/**
 * generate-itinerary/index.ts
 *
 * Five deterministic steps BEFORE any AI call:
 *
 *  Step 1 — Normalize: unify o_que_fazer_rio + restaurantes into one EnrichedPlace type
 *  Step 2 — Enrich: attach neighborhood metadata (stay_neighborhoods) per bairro
 *  Step 3 — Classify: assign best_periodo to each place using metadata hard signals
 *  Step 4 — Cluster: group places by geographic coherence (zone + neighborhood proximity)
 *  Step 5 — Build: construct fully populated DiaRoteiro[] — Gemini gets a finished draft
 *
 *  Gemini refinement (step 6): receives the complete draft; may ONLY reorder items
 *  within each período for better flow — cannot change days, add/remove places, or
 *  reassign to different períodos.
 *
 *  Step 7 — Validate: re-attach any places dropped during refinement.
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
  id:           string;
  titulo:       string;
  categoria:    SavedCategory;
  localizacao?: string;
}

interface Preferences {
  inspirations: string[];
  vibe:         string | null;
}

interface RequestBody {
  savedItems:     SavedItemInput[];
  destination?:   string;
  preferences?:   Preferences;
  requestedDays?: number;
}

/** Fully enriched place — unified source of truth for all 5 deterministic steps */
interface EnrichedPlace {
  // ── Identity
  id:            string;
  name:          string;
  categoria:     SavedCategory;
  // ── Location
  area:          string;          // bairro name
  zone:          number;          // 1-6, South → North
  // ── Time metadata (from DB)
  momento_ideal: string[];        // ["morning","afternoon","sunset"]
  energia:       string;          // "low" | "medium" | "high"
  // ── Content metadata (from DB)
  tags:          string[];        // tags_ia from o_que_fazer_rio
  vibe_tags:     string[];        // vibe from o_que_fazer_rio
  duracao:       string;          // "1-2h" | "2-4h" etc.
  especialidade?: string;         // restaurant specialty
  perfil_publico?: string;        // restaurant audience
  // ── Computed in Step 3
  best_periodo?: PeriodoDia;
  // ── Neighborhood metadata (attached in Step 2)
  neighborhood?: {
    walkable:           string;
    better_for:         string;
    best_for_1:         string;
    safety_solo_woman:  string;
  };
}

/** Output types — must stay compatible with the existing DiaRoteiro UI shape */
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
// 6 zones ordered South → North. Adjacent zones = walkable in the same day.

const ZONE_MAP: Record<string, number> = {
  // Zone 1 — Zona Sul beach strip
  "Ipanema": 1, "Leblon": 1, "Copacabana": 1, "Arpoador": 1, "Leme": 1,
  // Zone 2 — Zona Sul inland
  "Lagoa": 2, "Jardim Botânico": 2, "Gávea": 2, "Cosme Velho": 2,
  "Humaitá": 2, "Alto da Boa Vista": 2,
  // Zone 3 — Botafogo / Flamengo / Urca
  "Botafogo": 3, "Urca": 3, "Flamengo": 3, "Catete": 3, "Laranjeiras": 3, "Glória": 3,
  // Zone 4 — Centro / Santa Teresa / Lapa
  "Centro": 4, "Santa Teresa": 4, "Lapa": 4, "Porto Maravilha": 4,
  "Saúde": 4, "Gamboa": 4, "Santo Cristo": 4,
  // Zone 5 — Zona Oeste
  "Barra da Tijuca": 5, "Recreio": 5, "Prainha": 5, "Grumari": 5,
  "Joá": 5, "Guaratiba": 5,
  // Zone 6 — Zona Norte
  "Tijuca": 6, "Maracanã": 6, "São Cristóvão": 6, "Penha": 6,
  "Méier": 6, "Madureira": 6, "Ramos": 6,
};

function getZone(bairro?: string): number {
  if (!bairro) return 3;
  for (const [key, zone] of Object.entries(ZONE_MAP)) {
    if (bairro.toLowerCase().includes(key.toLowerCase())) return zone;
  }
  return 3;
}

