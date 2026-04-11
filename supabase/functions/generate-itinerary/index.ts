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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SavedCategory = "oQueFazer" | "restaurante" | "hotel" | "lucky";
type PeriodoDia = "manha" | "almoco" | "tarde" | "noite";

interface SavedItemInput {
  id: string;
  titulo: string;
  categoria: SavedCategory;
  localizacao?: string;
}

interface Preferences {
  inspirations: string[];
  vibe: string | null; // pace: tranquilo / moderado / intenso
  travelVibe?: string | null; // companion: solo / casal / amigos / família
  budget?: string | null; // essencial / conforto / sofisticado
}

interface RequestBody {
  savedItems: SavedItemInput[];
  destination?: string;
  preferences?: Preferences;
  requestedDays?: number;
  arrivalDate?: string; // ISO date string "YYYY-MM-DD"
  departureDate?: string; // ISO date string "YYYY-MM-DD"
}

/** Fully enriched place — unified source of truth for all 5 deterministic steps */
interface EnrichedPlace {
  // ── Identity
  id: string;
  name: string;
  categoria: SavedCategory;
  // ── Location
  area: string; // bairro name
  zone: number; // 1-6, South → North
  // ── Time metadata (from DB)
  momento_ideal: string[]; // ["morning","afternoon","sunset"]
  energia: string; // "low" | "medium" | "high"
  // ── Content metadata (from DB)
  tags: string[]; // tags_ia from o_que_fazer_rio
  vibe_tags: string[]; // vibe from o_que_fazer_rio
  duracao: string; // "1-2h" | "2-4h" etc.
  especialidade?: string; // restaurant specialty
  perfil_publico?: string; // restaurant audience
  preco_nivel?: number; // 1-5 price level (from DB)
  perfil_ideal?: string[]; // target audience tags (from DB)
  // ── Output enrichment fields (Step F — additive only, never affect engine logic)
  photo_url?: string | null; // Supabase photo_url — passed through to ItemRoteiro.image
  meu_olhar?: string | null; // Lucky Trip editorial note — passed through to ItemRoteiro.descricao
  // ── Computed in Step 3
  best_periodo?: PeriodoDia;
  // ── Neighborhood metadata (attached in Step 2)
  neighborhood?: {
    walkable: string;
    better_for: string;
    best_for_1: string;
    safety_solo_woman: string;
  };
  // ── Computed in Step 3b, consumed by Step 4 only (internal, never serialized)
  // Stamped by scoreAndSortPool; read by sortBucket for intra-zone ordering.
  // Optional: absent on synthetic places created after scoring runs.
  prefScore?: number;
}

/** Output types — must stay compatible with the existing DiaRoteiro UI shape */
interface ItemRoteiro {
  id: string;
  titulo: string;
  categoria: SavedCategory;
  localizacao: string;
  source_table: string;
  image?: unknown;
  // Step F — additive enrichment fields (optional, backward compatible)
  photo_url?: string | null; // Supabase photo_url; null if not available
  descricao?: string | null; // meu_olhar editorial note; null if not available
  duracao?: string; // average visit duration e.g. "1-2h"
}

interface DiaPeriodo {
  periodo: PeriodoDia;
  items: ItemRoteiro[];
}

interface DiaRoteiro {
  numero: number;
  bairro: string;
  periodos: DiaPeriodo[];
}

interface ItineraryResult {
  destination: string;
  source: string;
  preferences: Preferences;
  summary: { totalDays: number; totalItems: number };
  days: DiaRoteiro[];
}

// ── Geographic zone map ───────────────────────────────────────────────────────
// 6 zones ordered South → North. Adjacent zones = walkable in the same day.

const ZONE_MAP: Record<string, number> = {
  // Zone 1 — Zona Sul beach strip
  Ipanema: 1,
  Leblon: 1,
  Copacabana: 1,
  Arpoador: 1,
  Leme: 1,
  // Zone 2 — Zona Sul inland
  Lagoa: 2,
  "Jardim Botânico": 2,
  Gávea: 2,
  "Cosme Velho": 2,
  Humaitá: 2,
  "Alto da Boa Vista": 2,
  // Zone 3 — Botafogo / Flamengo / Urca
  Botafogo: 3,
  Urca: 3,
  Flamengo: 3,
  Catete: 3,
  Laranjeiras: 3,
  Glória: 3,
  // Zone 4 — Centro / Santa Teresa / Lapa
  Centro: 4,
  "Santa Teresa": 4,
  Lapa: 4,
  "Porto Maravilha": 4,
  Saúde: 4,
  Gamboa: 4,
  "Santo Cristo": 4,
  // Zone 5 — Zona Oeste
  "Barra da Tijuca": 5,
  Recreio: 5,
  Prainha: 5,
  Grumari: 5,
  Joá: 5,
  Guaratiba: 5,
  // Zone 6 — Zona Norte
  Tijuca: 6,
  Maracanã: 6,
  "São Cristóvão": 6,
  Penha: 6,
  Méier: 6,
  Madureira: 6,
  Ramos: 6,
};

function getZone(bairro?: string): number {
  if (!bairro) return 3;
  for (const [key, zone] of Object.entries(ZONE_MAP)) {
    if (bairro.toLowerCase().includes(key.toLowerCase())) return zone;
  }
  return 3;
}

// ── Vibe → items per day ──────────────────────────────────────────────────────

const VIBE_PER_DAY: Record<string, number> = {
  tranquilo: 3,
  moderado: 4,
  intenso: 6,
};

