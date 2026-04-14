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

  // ALLOW: Google image URLs (cached via Supabase) — valid for entity images
  if (cleaned.includes("googleusercontent.com") || cleaned.includes("lh3.google")) {
    console.log("[IMAGE PIPELINE] source: google", cleaned.slice(0, 80));
    return cleaned;
  }

  // ALLOW: Cloudinary — first-class image source (video frames + hero images)
  if (cleaned.includes("res.cloudinary.com")) {
    console.log("[IMAGE PIPELINE] source: cloudinary:", cleaned.slice(0, 80));
    return cleaned;
  }

  // ALLOW: Supabase Storage
  if (cleaned.includes("supabase.co")) {
    console.log("[IMAGE PIPELINE] source: supabase");
    return cleaned;
  }

  // ALLOW: all other CDN sources (Unsplash, etc.)
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