// ── Vibe → items per day ──────────────────────────────────────────────────────

const VIBE_PER_DAY: Record<string, number> = { tranquilo: 3, moderado: 4, intenso: 6 };

function computeTripLength(count: number, vibe: string, requestedDays?: number): number {
  if (requestedDays && requestedDays >= 1) return requestedDays;
  const perDay = VIBE_PER_DAY[vibe] ?? 4;
  return Math.max(1, Math.ceil(count / perDay));
}

// ── STEP 1 + 2: Normalize + Enrich from Supabase ─────────────────────────────
// Queries o_que_fazer_rio and restaurantes, then merges into one EnrichedPlace array.

async function enrichPlaces(
  saved: SavedItemInput[],
  supa:  ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  const oqIds   = saved.filter((s) => s.categoria === "oQueFazer" || s.categoria === "lucky").map((s) => s.id);
  const restIds = saved.filter((s) => s.categoria === "restaurante").map((s) => Number(s.id));

  // Parallel fetch
  const [oqResult, restResult] = await Promise.all([
    oqIds.length > 0
      ? supa.from("o_que_fazer_rio")
          .select("id,bairro,tags_ia,momento_ideal,vibe,energia,duracao_media")
          .in("id", oqIds)
      : Promise.resolve({ data: [] }),
    restIds.length > 0
      ? supa.from("restaurantes")
          .select("id,bairro,categoria,especialidade,perfil_publico")
          .in("id", restIds)
      : Promise.resolve({ data: [] }),
  ]);

  const oqMap   = new Map((oqResult.data   ?? []).map((r: Record<string, unknown>) => [String(r.id),  r]));
  const restMap = new Map((restResult.data ?? []).map((r: Record<string, unknown>) => [Number(r.id), r]));

  const places: EnrichedPlace[] = [];

  for (const s of saved) {
    if (s.categoria === "hotel") continue;

    let area        = s.localizacao ?? "";
    let tags:        string[]     = [];
    let momento:     string[]     = [];
    let vibe_tags:   string[]     = [];
    let energia                   = "medium";
    let duracao                   = "1-2h";
    let especialidade: string | undefined;
    let perfil:        string | undefined;

    if (s.categoria === "oQueFazer" || s.categoria === "lucky") {
      const row = oqMap.get(s.id);
      if (row) {
        area      = (row.bairro        as string) || area;
        tags      = (row.tags_ia       as string[]) ?? [];
        momento   = (row.momento_ideal as string[]) ?? [];
        vibe_tags = (row.vibe          as string[]) ?? [];
        energia   = (row.energia       as string)  ?? "medium";
        duracao   = (row.duracao_media as string)  ?? "1-2h";
      }
    } else if (s.categoria === "restaurante") {
      const row = restMap.get(Number(s.id));
      if (row) {
        area          = (row.bairro        as string) || area;
        especialidade = row.especialidade  as string | undefined;
        perfil        = row.perfil_publico as string | undefined;
      }
      momento = ["lunch"]; // restaurants always prefer lunch slot by default
    }

    places.push({
      id:          s.id,
      name:        s.titulo,
      categoria:   s.categoria,
      area:        area || "Rio de Janeiro",
      zone:        getZone(area),
      momento_ideal: momento,
      energia,
      tags,
      vibe_tags,
      duracao,
      especialidade,
      perfil_publico: perfil,
    });
  }

  return places;
}

// ── STEP 2: Attach neighborhood metadata ──────────────────────────────────────

async function attachNeighborhoodMeta(
  places: EnrichedPlace[],
  supa:   ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  const bairros = [...new Set(places.map((p) => p.area).filter(Boolean))];
  if (bairros.length === 0) return places;

  const { data } = await supa
    .from("stay_neighborhoods")
    .select("neighborhood_name,walkable,better_for,best_for_1,safety_solo_woman")
    .in("neighborhood_name", bairros);

  const nbMap = new Map(
    (data ?? []).map((r: Record<string, string>) => [r.neighborhood_name, r]),
  );

  return places.map((p) => {
    const nb = nbMap.get(p.area);
    if (!nb) return p;
    return {
      ...p,
      neighborhood: {
        walkable:          nb.walkable          ?? "",
        better_for:        nb.better_for        ?? "",
        best_for_1:        nb.best_for_1        ?? "",
        safety_solo_woman: nb.safety_solo_woman ?? "",
      },
    };
  });
}

