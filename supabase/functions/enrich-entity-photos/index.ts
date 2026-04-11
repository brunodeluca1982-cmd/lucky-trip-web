/**
 * enrich-entity-photos/index.ts
 *
 * Fetches real photos from Google Places for entity table rows that lack photo_url.
 * Writes back to the entity table and caches in place_photos.
 *
 * POST body:
 *   table?:       "stay_hotels" | "lucky_list_rio" | "restaurantes" | "o_que_fazer_rio"
 *                  (default: all four)
 *   batch_size?:  number  (default 20, max 50)
 *   force?:       boolean (default false — skip rows that already have photo_url)
 *
 * Uses GOOGLE_MAPS_API_KEY + SUPABASE_SERVICE_ROLE_KEY from Supabase secrets.
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Table config ──────────────────────────────────────────────────────────────
//
// activeCol: column used to filter active rows.
//   - null means the table has no active/ativo column → no filter applied.
//   - o_que_fazer_rio and lucky_list_rio have NO ativo column; applying
//     `.eq("ativo", true)` on them returns a PostgREST "column not found"
//     error and silently skips enrichment for those tables entirely.

interface TableConfig {
  nameCol:         string;
  neighborhoodCol: string;
  activeCol:       string | null;
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  restaurantes:    { nameCol: "nome",       neighborhoodCol: "bairro",            activeCol: "ativo"  },
  stay_hotels:     { nameCol: "hotel_name", neighborhoodCol: "neighborhood_slug", activeCol: "active" },
  o_que_fazer_rio: { nameCol: "nome",       neighborhoodCol: "bairro",            activeCol: null     },
  lucky_list_rio:  { nameCol: "nome",       neighborhoodCol: "bairro",            activeCol: null     },
};

// ── Google Places helpers ─────────────────────────────────────────────────────

async function findPlace(
  query: string,
  key: string,
): Promise<{ placeId: string; photoRef: string | null } | null> {
  const url =
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json" +
    `?input=${encodeURIComponent(query + " Rio de Janeiro")}` +
    "&inputtype=textquery" +
    "&fields=place_id,photos" +
    `&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;
  const candidate = data.candidates?.[0];
  if (!candidate?.place_id) return null;
  const photoRef = candidate.photos?.[0]?.photo_reference ?? null;
  return { placeId: candidate.place_id, photoRef };
}

async function getPhotoRef(placeId: string, key: string): Promise<string | null> {
  const url =
    "https://maps.googleapis.com/maps/api/place/details/json" +
    `?place_id=${placeId}` +
    "&fields=photos" +
    `&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.result?.photos?.[0]?.photo_reference ?? null;
}

/**
 * Resolve a photo_reference to a stable CDN URL (lh3.googleusercontent.com).
 *
 * FIX: The previous implementation used `redirect: "manual"` and tried to read
 * the `Location` header. In Deno/Supabase edge functions, opaque redirect
 * responses do NOT expose the Location header, so the CDN URL was never
 * captured and the fallback stored the raw Google API URL (with embedded key).
 *
 * Fix: use the default `redirect: "follow"`. After following the 302, `res.url`
 * is the final CDN URL (lh3.googleusercontent.com/...) — stable, keyless, permanent.
 */
async function resolvePhotoCdnUrl(photoRef: string, key: string): Promise<string | null> {
  const apiUrl =
    "https://maps.googleapis.com/maps/api/place/photo" +
    `?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${key}`;
  try {
    // redirect: "follow" (default) — Deno follows the 302 and exposes the
    // final URL via res.url, which is the keyless lh3.googleusercontent.com CDN URL.
    const res = await fetch(apiUrl);
    if (!res.ok) return null;

    // res.url is the URL of the final response after following all redirects.
    // When Google redirects to the CDN, res.url === "https://lh3.googleusercontent.com/..."
    // which is a permanent URL with no API key embedded.
    const finalUrl = res.url;
    if (finalUrl && finalUrl.startsWith("http") && !finalUrl.includes("googleapis.com/maps/api")) {
      return finalUrl;
    }

    // If for any reason the CDN redirect didn't happen (direct 200 from Google),
    // do NOT store the API URL with the embedded key. Return null so the row
    // stays unset and can be retried later.
    return null;
  } catch {
    return null;
  }
}

