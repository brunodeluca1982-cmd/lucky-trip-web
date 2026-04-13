/**
 * getImageForEntity.ts — Unified image resolver for all entity types.
 *
 * IMAGE PIPELINE:
 *   1. item.photo_url (Supabase column)         → source: supabase
 *   2. place_photos table (server-side cache)   → source: cache
 *   3. Google Places API (server-side only)     → source: google
 *
 * FRONTEND RULES:
 *   - Accept ANY url stored in Supabase photo_url (including cached Google)
 *   - NEVER call Google directly from the frontend
 *   - If photo_url is null → render premium placeholder
 */

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

export type EntityImageSource = { uri: string } | null;

/**
 * Accepts any photo_url from Supabase (including cached Google CDN URLs).
 * Logs the source for debugging. Returns null only if url is empty/falsy.
 */
export function sanitizePhotoUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const cleaned = url.trim();
  if (cleaned.includes("googleusercontent") || cleaned.includes("lh3.google")) {
    console.log("[IMAGE PIPELINE] source: google (cached via Supabase):", cleaned.slice(0, 80));
  } else if (cleaned.includes("supabase.co") || cleaned.includes("res.cloudinary")) {
    console.log("[IMAGE PIPELINE] source: supabase");
  }
  return cleaned;
}

/**
 * Returns { uri: photoUrl } when a valid photo_url is present.
 * Returns null when no image exists — callers must show a premium placeholder.
 */
export function getImageForEntity(
  _type: EntityType,
  _name: string,
  _localizacao?: string,
  supabaseImageUrl?: string | null,
): EntityImageSource {
  const safe = sanitizePhotoUrl(supabaseImageUrl);
  if (safe) return { uri: safe };
  return null;
}