function computeTripLength(
  count: number,
  vibe: string,
  requestedDays?: number,
): number {
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
  supa: ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  const oqIds = saved
    .filter((s) => s.categoria === "oQueFazer")
    .map((s) => s.id);
  const luckyIds = saved
    .filter((s) => s.categoria === "lucky")
    .map((s) => s.id);
  const restIds = saved
    .filter((s) => s.categoria === "restaurante")
    .map((s) => Number(s.id));

  // Parallel fetch from all three sources
  const [oqResult, luckyResult, restResult] = await Promise.all([
    oqIds.length > 0
      ? supa
          .from("o_que_fazer_rio")
          .select(
            "id,nome,bairro,categoria,tags_ia,momento_ideal,vibe,energia,duracao_media,photo_url,meu_olhar",
          )
          .in("id", oqIds)
      : Promise.resolve({ data: [] }),
    luckyIds.length > 0
      ? supa
          .from("lucky_list_rio")
          .select(
            "id,nome,bairro,tipo,tags_ia,momento_ideal,photo_url,meu_olhar",
          )
          .in("id", luckyIds)
      : Promise.resolve({ data: [] }),
    restIds.length > 0
      ? supa
          .from("restaurantes")
          // NOTE: restaurantes does NOT have momento_ideal or tags_ia columns.
          // Those fields are enriched via fallback logic below (["lunch"] and []).
          // isBreakfastRestaurant() uses especialidade; isDinnerRestaurant() is
          // inoperative until momento_ideal is added to the restaurantes schema.
          .select(
            "id,nome,bairro,categoria,especialidade,perfil_publico,preco_nivel,photo_url,meu_olhar",
          )
          .eq("ativo", true)
          .in("id", restIds)
      : Promise.resolve({ data: [] }),
  ]);

  const oqMap = new Map(
    (oqResult.data ?? []).map((r: Record<string, unknown>) => [
      String(r.id),
      r,
    ]),
  );
  const luckyMap = new Map(
    (luckyResult.data ?? []).map((r: Record<string, unknown>) => [
      String(r.id),
      r,
    ]),
  );
  const restMap = new Map(
    (restResult.data ?? []).map((r: Record<string, unknown>) => [
      Number(r.id),
      r,
    ]),
  );

  const places: EnrichedPlace[] = [];

  for (const s of saved) {
    if (s.categoria === "hotel") continue;

    let area: string = s.localizacao ?? "";
    let name: string = s.titulo;
    let tags: string[] = [];
    let momento: string[] = [];
    let vibe_tags: string[] = [];
    let energia = "medium";
    let duracao = "1-2h";
    let especialidade: string | undefined;
    let perfil: string | undefined;
    // Step F — output enrichment (read-only, never used in engine logic)
    let photo_url: string | null = null;
    let meu_olhar: string | null = null;

    if (s.categoria === "oQueFazer") {
      const row = oqMap.get(s.id);
      if (row) {
        area = (row.bairro as string) || area;
        name = (row.nome as string) || name;
        tags = (row.tags_ia as string[]) ?? [];
        momento = (row.momento_ideal as string[]) ?? [];
        vibe_tags = (row.vibe as string[]) ?? [];
        energia = (row.energia as string) ?? "medium";
        duracao = (row.duracao_media as string) ?? "1-2h";
        photo_url = (row.photo_url as string | null) ?? null;
        meu_olhar = (row.meu_olhar as string | null) ?? null;
      }
    } else if (s.categoria === "lucky") {
      // Look up in lucky_list_rio — confirmed columns: id,nome,bairro,tipo,tags_ia,momento_ideal,photo_url,meu_olhar
      const row = luckyMap.get(s.id);
      if (row) {
        area = (row.bairro as string) || area;
        name = (row.nome as string) || name;
        tags = (row.tags_ia as string[]) ?? [];
        momento = (row.momento_ideal as string[]) ?? [];
        vibe_tags = [];
        energia = "medium";
        photo_url = (row.photo_url as string | null) ?? null;
        meu_olhar = (row.meu_olhar as string | null) ?? null;
      }
    } else if (s.categoria === "restaurante") {
      const row = restMap.get(Number(s.id));
      if (row) {
        area = (row.bairro as string) || area;
        name = (row.nome as string) || name;
        especialidade = row.especialidade as string | undefined;
        perfil = row.perfil_publico as string | undefined;
        photo_url = (row.photo_url as string | null) ?? null;
        meu_olhar = (row.meu_olhar as string | null) ?? null;
        // Use DB momento_ideal if present; fall back to ["lunch"] so existing
        // behavior is preserved for restaurants that have no momento_ideal set.
        const dbMomento = (row.momento_ideal as string[] | null) ?? [];
        momento = dbMomento.length > 0 ? dbMomento : ["lunch"];
        tags = (row.tags_ia as string[] | null) ?? [];
      } else {
        momento = ["lunch"];
      }
    }

    const oqRow = s.categoria === "oQueFazer" ? oqMap.get(s.id) : undefined;
    const perfil_ideal = oqRow
      ? ((oqRow.perfil_ideal as string[] | null) ?? [])
      : [];
    const restRow =
      s.categoria === "restaurante" ? restMap.get(Number(s.id)) : undefined;
    const preco_nivel = restRow
      ? ((restRow.preco_nivel as number | null) ?? undefined)
      : undefined;

    places.push({
      id: s.id,
      name,
      categoria: s.categoria,
      area: area || "Rio de Janeiro",
      zone: getZone(area),
      momento_ideal: momento,
      energia,
      tags,
      vibe_tags,
      duracao,
      especialidade,
      perfil_publico: perfil,
      preco_nivel,
      perfil_ideal,
      photo_url,
      meu_olhar,
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
  requestedDays: number,
  vibe: string,
  supa: ReturnType<typeof createClient>,
  preferences: Preferences,
): Promise<EnrichedPlace[]> {
  const existingIds = new Set(existingPlaces.map((p) => p.id));
  // Step C: zones of the user's saved places — used as proximity reference.
  // Empty when no saved places exist; zoneProximityScore degrades gracefully.
  const savedZones = new Set(existingPlaces.map((p) => p.zone));

  const perDay = VIBE_PER_DAY[vibe] ?? 4;
  // Target: (perDay-1) activities per day; 3 restaurant slots per day (breakfast/lunch/dinner)
  const targetActs = requestedDays * (perDay - 1);

  const currentActs = existingPlaces.filter(
    (p) => p.categoria !== "restaurante",
  ).length;

  // Count saved restaurants by subtype so we know exactly what's missing per slot
  const currentBreakfast = existingPlaces.filter(
    (p) => p.categoria === "restaurante" && isBreakfastRestaurant(p),
  ).length;
  const currentDinner = existingPlaces.filter(
    (p) =>
      p.categoria === "restaurante" &&
      (isBarRestaurant(p) || isDinnerRestaurant(p)),
  ).length;
  const currentLunch = existingPlaces.filter(
    (p) =>
      p.categoria === "restaurante" &&
      !isBreakfastRestaurant(p) &&
      !isBarRestaurant(p) &&
      !isDinnerRestaurant(p),
  ).length;

  const needActs = Math.max(0, targetActs - currentActs);
  const needBreakfast = Math.max(0, requestedDays - currentBreakfast);
  const needDinner = Math.max(0, requestedDays - currentDinner);
  const needLunch = Math.max(0, requestedDays - currentLunch);
  const totalRestNeeded = needBreakfast + needDinner + needLunch;

  if (needActs === 0 && totalRestNeeded === 0) return [];

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
      .select("id,nome,bairro,tipo,tags_ia,momento_ideal,photo_url,meu_olhar")
      .limit(Math.min(60, (needActs + 5) * 3));

    const luckyCandidates: EnrichedPlace[] = [];
    for (const row of (luckyRows ?? []) as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id || existingIds.has(id)) continue;

      const tipo = ((row.tipo as string) ?? "").toLowerCase();
      // Skip lucky items that are restaurants (handled separately)
      if (
        tipo.includes("restaurante") ||
        tipo.includes("bar") ||
        tipo.includes("café")
      )
        continue;

      const area = (row.bairro as string) || "Rio de Janeiro";
      const tags = (row.tags_ia as string[]) ?? [];
      const momento = (row.momento_ideal as string[]) ?? [];

      luckyCandidates.push({
        id,
        name: (row.nome as string) || area,
        categoria: "lucky",
        area,
        zone: getZone(area),
        momento_ideal: Array.isArray(momento) ? momento : [],
        energia: "medium",
        tags: Array.isArray(tags) ? tags : [],
        vibe_tags: [],
        duracao: "1-2h",
        photo_url: (row.photo_url as string | null) ?? null,
        meu_olhar: (row.meu_olhar as string | null) ?? null,
      });
    }

    // Score all candidates, sort descending, take top needActs.
    // Soft ranking: nothing is removed — only ordered by relevance.
    const luckySelected = luckyCandidates
      .map((p) => ({
        p,
        score:
          compositePreferenceScore(p, preferences) +
          zoneProximityScore(p, savedZones),
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
    0,
    needActs - complement.filter((p) => p.categoria !== "restaurante").length,
  );
  if (stillNeedActs > 0) {
    const { data: oqRows } = await supa
      .from("o_que_fazer_rio")
      .select(
        "id,nome,bairro,tags_ia,momento_ideal,vibe,energia,duracao_media,photo_url,meu_olhar",
      )
      .limit(Math.min(75, (stillNeedActs + 8) * 3));

    const oqCandidates: EnrichedPlace[] = [];
    for (const row of (oqRows ?? []) as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id || existingIds.has(id)) continue;

      const area = (row.bairro as string) || "Rio de Janeiro";
      oqCandidates.push({
        id,
        name: (row.nome as string) || area,
        categoria: "oQueFazer",
        area,
        zone: getZone(area),
        momento_ideal: (row.momento_ideal as string[]) ?? [],
        energia: (row.energia as string) ?? "medium",
        tags: (row.tags_ia as string[]) ?? [],
        vibe_tags: (row.vibe as string[]) ?? [],
        duracao: (row.duracao_media as string) ?? "1-2h",
        photo_url: (row.photo_url as string | null) ?? null,
        meu_olhar: (row.meu_olhar as string | null) ?? null,
      });
    }

    const oqSelected = oqCandidates
      .map((p) => ({
        p,
        score:
          compositePreferenceScore(p, preferences) +
          zoneProximityScore(p, savedZones),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, stillNeedActs)
      .map(({ p }) => p);

    for (const p of oqSelected) {
      complement.push(p);
      existingIds.add(p.id);
    }
  }

  // ── 3. Restaurantes — 1 breakfast + 1 lunch + 1 dinner/bar per day ─────────
  // Fetches a broad pool, classifies into 3 slots, scores + picks independently.
  // Guarantees noite always has a bar/dinner anchor and manha always has breakfast.
  if (totalRestNeeded > 0) {
    const { data: restRows } = await supa
      .from("restaurantes")
      .select(
        "id,nome,bairro,especialidade,perfil_publico,preco_nivel,tags_ia,momento_ideal,photo_url,meu_olhar",
      )
      .eq("ativo", true)
      .limit(Math.min(150, totalRestNeeded * 6 + 30));

    const breakfastPool: EnrichedPlace[] = [];
    const dinnerPool: EnrichedPlace[] = [];
    const lunchPool: EnrichedPlace[] = [];

    for (const row of (restRows ?? []) as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id || existingIds.has(id)) continue;

      const area = (row.bairro as string) || "Rio de Janeiro";
      const dbMomento = (row.momento_ideal as string[] | null) ?? [];
      const p: EnrichedPlace = {
        id,
        name: (row.nome as string) || area,
        categoria: "restaurante",
        area,
        zone: getZone(area),
        momento_ideal: dbMomento.length > 0 ? dbMomento : ["lunch"],
        energia: "low",
        tags: (row.tags_ia as string[] | null) ?? [],
        vibe_tags: [],
        duracao: "1-2h",
        especialidade: row.especialidade as string | undefined,
        perfil_publico: row.perfil_publico as string | undefined,
        preco_nivel: row.preco_nivel as number | undefined,
        photo_url: (row.photo_url as string | null) ?? null,
        meu_olhar: (row.meu_olhar as string | null) ?? null,
      };

      // Classify into exactly one bucket — mutually exclusive
      if (isBreakfastRestaurant(p)) breakfastPool.push(p);
      else if (isBarRestaurant(p) || isDinnerRestaurant(p)) dinnerPool.push(p);
      else lunchPool.push(p);
    }

    const scoreAndPick = (pool: EnrichedPlace[], n: number): EnrichedPlace[] =>
      pool
        .map((p) => ({
          p,
          score:
            compositePreferenceScore(p, preferences) +
            zoneProximityScore(p, savedZones),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .map(({ p }) => p);

    for (const p of scoreAndPick(breakfastPool, needBreakfast)) {
      complement.push(p);
      existingIds.add(p.id);
    }
    for (const p of scoreAndPick(dinnerPool, needDinner)) {
      complement.push(p);
      existingIds.add(p.id);
    }
    for (const p of scoreAndPick(lunchPool, needLunch)) {
      complement.push(p);
      existingIds.add(p.id);
    }
  }

  return complement;
}

// ── STEP 2: Attach neighborhood metadata ──────────────────────────────────────

async function attachNeighborhoodMeta(
  places: EnrichedPlace[],
  supa: ReturnType<typeof createClient>,
): Promise<EnrichedPlace[]> {
  const bairros = [...new Set(places.map((p) => p.area).filter(Boolean))];
  if (bairros.length === 0) return places;

  const { data } = await supa
    .from("stay_neighborhoods")
    .select(
      "neighborhood_name,walkable,better_for,best_for_1,safety_solo_woman",
    )
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
        walkable: nb.walkable ?? "",
        better_for: nb.better_for ?? "",
        best_for_1: nb.best_for_1 ?? "",
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
  // English (o_que_fazer_rio)
  morning: "manha",
  lunch: "almoco",
  afternoon: "tarde",
  sunset: "tarde",
  evening: "noite",
  night: "noite",
  // Portuguese (lucky_list_rio)
  manha: "manha",
  brunch: "manha",
  almoco: "almoco",
  tarde: "tarde",
  fim_de_tarde: "tarde",
  por_do_sol: "tarde",
  noite: "noite",
  // day-context tags (dia_de_sol, fim_de_semana, etc.) intentionally absent — no time-of-day implied
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
  return p.tags.some(
    (t) =>
      t.includes("beach") || t.includes("praia") || t.includes("beach_life"),
  );
}

// Beach classification is vibe-aware:
//   intenso + high energy → manha  (beat crowds, serious beach session)
//   DB has "sunset"       → tarde  (Ipanema sunset is the premium experience)
//   tranquilo             → tarde  (relaxed, unhurried afternoon arrival)
//   default               → tarde  (afternoon is the standard Rio beach time)
// Only intenso + high-energy overrides to morning.
function classifyBeachPeriodo(p: EnrichedPlace, vibe: string): PeriodoDia {
  if (vibe === "intenso" && p.energia === "high") return "manha";
  if (p.momento_ideal.includes("sunset")) return "tarde"; // Ipanema sunset
  return "tarde";
}

// ── Restaurant subtype helpers ─────────────────────────────────────────────────
//
// Classification uses only Supabase-sourced fields: momento_ideal, tags, especialidade.
// No external data. No name-matching heuristics. Fully deterministic.
//
// BREAKFAST signals (from restaurantes.momento_ideal / tags_ia / especialidade):
//   momento_ideal: "morning" | "brunch" | "breakfast"
//   especialidade: "padaria" | "café" | "cafe" | "brunch" | "bakery" | "cafeteria" | "pão" | "pao"
//   tags_ia:       "café da manhã" | "breakfast" | "brunch" | "padaria" | "padaria artesanal"
//
// DINNER signals:
//   momento_ideal: "dinner" | "evening" | "noite"
//   AND NOT:       "morning" | "brunch" | "lunch"
//   (If a place is valid for both lunch and dinner, it stays with almoco as default.)
//
// All other restaurants default to almoco — existing behavior preserved.

const BREAKFAST_MOMENTO = new Set(["morning", "brunch", "breakfast"]);
// NOTE: especialidade values in the DB are compound ("Café da Manhã", "Pães e Cafés").
// Use an array of substrings to match against; .has() exact match does not work.
const BREAKFAST_ESPECIALIDADE_SUBS = [
  "padaria",
  "café",
  "cafe",
  "brunch",
  "bakery",
  "cafeteria",
  "pão",
  "pao",
  "café da manhã",
  "cafe da manha",
  "pães e cafés",
];
const BREAKFAST_TAGS = new Set([
  "café da manhã",
  "cafe da manha",
  "breakfast",
  "brunch",
  "padaria",
  "padaria artesanal",
  "café colonial",
  "cafe colonial",
]);

function isBreakfastRestaurant(p: EnrichedPlace): boolean {
  if (p.momento_ideal.some((m) => BREAKFAST_MOMENTO.has(m.toLowerCase())))
    return true;
  // Use substring matching — especialidade values are compound ("Café da Manhã", "Pães e Cafés")
  if (p.especialidade) {
    const esp = p.especialidade.toLowerCase();
    if (BREAKFAST_ESPECIALIDADE_SUBS.some((sub) => esp.includes(sub)))
      return true;
  }
  if (p.tags.some((t) => BREAKFAST_TAGS.has(t.toLowerCase()))) return true;
  return false;
}

const DINNER_MOMENTO = new Set(["dinner", "evening", "noite"]);
const DINNER_EXCLUDE = new Set(["morning", "brunch", "lunch"]);

function isDinnerRestaurant(p: EnrichedPlace): boolean {
  const hasDinner = p.momento_ideal.some((m) =>
    DINNER_MOMENTO.has(m.toLowerCase()),
  );
  if (!hasDinner) return false;
  const hasLunchOrBreakfast = p.momento_ideal.some((m) =>
    DINNER_EXCLUDE.has(m.toLowerCase()),
  );
  return !hasLunchOrBreakfast;
}

// Bar/nightlife detection via especialidade + tags_ia.
// Used because restaurantes table has no momento_ideal column, so isDinnerRestaurant()
// cannot fire for bars — this compensates by reading fields that ARE present in the DB.
const BAR_ESPECIALIDADE_SUBS = [
  "bar",
  "boteco",
  "pub",
  "drinks",
  "cocktail",
  "cervejaria",
  "speakeasy",
  "caipirinharia",
  "coquetelaria",
  "lounge",
];
const BAR_TAGS = new Set([
  "bar",
  "boteco",
  "pub",
  "drinks",
  "cocktail",
  "cervejaria",
  "nightlife",
  "balada",
  "dj",
  "speakeasy",
  "caipirinharia",
  "coquetelaria",
  "lounge",
  "drinks and music",
  "happy hour",
]);

function isBarRestaurant(p: EnrichedPlace): boolean {
  if (p.especialidade) {
    const esp = p.especialidade.toLowerCase();
    if (BAR_ESPECIALIDADE_SUBS.some((sub) => esp.includes(sub))) return true;
  }
  if (p.tags.some((t) => BAR_TAGS.has(t.toLowerCase()))) return true;
  return false;
}

function classifyPeriodo(p: EnrichedPlace, vibe: string): PeriodoDia {
  if (p.categoria === "restaurante") {
    if (isBreakfastRestaurant(p)) return "manha";
    if (isDinnerRestaurant(p) || isBarRestaurant(p)) return "noite";
    return "almoco";
  }

  // Beach items: vibe + context-aware (overrides DB momento_ideal)
  if (isBeachItem(p)) return classifyBeachPeriodo(p, vibe);

  // DB momento_ideal — most reliable for non-beach items
  for (const m of p.momento_ideal) {
    const mapped = MOMENTO_TO_PERIODO[m.toLowerCase()];
    if (mapped && mapped !== "almoco") return mapped;
  }

  // Expanded nightlife tag detection for oQueFazer + lucky items
  const NIGHTLIFE_KW = [
    "bar",
    "nightlife",
    "boteco",
    "drinks",
    "cocktail",
    "pub",
    "balada",
    "cervejaria",
    "speakeasy",
    "lounge",
  ];
  if (
    p.tags.some((t) => NIGHTLIFE_KW.some((kw) => t.toLowerCase().includes(kw)))
  )
    return "noite";

  // Energia
  if (p.energia === "high") return "manha";

  // Long-duration experiences → tarde
  if (
    p.duracao.startsWith("3") ||
    p.duracao.startsWith("4") ||
    p.duracao.startsWith("5")
  )
    return "tarde";

  return "manha";
}

function classifyAllPeriodos(
  places: EnrichedPlace[],
  vibe: string,
): EnrichedPlace[] {
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

type SubZone =
  | "sul_beach"
  | "sul_inland"
  | "sul_bridge"
  | "centro"
  | "oeste"
  | "norte";
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
  1: "sul",
  2: "sul",
  3: "sul",
  4: "centro",
  5: "oeste",
  6: "norte",
};

function getSubZone(zone: number): SubZone {
  return ZONE_TO_SUBZONE[zone] ?? "sul_bridge";
}
function getMacro(zone: number): MacroRegion {
  return ZONE_TO_MACRO[zone] ?? "sul";
}

// ── Travel penalty matrix ──────────────────────────────────────────────────────
// Realistic Uber travel times (minutes) between zone pairs in Rio.
// Simple zone-distance is misleading: zone 4→5 (Centro→Barra) = 40min,
// not 10min as linear math would suggest.
//
// Used as a scoring layer for:
//   • Restaurant-to-day matching (prefer restaurants reachable without leaving the cluster)
//   • Within-day item sequencing (sort items to minimize total travel)

const TRAVEL_MINUTES: Record<string, number> = {
  "1,1": 0,
  "2,2": 0,
  "3,3": 0,
  "4,4": 0,
  "5,5": 0,
  "6,6": 0,
  "1,2": 10,
  "2,1": 10, // Ipanema ↔ Lagoa/Jardim Botânico
  "1,3": 12,
  "3,1": 12, // Ipanema ↔ Botafogo/Flamengo
  "2,3": 8,
  "3,2": 8, // Lagoa ↔ Botafogo
  "3,4": 12,
  "4,3": 12, // Botafogo/Flamengo ↔ Centro (via Aterro)
  "2,4": 20,
  "4,2": 20, // Jardim Botânico ↔ Centro (longer route)
  "1,4": 28,
  "4,1": 28, // Ipanema ↔ Centro (the longest Sul→Centro leg)
  "4,6": 20,
  "6,4": 20, // Centro ↔ Tijuca/Norte
  "3,6": 22,
  "6,3": 22, // Botafogo ↔ Tijuca
  "1,5": 45,
  "5,1": 45, // Ipanema ↔ Barra (the famous long ride)
  "3,5": 40,
  "5,3": 40, // Botafogo ↔ Barra
  "4,5": 38,
  "5,4": 38, // Centro ↔ Barra
  "5,6": 55,
  "6,5": 55, // Barra ↔ Norte (cross-city)
  "1,6": 35,
  "6,1": 35, // Ipanema ↔ Norte
  "2,5": 42,
  "5,2": 42,
  "2,6": 30,
  "6,2": 30,
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
  if (
    (szA === "sul_beach" && szB === "centro") ||
    (szA === "centro" && szB === "sul_beach")
  )
    return 20;
  // Beach strip ↔ inland: natural (Lagoa is walkable from Ipanema)
  if (
    (szA === "sul_beach" && szB === "sul_inland") ||
    (szA === "sul_inland" && szB === "sul_beach")
  )
    return 5;
  // Inland ↔ bridge: adjacent
  if (
    (szA === "sul_inland" && szB === "sul_bridge") ||
    (szA === "sul_bridge" && szB === "sul_inland")
  )
    return 5;
  // Bridge ↔ Centro: the natural corridor
  if (
    (szA === "sul_bridge" && szB === "centro") ||
    (szA === "centro" && szB === "sul_bridge")
  )
    return 8;
  // Beach ↔ bridge: fine (Copacabana → Botafogo is short)
  if (
    (szA === "sul_beach" && szB === "sul_bridge") ||
    (szA === "sul_bridge" && szB === "sul_beach")
  )
    return 8;
  // Isolated regions: massive penalty
  if (szA === "oeste" || szB === "oeste" || szA === "norte" || szB === "norte")
    return 100;
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
function sortByProximity(
  items: EnrichedPlace[],
  periodo?: PeriodoDia,
): EnrichedPlace[] {
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
      const dist =
        travelMinutes(last.zone, item.zone) +
        subZoneCompatibilityPenalty(
          getSubZone(last.zone),
          getSubZone(item.zone),
        );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    result.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  // Sunset-last rule (Step A): applies only to tarde period.
  // All non-sunset items come first in proximity order; sunset items are
  // appended at the end. This preserves the greedy ordering for all other items.
  if (periodo === "tarde") {
    const sunsetItems = result.filter((p) =>
      p.momento_ideal.includes("sunset"),
    );
    const otherItems = result.filter(
      (p) => !p.momento_ideal.includes("sunset"),
    );
    return [...otherItems, ...sunsetItems];
  }

  return result;
}

// ── Flow sort: human-concierge ordering within each period ────────────────────
//
// Runs BEFORE proximity sort. Anchors the most time-critical item first,
// then sorts the rest by energia/type so proximity sort has a correct starting
// node. Gemini step 6 can still reorder within the result.
//
// manha:  breakfast restaurant → high-energia activities → medium → low
// almoco: lunch restaurant → other activities
// tarde:  handled by sortByProximity (sunset-last rule already applied)
// noite:  dinner restaurant → bars → other nightlife
function sortByDayFlow(
  items: EnrichedPlace[],
  periodo: PeriodoDia,
): EnrichedPlace[] {
  if (items.length <= 1) return items;

  function flowPriority(p: EnrichedPlace): number {
    if (periodo === "manha") {
      if (p.categoria === "restaurante" && isBreakfastRestaurant(p)) return 0;
      if (p.energia === "high") return 1;
      if (p.energia === "medium") return 2;
      return 3;
    }
    if (periodo === "almoco") {
      if (p.categoria === "restaurante") return 0;
      return 1;
    }
    if (periodo === "noite") {
      if (p.categoria === "restaurante" && !isBarRestaurant(p)) return 0;
      if (p.categoria === "restaurante" && isBarRestaurant(p)) return 1;
      return 2;
    }
    return 0; // tarde: no change — sortByProximity + sunset-last handles it
  }

  return [...items].sort((a, b) => {
    const fa = flowPriority(a);
    const fb = flowPriority(b);
    if (fa !== fb) return fa - fb;
    // Within the same flow group, use zone proximity as tiebreaker
    return a.zone - b.zone;
  });
}

// Chunk a sorted array into `n` groups (sequential slices)
function chunkInto(items: EnrichedPlace[], n: number): EnrichedPlace[][] {
  if (n <= 0 || items.length === 0) return [];
  const size = Math.ceil(items.length / n);
  return Array.from({ length: n }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  ).filter((g) => g.length > 0);
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
  places: EnrichedPlace[],
  tripLength: number,
  vibe: string,
  hotelZone?: number,
): { dayGroups: EnrichedPlace[][]; dayRestaurants: EnrichedPlace[][] } {
  const activities = places.filter((p) => p.categoria !== "restaurante");
  const restaurants = places.filter((p) => p.categoria === "restaurante");

  // ── 4a. Separate into sub-zone buckets ───────────────────────────────────
  const bySubZone: Record<SubZone, EnrichedPlace[]> = {
    sul_beach: [],
    sul_inland: [],
    sul_bridge: [],
    centro: [],
    oeste: [],
    norte: [],
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

  // ── Step D: soft hotel-zone bias for intra-zone ordering within centralItems ─
  // hotelBias is a SOFT signal. Zone is ALWAYS the primary sort key.
  // This only changes which item appears first within the same zone —
  // it cannot move a zone-4 item before a zone-1 item, ever.
  //
  // +3: item is in the hotel zone
  // +1: item is in an adjacent zone (±1 from hotel zone)
  //  0: otherwise (also when hotelZone = 0 / no hotel saved)
  const hotelBias = (item: EnrichedPlace): number => {
    if (!hotelZone) return 0;
    if (item.zone === hotelZone) return 3;
    if (Math.abs(item.zone - hotelZone) === 1) return 1;
    return 0;
  };

  if (hotelZone) {
    centralItems.sort((a, b) => {
      if (a.zone !== b.zone) return a.zone - b.zone; // zone ALWAYS primary
      const sa = (a.prefScore ?? 0) + hotelBias(a);
      const sb = (b.prefScore ?? 0) + hotelBias(b);
      return sb !== sa ? sb - sa : a.area.localeCompare(b.area);
    });
  }

  const totalActs = activities.length;
  if (totalActs === 0) {
    const dayGroups: EnrichedPlace[][] = Array.from(
      { length: tripLength },
      () => [],
    );
    const dayRestaurants: EnrichedPlace[][] = Array.from(
      { length: tripLength },
      () => [],
    );
    restaurants.forEach((r, i) => dayRestaurants[i % tripLength].push(r));
    return { dayGroups, dayRestaurants };
  }

  // ── 4c. Proportional day allocation per pool ──────────────────────────────
  let centralDays =
    centralItems.length > 0
      ? Math.max(1, Math.round((centralItems.length / totalActs) * tripLength))
      : 0;
  let oesteDays =
    oesteItems.length > 0
      ? Math.max(1, Math.round((oesteItems.length / totalActs) * tripLength))
      : 0;
  let norteDays =
    norteItems.length > 0
      ? Math.max(1, Math.round((norteItems.length / totalActs) * tripLength))
      : 0;

  // Fix sum to tripLength by adjusting the central pool (most flexible)
  const delta = tripLength - (centralDays + oesteDays + norteDays);
  centralDays = Math.max(centralItems.length > 0 ? 1 : 0, centralDays + delta);

  // ── 4d. Build day groups ──────────────────────────────────────────────────
  // Sequential chunking: because centralItems is already sorted beach→centro,
  // a 2-day central split naturally produces Day A (beach) and Day B (centro).
  const dayGroups: EnrichedPlace[][] = [
    ...chunkInto(centralItems, centralDays),
    ...chunkInto(oesteItems, oesteDays),
    ...chunkInto(norteItems, norteDays),
  ];
  while (dayGroups.length < tripLength) dayGroups.push([]);

  // ── Step D: reorder day clusters so the cluster most adjacent to the hotel
  // zone becomes Day 1. This is a SOFT sort — existing cluster composition is
  // 100% preserved; only the array order changes.
  // CRITICAL placement: this runs BEFORE dayRestaurants assignment (line below)
  // so that dayRestaurants[i] aligns correctly to the reordered dayGroups.
  if (hotelZone) {
    const dayHotelScore = (acts: EnrichedPlace[]): number => {
      const matches = acts.filter((p) => p.zone === hotelZone).length;
      const adj = acts.filter((p) => Math.abs(p.zone - hotelZone) === 1).length;
      return matches * 2 + adj;
    };
    dayGroups.sort((a, b) => dayHotelScore(b) - dayHotelScore(a));
  }

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
    for (const a of acts)
      counts[getSubZone(a.zone)] = (counts[getSubZone(a.zone)] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0] as SubZone;
  }

  const dayRestaurants: EnrichedPlace[][] = Array.from(
    { length: dayGroups.length },
    () => [],
  );
  for (const rest of restaurants) {
    const restSZ = getSubZone(rest.zone);
    let bestDay = 0;
    let bestScore = Infinity;

    dayGroups.forEach((acts, di) => {
      const daySZ = dayDominantSubZone(acts);
      const dayZone = dayMedianZone(acts);

      // Sub-zone compatibility (main signal)
      const szPenalty = subZoneCompatibilityPenalty(restSZ, daySZ);
      // Travel penalty from restaurant to day center
      const travel = travelMinutes(rest.zone, dayZone);
      // Load balancing
      const load = dayRestaurants[di].length * 5;

      const score = szPenalty + travel * 0.5 + load;
      if (score < bestScore) {
        bestScore = score;
        bestDay = di;
      }
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
  gastronomy: [
    "gastronomia",
    "restaurante",
    "food",
    "culinary",
    "comida",
    "fine_dining",
  ],
  culture: [
    "cultura",
    "arte",
    "museu",
    "history",
    "teatro",
    "galeria",
    "historical",
  ],
  beach: ["praia", "beach", "surf", "beach_life", "orla", "mar"],
  adventure: [
    "aventura",
    "trilha",
    "esporte",
    "outdoor",
    "natureza",
    "escalada",
  ],
  lucky: ["lucky", "insider", "exclusivo", "secreto", "curadoria"],
  natureza: ["natureza", "parque", "floresta", "jardim", "vista", "ecológico"],
  festa: ["balada", "bar", "nightlife", "samba", "forró", "festa", "carnaval"],
};

function inspirationScore(p: EnrichedPlace, inspirations: string[]): number {
  if (inspirations.length === 0) return 0;
  const haystack = [...p.tags, ...p.vibe_tags, p.categoria].map((t) =>
    t.toLowerCase(),
  );
  let total = 0;
  for (const ins of inspirations) {
    const kws = INSPIRATION_TAGS[ins] ?? [];
    const hits = kws.filter((kw) => haystack.some((h) => h.includes(kw)));
    total += hits.length * 2;
    if (ins === "gastronomy" && p.categoria === "restaurante") total += 3;
    if (
      ins === "beach" &&
      p.tags.some((t) => t.includes("beach") || t.includes("praia"))
    )
      total += 3;
    if (ins === "lucky" && p.categoria === "lucky") total += 4;
  }
  return total;
}

const BUDGET_SIGNALS_SOFISTICADO = [
  "fine dining",
  "exclusivo",
  "premium",
  "luxo",
  "alta",
  "especial",
];
const BUDGET_SIGNALS_ESSENCIAL = [
  "popular",
  "barato",
  "rústico",
  "simples",
  "acessível",
  "boteco",
];

function budgetScore(p: EnrichedPlace, budget: string | null): number {
  if (!budget) return 0;

  // preco_nivel from DB takes priority when available (1=muito barato, 5=muito caro)
  const nivel = p.preco_nivel ?? null;
  if (nivel !== null) {
    if (budget === "sofisticado") return nivel >= 4 ? 3 : nivel <= 2 ? -2 : 0;
    if (budget === "essencial") return nivel <= 2 ? 3 : nivel >= 4 ? -2 : 0;
    return 0; // "conforto" = neutral
  }

  // Fallback: text-signal matching when preco_nivel not available
  const text = [
    p.especialidade ?? "",
    p.perfil_publico ?? "",
    ...p.tags,
    ...p.vibe_tags,
  ]
    .join(" ")
    .toLowerCase();

  if (budget === "sofisticado") {
    const match = BUDGET_SIGNALS_SOFISTICADO.some((s) => text.includes(s));
    const mismatch = BUDGET_SIGNALS_ESSENCIAL.some((s) => text.includes(s));
    return match ? 3 : mismatch ? -2 : 0;
  }
  if (budget === "essencial") {
    const match = BUDGET_SIGNALS_ESSENCIAL.some((s) => text.includes(s));
    const mismatch = BUDGET_SIGNALS_SOFISTICADO.some((s) => text.includes(s));
    return match ? 3 : mismatch ? -2 : 0;
  }
  return 0; // "conforto" = neutral
}

const TRAVEL_VIBE_SIGNALS: Record<string, string[]> = {
  solo: ["solo", "individual", "introspec", "single", "sozinha", "sozinho"],
  casal: ["casal", "couple", "romantic", "romântico", "intimidade", "namorado"],
  amigos: ["grupo", "amigos", "friends", "animado", "turma"],
  família: ["família", "family", "crianças", "kids", "infantil", "filhos"],
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

function compositePreferenceScore(
  p: EnrichedPlace,
  prefs: Preferences,
): number {
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
function zoneProximityScore(
  item: EnrichedPlace,
  savedZones: Set<number>,
): number {
  if (savedZones.has(item.zone)) return 3;
  for (const sz of savedZones) {
    if (Math.abs(item.zone - sz) === 1) return 1;
  }
  if ((item.zone === 5 || item.zone === 6) && !savedZones.has(item.zone))
    return -2;
  return 0;
}

// Re-rank: saved items before complementary; within each tier, sort by composite score.
// Step B: stamps prefScore onto each place before sorting so that downstream
// steps (Step 4 sortBucket) can use it without receiving preferences as a parameter.
// Score is computed once per place — O(n) — instead of twice per comparison — O(n log n).
// prefScore is internal only: it is never written to the output ItemRoteiro or DiaRoteiro.
function scoreAndSortPool(
  places: EnrichedPlace[],
  prefs: Preferences,
  savedIds: Set<string>,
): EnrichedPlace[] {
  // Step B: stamp prefScore onto each place so downstream steps (Step 4 sortBucket)
  // can use it without re-computing or receiving preferences as a parameter.
  // Score is computed once here; all subsequent reads are O(1) field access.
  const stamped = places.map((p) => ({
    ...p,
    prefScore: compositePreferenceScore(p, prefs),
  }));

  const saved = stamped.filter((p) => savedIds.has(p.id));
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

const MANHA_CAP: Record<string, number> = {
  tranquilo: 2,
  moderado: 2,
  intenso: 3,
};

// ── Step A slot caps ──────────────────────────────────────────────────────────
// tarde and noite caps enforce a realistic daily rhythm.
//
// NOTE (Step A): Items that exceed these caps are DROPPED from the day rather
// than redistributed to other days. This is intentional and temporary behaviour
// for Step A only. A future step (complement scoring + geographic clustering)
// will ensure the pool never generates this many same-day same-zone items in the
// first place, making overflow redistribution unnecessary. Do NOT add
// cross-day redistribution logic here.
const TARDE_CAP: Record<string, number> = {
  tranquilo: 2,
  moderado: 3,
  intenso: 4,
};
const NOITE_CAP: Record<string, number> = {
  tranquilo: 1,
  moderado: 2,
  intenso: 2,
};

function categoriaToTable(cat: SavedCategory): string {
  switch (cat) {
    case "restaurante":
      return "restaurantes";
    case "hotel":
      return "stay_hotels";
    case "oQueFazer":
      return "o_que_fazer_rio";
    case "lucky":
      return "lucky_list_rio";
  }
}

function buildFullDraft(
  dayGroups: EnrichedPlace[][],
  dayRestaurants: EnrichedPlace[][],
  vibe: string,
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
      const locked = manha.filter((p) => !isFlexible(p));
      const flexible = manha.filter((p) => isFlexible(p));

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
    // Bars/nightlife (via isBarRestaurant) → noite regardless of position.
    // Breakfast places (via isBreakfastRestaurant) → manha regardless of position.
    // First non-bar, non-breakfast restaurant → almoco.
    // Second+ non-bar → almoco (all restaurants default to lunch in the DB).
    // NOTE: restaurantes table has no momento_ideal column, so isDinnerRestaurant()
    // always returns false. isBarRestaurant() compensates via especialidade + tags_ia.
    rests.forEach((r, i) => {
      let p: PeriodoDia;
      if (isBreakfastRestaurant(r)) {
        p = "manha";
      } else if (isDinnerRestaurant(r) || isBarRestaurant(r)) {
        p = "noite";
      } else {
        p = i === 0 ? "almoco" : "almoco";
      }
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

    // ── 5d. Within-period flow + proximity sequencing ────────────────────────
    // First: flow sort anchors the time-critical item (breakfast, dinner, sunset)
    // at the correct position within the period. Then: proximity sort minimizes
    // travel starting from that anchor.
    for (const [periodo, items] of periodMap.entries()) {
      const flowed =
        periodo === "tarde"
          ? items // tarde: sortByProximity handles sunset-last; skip flow pre-sort
          : sortByDayFlow(items, periodo);
      periodMap.set(periodo, sortByProximity(flowed, periodo));
    }

    // ── 5e. Build ordered periodos ────────────────────────────────────────────
    const periodos: DiaPeriodo[] = PERIODO_ORDER.filter(
      (p) => (periodMap.get(p) ?? []).length > 0,
    ).map((p) => ({
      periodo: p,
      items: periodMap.get(p)!.map((a) => {
        // Step F — photo resolution:
        // Only Supabase photo_url is used. No external fallback.
        // Null is a valid output — the mobile app handles missing images locally.
        const finalPhoto: string | null = a.photo_url ?? null;

        return {
          id: a.id,
          titulo: a.name,
          categoria: a.categoria,
          localizacao: a.area,
          source_table: categoriaToTable(a.categoria),
          // Step F — additive enrichment fields
          image: finalPhoto ? { uri: finalPhoto } : undefined,
          photo_url: finalPhoto,
          descricao: a.meu_olhar ?? null,
          duracao: a.duracao,
        };
      }),
    }));

    if (periodos.length === 0) return;

    // ── 5f. Day label = modal neighborhood ────────────────────────────────────
    const allItems = [...acts, ...rests];
    const bairroCount = new Map<string, number>();
    for (const item of allItems)
      bairroCount.set(item.area, (bairroCount.get(item.area) ?? 0) + 1);
    const bairro =
      [...bairroCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Rio de Janeiro";

    days.push({ numero: di + 1, bairro, periodos });
  });

  return days.map((d, i) => ({ ...d, numero: i + 1 }));
}

// ── STEP 6: Gemini refinement (NOT generation) ────────────────────────────────
// Receives the fully populated draft built by steps 1-5.
// Gemini's ONLY allowed action: reorder items WITHIN each período for better flow.
// It cannot: change day count, move items between days, move between períodos, add/remove.

async function refineWithGemini(
  draft: DiaRoteiro[],
  dest: string,
  prefs: Preferences,
  allPlaces: EnrichedPlace[],
): Promise<DiaRoteiro[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !draft.length) return draft;

  // 🔥 NOVO: trava total — não deixa Gemini bagunçar nada crítico
  const lockedStructure = JSON.stringify(draft);

  const prompt = You are NOT an AI assistant.

    You are a senior luxury travel concierge working for a premium product called "The Lucky Trip".

    You specialize in highly personalized travel experiences using real curated data.

    You receive a FULL itinerary already built using real data from Supabase.

    Your job is to refine, personalize and elevate the experience — NEVER to invent, remove or replace places.

    ---

    # 🔒 ABSOLUTE RULES

    - DO NOT add new places
    - DO NOT remove places
    - DO NOT change structure
    - DO NOT change number of days
    - DO NOT change periods (manha, almoco, tarde, noite)
    - DO NOT hallucinate
    - DO NOT use external places outside curated data

    You are ONLY allowed to:
    - reorder items inside the same day
    - adjust timing for realism
    - improve flow and personalization

    ---

    # 🧠 CORE INTELLIGENCE (MOST IMPORTANT)

    You MUST understand the traveler — even with limited data.

    Use ALL signals available:
    - selected preferences (gastronomia, festa, natureza, cultura, etc)
    - selected travel vibe (familia, casal, amigos, solo)
    - pacing (intenso, moderado, tranquilo)
    - types of places inside the itinerary

    From this, you MUST infer behavior.

    ---

    # 🎯 PERSONALIZATION ENGINE

    ### If FESTA:
    - Strong nights EVERY DAY
    - Energy builds throughout the day
    - Avoid early mornings

    ### If GASTRONOMIA:
    - Meals are the anchors of the day
    - No rushed transitions
    - Comfort between meals

    ### If NATUREZA:
    - Light mornings
    - Breathing space
    - Sunset becomes key moment

    ### If CULTURA:
    - Logical progression
    - Avoid fatigue
    - Balanced intellectual rhythm

    ### If FAMÍLIA:
    - Safe, smooth flow
    - Kid-friendly rhythm
    - Early nights

    ### If CASAL:
    - Romantic pacing
    - Sunset + dinner as key emotional moments

    ### If SOLO:
    - Calm, reflective
    - Walkable, introspective experiences

    ### If UNKNOWN:
    - Balanced and intuitive

    ---

    # ⚡ RHYTHM CONTROL

    Detect rhythm and improve it:

    - INTENSO → full days + active nights
    - MODERADO → balanced
    - TRANQUILO → fewer items + relaxed pacing

    ---

    # 🧩 DAILY STRUCTURE (MANDATORY)

    Each day MUST feel complete:

    - Morning (light start)
    - Lunch (12:00–14:30)
    - Afternoon (logical continuation)
    - Night (MANDATORY)

    ---

    # 🌙 NIGHT RULE

    - If user leans FESTA → nightlife EVERY night
    - If NOT → dinner is the main closing moment

    ---

    # 🍽️ FOOD INTELLIGENCE

    - Never move meals to wrong periods
    - Never create unnatural sequences
    - Meals must feel intentional

    ---

    # 📍 GEO INTELLIGENCE

    - Group nearby places
    - Avoid long unnecessary travel
    - Avoid switching zones multiple times
    - Respect real-world movement

    ---

    # 🌇 EXPERIENCE QUALITY

    The itinerary must feel:

    - Human
    - Natural
    - Effortless
    - Designed specifically for this traveler

    ---

    # 🌦️ CONTEXT AWARENESS

    You must consider:

    - time of day
    - flow of the day
    - realistic energy levels

    ---

    # 🌐 SMART ACCESS (VERY IMPORTANT)

    You are allowed to use external knowledge ONLY for:

    - validating real-world details (opening hours, timing, context)
    - enriching understanding of places already in the itinerary

    STRICT RULE:

    - You can ONLY reference places that already exist in the itinerary
    - You CANNOT introduce new places

    Example:
    - If "teatro X" exists → you may consider showtime logic
    - You cannot suggest another theater

    ---

    # 🧠 REAL-TIME INTELLIGENCE

    Assume this system may be used for:

    - "what to do now"
    - real-time suggestions

    So:

    - timing must make sense
    - sequence must be realistic
    - no impossible transitions

    ---

    # 🚫 WHAT YOU MUST NEVER DO

    - NEVER invent places
    - NEVER break structure
    - NEVER change dataset
    - NEVER act like a generic AI

    ---

    # 🎯 FINAL GOAL

    The output must feel like:

    "A real human concierge understood me without me needing to explain everything."

    ---

    # INPUT

    ${lockedStructure}

    ---

    # OUTPUT

    Return ONLY valid JSON.

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 },
        }),
      },
    );

    if (!res.ok) return draft;

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const clean = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(clean);

    // 🔥 VALIDAÇÃO PESADA (anti-bug / anti-Gemini louco)
    if (!Array.isArray(parsed) || parsed.length !== draft.length) {
      return draft;
    }

    for (let i = 0; i < parsed.length; i++) {
      const original = draft[i];
      const refined = parsed[i];

      if (
        !refined.periodos ||
        refined.periodos.length !== original.periodos.length
      ) {
        return draft;
      }

      for (let j = 0; j < original.periodos.length; j++) {
        if (
          !refined.periodos[j]?.items ||
          refined.periodos[j].items.length !== original.periodos[j].items.length
        ) {
          return draft;
        }
      }
    }

    return parsed as DiaRoteiro[];
  } catch (_) {
    return draft;
  }
}

// ── STEP 7: Validation ────────────────────────────────────────────────────────
// 7a. Re-attaches any places dropped during Gemini refinement.
// 7b. Enforces temporal sanity + source-of-truth rules:
//   Rule 0 — Source-of-truth strip: items not in allPlaces (Supabase registry) are dropped.
//   Rule 1 — Sunset items → only tarde.
//   Rule 2 — Restaurant subtype-aware: breakfast/brunch valid in manha; dinner evicted to noite;
//             all others evicted from manha to almoco.
//   Rule 5 — Dinner-only restaurants in almoco or tarde → evicted to noite.
//   Rule 3 — Nightlife venues (tag-authoritative): nightlife tag + any night/evening momento
//             → not manha/almoco. Updated from exclusive-night to tag-authoritative check.
//   Rule 6 — Breakfast restaurants in almoco, tarde, or noite → evicted to manha (full coverage).
//   Rule 4 — Performance venues → not manha/almoco.

function validateAndFix(
  days: DiaRoteiro[],
  allPlaces: EnrichedPlace[],
): DiaRoteiro[] {
  // 7a. Re-attach any items dropped during Gemini refinement ─────────────────
  const usedIds = new Set<string>();
  for (const day of days) {
    for (const p of day.periodos) {
      for (const it of p.items) usedIds.add(it.id);
    }
  }

  // Guard: also catch same-ID items that appear more than once across days
  // (e.g. if Gemini duplicated an item). Strip all but first occurrence.
  const globalSeenIds = new Set<string>();
  for (const day of days) {
    for (const p of day.periodos) {
      p.items = p.items.filter((it) => {
        if (globalSeenIds.has(it.id)) return false;
        globalSeenIds.add(it.id);
        return true;
      });
    }
  }
  // Rebuild usedIds from the deduplicated day set
  usedIds.clear();
  for (const day of days) {
    for (const p of day.periodos) {
      for (const it of p.items) usedIds.add(it.id);
    }
  }

  const lost = allPlaces.filter((p) => !usedIds.has(p.id));
  if (lost.length > 0 && days.length > 0) {
    const lastDay = days[days.length - 1];
    const tarde = lastDay.periodos.find((p) => p.periodo === "tarde");
    // Only attach items not already present anywhere (belt-and-suspenders)
    const lostItems = lost
      .filter((l) => !usedIds.has(l.id))
      .map((l) => {
        usedIds.add(l.id);
        return {
          id: l.id,
          titulo: l.name,
          categoria: l.categoria,
          localizacao: l.area,
          source_table: categoriaToTable(l.categoria),
          // Step F — Supabase photo_url only; no external fallback
          image: l.photo_url ? { uri: l.photo_url } : undefined,
          photo_url: l.photo_url ?? null,
          descricao: l.meu_olhar ?? null,
          duracao: l.duracao,
        };
      });
    if (lostItems.length > 0) {
      if (tarde) {
        tarde.items.push(...lostItems);
      } else {
        lastDay.periodos.push({ periodo: "tarde", items: lostItems });
      }
    }
  }

  // 7b. Temporal sanity pass — fix any invalid period assignments ─────────────
  const placeById = new Map<string, EnrichedPlace>(
    allPlaces.map((p) => [p.id, p]),
  );

  for (const day of days) {
    const evictions: Array<{ item: ItemRoteiro; to: PeriodoDia }> = [];

    for (const periodoBlock of day.periodos) {
      const keep: ItemRoteiro[] = [];

      for (const item of periodoBlock.items) {
        const place = placeById.get(item.id);

        // Rule 0 — Source-of-truth strip
        // Any item whose id is not present in allPlaces (the Supabase-sourced registry)
        // is an unauthorized item — hallucinated by Gemini or otherwise orphaned.
        // Drop it unconditionally. Never silently keep unknown items.
        if (!place) {
          continue;
        }

        const momento = place.momento_ideal.map((m) => m.toLowerCase());
        const tags = place.tags.map((t) => t.toLowerCase());

        // Rule 1: sunset → only tarde (pôr do sol nunca às 14h)
        // o_que_fazer_rio uses English "sunset"; lucky_list_rio uses Portuguese "por_do_sol".
        // Both must map to tarde. The MOMENTO_TO_PERIODO map handles classification,
        // but validateAndFix needs its own bilingual check for the correction pass.
        const isSunset =
          momento.includes("sunset") || momento.includes("por_do_sol");
        if (isSunset && periodoBlock.periodo !== "tarde") {
          evictions.push({ item, to: "tarde" });
          continue;
        }

        // Rule 2: restaurant temporal placement — subtype-aware
        // Breakfast restaurants (padaria, café, brunch) are valid in manha.
        // Dinner-only restaurants are evicted from manha to noite.
        // All other restaurants are evicted from manha to almoco.
        if (
          item.categoria === "restaurante" &&
          periodoBlock.periodo === "manha"
        ) {
          if (isBreakfastRestaurant(place)) {
            keep.push(item);
            continue;
          }
          if (isDinnerRestaurant(place)) {
            evictions.push({ item, to: "noite" });
            continue;
          }
          evictions.push({ item, to: "almoco" });
          continue;
        }

        // Rule 5: dinner-only restaurant → not almoco or tarde
        // Extended from almoco-only to also cover tarde: a dinner-only restaurant
        // can land in tarde via validateAndFix 7a re-attachment. Both are wrong.
        if (
          item.categoria === "restaurante" &&
          (periodoBlock.periodo === "almoco" ||
            periodoBlock.periodo === "tarde") &&
          isDinnerRestaurant(place)
        ) {
          evictions.push({ item, to: "noite" });
          continue;
        }

        // Rule 3: nightlife venue → not manha/almoco
        //
        // Original condition required momento.every(["night","evening"]) — this
        // excluded venues with mixed momento_ideal like ["morning","night"] that
        // are legitimately nightlife but also offer morning experiences (tours, etc.).
        //
        // Updated: tag-authoritative — nightlife tag + ANY night/evening momento is
        // sufficient to evict from manha/almoco. The nightlife tag is the semantic
        // authority; presence of "morning" in momento_ideal does not override it.
        // A venue with nightlife tags that works at night belongs in noite.
        // o_que_fazer_rio uses English "night"/"evening"; lucky_list_rio uses Portuguese "noite".
        const hasNightMomento = momento.some((m) =>
          ["night", "evening", "noite"].includes(m),
        );
        const isNightlife = tags.some((t) =>
          ["balada", "nightlife", "clubbing"].some((k) => t.includes(k)),
        );
        if (
          hasNightMomento &&
          isNightlife &&
          (periodoBlock.periodo === "manha" ||
            periodoBlock.periodo === "almoco")
        ) {
          evictions.push({ item, to: "noite" });
          continue;
        }

        // Rule 6: breakfast restaurant → only manha
        // Coverage: almoco, tarde, noite → all must evict to manha.
        // buildFullDraft hardcodes first restaurant to almoco regardless of subtype,
        // and Gemini may also move breakfast items to almoco. This rule is the
        // authoritative fallback that enforces manha placement unconditionally.
        // Rule 2 (above) already handles the manha case (keeps breakfast in manha).
        if (
          item.categoria === "restaurante" &&
          isBreakfastRestaurant(place) &&
          periodoBlock.periodo !== "manha"
        ) {
          evictions.push({ item, to: "manha" });
          continue;
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
          "opera",
          "ballet",
          "show",
          "concerto",
          "espetáculo",
          "espetaculo",
          "performance",
        ];
        const isPerformanceVenue = tags.some((t) =>
          PERFORMANCE_TAGS.some((k) => t.includes(k)),
        );
        if (
          isPerformanceVenue &&
          (periodoBlock.periodo === "manha" ||
            periodoBlock.periodo === "almoco")
        ) {
          evictions.push({ item, to: "noite" });
          continue;
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
    day.periodos = PERIODO_ORDER.map((po) =>
      day.periodos.find((p) => p.periodo === po),
    ).filter(Boolean) as DiaPeriodo[];

    // ── Recalculate day.bairro from final item positions ──────────────────────
    // This must run AFTER re-sort so it reflects the true final item set:
    //   • Gemini may have reordered items (changing first-item bairro)
    //   • 7a may have re-attached complement items from new bairros
    //   • 7b may have evicted items to different periods (changing the bairro mix)
    // Previous bairro was set by buildFullDraft (modal of acts+rests only, pre-complement)
    // and may have been echoed back verbatim by Gemini regardless of item moves.
    //
    // Algorithm:
    //   1. Count occurrences of each item.localizacao across all periods
    //   2. Select the most frequent bairro (modal)
    //   3. Tiebreaker: prefer the bairro of the item with the longest duration
    //   4. Final fallback: first item after canonical period ordering
    const allFinalItems = day.periodos.flatMap((p) => p.items);
    if (allFinalItems.length > 0) {
      // Step 1 — frequency map
      const freq = new Map<string, number>();
      for (const it of allFinalItems) {
        const loc = it.localizacao || placeById.get(it.id)?.area || "";
        if (loc) freq.set(loc, (freq.get(loc) ?? 0) + 1);
      }
      if (freq.size > 0) {
        const maxFreq = Math.max(...freq.values());
        const tied = new Set(
          [...freq.entries()].filter(([, c]) => c === maxFreq).map(([b]) => b),
        );

        if (tied.size === 1) {
          day.bairro = [...tied][0];
        } else {
          // Step 3 — tiebreaker: longest-duration item among the tied bairros
          // Duration strings: "1-2h" | "2h" | "3h+" — extract first integer.
          const parseDur = (d?: string): number => {
            if (!d) return 0;
            const m = d.match(/(\d+)/);
            return m ? parseInt(m[1], 10) : 0;
          };
          let winner = "";
          let bestDur = -1;
          for (const it of allFinalItems) {
            const loc = it.localizacao || placeById.get(it.id)?.area || "";
            if (!tied.has(loc)) continue;
            const dur = parseDur(placeById.get(it.id)?.duracao);
            if (dur > bestDur) {
              bestDur = dur;
              winner = loc;
            }
          }
          // Step 4 — fallback: first item's bairro (allFinalItems is in canonical order)
          day.bairro = winner || allFinalItems[0].localizacao || day.bairro;
        }
      }
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
      savedItems = [],
      destination = "Rio de Janeiro",
      preferences = { inspirations: [], vibe: "moderado" },
      requestedDays,
      arrivalDate,
      departureDate,
    } = body;

    // ── Step D: determine hotel zone anchor ───────────────────────────────────
    // Source: raw savedItems where categoria === "hotel" (enrichPlaces skips hotels).
    // ONLY hotel items contribute to hotelZone — no non-hotel item can ever
    // influence this extraction.
    //
    // Multi-hotel selection (when >1 hotel saved) uses three deterministic tiers:
    //   Tier 1 — budget zone match: sofisticado → zones 1-2; conforto → zones 1-3; essencial → neutral
    //   Tier 2 — zone proximity to dominant non-hotel saved-item zone
    //            (smoother gradient: score = max(0, 3 - |hz - domZ|))
    //   Tier 3 — stable alphabetical sort on item id (deterministic tiebreak)
    //
    // hotelZone = 0 when no hotel is saved; all hotel-aware branches guard on
    // `if (hotelZone)` which is falsy for 0 → zero behavioral change for users
    // with no saved hotel.  DO NOT add hotel auto-recommendation here (Step D.5).
    type RawItem = { categoria?: string; localizacao?: string; id?: string };
    const rawItems = savedItems as RawItem[];
    const hotelItems = rawItems.filter((s) => s.categoria === "hotel");

    let hotelZone = 0;

    if (hotelItems.length === 1) {
      // Single hotel — use it directly, no scoring needed
      hotelZone = getZone(hotelItems[0].localizacao ?? "");
    } else if (hotelItems.length > 1) {
      // Tier 2 input: dominant zone from non-hotel saved items
      const nonHotelRaw = rawItems.filter((s) => s.categoria !== "hotel");
      const zoneCounts: Record<number, number> = {};
      for (const item of nonHotelRaw) {
        const z = getZone(item.localizacao ?? "");
        if (z > 0) zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
      }
      const domZEntry = Object.entries(zoneCounts).sort(
        (a, b) => Number(b[1]) - Number(a[1]),
      )[0];
      const domZ = domZEntry ? Number(domZEntry[0]) : 0;

      // Tier 1: budget preference → preferred zone set.
      // Values match the app's BudgetStyle type: "essencial" | "conforto" | "sofisticado".
      // sofisticado → zones 1-2 (Ipanema/Leblon/Lagoa — premium Zona Sul)
      // conforto    → zones 1-3 (broader Zona Sul — comfortable mid-range)
      // essencial   → no zone bias (affordable options across all zones)
      const budgetZoneMap: Record<string, number[]> = {
        sofisticado: [1, 2],
        conforto: [1, 2, 3],
      };
      const preferredBudgetZones = new Set(
        budgetZoneMap[preferences.budget ?? ""] ?? [],
      );

      // Score each hotel candidate on two tiers; stable id sort as Tier 3
      const scored = hotelItems.map((h) => {
        const hz = getZone(h.localizacao ?? "");
        const t1 =
          preferredBudgetZones.size > 0 && preferredBudgetZones.has(hz) ? 2 : 0;
        const t2 = domZ > 0 ? Math.max(0, 3 - Math.abs(hz - domZ)) : 0;
        return { h, hz, score: t1 + t2 };
      });

      scored.sort((a, b) =>
        b.score !== a.score
          ? b.score - a.score
          : String(a.h.id ?? "").localeCompare(String(b.h.id ?? "")),
      );

      hotelZone = scored[0]!.hz;
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const dest = destination || "Rio de Janeiro";
    const vibe = preferences.vibe ?? "moderado";
    const travelVibe = preferences.travelVibe ?? null;
    const budget = preferences.budget ?? null;

    // Compute requested days: priority order —
    //   1. Explicit requestedDays from frontend (derived from arrival/departure dates)
    //   2. Derived from arrivalDate + departureDate strings if provided
    //   3. Fall through to computeTripLength item-based estimate
    let resolvedDays: number | undefined = requestedDays;
    if (!resolvedDays && arrivalDate && departureDate) {
      const ms =
        new Date(departureDate).getTime() - new Date(arrivalDate).getTime();
      const diff = Math.round(ms / 86_400_000); // ms → days
      if (diff >= 1) resolvedDays = diff;
    }

    // ── Step 1+2: Normalize saved items from all sources ────────────────────────
    let savedPlaces = await enrichPlaces(savedItems, supa);

    // ── Trip length is locked early — determines how much complement we need ──
    const tripLength = computeTripLength(
      savedPlaces.length,
      vibe,
      resolvedDays,
    );

    // Only block if there's nothing to work with AND no trip dates were given
    if (savedPlaces.length === 0 && tripLength === 0) {
      return new Response(
        JSON.stringify({
          error: "No actionable saved places and no trip dates provided",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // ── Fetch complementary content from lucky_list_rio, o_que_fazer_rio, restaurantes
    // Priority: saved items first, then lucky list, then o_que_fazer, then restaurants.
    // This pads out weak itineraries caused by too few saved items for the trip length.
    const complementaryPlaces = await fetchComplementaryContent(
      savedPlaces,
      tripLength,
      vibe,
      supa,
      preferences,
    );

    // Merge: saved items always come first (preserved position in clustering)
    // Dedup: remove any place that appears more than once (by ID).
    // Saved items win over complementary — the filter preserves first occurrence.
    const _mergedRaw = [...savedPlaces, ...complementaryPlaces];
    const _seenMerge = new Set<string>();
    let places = _mergedRaw.filter((p) => {
      if (_seenMerge.has(p.id)) return false;
      _seenMerge.add(p.id);
      return true;
    });

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
    const { dayGroups, dayRestaurants } = groupByGeography(
      places,
      tripLength,
      vibe,
      hotelZone,
    );

    // ── Step 5: Build fully populated DiaRoteiro[] with morning load balancing
    let days = buildFullDraft(dayGroups, dayRestaurants, vibe);

    // ── Step 6: Gemini refinement — only reorders within existing períodos ─────
    days = await refineWithGemini(days, dest, preferences, places);

    // ── Step 7: Validation — recover any dropped places ───────────────────────
    days = validateAndFix(days, places);

    const result: ItineraryResult = {
      destination: dest,
      source: "trip_saved_places",
      preferences,
      summary: { totalDays: days.length, totalItems: places.length },
      days,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
