import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SavedCategory = "oQueFazer" | "restaurante" | "hotel" | "lucky";
type PeriodoDia    = "manha" | "almoco" | "tarde" | "noite";
type Vibe          = "tranquilo" | "moderado" | "intenso";
type Inspiration   = "gastronomy" | "culture" | "beach" | "adventure" | "lucky";

interface SerializableItem {
  id:         string;
  titulo:     string;
  categoria:  SavedCategory;
  localizacao: string;
}

interface Preferences {
  inspirations: Inspiration[];
  vibe:         Vibe | null;
}

interface RequestBody {
  savedItems:  SerializableItem[];
  destination: string;
  preferences: Preferences;
}

interface DiaPeriodo {
  periodo: PeriodoDia;
  items:   SerializableItem[];
}

interface DiaRoteiro {
  numero:   number;
  bairro:   string;
  periodos: DiaPeriodo[];
}

interface ItineraryResult {
  destination: string;
  source:      "trip_saved_places";
  preferences: Preferences;
  summary: {
    totalDays:  number;
    totalItems: number;
  };
  days: DiaRoteiro[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_AFFINITY: Record<Inspiration, Partial<Record<SavedCategory, number>>> = {
  gastronomy: { restaurante: 2, oQueFazer: 0, lucky: 1, hotel: 0 },
  culture:    { restaurante: 0, oQueFazer: 2, lucky: 1, hotel: 0 },
  beach:      { restaurante: 1, oQueFazer: 2, lucky: 1, hotel: 0 },
  adventure:  { restaurante: 0, oQueFazer: 2, lucky: 2, hotel: 0 },
  lucky:      { restaurante: 1, oQueFazer: 1, lucky: 3, hotel: 0 },
};

const VIBE_MAX_ITEMS: Record<Vibe, number> = {
  tranquilo: 3,
  moderado:  5,
  intenso:   99,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function tipoFromCategoria(cat: SavedCategory): "atividade" | "restaurante" | "hotel" {
  if (cat === "restaurante") return "restaurante";
  if (cat === "hotel")       return "hotel";
  return "atividade";
}

function itemScore(cat: SavedCategory, inspirations: Inspiration[]): number {
  if (!inspirations.length) return 0;
  return inspirations.reduce(
    (sum, ins) => sum + (CATEGORY_AFFINITY[ins][cat] ?? 0),
    0,
  );
}

// ── getSavedPlacesForUser ────────────────────────────────────────────────────
// Items are passed from the frontend (already resolved). This function validates
// and normalises them so the rest of the pipeline is always clean.

function getSavedPlacesForUser(raw: SerializableItem[]): SerializableItem[] {
  return raw.filter(
    (i) =>
      i &&
      typeof i.id         === "string" &&
      typeof i.titulo     === "string" &&
      typeof i.categoria  === "string" &&
      typeof i.localizacao === "string",
  );
}

// ── inferDestinationFromSavedPlaces ──────────────────────────────────────────

function inferDestinationFromSavedPlaces(
  _items: SerializableItem[],
  fallback: string,
): string {
  return fallback || "Rio de Janeiro";
}

// ── groupPlacesByArea ─────────────────────────────────────────────────────────

function groupPlacesByArea(
  items: SerializableItem[],
): Map<string, SerializableItem[]> {
  const map = new Map<string, SerializableItem[]>();
  for (const item of items) {
    const bairro = item.localizacao.trim() || "Rio de Janeiro";
    if (!map.has(bairro)) map.set(bairro, []);
    map.get(bairro)!.push(item);
  }
  return map;
}

// ── distributePlacesIntoDays ──────────────────────────────────────────────────

function distributePlacesIntoDays(
  byArea: Map<string, SerializableItem[]>,
  preferences: Preferences,
): DiaRoteiro[] {
  const { inspirations, vibe } = preferences;
  let diaNum = 1;
  const days: DiaRoteiro[] = [];

  for (const [bairro, areaItems] of byArea) {
    const atividades   = areaItems.filter(i => tipoFromCategoria(i.categoria) === "atividade");
    const restaurantes = areaItems.filter(i => tipoFromCategoria(i.categoria) === "restaurante");

    if (inspirations.length > 0) {
      atividades.sort((a, b) => itemScore(b.categoria, inspirations) - itemScore(a.categoria, inspirations));
      restaurantes.sort((a, b) => itemScore(b.categoria, inspirations) - itemScore(a.categoria, inspirations));
    }

    const meio   = Math.ceil(atividades.length / 2);
    const manha  = atividades.slice(0, meio);
    const tarde  = atividades.slice(meio);
    const almoco = restaurantes.slice(0, 1);
    const noite  = restaurantes.slice(1);

    const periodos: DiaPeriodo[] = [];
    if (manha.length)  periodos.push({ periodo: "manha",  items: manha  });
    if (almoco.length) periodos.push({ periodo: "almoco", items: almoco });
    if (tarde.length)  periodos.push({ periodo: "tarde",  items: tarde  });
    if (noite.length)  periodos.push({ periodo: "noite",  items: noite  });

    if (!periodos.length) continue;
    days.push({ numero: diaNum++, bairro, periodos });
  }

  if (!vibe) return days;

  const maxItems = VIBE_MAX_ITEMS[vibe];
  const capped: DiaRoteiro[] = [];
  let num = 1;

  for (const dia of days) {
    let remaining = maxItems;
    const cappedPeriodos: DiaPeriodo[] = [];

    for (const p of dia.periodos) {
      if (remaining <= 0) break;
      const sliced = p.items.slice(0, remaining);
      remaining -= sliced.length;
      if (sliced.length) cappedPeriodos.push({ ...p, items: sliced });
    }

    if (cappedPeriodos.length) {
      capped.push({ ...dia, numero: num++, periodos: cappedPeriodos });
    }
  }

  return capped;
}

// ── refineItineraryWithGemini ─────────────────────────────────────────────────
// Optional pass — gracefully skipped if GEMINI_API_KEY is not set.
// Sends compact structured data; Gemini may only reorder items within periods.

async function refineItineraryWithGemini(
  days: DiaRoteiro[],
  preferences: Preferences,
  destination: string,
): Promise<DiaRoteiro[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !days.length) return days;

  const compact = days.map((d) => ({
    numero: d.numero,
    bairro: d.bairro,
    periodos: d.periodos.map((p) => ({
      periodo: p.periodo,
      items: p.items.map((i) => ({ id: i.id, titulo: i.titulo, categoria: i.categoria })),
    })),
  }));

  const prompt =
    `You are a travel planner for ${destination}.\n` +
    `Below is a structured JSON itinerary. Return an improved version.\n` +
    `Rules:\n` +
    `- ONLY reorder items within each periodo for better flow\n` +
    `- Do NOT add, remove, or rename any place\n` +
    `- Do NOT change bairros, IDs, or categories\n` +
    `- Keep the same JSON structure exactly\n` +
    `User preferences: inspirations=[${preferences.inspirations.join(",")}], vibe=${preferences.vibe ?? "moderado"}\n\n` +
    `JSON:\n${JSON.stringify(compact)}\n\n` +
    `Return ONLY the JSON array. No markdown, no prose.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      },
    );

    if (!res.ok) return days;

    const data   = await res.json();
    const text   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean  = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const refined = JSON.parse(clean) as typeof compact;

    if (!Array.isArray(refined) || !refined.length) return days;

    // Re-hydrate full items from the original days map
    const itemMap = new Map<string, SerializableItem>();
    for (const dia of days) {
      for (const p of dia.periodos) {
        for (const item of p.items) itemMap.set(item.id, item);
      }
    }

    return refined.map((d, i) => ({
      numero: i + 1,
      bairro: d.bairro,
      periodos: d.periodos.map((p) => ({
        periodo: p.periodo as PeriodoDia,
        items: p.items
          .map((ri) => itemMap.get(ri.id))
          .filter(Boolean) as SerializableItem[],
      })).filter((p) => p.items.length > 0),
    })).filter((d) => d.periodos.length > 0);
  } catch (_) {
    return days;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      savedItems  = [],
      destination = "Rio de Janeiro",
      preferences = { inspirations: [], vibe: "moderado" },
    } = body;

    const items      = getSavedPlacesForUser(savedItems);
    const actionable = items.filter((i) => i.categoria !== "hotel");
    const dest       = inferDestinationFromSavedPlaces(actionable, destination);
    const byArea     = groupPlacesByArea(actionable);
    let days         = distributePlacesIntoDays(byArea, preferences);

    days = await refineItineraryWithGemini(days, preferences, dest);
    days = days.map((d, i) => ({ ...d, numero: i + 1 }));

    const result: ItineraryResult = {
      destination: dest,
      source:      "trip_saved_places",
      preferences,
      summary: {
        totalDays:  days.length,
        totalItems: actionable.length,
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status:  400,
      },
    );
  }
});