// ── STEP 3: Classify best período using metadata hard signals ─────────────────
// Rules applied in order of priority:
//   1. categoria === "restaurante"  → almoco (will be overridden to noite if 2nd+ per day)
//   2. momento_ideal from DB        → primary signal
//   3. tags_ia contains "beach"     → tarde
//   4. energia === "high"           → manha (high-energy = morning activity)
//   5. default                      → manha

const MOMENTO_TO_PERIODO: Record<string, PeriodoDia> = {
  morning:   "manha",
  lunch:     "almoco",
  afternoon: "tarde",
  sunset:    "tarde",
  evening:   "noite",
  night:     "noite",
};

function classifyPeriodo(p: EnrichedPlace): PeriodoDia {
  // Rule 1 — restaurants anchor to almoco (day-level logic later handles overflow to noite)
  if (p.categoria === "restaurante") return "almoco";

  // Rule 2 — DB momento_ideal (most reliable signal)
  for (const m of p.momento_ideal) {
    const mapped = MOMENTO_TO_PERIODO[m.toLowerCase()];
    if (mapped) return mapped;
  }

  // Rule 3 — beach tag → tarde (beaches are best in the afternoon)
  if (p.tags.some((t) => t.includes("beach") || t.includes("praia"))) return "tarde";

  // Rule 4 — high energy activities → morning (parks, viewpoints, hikes)
  if (p.energia === "high") return "manha";

  // Rule 5 — default
  return "manha";
}

function classifyAllPeriodos(places: EnrichedPlace[]): EnrichedPlace[] {
  return places.map((p) => ({ ...p, best_periodo: classifyPeriodo(p) }));
}

// ── STEP 4: Group places by geographic coherence ──────────────────────────────
// Algorithm:
//   1. Sort activities by zone (South → North keeps days geographically tight)
//   2. Sequential chunking: first N activities → Day 1, next N → Day 2, etc.
//   3. Within each day chunk, sub-sort by neighborhood to keep walkable places together
//   4. Restaurants matched to the day whose zone center is closest

function groupByGeography(
  places:     EnrichedPlace[],
  tripLength: number,
): { dayGroups: EnrichedPlace[][]; dayRestaurants: EnrichedPlace[][] } {
  const activities  = places.filter((p) => p.categoria !== "restaurante");
  const restaurants = places.filter((p) => p.categoria === "restaurante");

  // Sort activities by zone, then by area name (keeps same-neighborhood items consecutive)
  const sortedActs = [...activities].sort((a, b) => {
    if (a.zone !== b.zone) return a.zone - b.zone;
    return a.area.localeCompare(b.area);
  });

  // Sequential zone chunks — each day gets a contiguous slice of the sorted list
  const chunkSize = Math.ceil(sortedActs.length / tripLength);
  const dayGroups: EnrichedPlace[][] = Array.from({ length: tripLength }, () => []);
  sortedActs.forEach((act, i) => {
    dayGroups[Math.min(Math.floor(i / chunkSize), tripLength - 1)].push(act);
  });

  // Match each restaurant to the closest-zone day
  const dayRestaurants: EnrichedPlace[][] = Array.from({ length: tripLength }, () => []);
  for (const rest of restaurants) {
    let bestDay   = 0;
    let bestScore = Infinity;
    dayGroups.forEach((acts, di) => {
      // Representative zone = median item's zone for this day
      const rep   = acts[Math.floor(acts.length / 2)]?.zone ?? 3;
      // Score = zone distance (primary) + load penalty (secondary, avoids piling all on one day)
      const score = Math.abs(rest.zone - rep) * 10 + dayRestaurants[di].length * 3;
      if (score < bestScore) { bestScore = score; bestDay = di; }
    });
    dayRestaurants[bestDay].push(rest);
  }

  return { dayGroups, dayRestaurants };
}

