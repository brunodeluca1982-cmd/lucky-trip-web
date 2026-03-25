/**
 * generate-itinerary/index.ts
 *
 * Pipeline:
 *   1. Receive saved items (id + titulo + categoria + localizacao)
 *   2. Enrich each from Supabase (o_que_fazer_rio, restaurantes)
 *   3. Attach neighborhood metadata (stay_neighborhoods) per bairro
 *   4. Deterministic pre-processing: zone clustering → skeleton build
 *   5. Gemini skeleton-fill (locked day count) with full metadata
 *   6. Validate — fix gaps, renumber
 *   7. Return DiaRoteiro[] format (compatible with existing UI)
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SavedCategory = "oQueFazer" | "restaurante" | "hotel" | "lucky";
type PeriodoDia    = "manha" | "almoco" | "tarde" | "noite";

interface SavedItemInput {
  id:          string;
  titulo:      string;
  categoria:   SavedCategory;
  localizacao?: string;
}

interface Preferences {
  inspirations: string[];
  vibe:         string | null;
}

interface RequestBody {
  savedItems:    SavedItemInput[];
  destination?:  string;
  preferences?:  Preferences;
  requestedDays?: number;
}

// Enriched place — combines saved item + DB metadata + neighborhood context
interface EnrichedPlace {
  id:            string;
  name:          string;
  categoria:     SavedCategory;
  area:          string;              // bairro
  zone:          number;              // geographic zone 1-6
  momento_ideal: string[];           // ["morning","afternoon","sunset"]
  tags:          string[];
  vibe_tags:     string[];
  energia:       string;             // "low" | "medium" | "high"
  duracao:       string;             // "1-2h"
  especialidade?: string;            // restaurant specialty
  perfil_publico?: string;           // restaurant audience
  neighborhood?: {
    walkable:           string;
    better_for:         string;
    best_for_1:         string;
    best_for_2:         string;
    best_for_3:         string;
    safety_solo_woman:  string;
    my_view:            string;
  };
}

// Output types (compatible with existing DiaRoteiro in the UI)
interface ItemRoteiro {
  id:          string;
  titulo:      string;
  categoria:   SavedCategory;
  localizacao: string;
  image?:      unknown;
}

interface DiaPeriodo {
  periodo: PeriodoDia;
  items:   ItemRoteiro[];
}

interface DiaRoteiro {
  numero:   number;
  bairro:   string;
  periodos: DiaPeriodo[];
}

interface ItineraryResult {
  destination: string;
  source:      string;
  preferences: Preferences;
  summary:     { totalDays: number; totalItems: number };
  days:        DiaRoteiro[];
}

// ── Geographic zone map ───────────────────────────────────────────────────────
// 6 zones ordered roughly South → North, matching how a traveler moves through Rio.

const ZONE_MAP: Record<string, number> = {
  // Zone 1 — Zona Sul (beach strip)
  "Ipanema": 1, "Leblon": 1, "Copacabana": 1, "Arpoador": 1, "Leme": 1,
  // Zone 2 — Zona Sul inland
  "Lagoa": 2, "Jardim Botânico": 2, "Gávea": 2, "Cosme Velho": 2,
  "Humaitá": 2, "Alto da Boa Vista": 2,
  // Zone 3 — Botafogo / Flamengo
  "Botafogo": 3, "Urca": 3, "Flamengo": 3, "Catete": 3, "Laranjeiras": 3,
  "Glória": 3,
  // Zone 4 — Centro / Santa Teresa
  "Centro": 4, "Santa Teresa": 4, "Lapa": 4, "Porto Maravilha": 4,
  "Saúde": 4, "Gamboa": 4, "Santo Cristo": 4,
  // Zone 5 — Zona Oeste (Barra / beaches)
  "Barra da Tijuca": 5, "Recreio": 5, "Prainha": 5, "Grumari": 5,
  "Joá": 5, "Guaratiba": 5,
  // Zone 6 — Zona Norte
  "Tijuca": 6, "Maracanã": 6, "São Cristóvão": 6, "Ramos": 6,
  "Penha": 6, "Méier": 6, "Madureira": 6,
};

function getZone(bairro?: string): number {
  if (!bairro) return 3;
  for (const [key, zone] of Object.entries(ZONE_MAP)) {
    if (bairro.toLowerCase().includes(key.toLowerCase())) return zone;
  }
  return 3;
}

// ── Trip length ───────────────────────────────────────────────────────────────

const VIBE_PER_DAY: Record<string, number> = {
  tranquilo: 3,
  moderado:  4,
  intenso:   6,
};

function computeTripLength(
  items:        EnrichedPlace[],
  vibe:         string,
  requestedDays?: number,
): number {
  if (requestedDays && requestedDays >= 1) return requestedDays;
  const perDay = VIBE_PER_DAY[vibe] ?? 4;
  return Math.max(1, Math.ceil(items.length / perDay));
}

// ── Supabase enrichment ───────────────────────────────────────────────────────

async function enrichPlaces(
  saved:   SavedItemInput[],
  supa:    ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  // Split by category so we query the right tables
  const oqIds   = saved.filter((s) => s.categoria === "oQueFazer" || s.categoria === "lucky").map((s) => s.id);
  const restIds = saved.filter((s) => s.categoria === "restaurante").map((s) => Number(s.id));

  // Fetch o_que_fazer_rio metadata
  const oqMap = new Map<string, Record<string, unknown>>();
  if (oqIds.length > 0) {
    const { data } = await supa
      .from("o_que_fazer_rio")
      .select("id,bairro,tags_ia,momento_ideal,vibe,energia,duracao_media")
      .in("id", oqIds);
    for (const row of data ?? []) oqMap.set(String(row.id), row);
  }

  // Fetch restaurantes metadata
  const restMap = new Map<number, Record<string, unknown>>();
  if (restIds.length > 0) {
    const { data } = await supa
      .from("restaurantes")
      .select("id,bairro,categoria,especialidade,perfil_publico")
      .in("id", restIds);
    for (const row of data ?? []) restMap.set(Number(row.id), row);
  }

  // Build enriched places (hotels skipped)
  const enriched: EnrichedPlace[] = [];
  for (const s of saved) {
    if (s.categoria === "hotel") continue;

    let bairro     = s.localizacao ?? "";
    let tags:       string[] = [];
    let momento:    string[] = [];
    let vibe_tags:  string[] = [];
    let energia     = "medium";
    let duracao     = "1-2h";
    let especialidade: string | undefined;
    let perfil:        string | undefined;

    if (s.categoria === "oQueFazer" || s.categoria === "lucky") {
      const row = oqMap.get(s.id);
      if (row) {
        bairro    = (row.bairro as string) || bairro;
        tags      = (row.tags_ia     as string[]) ?? [];
        momento   = (row.momento_ideal as string[]) ?? [];
        vibe_tags = (row.vibe        as string[]) ?? [];
        energia   = (row.energia     as string) ?? "medium";
        duracao   = (row.duracao_media as string) ?? "1-2h";
      }
    } else if (s.categoria === "restaurante") {
      const row = restMap.get(Number(s.id));
      if (row) {
        bairro       = (row.bairro        as string) || bairro;
        especialidade = row.especialidade  as string | undefined;
        perfil        = row.perfil_publico as string | undefined;
      }
      momento = ["lunch"];
    }

    enriched.push({
      id:            s.id,
      name:          s.titulo,
      categoria:     s.categoria,
      area:          bairro || "Rio de Janeiro",
      zone:          getZone(bairro),
      momento_ideal: momento,
      tags,
      vibe_tags,
      energia,
      duracao,
      especialidade,
      perfil_publico: perfil,
    });
  }

  return enriched;
}

// ── Neighborhood enrichment ───────────────────────────────────────────────────

async function attachNeighborhoodMeta(
  places: EnrichedPlace[],
  supa:   ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  const bairros = [...new Set(places.map((p) => p.area).filter(Boolean))];
  if (bairros.length === 0) return places;

  const { data } = await supa
    .from("stay_neighborhoods")
    .select("neighborhood_name,walkable,better_for,best_for_1,best_for_2,best_for_3,safety_solo_woman,my_view")
    .in("neighborhood_name", bairros);

  const nbMap = new Map<string, Record<string, string>>();
  for (const row of data ?? []) nbMap.set(row.neighborhood_name as string, row as Record<string, string>);

  return places.map((p) => {
    const nb = nbMap.get(p.area);
    if (!nb) return p;
    return {
      ...p,
      neighborhood: {
        walkable:          nb.walkable          ?? "",
        better_for:        nb.better_for        ?? "",
        best_for_1:        nb.best_for_1        ?? "",
        best_for_2:        nb.best_for_2        ?? "",
        best_for_3:        nb.best_for_3        ?? "",
        safety_solo_woman: nb.safety_solo_woman ?? "",
        my_view:           nb.my_view           ?? "",
      },
    };
  });
}

// ── momento_ideal → PeriodoDia ────────────────────────────────────────────────

function momentoToPeriodo(momento: string[]): PeriodoDia {
  if (!momento || momento.length === 0) return "manha";
  const first = momento[0].toLowerCase();
  if (first === "morning")              return "manha";
  if (first === "lunch")                return "almoco";
  if (first === "afternoon" || first === "sunset") return "tarde";
  if (first === "evening" || first === "night")    return "noite";
  return "manha";
}

function categoryToPeriodo(cat: SavedCategory): PeriodoDia {
  if (cat === "restaurante") return "almoco";
  return "manha";
}

// ── Deterministic draft builder ───────────────────────────────────────────────
// Zone-sorted sequential chunking: Day 1 gets first N zones, Day 2 next N, etc.
// Restaurants matched to days by zone proximity.

function buildDraft(
  places:     EnrichedPlace[],
  tripLength: number,
): DiaRoteiro[] {
  const activities  = places.filter((p) => p.categoria !== "restaurante");
  const restaurants = places.filter((p) => p.categoria === "restaurante");

  // Sort activities by zone
  const sortedActs = [...activities].sort((a, b) => a.zone - b.zone);
  const chunkSize  = Math.ceil(sortedActs.length / tripLength);

  // Distribute activities across days
  const dayActs: EnrichedPlace[][] = Array.from({ length: tripLength }, () => []);
  sortedActs.forEach((act, i) => {
    dayActs[Math.min(Math.floor(i / chunkSize), tripLength - 1)].push(act);
  });

  // Match each restaurant to the best day by zone proximity
  const dayRestaurants: EnrichedPlace[][] = Array.from({ length: tripLength }, () => []);
  for (const rest of restaurants) {
    let bestDay   = 0;
    let bestScore = Infinity;
    dayActs.forEach((acts, di) => {
      const repZone  = acts.length > 0 ? acts[Math.floor(acts.length / 2)].zone : 3;
      const score    = Math.abs(rest.zone - repZone) * 10 + dayRestaurants[di].length;
      if (score < bestScore) { bestScore = score; bestDay = di; }
    });
    dayRestaurants[bestDay].push(rest);
  }

  // Build DiaRoteiro
  const ORDER: PeriodoDia[] = ["manha", "almoco", "tarde", "noite"];
  const days: DiaRoteiro[]  = [];

  for (let d = 0; d < tripLength; d++) {
    const acts  = dayActs[d];
    const rests = dayRestaurants[d];
    if (acts.length === 0 && rests.length === 0) continue;

    const periodMap = new Map<PeriodoDia, ItemRoteiro[]>();

    // Assign activities by momento_ideal
    const half = Math.ceil(acts.length / 2);
    acts.forEach((a, i) => {
      const periodo = a.momento_ideal.length > 0
        ? momentoToPeriodo(a.momento_ideal)
        : (i < half ? "manha" : "tarde");
      if (!periodMap.has(periodo)) periodMap.set(periodo, []);
      periodMap.get(periodo)!.push({ id: a.id, titulo: a.name, categoria: a.categoria, localizacao: a.area });
    });

    // First restaurant → almoco, rest → noite
    rests.forEach((r, i) => {
      const periodo: PeriodoDia = i === 0 ? "almoco" : "noite";
      if (!periodMap.has(periodo)) periodMap.set(periodo, []);
      periodMap.get(periodo)!.push({ id: r.id, titulo: r.name, categoria: r.categoria, localizacao: r.area });
    });

    const periodos: DiaPeriodo[] = ORDER
      .filter((p) => periodMap.has(p) && periodMap.get(p)!.length > 0)
      .map((p) => ({ periodo: p, items: periodMap.get(p)! }));

    const repZone = acts[0]?.zone ?? rests[0]?.zone ?? 3;
    const bairro  = acts[0]?.area ?? rests[0]?.area ?? "Rio de Janeiro";

    if (periodos.length > 0) {
      days.push({ numero: d + 1, bairro, periodos });
    }
  }

  return days.map((day, i) => ({ ...day, numero: i + 1 }));
}

// ── Gemini skeleton-fill ──────────────────────────────────────────────────────
// Sends empty day skeleton + FULL enriched place metadata to Gemini.
// Gemini ONLY assigns places into pre-built day slots — day count is locked.

async function fillSkeletonWithGemini(
  places:     EnrichedPlace[],
  tripLength: number,
  dest:       string,
  prefs:      Preferences,
  fallback:   DiaRoteiro[],
): Promise<DiaRoteiro[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !places.length) return fallback;

  const skeleton    = Array.from({ length: tripLength }, (_, i) => ({ day: i + 1, items: [] }));
  const itemsPerDay = Math.ceil(places.length / tripLength);

  // Compact enriched payload — all useful metadata, nothing superfluous
  const placePayload = places.map((p) => ({
    place_id:      p.id,
    name:          p.name,
    category:      p.categoria,
    area:          p.area,
    zone:          p.zone,
    momento_ideal: p.momento_ideal,
    tags:          p.tags.slice(0, 8),
    energia:       p.energia,
    duracao:       p.duracao,
    especialidade: p.especialidade,
    perfil:        p.perfil_publico,
    neighborhood:  p.neighborhood
      ? {
          walkable:           p.neighborhood.walkable,
          better_for:         p.neighborhood.better_for,
          best_for_1:         p.neighborhood.best_for_1,
          best_for_2:         p.neighborhood.best_for_2,
          best_for_3:         p.neighborhood.best_for_3,
          safety_solo_woman:  p.neighborhood.safety_solo_woman,
        }
      : undefined,
  }));

  const prompt =
`You are a Rio de Janeiro expert building a real travel itinerary.

The number of days is ALREADY DEFINED — do NOT change it.
You MUST fill ALL ${tripLength} days with places.
You MUST distribute places EVENLY — around ${itemsPerDay} items per day.
You MUST NOT leave any day empty.
You MUST NOT put all places in day 1.

DESTINATION: ${dest}
VIBE: ${prefs.vibe ?? "moderado"} | INSPIRATIONS: ${prefs.inspirations.join(", ") || "any"}

EMPTY SKELETON (fill this exactly):
${JSON.stringify(skeleton)}

PLACES TO DISTRIBUTE (use only these — do not invent new ones):
${JSON.stringify(placePayload)}

ASSIGNMENT RULES:
- Group by geographic zone (same or adjacent zone numbers on same day — avoids cross-city jumps)
- Use momento_ideal as a HARD signal for time-of-day:
    morning → manha
    lunch → almoco
    afternoon or sunset → tarde
    evening or night → noite
- If categoria is "restaurante": default time is "lunch" (almoco)
- If categoria is "oQueFazer" or "lucky": use momento_ideal[0]
- Balance activities and restaurants across days
- Use "walkable" neighborhood data to group walkable places together
- Respect "energia" — pair high-energy with low-energy in same day
- If "safety_solo_woman" is "limited", consider placing in daytime periods
- Choose "area" for each day as the dominant neighborhood of that day's items

VALIDATION BEFORE RETURNING:
- Exactly ${tripLength} days in output
- Every day has at least 1 item
- All ${places.length} places appear exactly once
- No unrealistic zone jumps within a single day (e.g. Barra da Tijuca + São Cristóvão)

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "day": 1,
    "area": "dominant neighborhood",
    "items": [
      { "place_id": "id", "name": "name", "time": "morning|lunch|afternoon|evening" }
    ]
  }
]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents:         [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 4096 },
        }),
      },
    );

    if (!res.ok) return fallback;

    const data  = await res.json();
    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(clean) as Array<{
      day:   number;
      area:  string;
      items: Array<{ place_id: string; name: string; time: string }>;
    }>;

    // Hard check: must have exactly tripLength days
    if (!Array.isArray(parsed) || parsed.length !== tripLength) return fallback;

    // Build item lookup by place_id
    const placeMap = new Map(places.map((p) => [p.id, p]));

    // Time string → PeriodoDia
    const timeMap: Record<string, PeriodoDia> = {
      morning:   "manha",
      lunch:     "almoco",
      afternoon: "tarde",
      sunset:    "tarde",
      evening:   "noite",
      night:     "noite",
    };

    const ORDER: PeriodoDia[] = ["manha", "almoco", "tarde", "noite"];

    const days: DiaRoteiro[] = parsed.map((gDay, idx) => {
      const periodMap = new Map<PeriodoDia, ItemRoteiro[]>();

      for (const gi of gDay.items ?? []) {
        const full = placeMap.get(gi.place_id);
        if (!full) continue; // Gemini cannot invent places

        const periodo: PeriodoDia =
          timeMap[gi.time?.toLowerCase() ?? ""] ??
          categoryToPeriodo(full.categoria);

        if (!periodMap.has(periodo)) periodMap.set(periodo, []);
        periodMap.get(periodo)!.push({
          id:          full.id,
          titulo:      full.name,
          categoria:   full.categoria,
          localizacao: full.area,
        });
      }

      const periodos: DiaPeriodo[] = ORDER
        .filter((p) => periodMap.has(p) && periodMap.get(p)!.length > 0)
        .map((p)  => ({ periodo: p, items: periodMap.get(p)! }));

      return {
        numero:   idx + 1,
        bairro:   gDay.area || places.find((p) => p.zone === 3)?.area || "Rio de Janeiro",
        periodos,
      };
    }).filter((d) => d.periodos.length > 0);

    if (days.length !== tripLength) return fallback;
    return days;

  } catch (_) {
    return fallback;
  }
}

// ── Validation pass ───────────────────────────────────────────────────────────
// Ensures no saved places were silently dropped and all days are non-empty.

function validateAndFix(
  days:      DiaRoteiro[],
  allPlaces: EnrichedPlace[],
  tripLength: number,
): DiaRoteiro[] {
  // 1. Collect placed IDs
  const usedIds = new Set<string>();
  for (const day of days) {
    for (const p of day.periodos) {
      for (const item of p.items) usedIds.add(item.id);
    }
  }

  // 2. Re-attach any dropped places to the last day
  const lost = allPlaces.filter((p) => !usedIds.has(p.id));
  if (lost.length > 0 && days.length > 0) {
    const lastDay = days[days.length - 1];
    const tarde   = lastDay.periodos.find((p) => p.periodo === "tarde");
    const lostItems = lost.map((l) => ({
      id: l.id, titulo: l.name, categoria: l.categoria, localizacao: l.area,
    }));
    if (tarde) {
      tarde.items.push(...lostItems);
    } else {
      lastDay.periodos.push({ periodo: "tarde", items: lostItems });
    }
  }

  // 3. Remove truly empty days and renumber
  return days
    .filter((d) => d.periodos.length > 0)
    .map((d, i) => ({ ...d, numero: i + 1 }));
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      savedItems    = [],
      destination   = "Rio de Janeiro",
      preferences   = { inspirations: [], vibe: "moderado" },
      requestedDays,
    } = body;

    // Supabase client — edge functions have these env vars automatically
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const dest = destination || "Rio de Janeiro";
    const vibe = preferences.vibe ?? "moderado";

    // 1. Enrich saved items from Supabase tables
    let places = await enrichPlaces(savedItems, supa);

    // 2. Attach neighborhood metadata per bairro
    places = await attachNeighborhoodMeta(places, supa);

    if (places.length === 0) {
      return new Response(
        JSON.stringify({ error: "No actionable saved places" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // 3. Compute trip length (locked — Gemini cannot change this)
    const tripLength = computeTripLength(places, vibe, requestedDays);

    // 4. Deterministic draft — guaranteed correct fallback
    const deterministicDraft = buildDraft(places, tripLength);

    // 5. Gemini skeleton-fill with full enriched metadata
    //    Passes deterministicDraft as fallback; Gemini only fills pre-built slots
    let days = await fillSkeletonWithGemini(
      places,
      tripLength,
      dest,
      preferences,
      deterministicDraft,
    );

    // 6. Validate — re-attach any dropped places
    days = validateAndFix(days, places, tripLength);

    const result: ItineraryResult = {
      destination: dest,
      source:      "trip_saved_places",
      preferences,
      summary: {
        totalDays:  days.length,
        totalItems: places.length,
      },
      days,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status:  200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
