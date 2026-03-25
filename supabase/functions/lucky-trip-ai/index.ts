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
  id:          string;
  titulo:      string;
  categoria:   SavedCategory;
  localizacao: string;
}

interface Preferences {
  inspirations: Inspiration[];
  vibe:         Vibe | null;
}

interface RequestBody {
  savedItems:    SerializableItem[];
  destination:   string;
  preferences:   Preferences;
  requestedDays?: number;
  startDate?:    string;
  endDate?:      string;
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

// Gemini output shape
interface GeminiDayItem {
  time:     "morning" | "afternoon" | "evening";
  place_id: string;
  name:     string;
}

interface GeminiDay {
  day:   number;
  area:  string;
  items: GeminiDayItem[];
}

interface GeminiResult {
  destination: string;
  days:        GeminiDay[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_AFFINITY: Record<Inspiration, Partial<Record<SavedCategory, number>>> = {
  gastronomy: { restaurante: 2, oQueFazer: 0, lucky: 1, hotel: 0 },
  culture:    { restaurante: 0, oQueFazer: 2, lucky: 1, hotel: 0 },
  beach:      { restaurante: 1, oQueFazer: 2, lucky: 1, hotel: 0 },
  adventure:  { restaurante: 0, oQueFazer: 2, lucky: 2, hotel: 0 },
  lucky:      { restaurante: 1, oQueFazer: 1, lucky: 3, hotel: 0 },
};

const VIBE_ITEMS_PER_DAY: Record<Vibe, number> = {
  tranquilo: 3,
  moderado:  4,
  intenso:   6,
};

// Map Gemini time slot → DiaRoteiro periodo
const TIME_TO_PERIODO: Record<string, PeriodoDia> = {
  morning:   "manha",
  afternoon: "tarde",
  evening:   "noite",
};

// ── getSavedPlacesForUser ─────────────────────────────────────────────────────

function getSavedPlacesForUser(raw: SerializableItem[]): SerializableItem[] {
  return (raw ?? []).filter(
    (i) =>
      i &&
      typeof i.id          === "string" &&
      typeof i.titulo      === "string" &&
      typeof i.categoria   === "string" &&
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

// ── computeTripLength ─────────────────────────────────────────────────────────

function computeTripLength(
  items: SerializableItem[],
  vibe: Vibe | null,
  requested?: number,
): number {
  if (requested && requested > 0) return requested;
  const perDay = VIBE_ITEMS_PER_DAY[vibe ?? "moderado"];
  return Math.max(1, Math.ceil(items.length / perDay));
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

// ── distributePlacesIntoDays (deterministic fallback) ─────────────────────────

function itemScore(cat: SavedCategory, inspirations: Inspiration[]): number {
  if (!inspirations.length) return 0;
  return inspirations.reduce(
    (sum, ins) => sum + (CATEGORY_AFFINITY[ins][cat] ?? 0),
    0,
  );
}

function tipoFromCategoria(cat: SavedCategory): "atividade" | "restaurante" | "hotel" {
  if (cat === "restaurante") return "restaurante";
  if (cat === "hotel")       return "hotel";
  return "atividade";
}

function distributePlacesIntoDays(
  items: SerializableItem[],
  preferences: Preferences,
  tripLength: number,
): DiaRoteiro[] {
  const { inspirations, vibe } = preferences;

  // Sort by affinity then group by area
  const sorted = inspirations.length > 0
    ? [...items].sort((a, b) => itemScore(b.categoria, inspirations) - itemScore(a.categoria, inspirations))
    : [...items];

  const byArea = groupPlacesByArea(sorted);
  const perDay = VIBE_ITEMS_PER_DAY[vibe ?? "moderado"];
  let diaNum   = 1;
  const days: DiaRoteiro[] = [];

  for (const [bairro, areaItems] of byArea) {
    const atividades   = areaItems.filter(i => tipoFromCategoria(i.categoria) === "atividade");
    const restaurantes = areaItems.filter(i => tipoFromCategoria(i.categoria) === "restaurante");

    // Chunk area items into days based on perDay cap
    const allForArea = [
      ...atividades.slice(0, Math.ceil(perDay * 0.6)),
      ...restaurantes,
    ];

    const chunks: SerializableItem[][] = [];
    for (let i = 0; i < allForArea.length; i += perDay) {
      chunks.push(allForArea.slice(i, i + perDay));
    }

    for (const chunk of chunks) {
      const periodos: DiaPeriodo[] = [];
      const atv  = chunk.filter(i => tipoFromCategoria(i.categoria) === "atividade");
      const rest = chunk.filter(i => tipoFromCategoria(i.categoria) === "restaurante");

      const meio   = Math.ceil(atv.length / 2);
      const manha  = atv.slice(0, meio);
      const tarde  = atv.slice(meio);
      const almoco = rest.slice(0, 1);
      const noite  = rest.slice(1);

      if (manha.length)  periodos.push({ periodo: "manha",  items: manha  });
      if (almoco.length) periodos.push({ periodo: "almoco", items: almoco });
      if (tarde.length)  periodos.push({ periodo: "tarde",  items: tarde  });
      if (noite.length)  periodos.push({ periodo: "noite",  items: noite  });

      if (periodos.length) days.push({ numero: diaNum++, bairro, periodos });
    }
  }

  // Renumber sequentially
  return days
    .slice(0, Math.max(tripLength, days.length))
    .map((d, i) => ({ ...d, numero: i + 1 }));
}

// ── generateItineraryWithGemini (primary) ─────────────────────────────────────
// Uses the full generation prompt — Gemini builds the complete itinerary.
// Falls back to distributePlacesIntoDays on any failure.

async function generateItineraryWithGemini(
  items: SerializableItem[],
  destination: string,
  preferences: Preferences,
  tripLength: number,
  startDate: string,
  endDate: string,
): Promise<DiaRoteiro[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  // Build a compact places array for the prompt
  const places = items.map((i) => ({
    id:       i.id,
    name:     i.titulo,
    category: i.categoria,
    area:     i.localizacao || "Rio de Janeiro",
  }));

  const prompt = `
You are an expert travel planner generating structured itineraries.

Your job is to create a COMPLETE travel plan.

CRITICAL RULES (MUST FOLLOW):
- You MUST create EXACTLY ${tripLength} days
- You MUST distribute ALL places across days
- You CANNOT put all places in one day
- You MUST spread places evenly across days
- Each day MUST have at least 2 items
- Prefer 2–4 items per day depending on total places
- Group places by proximity (area)
- Do NOT invent places
- Use ONLY the provided places
- Output STRICT JSON (no markdown, no text)

TIME LOGIC:
- morning → attractions, experiences (oQueFazer, lucky)
- afternoon → attractions or light activities
- evening → restaurants (restaurante) or nightlife

USER CONTEXT:
Destination: ${destination}
Trip length: ${tripLength} days
Start date: ${startDate}
End date: ${endDate}

Preferences:
${JSON.stringify({ inspirations: preferences.inspirations, vibe: preferences.vibe })}

Places:
${JSON.stringify(places)}

OUTPUT FORMAT (STRICT):
{
  "destination": "${destination}",
  "days": [
    {
      "day": 1,
      "area": "string",
      "items": [
        {
          "time": "morning",
          "place_id": "id",
          "name": "name"
        },
        {
          "time": "afternoon",
          "place_id": "id",
          "name": "name"
        },
        {
          "time": "evening",
          "place_id": "id",
          "name": "name"
        }
      ]
    }
  ]
}

VALIDATION BEFORE RETURN:
- Check if number of days == ${tripLength}
- Check if places are distributed
- Check if no day is empty
- Check if JSON is valid

If any rule is broken, FIX before returning.
You are NOT allowed to return fewer than ${tripLength} days.
You are NOT allowed to cluster all items in one day.
Failure to comply is an error.
`.trim();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:     0.3,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!res.ok) return null;

    const data  = await res.json();
    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed: GeminiResult = JSON.parse(clean);
    if (!parsed?.days?.length) return null;

    // Build a lookup so we can re-attach full SerializableItem data by place_id
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const days: DiaRoteiro[] = parsed.days
      .map((gDay) => {
        // Group items by time slot → periodo
        const byTime = new Map<PeriodoDia, SerializableItem[]>();

        for (const gItem of gDay.items ?? []) {
          const periodo = TIME_TO_PERIODO[gItem.time] ?? "tarde";
          const full    = itemMap.get(gItem.place_id);
          if (!full) continue; // skip invented places

          if (!byTime.has(periodo)) byTime.set(periodo, []);
          byTime.get(periodo)!.push(full);
        }

        // Preserve natural period order: manha, almoco, tarde, noite
        const ORDER: PeriodoDia[] = ["manha", "almoco", "tarde", "noite"];
        const periodos: DiaPeriodo[] = ORDER
          .filter((p) => byTime.has(p))
          .map((p) => ({ periodo: p, items: byTime.get(p)! }));

        return {
          numero:   gDay.day,
          bairro:   gDay.area || "Rio de Janeiro",
          periodos,
        };
      })
      .filter((d) => d.periodos.length > 0);

    if (!days.length) return null;

    return days.map((d, i) => ({ ...d, numero: i + 1 }));
  } catch (_) {
    return null;
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
      savedItems    = [],
      destination   = "Rio de Janeiro",
      preferences   = { inspirations: [], vibe: "moderado" },
      requestedDays,
      startDate     = "",
      endDate       = "",
    } = body;

    const items      = getSavedPlacesForUser(savedItems);
    const actionable = items.filter((i) => i.categoria !== "hotel");
    const dest       = inferDestinationFromSavedPlaces(actionable, destination);
    const tripLength = computeTripLength(actionable, preferences.vibe ?? "moderado", requestedDays);

    // Try AI-first generation; fall back to deterministic if unavailable
    let days =
      await generateItineraryWithGemini(
        actionable, dest, preferences, tripLength, startDate, endDate,
      ) ??
      distributePlacesIntoDays(actionable, preferences, tripLength);

    // Always ensure sequential numbering
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
