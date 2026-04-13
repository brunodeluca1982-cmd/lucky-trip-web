/**
 * getImageForEntity.ts — Unified image resolver for all entity types.
 *
 * STRICT RULE: Supabase photo_url ONLY.
 * - lh3.googleusercontent.com URLs are BANNED.
 * - Any Google CDN URL is treated as null.
 * - No fallback to external APIs or local assets.
 */

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

export type EntityImageSource = { uri: string } | null;

/**
 * Sanitizes a photo_url value.
 * Returns null if the URL is from Google (googleusercontent / lh3.google).
 * Logs an error if a violation is detected.
 */
export function sanitizePhotoUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  if (url.includes("googleusercontent") || url.includes("lh3.google")) {
    console.error("[INVALID IMAGE SOURCE] Google URL blocked:", url);
    return null;
  }
  return url.trim();
}

/**
 * Returns { uri: supabaseImageUrl } when a valid Supabase photo_url is present.
 * Returns null when no Supabase image exists — callers must show a placeholder.
 *
 * @param supabaseImageUrl - Supabase photo_url / hero_image_url
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