// ── STEP 5: Build fully populated DiaRoteiro[] ────────────────────────────────
// Produces a complete itinerary draft — Gemini will receive this, not an empty skeleton.
//
// Period assignment per day:
//   • Each activity uses its pre-classified best_periodo
//   • First restaurant in a day  → almoco
//   • Second+ restaurant in a day → noite (dinner overflow)
//   • Canonical order: manha → almoco → tarde → noite

const PERIODO_ORDER: PeriodoDia[] = ["manha", "almoco", "tarde", "noite"];

function buildFullDraft(
  dayGroups:      EnrichedPlace[][],
  dayRestaurants: EnrichedPlace[][],
): DiaRoteiro[] {
  const days: DiaRoteiro[] = [];

  dayGroups.forEach((acts, di) => {
    const rests = dayRestaurants[di] ?? [];
    if (acts.length === 0 && rests.length === 0) return;

    const periodMap = new Map<PeriodoDia, ItemRoteiro[]>();

    // Place activities using their pre-classified período
    for (const act of acts) {
      const periodo = act.best_periodo ?? "manha";
      if (!periodMap.has(periodo)) periodMap.set(periodo, []);
      periodMap.get(periodo)!.push({
        id: act.id, titulo: act.name, categoria: act.categoria, localizacao: act.area,
      });
    }

    // Place restaurants: 1st → almoco, 2nd+ → noite
    rests.forEach((r, i) => {
      const periodo: PeriodoDia = i === 0 ? "almoco" : "noite";
      if (!periodMap.has(periodo)) periodMap.set(periodo, []);
      periodMap.get(periodo)!.push({
        id: r.id, titulo: r.name, categoria: r.categoria, localizacao: r.area,
      });
    });

    // Build ordered periodos
    const periodos: DiaPeriodo[] = PERIODO_ORDER
      .filter((p) => (periodMap.get(p) ?? []).length > 0)
      .map((p)   => ({ periodo: p, items: periodMap.get(p)! }));

    if (periodos.length === 0) return;

    // Day bairro = the neighborhood with the most items (modal bairro)
    const allItems = [...acts, ...rests];
    const bairroCount = new Map<string, number>();
    for (const item of allItems) bairroCount.set(item.area, (bairroCount.get(item.area) ?? 0) + 1);
    const bairro = [...bairroCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Rio de Janeiro";

    days.push({ numero: di + 1, bairro, periodos });
  });

  // Renumber (some days may have been skipped if truly empty)
  return days.map((d, i) => ({ ...d, numero: i + 1 }));
}

// ── STEP 6: Gemini refinement (NOT generation) ────────────────────────────────
// Receives the fully populated draft built by steps 1-5.
// Gemini's ONLY allowed action: reorder items WITHIN each período for better flow.
// It cannot: change day count, move items between days, move between períodos, add/remove.

async function refineWithGemini(
  draft:   DiaRoteiro[],
  dest:    string,
  prefs:   Preferences,
  allPlaces: EnrichedPlace[],
): Promise<DiaRoteiro[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !draft.length) return draft;

  // Compact representation — only what Gemini needs to decide order
  const compact = draft.map((day) => ({
    day:      day.numero,
    area:     day.bairro,
    periodos: day.periodos.map((p) => ({
      periodo: p.periodo,
      items:   p.items.map((it) => {
        const full = allPlaces.find((pl) => pl.id === it.id);
        return {
          id:       it.id,
          name:     it.titulo,
          area:     it.localizacao,
          zone:     full?.zone ?? 3,
          energia:  full?.energia ?? "medium",
          tags:     (full?.tags ?? []).slice(0, 5),
        };
      }),
    })),
  }));

  const prompt =
`You are a Rio de Janeiro travel expert. You received a fully structured itinerary built from real Supabase data.

Your role is ONLY to improve the ORDER of items within each período for better geographic flow and realistic pacing.

STRICT RULES:
- Do NOT add new places
- Do NOT remove places
- Do NOT move items between different days
- Do NOT move items between different períodos (manha/almoco/tarde/noite)
- Do NOT change the number of days
- ONLY reorder items within each período
- Return the EXACT same JSON structure

Use "zone" and "area" to group geographically close items together within each período.
Use "energia" to order high-energy items early in the período.
Vibe: ${prefs.vibe ?? "moderado"} | Inspirations: ${prefs.inspirations.join(", ") || "any"}
Destination: ${dest}

DRAFT TO REFINE:
${JSON.stringify(compact)}

Return ONLY a valid JSON array with the same structure — no markdown, no explanation.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents:         [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        }),
      },
    );
    if (!res.ok) return draft;

    const data  = await res.json();
    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

    const refined = JSON.parse(clean) as typeof compact;

    // Hard checks: same day count and same item counts per período
    if (!Array.isArray(refined) || refined.length !== draft.length) return draft;
    for (let i = 0; i < refined.length; i++) {
      const orig = draft[i];
      const ref  = refined[i];
      if (!ref.periodos || ref.periodos.length !== orig.periodos.length) return draft;
      for (let j = 0; j < orig.periodos.length; j++) {
        if ((ref.periodos[j]?.items?.length ?? 0) !== orig.periodos[j].items.length) return draft;
      }
    }

    // Re-attach full ItemRoteiro objects from the original draft (Gemini only had compact view)
    const itemById = new Map<string, ItemRoteiro>();
    for (const day of draft) {
      for (const p of day.periodos) {
        for (const it of p.items) itemById.set(it.id, it);
      }
    }

    return refined.map((rDay, i) => ({
      numero:   i + 1,
      bairro:   rDay.area || draft[i].bairro,
      periodos: rDay.periodos.map((rp, j) => ({
        periodo: rp.periodo as PeriodoDia,
        items:   (rp.items as Array<{ id: string }>)
          .map((ri) => itemById.get(ri.id))
          .filter(Boolean) as ItemRoteiro[],
      })).filter((p) => p.items.length > 0),
    })).filter((d) => d.periodos.length > 0);

  } catch (_) {
    return draft;
  }
}

// ── STEP 7: Validation ────────────────────────────────────────────────────────
// Re-attaches any places dropped during Gemini refinement.
// Verifies day count integrity.

function validateAndFix(
  days:      DiaRoteiro[],
  allPlaces: EnrichedPlace[],
): DiaRoteiro[] {
  const usedIds = new Set<string>();
  for (const day of days) {
    for (const p of day.periodos) {
      for (const it of p.items) usedIds.add(it.id);
    }
  }

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

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const dest = destination || "Rio de Janeiro";
    const vibe = preferences.vibe ?? "moderado";

    // ── Step 1+2: Normalize + Enrich from Supabase ────────────────────────────
    let places = await enrichPlaces(savedItems, supa);
    places     = await attachNeighborhoodMeta(places, supa);

    if (places.length === 0) {
      return new Response(
        JSON.stringify({ error: "No actionable saved places" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // ── Step 3: Classify each place by best time-of-day ───────────────────────
    places = classifyAllPeriodos(places);

    // ── Trip length is locked here — Gemini cannot change it ──────────────────
    const tripLength = computeTripLength(places.length, vibe, requestedDays);

    // ── Step 4: Group places by geographic coherence ──────────────────────────
    const { dayGroups, dayRestaurants } = groupByGeography(places, tripLength);

    // ── Step 5: Build fully populated DiaRoteiro[] ────────────────────────────
    let days = buildFullDraft(dayGroups, dayRestaurants);

    // ── Step 6: Gemini refinement — only reorders within existing períodos ─────
    days = await refineWithGemini(days, dest, preferences, places);

    // ── Step 7: Validation — recover any dropped places ───────────────────────
    days = validateAndFix(days, places);

    const result: ItineraryResult = {
      destination: dest,
      source:      "trip_saved_places",
      preferences,
      summary: { totalDays: days.length, totalItems: places.length },
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
