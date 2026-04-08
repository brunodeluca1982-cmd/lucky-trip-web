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
  vibe:         string | null;   // pace: tranquilo / moderado / intenso
  travelVibe?:  string | null;   // companion: solo / casal / amigos / família
  budget?:      string | null;   // essencial / conforto / sofisticado
}

interface RequestBody {
  savedItems:     SavedItemInput[];
  destination?:   string;
  preferences?:   Preferences;
  requestedDays?: number;
  arrivalDate?:   string;        // ISO date string "YYYY-MM-DD"
  departureDate?: string;        // ISO date string "YYYY-MM-DD"
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
  preco_nivel?: number;           // 1-5 price level (from DB)
  perfil_ideal?: string[];        // target audience tags (from DB)
  // ── Computed in Step 3
  best_periodo?: PeriodoDia;
  // ── Neighborhood metadata (attached in Step 2)
  neighborhood?: {
    walkable:           string;
    better_for:         string;
    best_for_1:         string;
    safety_solo_woman:  string;
  };
  // ── Computed in Step 3b, consumed by Step 4 only (internal, never serialized)
  // Stamped by scoreAndSortPool; read by sortBucket for intra-zone ordering.
  // Optional: absent on synthetic places created after scoring runs.
  prefScore?: number;
}

/** Output types — must stay compatible with the existing DiaRoteiro UI shape */
interface ItemRoteiro {
  id:           string;
  titulo:       string;
  categoria:    SavedCategory;
  localizacao:  string;
  source_table: string;
  image?:       unknown;
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
//
// Sources queried for SAVED items:
//   • o_que_fazer_rio  — oQueFazer categoria (UUID id)
//   • lucky_list_rio   — lucky categoria (separate table, different columns)
//   • restaurantes     — restaurante categoria (integer id)
//
// Then fetchComplementaryContent() pads out the pool to support multi-day trips.

async function enrichPlaces(
  saved: SavedItemInput[],
  supa:  ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  const oqIds    = saved.filter((s) => s.categoria === "oQueFazer").map((s) => s.id);
  const luckyIds = saved.filter((s) => s.categoria === "lucky").map((s) => s.id);
  const restIds  = saved.filter((s) => s.categoria === "restaurante").map((s) => Number(s.id));

  // Parallel fetch from all three sources
  const [oqResult, luckyResult, restResult] = await Promise.all([
    oqIds.length > 0
      ? supa.from("o_que_fazer_rio")
          .select("id,nome,bairro,categoria,tags_ia,momento_ideal,vibe,energia,duracao_media,perfil_ideal")
          .in("id", oqIds)
      : Promise.resolve({ data: [] }),
    luckyIds.length > 0
      ? supa.from("lucky_list_rio")
          .select("id,nome,bairro,tipo,tags_ia,momento_ideal,photo_url")
          .in("id", luckyIds)
      : Promise.resolve({ data: [] }),
    restIds.length > 0
      ? supa.from("restaurantes")
          .select("id,nome,bairro,categoria,especialidade,perfil_publico,preco_nivel")
          .eq("ativo", true)
          .in("id", restIds)
      : Promise.resolve({ data: [] }),
  ]);

  const oqMap    = new Map((oqResult.data    ?? []).map((r: Record<string, unknown>) => [String(r.id),  r]));
  const luckyMap = new Map((luckyResult.data ?? []).map((r: Record<string, unknown>) => [String(r.id),  r]));
  const restMap  = new Map((restResult.data  ?? []).map((r: Record<string, unknown>) => [Number(r.id), r]));

  const places: EnrichedPlace[] = [];

  for (const s of saved) {
    if (s.categoria === "hotel") continue;

    let area:        string   = s.localizacao ?? "";
    let name:        string   = s.titulo;
    let tags:        string[] = [];
    let momento:     string[] = [];
    let vibe_tags:   string[] = [];
    let energia                = "medium";
    let duracao                = "1-2h";
    let especialidade: string | undefined;
    let perfil:        string | undefined;

    if (s.categoria === "oQueFazer") {
      const row = oqMap.get(s.id);
      if (row) {
        area      = (row.bairro        as string)   || area;
        name      = (row.nome          as string)   || name;
        tags      = (row.tags_ia       as string[]) ?? [];
        momento   = (row.momento_ideal as string[]) ?? [];
        vibe_tags = (row.vibe          as string[]) ?? [];
        energia   = (row.energia       as string)   ?? "medium";
        duracao   = (row.duracao_media as string)   ?? "1-2h";
      }
    } else if (s.categoria === "lucky") {
      // Look up in lucky_list_rio — confirmed columns: id,nome,bairro,tipo,tags_ia,momento_ideal,photo_url
      const row = luckyMap.get(s.id);
      if (row) {
        area      = (row.bairro        as string)   || area;
        name      = (row.nome          as string)   || name;
        tags      = (row.tags_ia       as string[]) ?? [];
        momento   = (row.momento_ideal as string[]) ?? [];
        vibe_tags = [];
        energia   = "medium";
      }
    } else if (s.categoria === "restaurante") {
      const row = restMap.get(Number(s.id));
      if (row) {
        area          = (row.bairro        as string) || area;
        name          = (row.nome          as string) || name;
        especialidade = row.especialidade  as string | undefined;
        perfil        = row.perfil_publico as string | undefined;
      }
      momento = ["lunch"];
    }

    const oqRow       = s.categoria === "oQueFazer" ? oqMap.get(s.id) : undefined;
    const perfil_ideal = oqRow
      ? ((oqRow.perfil_ideal as string[] | null) ?? [])
      : [];
    const restRow     = s.categoria === "restaurante" ? restMap.get(Number(s.id)) : undefined;
    const preco_nivel = restRow
      ? ((restRow.preco_nivel as number | null) ?? undefined)
      : undefined;

    places.push({
      id:            s.id,
      name,
      categoria:     s.categoria,
      area:          area || "Rio de Janeiro",
      zone:          getZone(area),
      momento_ideal: momento,
      energia,
      tags,
      vibe_tags,
      duracao,
      especialidade,
      perfil_publico: perfil,
      preco_nivel,
      perfil_ideal,
    });
  }

  return places;
}

// ── Complementary content: pad the place pool for multi-day trips ─────────────
//
// Priority: lucky_list_rio (editorial) → o_que_fazer_rio (core) → restaurantes
// Only called when saved items are insufficient for the requested trip length.

async function fetchComplementaryContent(
  existingPlaces: EnrichedPlace[],
  requestedDays:  number,
  vibe:           string,
  supa:           ReturnType<typeof createClient>,
  preferences:    Preferences,
): Promise<EnrichedPlace[]> {
  const existingIds = new Set(existingPlaces.map((p) => p.id));
  // Step C: zones of the user's saved places — used as proximity reference.
  // Empty when no saved places exist; zoneProximityScore degrades gracefully.
  const savedZones  = new Set(existingPlaces.map((p) => p.zone));

  const perDay       = VIBE_PER_DAY[vibe] ?? 4;
  // Target: (perDay-1) activities + 1 restaurant per day = comfortable density
  const targetActs   = requestedDays * (perDay - 1);
  const targetRests  = requestedDays;

  const currentActs  = existingPlaces.filter((p) => p.categoria !== "restaurante").length;
  const currentRests = existingPlaces.filter((p) => p.categoria === "restaurante").length;

  const needActs  = Math.max(0, targetActs  - currentActs);
  const needRests = Math.max(0, targetRests - currentRests);

  if (needActs === 0 && needRests === 0) return [];

  const complement: EnrichedPlace[] = [];

  // ── 1. Lucky List Rio — highest editorial priority ────────────────────────
  // Step C: fetch 3× broader pool, build all candidates, score each by
  // (compositePreferenceScore + zoneProximityScore), sort desc, slice top N.
  // The score is a transient local value — never stored on EnrichedPlace.
  // zoneProximityScore is a SOFT signal: -2 penalty never hard-excludes anything.
  // A high-preference item in zone 5 or 6 can still win (no hard filtering).
  if (needActs > 0) {
    const { data: luckyRows } = await supa
      .from("lucky_list_rio")
      .select("id,nome,bairro,tipo,tags_ia,momento_ideal")
      .limit(Math.min(60, (needActs + 5) * 3));

    const luckyCandidates: EnrichedPlace[] = [];
    for (const row of (luckyRows ?? []) as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id || existingIds.has(id)) continue;

      const tipo = (row.tipo as string ?? "").toLowerCase();
      // Skip lucky items that are restaurants (handled separately)
      if (tipo.includes("restaurante") || tipo.includes("bar") || tipo.includes("café")) continue;

      const area = (row.bairro as string) || "Rio de Janeiro";
      const tags = (row.tags_ia as string[]) ?? [];
      const momento = (row.momento_ideal as string[]) ?? [];

      luckyCandidates.push({
        id,
        name:          (row.nome as string) || area,
        categoria:     "lucky",
        area,
        zone:          getZone(area),
        momento_ideal: Array.isArray(momento) ? momento : [],
        energia:       "medium",
        tags:          Array.isArray(tags) ? tags : [],
        vibe_tags:     [],
        duracao:       "1-2h",
      });
    }

    // Score all candidates, sort descending, take top needActs.
    // Soft ranking: nothing is removed — only ordered by relevance.
    const luckySelected = luckyCandidates
      .map((p) => ({
        p,
        score: compositePreferenceScore(p, preferences) + zoneProximityScore(p, savedZones),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, needActs)
      .map(({ p }) => p);

    for (const p of luckySelected) {
      complement.push(p);
      existingIds.add(p.id);
    }
  }

  // ── 2. O que fazer Rio — core anchors & broader activities ───────────────
  // Step C: same 3× pool pattern as the lucky block above.
  const stillNeedActs = Math.max(
    0, needActs - complement.filter((p) => p.categoria !== "restaurante").length,
  );
  if (stillNeedActs > 0) {
    const { data: oqRows } = await supa
      .from("o_que_fazer_rio")
      .select("id,nome,bairro,tags_ia,momento_ideal,vibe,energia,duracao_media")
      .limit(Math.min(75, (stillNeedActs + 8) * 3));

    const oqCandidates: EnrichedPlace[] = [];
    for (const row of (oqRows ?? []) as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id || existingIds.has(id)) continue;

      const area = (row.bairro as string) || "Rio de Janeiro";
      oqCandidates.push({
        id,
        name:          (row.nome as string) || area,
        categoria:     "oQueFazer",
        area,
        zone:          getZone(area),
        momento_ideal: (row.momento_ideal as string[]) ?? [],
        energia:       (row.energia       as string)   ?? "medium",
        tags:          (row.tags_ia       as string[]) ?? [],
        vibe_tags:     (row.vibe          as string[]) ?? [],
        duracao:       (row.duracao_media as string)   ?? "1-2h",
      });
    }

    const oqSelected = oqCandidates
      .map((p) => ({
        p,
        score: compositePreferenceScore(p, preferences) + zoneProximityScore(p, savedZones),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, stillNeedActs)
      .map(({ p }) => p);

    for (const p of oqSelected) {
      complement.push(p);
      existingIds.add(p.id);
    }
  }

  // ── 3. Restaurantes — 1 per day (for lunch/dinner anchors) ───────────────
  // Step C: 3× pool, preco_nivel added to SELECT (enables structured budgetScore
  // instead of text fallback), ordem_bairro removed (zone proximity replaces it).
  if (needRests > 0) {
    const { data: restRows } = await supa
      .from("restaurantes")
      .select("id,nome,bairro,especialidade,perfil_publico,preco_nivel")
      .eq("ativo", true)
      .limit(Math.min(35, (needRests + 3) * 3));

    const restCandidates: EnrichedPlace[] = [];
    for (const row of (restRows ?? []) as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id || existingIds.has(id)) continue;

      const area = (row.bairro as string) || "Rio de Janeiro";
      restCandidates.push({
        id,
        name:          (row.nome as string) || area,
        categoria:     "restaurante",
        area,
        zone:          getZone(area),
        momento_ideal: ["lunch"],
        energia:       "low",
        tags:          [],
        vibe_tags:     [],
        duracao:       "1-2h",
        especialidade:  row.especialidade  as string | undefined,
        perfil_publico: row.perfil_publico as string | undefined,
        preco_nivel:    row.preco_nivel    as number | undefined,
      });
    }

    const restSelected = restCandidates
      .map((p) => ({
        p,
        score: compositePreferenceScore(p, preferences) + zoneProximityScore(p, savedZones),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, needRests)
      .map(({ p }) => p);

    for (const p of restSelected) {
      complement.push(p);
      existingIds.add(p.id);
    }
  }

  return complement;
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
//
// Priority order:
//   1. categoria === "restaurante"         → almoco  (2nd+ per day → noite in step 5)
//   2. Beach context-aware (vibe + signals) — overrides DB for beaches
//   3. DB momento_ideal                    → primary signal for non-beach items
//   4. tags_ia contains bar/nightlife      → noite
//   5. energia === "high"                  → manha
//   6. duracao_media starts with "3h+"     → tarde
//   7. default                             → manha

const MOMENTO_TO_PERIODO: Record<string, PeriodoDia> = {
  morning:   "manha",
  lunch:     "almoco",
  afternoon: "tarde",
  sunset:    "tarde",
  evening:   "noite",
  night:     "noite",
};

// Whether a place's DB data allows it to move to a different period.
// Used by the morning load-balancer.
function isFlexible(p: EnrichedPlace): boolean {
  if (p.categoria === "restaurante") return false;
  const hasAfternoon = p.momento_ideal.some(
    (m) => m === "afternoon" || m === "sunset" || m === "evening",
  );
  if (!hasAfternoon && p.energia === "high") return false;
  return true;
}

function isBeachItem(p: EnrichedPlace): boolean {
  return p.tags.some((t) => t.includes("beach") || t.includes("praia") || t.includes("beach_life"));
}

// Beach classification is vibe-aware:
//   intenso + high energy → manha  (beat crowds, serious beach session)
//   DB has "sunset"       → tarde  (Ipanema sunset is the premium experience)
//   tranquilo             → tarde  (relaxed, unhurried afternoon arrival)
//   default               → tarde  (afternoon is the standard Rio beach time)
// Only intenso + high-energy overrides to morning.
function classifyBeachPeriodo(p: EnrichedPlace, vibe: string): PeriodoDia {
  if (vibe === "intenso" && p.energia === "high") return "manha";
  if (p.momento_ideal.includes("sunset"))          return "tarde"; // Ipanema sunset
  return "tarde";
}

function classifyPeriodo(p: EnrichedPlace, vibe: string): PeriodoDia {
  if (p.categoria === "restaurante") return "almoco";

  // Beach items: vibe + context-aware (overrides DB momento_ideal)
  if (isBeachItem(p)) return classifyBeachPeriodo(p, vibe);

  // DB momento_ideal — most reliable for non-beach items
  for (const m of p.momento_ideal) {
    const mapped = MOMENTO_TO_PERIODO[m.toLowerCase()];
    if (mapped && mapped !== "almoco") return mapped;
  }

  // Tag-based rules
  if (p.tags.some((t) => t.includes("bar") || t.includes("nightlife"))) return "noite";

  // Energia
  if (p.energia === "high") return "manha";

  // Long-duration experiences → tarde
  if (p.duracao.startsWith("3") || p.duracao.startsWith("4") || p.duracao.startsWith("5")) return "tarde";

  return "manha";
}

function classifyAllPeriodos(places: EnrichedPlace[], vibe: string): EnrichedPlace[] {
  return places.map((p) => ({ ...p, best_periodo: classifyPeriodo(p, vibe) }));
}

// ── Sub-zone definitions ───────────────────────────────────────────────────────
//
// Within Sul, three sub-zones have different compatibility with Centro:
//
//   sul_beach  (zone 1)  Ipanema, Leblon, Copacabana, Arpoador
//                        → Pure beach/lifestyle strip. Keep these in a beach-focused day.
//                        → Mixing with Centro requires a 25-30 min ride — acceptable only
//                          when trip length forces it.
//
//   sul_inland (zone 2)  Lagoa, Jardim Botânico, Gávea, Cosme Velho
//                        → Naturally bridges between beach strip and Centro.
//                        → Compatible with either sul_beach or centro.
//
//   sul_bridge (zone 3)  Botafogo, Flamengo, Urca, Laranjeiras
//                        → The geographic bridge between Sul and Centro.
//                        → High affinity with Centro — Flamengo → Glória → Centro is
//                          a natural corridor (10-15 min).
//
//   centro     (zone 4)  Centro, Santa Teresa, Lapa, Porto Maravilha
//   oeste      (zone 5)  Barra da Tijuca, Recreio, Guaratiba  — ISOLATED
//   norte      (zone 6)  Tijuca, Maracanã, São Cristóvão      — ISOLATED

type SubZone = "sul_beach" | "sul_inland" | "sul_bridge" | "centro" | "oeste" | "norte";
type MacroRegion = "sul" | "centro" | "oeste" | "norte";

const ZONE_TO_SUBZONE: Record<number, SubZone> = {
  1: "sul_beach",
  2: "sul_inland",
  3: "sul_bridge",
  4: "centro",
  5: "oeste",
  6: "norte",
};

const ZONE_TO_MACRO: Record<number, MacroRegion> = {
  1: "sul", 2: "sul", 3: "sul",
  4: "centro",
  5: "oeste",
  6: "norte",
};

function getSubZone(zone: number): SubZone  { return ZONE_TO_SUBZONE[zone] ?? "sul_bridge"; }
function getMacro(zone: number): MacroRegion { return ZONE_TO_MACRO[zone]   ?? "sul"; }

// ── Travel penalty matrix ──────────────────────────────────────────────────────
// Realistic Uber travel times (minutes) between zone pairs in Rio.
// Simple zone-distance is misleading: zone 4→5 (Centro→Barra) = 40min,
// not 10min as linear math would suggest.
//
// Used as a scoring layer for:
//   • Restaurant-to-day matching (prefer restaurants reachable without leaving the cluster)
//   • Within-day item sequencing (sort items to minimize total travel)

const TRAVEL_MINUTES: Record<string, number> = {
  "1,1":  0,  "2,2":  0,  "3,3":  0,  "4,4":  0,  "5,5":  0,  "6,6":  0,
  "1,2": 10,  "2,1": 10,  // Ipanema ↔ Lagoa/Jardim Botânico
  "1,3": 12,  "3,1": 12,  // Ipanema ↔ Botafogo/Flamengo
  "2,3":  8,  "3,2":  8,  // Lagoa ↔ Botafogo
  "3,4": 12,  "4,3": 12,  // Botafogo/Flamengo ↔ Centro (via Aterro)
  "2,4": 20,  "4,2": 20,  // Jardim Botânico ↔ Centro (longer route)
  "1,4": 28,  "4,1": 28,  // Ipanema ↔ Centro (the longest Sul→Centro leg)
  "4,6": 20,  "6,4": 20,  // Centro ↔ Tijuca/Norte
  "3,6": 22,  "6,3": 22,  // Botafogo ↔ Tijuca
  "1,5": 45,  "5,1": 45,  // Ipanema ↔ Barra (the famous long ride)
  "3,5": 40,  "5,3": 40,  // Botafogo ↔ Barra
  "4,5": 38,  "5,4": 38,  // Centro ↔ Barra
  "5,6": 55,  "6,5": 55,  // Barra ↔ Norte (cross-city)
  "1,6": 35,  "6,1": 35,  // Ipanema ↔ Norte
  "2,5": 42,  "5,2": 42,
  "2,6": 30,  "6,2": 30,
};

function travelMinutes(zA: number, zB: number): number {
  const key = `${zA},${zB}`;
  return TRAVEL_MINUTES[key] ?? Math.abs(zA - zB) * 15;
}

// Sub-zone affinity for same-day pairing.
// Returns a score where lower = more compatible.
// Uses travel time as the base, with an extra penalty when mixing
// sul_beach with centro (these are distant enough to feel like separate city areas).
function subZoneCompatibilityPenalty(szA: SubZone, szB: SubZone): number {
  if (szA === szB) return 0;
  // Beach strip ↔ Centro: acceptable but not ideal (25-30min ride)
  if ((szA === "sul_beach" && szB === "centro") ||
      (szA === "centro" && szB === "sul_beach")) return 20;
  // Beach strip ↔ inland: natural (Lagoa is walkable from Ipanema)
  if ((szA === "sul_beach" && szB === "sul_inland") ||
      (szA === "sul_inland" && szB === "sul_beach")) return 5;
  // Inland ↔ bridge: adjacent
  if ((szA === "sul_inland" && szB === "sul_bridge") ||
      (szA === "sul_bridge" && szB === "sul_inland")) return 5;
  // Bridge ↔ Centro: the natural corridor
  if ((szA === "sul_bridge" && szB === "centro") ||
      (szA === "centro" && szB === "sul_bridge")) return 8;
  // Beach ↔ bridge: fine (Copacabana → Botafogo is short)
  if ((szA === "sul_beach" && szB === "sul_bridge") ||
      (szA === "sul_bridge" && szB === "sul_beach")) return 8;
  // Isolated regions: massive penalty
  if (szA === "oeste" || szB === "oeste" || szA === "norte" || szB === "norte") return 100;
  return 10;
}

// Sort a day's items to minimize total travel within the day.
// Uses a greedy nearest-neighbor approach.
//
// Step A: accepts an optional `periodo` parameter. When `periodo === "tarde"`,
// any items tagged with "sunset" in momento_ideal are moved to the end of the
// result after proximity sorting. Sunset is a time-anchored event (~17:30-18:30)
// and must always be the final item in the afternoon regardless of geography.
// The `periodo` param has no effect for any other period value.
function sortByProximity(items: EnrichedPlace[], periodo?: PeriodoDia): EnrichedPlace[] {
  if (items.length <= 2) {
    // Even with 1-2 items, still apply the sunset-last rule for tarde.
    if (periodo === "tarde" && items.length === 2) {
      const hasSunset0 = items[0].momento_ideal.includes("sunset");
      const hasSunset1 = items[1].momento_ideal.includes("sunset");
      if (hasSunset0 && !hasSunset1) return [items[1], items[0]];
    }
    return items;
  }
  const result: EnrichedPlace[] = [items[0]];
  const remaining = items.slice(1);
  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((item, i) => {
      const dist = travelMinutes(last.zone, item.zone) + subZoneCompatibilityPenalty(getSubZone(last.zone), getSubZone(item.zone));
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    result.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  // Sunset-last rule (Step A): applies only to tarde period.
  // All non-sunset items come first in proximity order; sunset items are
  // appended at the end. This preserves the greedy ordering for all other items.
  if (periodo === "tarde") {
    const sunsetItems = result.filter((p) => p.momento_ideal.includes("sunset"));
    const otherItems  = result.filter((p) => !p.momento_ideal.includes("sunset"));
    return [...otherItems, ...sunsetItems];
  }

  return result;
}

// Chunk a sorted array into `n` groups (sequential slices)
function chunkInto(items: EnrichedPlace[], n: number): EnrichedPlace[][] {
  if (n <= 0 || items.length === 0) return [];
  const size = Math.ceil(items.length / n);
  return Array.from({ length: n }, (_, i) => items.slice(i * size, (i + 1) * size)).filter(
    (g) => g.length > 0,
  );
}

// Sort a bucket by zone (primary), then by preference score descending within
// the same zone (Step B), then by area name alphabetically as a final
// deterministic tiebreaker for equal scores.
// prefScore is stamped by scoreAndSortPool before groupByGeography runs.
// Falls back to alphabetical when prefScore is absent (0 via ?? 0).
function sortBucket(items: EnrichedPlace[]): EnrichedPlace[] {
  return [...items].sort((a, b) => {
    if (a.zone !== b.zone) return a.zone - b.zone;
    const scoreDiff = (b.prefScore ?? 0) - (a.prefScore ?? 0);
    return scoreDiff !== 0 ? scoreDiff : a.area.localeCompare(b.area);
  });
}

function groupByGeography(
  places:     EnrichedPlace[],
  tripLength: number,
  vibe:       string,
): { dayGroups: EnrichedPlace[][]; dayRestaurants: EnrichedPlace[][] } {
  const activities  = places.filter((p) => p.categoria !== "restaurante");
  const restaurants = places.filter((p) => p.categoria === "restaurante");

  // ── 4a. Separate into sub-zone buckets ───────────────────────────────────
  const bySubZone: Record<SubZone, EnrichedPlace[]> = {
    sul_beach: [], sul_inland: [], sul_bridge: [], centro: [], oeste: [], norte: [],
  };
  for (const act of activities) bySubZone[getSubZone(act.zone)].push(act);

  // ── 4b. Pool definitions ──────────────────────────────────────────────────
  // "Central" pool = sul (all sub-zones) + centro — these can share days.
  // "Oeste" and "Norte" are isolated — each gets exclusive day(s).
  //
  // Within the central pool, sub-zone ordering matters:
  //   sul_beach → sul_inland → sul_bridge → centro
  // When centralDays ≥ 2, this natural sort creates a "beach day" (zones 1-2)
  // and a "bridge+centro day" (zones 3-4) without any extra logic.
  const centralItems = sortBucket([
    ...bySubZone.sul_beach,
    ...bySubZone.sul_inland,
    ...bySubZone.sul_bridge,
    ...bySubZone.centro,
  ]);
  const oesteItems = sortBucket(bySubZone.oeste);
  const norteItems = sortBucket(bySubZone.norte);

  const totalActs = activities.length;
  if (totalActs === 0) {
    const dayGroups: EnrichedPlace[][] = Array.from({ length: tripLength }, () => []);
    const dayRestaurants: EnrichedPlace[][] = Array.from({ length: tripLength }, () => []);
    restaurants.forEach((r, i) => dayRestaurants[i % tripLength].push(r));
    return { dayGroups, dayRestaurants };
  }

  // ── 4c. Proportional day allocation per pool ──────────────────────────────
  let centralDays = centralItems.length > 0 ? Math.max(1, Math.round((centralItems.length / totalActs) * tripLength)) : 0;
  let oesteDays   = oesteItems.length   > 0 ? Math.max(1, Math.round((oesteItems.length   / totalActs) * tripLength)) : 0;
  let norteDays   = norteItems.length   > 0 ? Math.max(1, Math.round((norteItems.length   / totalActs) * tripLength)) : 0;

  // Fix sum to tripLength by adjusting the central pool (most flexible)
  const delta = tripLength - (centralDays + oesteDays + norteDays);
  centralDays = Math.max(centralItems.length > 0 ? 1 : 0, centralDays + delta);

  // ── 4d. Build day groups ──────────────────────────────────────────────────
  // Sequential chunking: because centralItems is already sorted beach→centro,
  // a 2-day central split naturally produces Day A (beach) and Day B (centro).
  const dayGroups: EnrichedPlace[][] = [
    ...chunkInto(centralItems, centralDays),
    ...chunkInto(oesteItems,   oesteDays),
    ...chunkInto(norteItems,   norteDays),
  ];
  while (dayGroups.length < tripLength) dayGroups.push([]);

  // ── 4e. Restaurant matching using sub-zone affinity + travel penalty ──────
  // For each restaurant, score every day by:
  //   1. Sub-zone compatibility (primary) — keeps sul_beach restaurants with beach days
  //   2. Travel time from restaurant to day's median zone (secondary)
  //   3. Load balancing (tertiary)

  function dayMedianZone(acts: EnrichedPlace[]): number {
    if (acts.length === 0) return 3;
    const sorted = [...acts].map((a) => a.zone).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  function dayDominantSubZone(acts: EnrichedPlace[]): SubZone {
    if (acts.length === 0) return "sul_bridge";
    const counts: Partial<Record<SubZone, number>> = {};
    for (const a of acts) counts[getSubZone(a.zone)] = (counts[getSubZone(a.zone)] ?? 0) + 1;
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0]) as SubZone;
  }

  const dayRestaurants: EnrichedPlace[][] = Array.from({ length: dayGroups.length }, () => []);
  for (const rest of restaurants) {
    const restSZ  = getSubZone(rest.zone);
    let bestDay   = 0;
    let bestScore = Infinity;

    dayGroups.forEach((acts, di) => {
      const daySZ   = dayDominantSubZone(acts);
      const dayZone = dayMedianZone(acts);

      // Sub-zone compatibility (main signal)
      const szPenalty = subZoneCompatibilityPenalty(restSZ, daySZ);
      // Travel penalty from restaurant to day center
      const travel    = travelMinutes(rest.zone, dayZone);
      // Load balancing
      const load      = dayRestaurants[di].length * 5;

      const score = szPenalty + travel * 0.5 + load;
      if (score < bestScore) { bestScore = score; bestDay = di; }
    });

    dayRestaurants[bestDay].push(rest);
  }

  return { dayGroups, dayRestaurants };
}

// ── STEP 3b: Preference-based scoring + pool re-ranking ──────────────────────
//
// inspirations, budget, and travelVibe arrive from the frontend but were
// previously ignored after Step 3.  This pass re-weights the enriched pool
// (saved + complementary) BEFORE geographic clustering (Step 4) so that
// preference-relevant places tend to anchor the early, denser days.
//
// Design: soft scoring only — never hard-excludes — to avoid empty days.
// Saved items always outrank complementary items within the same score tier.

const INSPIRATION_TAGS: Record<string, string[]> = {
  gastronomy: ["gastronomia", "restaurante", "food", "culinary", "comida", "fine_dining"],
  culture:    ["cultura", "arte", "museu", "history", "teatro", "galeria", "historical"],
  beach:      ["praia", "beach", "surf", "beach_life", "orla", "mar"],
  adventure:  ["aventura", "trilha", "esporte", "outdoor", "natureza", "escalada"],
  lucky:      ["lucky", "insider", "exclusivo", "secreto", "curadoria"],
  natureza:   ["natureza", "parque", "floresta", "jardim", "vista", "ecológico"],
  festa:      ["balada", "bar", "nightlife", "samba", "forró", "festa", "carnaval"],
};

function inspirationScore(p: EnrichedPlace, inspirations: string[]): number {
  if (inspirations.length === 0) return 0;
  const haystack = [...p.tags, ...p.vibe_tags, p.categoria].map((t) => t.toLowerCase());
  let total = 0;
  for (const ins of inspirations) {
    const kws  = INSPIRATION_TAGS[ins] ?? [];
    const hits = kws.filter((kw) => haystack.some((h) => h.includes(kw)));
    total += hits.length * 2;
    if (ins === "gastronomy" && p.categoria === "restaurante") total += 3;
    if (ins === "beach"     && p.tags.some((t) => t.includes("beach") || t.includes("praia"))) total += 3;
    if (ins === "lucky"     && p.categoria === "lucky") total += 4;
  }
  return total;
}

const BUDGET_SIGNALS_SOFISTICADO = ["fine dining", "exclusivo", "premium", "luxo", "alta", "especial"];
const BUDGET_SIGNALS_ESSENCIAL   = ["popular", "barato", "rústico", "simples", "acessível", "boteco"];

function budgetScore(p: EnrichedPlace, budget: string | null): number {
  if (!budget) return 0;

  // preco_nivel from DB takes priority when available (1=muito barato, 5=muito caro)
  const nivel = p.preco_nivel ?? null;
  if (nivel !== null) {
    if (budget === "sofisticado") return nivel >= 4 ? 3 : (nivel <= 2 ? -2 : 0);
    if (budget === "essencial")   return nivel <= 2 ? 3 : (nivel >= 4 ? -2 : 0);
    return 0; // "conforto" = neutral
  }

  // Fallback: text-signal matching when preco_nivel not available
  const text = [
    p.especialidade ?? "",
    p.perfil_publico ?? "",
    ...p.tags,
    ...p.vibe_tags,
  ].join(" ").toLowerCase();

  if (budget === "sofisticado") {
    const match    = BUDGET_SIGNALS_SOFISTICADO.some((s) => text.includes(s));
    const mismatch = BUDGET_SIGNALS_ESSENCIAL.some((s) => text.includes(s));
    return match ? 3 : (mismatch ? -2 : 0);
  }
  if (budget === "essencial") {
    const match    = BUDGET_SIGNALS_ESSENCIAL.some((s) => text.includes(s));
    const mismatch = BUDGET_SIGNALS_SOFISTICADO.some((s) => text.includes(s));
    return match ? 3 : (mismatch ? -2 : 0);
  }
  return 0; // "conforto" = neutral
}

const TRAVEL_VIBE_SIGNALS: Record<string, string[]> = {
  solo:     ["solo", "individual", "introspec", "single", "sozinha", "sozinho"],
  casal:    ["casal", "couple", "romantic", "romântico", "intimidade", "namorado"],
  amigos:   ["grupo", "amigos", "friends", "animado", "turma"],
  família:  ["família", "family", "crianças", "kids", "infantil", "filhos"],
};

function travelVibeScore(p: EnrichedPlace, travelVibe: string | null): number {
  if (!travelVibe) return 0;
  const signals = TRAVEL_VIBE_SIGNALS[travelVibe] ?? [];
  if (signals.length === 0) return 0;

  // Check structured perfil_ideal array from DB first (higher confidence)
  if (p.perfil_ideal && p.perfil_ideal.length > 0) {
    const perfilText = p.perfil_ideal.join(" ").toLowerCase();
    if (signals.some((s) => perfilText.includes(s))) return 3;
  }

  // Fallback: perfil_publico text field
  const text = (p.perfil_publico ?? "").toLowerCase();
  return signals.some((s) => text.includes(s)) ? 2 : 0;
}

function compositePreferenceScore(p: EnrichedPlace, prefs: Preferences): number {
  return (
    inspirationScore(p, prefs.inspirations ?? []) +
    budgetScore(p, prefs.budget ?? null) +
    travelVibeScore(p, prefs.travelVibe ?? null)
  );
}

// Zone proximity bonus/penalty for complement candidate selection (Step C).
// This is a SOFT signal only — it never hard-excludes any candidate.
// A -2 zone penalty is outweighed by +6 preference match on a relevant item.
//
// +3: item is in the same zone as at least one saved place
// +1: item is in a zone adjacent (±1) to any saved-place zone
//  0: neutral — Sul/Centro item, no saved-place zone nearby
// -2: item is in Oeste (5) or Norte (6) and the user has NO saved places there
//     This gently discourages unsolicited Barra/Tijuca days on short trips.
//     Max combined score with -2 zone = compositePreferenceScore (can still win).
//
// Uses item.zone (already on EnrichedPlace). No new fields, no DB calls.
function zoneProximityScore(item: EnrichedPlace, savedZones: Set<number>): number {
  if (savedZones.has(item.zone)) return 3;
  for (const sz of savedZones) {
    if (Math.abs(item.zone - sz) === 1) return 1;
  }
  if ((item.zone === 5 || item.zone === 6) && !savedZones.has(item.zone)) return -2;
  return 0;
}

// Re-rank: saved items before complementary; within each tier, sort by composite score.
// Step B: stamps prefScore onto each place before sorting so that downstream
// steps (Step 4 sortBucket) can use it without receiving preferences as a parameter.
// Score is computed once per place — O(n) — instead of twice per comparison — O(n log n).
// prefScore is internal only: it is never written to the output ItemRoteiro or DiaRoteiro.
function scoreAndSortPool(
  places:      EnrichedPlace[],
  prefs:       Preferences,
  savedIds:    Set<string>,
): EnrichedPlace[] {
  // Step B: stamp prefScore onto each place so downstream steps (Step 4 sortBucket)
  // can use it without re-computing or receiving preferences as a parameter.
  // Score is computed once here; all subsequent reads are O(1) field access.
  const stamped = places.map((p) => ({
    ...p,
    prefScore: compositePreferenceScore(p, prefs),
  }));

  const saved  = stamped.filter((p) =>  savedIds.has(p.id));
  const padded = stamped.filter((p) => !savedIds.has(p.id));
  const byScore = (a: EnrichedPlace, b: EnrichedPlace) =>
    (b.prefScore ?? 0) - (a.prefScore ?? 0);
  return [...saved.sort(byScore), ...padded.sort(byScore)];
}

// ── STEP 5: Build fully populated DiaRoteiro[] ────────────────────────────────
//
// For each day group:
//   5a. Period assignment from Step 3 classification
//   5b. Morning load balancing (cap manha items; overflow flexible ones to tarde)
//   5c. Restaurants: 1st → almoco, 2nd+ → noite
//   5d. Within-period proximity sequencing (greedy nearest-neighbor)
//   5e. Day label = modal neighborhood

const PERIODO_ORDER: PeriodoDia[] = ["manha", "almoco", "tarde", "noite"];

const MANHA_CAP:  Record<string, number> = { tranquilo: 2, moderado: 2, intenso: 3 };

// ── Step A slot caps ──────────────────────────────────────────────────────────
// tarde and noite caps enforce a realistic daily rhythm.
//
// NOTE (Step A): Items that exceed these caps are DROPPED from the day rather
// than redistributed to other days. This is intentional and temporary behaviour
// for Step A only. A future step (complement scoring + geographic clustering)
// will ensure the pool never generates this many same-day same-zone items in the
// first place, making overflow redistribution unnecessary. Do NOT add
// cross-day redistribution logic here.
const TARDE_CAP:  Record<string, number> = { tranquilo: 2, moderado: 3, intenso: 4 };
const NOITE_CAP:  Record<string, number> = { tranquilo: 1, moderado: 2, intenso: 2 };

function categoriaToTable(cat: SavedCategory): string {
  switch (cat) {
    case "restaurante": return "restaurantes";
    case "hotel":       return "stay_hotels";
    case "oQueFazer":   return "o_que_fazer_rio";
    case "lucky":       return "lucky_list_rio";
  }
}

function buildFullDraft(
  dayGroups:      EnrichedPlace[][],
  dayRestaurants: EnrichedPlace[][],
  vibe:           string,
): DiaRoteiro[] {
  const manhaCap = MANHA_CAP[vibe] ?? 2;
  const days: DiaRoteiro[] = [];

  dayGroups.forEach((acts, di) => {
    const rests = dayRestaurants[di] ?? [];
    if (acts.length === 0 && rests.length === 0) return;

    // ── 5a. Initial period assignment ─────────────────────────────────────────
    const periodMap = new Map<PeriodoDia, EnrichedPlace[]>();
    for (const act of acts) {
      const p = act.best_periodo ?? "manha";
      if (!periodMap.has(p)) periodMap.set(p, []);
      periodMap.get(p)!.push(act);
    }

    // ── 5b. Morning load balancing ────────────────────────────────────────────
    const manha = periodMap.get("manha") ?? [];
    if (manha.length > manhaCap) {
      const locked   = manha.filter((p) => !isFlexible(p));
      const flexible = manha.filter((p) =>  isFlexible(p));

      const inManha: EnrichedPlace[] = locked.slice(0, manhaCap);
      const slots = manhaCap - inManha.length;
      inManha.push(...flexible.slice(0, slots));

      const finalOverflow = [
        ...locked.slice(manhaCap),
        ...flexible.slice(slots),
      ];
      periodMap.set("manha", inManha);
      if (finalOverflow.length > 0) {
        if (!periodMap.has("tarde")) periodMap.set("tarde", []);
        periodMap.get("tarde")!.unshift(...finalOverflow);
      }
    }

    // ── 5c. Restaurants ───────────────────────────────────────────────────────
    rests.forEach((r, i) => {
      const p: PeriodoDia = i === 0 ? "almoco" : "noite";
      if (!periodMap.has(p)) periodMap.set(p, []);
      periodMap.get(p)!.push(r);
    });

    // ── 5c-cap. Enforce tarde and noite slot caps (Step A) ────────────────────
    // Items exceeding the cap are dropped from this day and not redistributed.
    //
    // NOTE (Step A — temporary behaviour): Overflow items are discarded here
    // rather than moved to another day. This is intentional for Step A only.
    // A future step will filter the complement pool by preference score and
    // geographic proximity before assignment, so same-day overflow will not
    // occur in the first place. Do NOT introduce cross-day redistribution
    // logic in this block — that belongs to the complement-scoring step.
    const tardeCap = TARDE_CAP[vibe] ?? 3;
    const noiteCap = NOITE_CAP[vibe] ?? 2;
    const tardeItems = periodMap.get("tarde");
    if (tardeItems && tardeItems.length > tardeCap) {
      periodMap.set("tarde", tardeItems.slice(0, tardeCap));
    }
    const noiteItems = periodMap.get("noite");
    if (noiteItems && noiteItems.length > noiteCap) {
      periodMap.set("noite", noiteItems.slice(0, noiteCap));
    }

    // ── 5d. Within-period proximity sequencing ────────────────────────────────
    // Sort items inside each period by travel proximity (greedy nearest-neighbor).
    // This ensures the itinerary flows geographically within the day:
    //   e.g. morning: Parque Lage → Cosme Velho (Cristo) → Jardim Botânico
    //   not: Cristo → Jardim Botânico → Cristo area again
    for (const [periodo, items] of periodMap.entries()) {
      periodMap.set(periodo, sortByProximity(items, periodo));
    }

    // ── 5e. Build ordered periodos ────────────────────────────────────────────
    const periodos: DiaPeriodo[] = PERIODO_ORDER
      .filter((p) => (periodMap.get(p) ?? []).length > 0)
      .map((p) => ({
        periodo: p,
        items:   periodMap.get(p)!.map((a) => ({
          id:           a.id,
          titulo:       a.name,
          categoria:    a.categoria,
          localizacao:  a.area,
          source_table: categoriaToTable(a.categoria),
        })),
      }));

    if (periodos.length === 0) return;

    // ── 5f. Day label = modal neighborhood ────────────────────────────────────
    const allItems    = [...acts, ...rests];
    const bairroCount = new Map<string, number>();
    for (const item of allItems) bairroCount.set(item.area, (bairroCount.get(item.area) ?? 0) + 1);
    const bairro = [...bairroCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Rio de Janeiro";

    days.push({ numero: di + 1, bairro, periodos });
  });

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
Pace: ${prefs.vibe ?? "moderado"} | Companion: ${prefs.travelVibe ?? "any"} | Budget: ${prefs.budget ?? "conforto"} | Inspirations: ${prefs.inspirations.join(", ") || "any"}
Destination: ${dest}

DRAFT TO REFINE:
${JSON.stringify(compact)}

Return ONLY a valid JSON array with the same structure — no markdown, no explanation.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
// 7a. Re-attaches any places dropped during Gemini refinement.
// 7b. Enforces temporal sanity rules — silently corrects absurd assignments
//     that Gemini may have introduced during reordering:
//       • sunset items → only tarde
//       • pure nightlife items → not manha/almoco
//       • restaurantes → not manha

function validateAndFix(
  days:      DiaRoteiro[],
  allPlaces: EnrichedPlace[],
): DiaRoteiro[] {
  // 7a. Re-attach any items dropped during Gemini refinement ─────────────────
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
      source_table: categoriaToTable(l.categoria),
    }));
    if (tarde) {
      tarde.items.push(...lostItems);
    } else {
      lastDay.periodos.push({ periodo: "tarde", items: lostItems });
    }
  }

  // 7b. Temporal sanity pass — fix any invalid period assignments ─────────────
  const placeById = new Map<string, EnrichedPlace>(allPlaces.map((p) => [p.id, p]));

  for (const day of days) {
    const evictions: Array<{ item: ItemRoteiro; to: PeriodoDia }> = [];

    for (const periodoBlock of day.periodos) {
      const keep: ItemRoteiro[] = [];

      for (const item of periodoBlock.items) {
        const place = placeById.get(item.id);
        if (!place) { keep.push(item); continue; }

        const momento = place.momento_ideal.map((m) => m.toLowerCase());
        const tags    = place.tags.map((t) => t.toLowerCase());

        // Rule 1: sunset → only tarde (pôr do sol nunca às 14h)
        if (momento.includes("sunset") && periodoBlock.periodo !== "tarde") {
          evictions.push({ item, to: "tarde" }); continue;
        }

        // Rule 2: restaurant → not manha
        if (item.categoria === "restaurante" && periodoBlock.periodo === "manha") {
          evictions.push({ item, to: "almoco" }); continue;
        }

        // Rule 3: pure nightlife (ONLY night/evening momento + nightlife tag) → not manha/almoco
        const onlyNight = momento.length > 0 &&
          momento.every((m) => ["night", "evening"].includes(m));
        const isNightlife = tags.some((t) =>
          ["balada", "nightlife", "clubbing"].some((k) => t.includes(k)));
        if (onlyNight && isNightlife &&
          (periodoBlock.periodo === "manha" || periodoBlock.periodo === "almoco")) {
          evictions.push({ item, to: "noite" }); continue;
        }

        // Rule 4 (Step A.5): performance venue → not manha/almoco
        //
        // Performance venues (opera houses, concert halls, theaters) are visitable
        // in the morning for architectural tours, so their DB momento_ideal correctly
        // includes "morning". But their primary experience — the show itself — is
        // always evening. The first-match classifyPeriodo logic picks "morning" when
        // it appears first in the array, producing an impossible 09:00 show suggestion.
        //
        // Detection: tags_ia intersects with performance-context keywords.
        // Action: evict to noite regardless of what classifyPeriodo assigned.
        //
        // This rule uses NO external data sources — Supabase tags_ia only.
        // Do NOT expand this to cover opening hours or live schedules (future layer).
        const PERFORMANCE_TAGS = [
          "opera", "ballet", "show", "concerto", "espetáculo", "espetaculo", "performance",
        ];
        const isPerformanceVenue = tags.some((t) =>
          PERFORMANCE_TAGS.some((k) => t.includes(k)));
        if (isPerformanceVenue &&
            (periodoBlock.periodo === "manha" || periodoBlock.periodo === "almoco")) {
          evictions.push({ item, to: "noite" }); continue;
        }

        keep.push(item);
      }
      periodoBlock.items = keep;
    }

    // Re-insert evicted items into their correct target periods
    for (const { item, to } of evictions) {
      let target = day.periodos.find((p) => p.periodo === to);
      if (!target) {
        target = { periodo: to, items: [] };
        day.periodos.push(target);
      }
      target.items.push(item);
    }

    // Re-sort periods into canonical order after any modifications
    day.periodos = (PERIODO_ORDER
      .map((po) => day.periodos.find((p) => p.periodo === po))
      .filter(Boolean)) as DiaPeriodo[];
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
      arrivalDate,
      departureDate,
    } = body;

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const dest       = destination || "Rio de Janeiro";
    const vibe       = preferences.vibe       ?? "moderado";
    const travelVibe = preferences.travelVibe ?? null;
    const budget     = preferences.budget     ?? null;

    // Compute requested days: priority order —
    //   1. Explicit requestedDays from frontend (derived from arrival/departure dates)
    //   2. Derived from arrivalDate + departureDate strings if provided
    //   3. Fall through to computeTripLength item-based estimate
    let resolvedDays: number | undefined = requestedDays;
    if (!resolvedDays && arrivalDate && departureDate) {
      const ms = new Date(departureDate).getTime() - new Date(arrivalDate).getTime();
      const diff = Math.round(ms / 86_400_000); // ms → days
      if (diff >= 1) resolvedDays = diff;
    }

    // ── Step 1+2: Normalize saved items from all sources ────────────────────────
    let savedPlaces = await enrichPlaces(savedItems, supa);

    // ── Trip length is locked early — determines how much complement we need ──
    const tripLength = computeTripLength(savedPlaces.length, vibe, resolvedDays);

    // Only block if there's nothing to work with AND no trip dates were given
    if (savedPlaces.length === 0 && tripLength === 0) {
      return new Response(
        JSON.stringify({ error: "No actionable saved places and no trip dates provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // ── Fetch complementary content from lucky_list_rio, o_que_fazer_rio, restaurantes
    // Priority: saved items first, then lucky list, then o_que_fazer, then restaurants.
    // This pads out weak itineraries caused by too few saved items for the trip length.
    const complementaryPlaces = await fetchComplementaryContent(
      savedPlaces, tripLength, vibe, supa, preferences,
    );

    // Merge: saved items always come first (preserved position in clustering)
    let places = [...savedPlaces, ...complementaryPlaces];

    // Attach neighborhood metadata to the full pool (saved + complementary)
    places = await attachNeighborhoodMeta(places, supa);

    // ── Step 3: Classify each place by best time-of-day ───────────────────────
    places = classifyAllPeriodos(places, vibe);

    // ── Step 3b: Score + re-rank pool by user preferences ────────────────────
    // inspirations, budget, travelVibe were received but previously ignored.
    // Soft scoring only — never removes places. Saved items always rank first.
    const savedIds = new Set(savedPlaces.map((p) => p.id));
    places = scoreAndSortPool(places, preferences, savedIds);

    // ── Step 4: Macro-region clustering (oeste + norte isolated from centro + sul)
    const { dayGroups, dayRestaurants } = groupByGeography(places, tripLength, vibe);

    // ── Step 5: Build fully populated DiaRoteiro[] with morning load balancing
    let days = buildFullDraft(dayGroups, dayRestaurants, vibe);

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