async function enrichRow(
  supabase: ReturnType<typeof createClient>,
  table: string,
  row: Record<string, unknown>,
  nameCol: string,
  neighborhoodCol: string,
  googleKey: string,
): Promise<{ id: string; status: string; url?: string }> {
  const id     = row.id as string;
  const name   = row[nameCol] as string;
  const bairro = (row[neighborhoodCol] as string) ?? "";

  // 1. Check place_photos cache first — avoids ANY Google call if we've
  //    already enriched this entity in a previous run.
  const { data: cached } = await supabase
    .from("place_photos")
    .select("photo_url")
    .eq("item_id", id)
    .eq("item_type", table)
    .maybeSingle();

  if (cached?.photo_url) {
    // Already cached — write back to entity table if missing, then stop.
    // This is the only write; no Google call is made.
    await supabase
      .from(table)
      .update({ photo_url: cached.photo_url })
      .eq("id", id);
    return { id, status: "from_cache", url: cached.photo_url };
  }

  // 2. Find via Google Places — called ONCE per place, result cached immediately.
  const query = `${name} ${bairro}`;
  const found = await findPlace(query, googleKey);
  if (!found) return { id, status: "not_found" };

  let photoRef = found.photoRef;
  if (!photoRef) {
    // findPlace returned a place_id but no photo; fetch from Place Details.
    photoRef = await getPhotoRef(found.placeId, googleKey);
  }
  if (!photoRef) return { id, status: "no_photo_reference" };

  // 3. Resolve photo_reference → stable CDN URL (lh3.googleusercontent.com).
  //    Never stores the Google API URL with the embedded key.
  const cdnUrl = await resolvePhotoCdnUrl(photoRef, googleKey);
  if (!cdnUrl) return { id, status: "cdn_resolve_failed" };

  // 4. Write to entity table — photo_url is now permanently set.
  //    Future runs will skip this row (photo_url IS NOT NULL).
  await supabase
    .from(table)
    .update({ photo_url: cdnUrl })
    .eq("id", id);

  // 5. Cache in place_photos — guards against entity table resets.
  //    upsert ensures idempotency if the function is called concurrently.
  await supabase
    .from("place_photos")
    .upsert(
      {
        item_id:               id,
        item_type:             table,
        place_query:           query,
        place_id:              found.placeId,
        photo_url:             cdnUrl,
        photo_source:          "google_places",
        photo_last_fetched_at: new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      },
      { onConflict: "item_id,item_type" },
    );

  return { id, status: "enriched", url: cdnUrl };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!googleKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not set" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  const body      = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const tables    = body.tables    ?? Object.keys(TABLE_CONFIGS);
  const batchSize = Math.min(Number(body.batch_size ?? 20), 50);
  const force     = Boolean(body.force ?? false);

  const summary: Record<string, unknown> = {};

  for (const table of tables) {
    const cfg = TABLE_CONFIGS[table];
    if (!cfg) { summary[table] = { error: "unknown table" }; continue; }

    // Build the base query — select only the columns needed for enrichment.
    let query = supabase
      .from(table)
      .select(`id, ${cfg.nameCol}, ${cfg.neighborhoodCol}`)
      .limit(batchSize);

    // FIX: Only apply the active filter when the table actually has that column.
    // o_que_fazer_rio and lucky_list_rio have no "ativo" column — applying
    // .eq("ativo", true) on them produces a PostgREST error that silently
    // skips enrichment for those tables entirely.
    if (cfg.activeCol) {
      query = query.eq(cfg.activeCol, true);
    }

    // Only process rows that need enrichment (no photo yet), unless force=true.
    if (!force) {
      query = query.or("photo_url.is.null,photo_url.eq.");
    }

    const { data: rows, error } = await query;
    if (error) { summary[table] = { error: error.message }; continue; }
    if (!rows?.length) { summary[table] = { processed: 0, note: "all rows have photos" }; continue; }

    const results = await Promise.allSettled(
      rows.map((row) =>
        enrichRow(supabase, table, row as Record<string, unknown>, cfg.nameCol, cfg.neighborhoodCol, googleKey)
      ),
    );

    const counts = { enriched: 0, from_cache: 0, not_found: 0, failed: 0 };
    for (const r of results) {
      if (r.status === "rejected") { counts.failed++; continue; }
      const s = r.value.status;
      if      (s === "enriched")                                                     counts.enriched++;
      else if (s === "from_cache")                                                   counts.from_cache++;
      else if (s === "not_found" || s === "no_photo_reference" || s === "cdn_resolve_failed") counts.not_found++;
    }
    summary[table] = { processed: rows.length, ...counts };
  }

  return new Response(
    JSON.stringify({ ok: true, summary }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
