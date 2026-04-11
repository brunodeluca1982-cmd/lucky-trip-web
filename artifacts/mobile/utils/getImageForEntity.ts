/**
 * getImageForEntity.ts — Unified image resolver for all entity types.
 *
 * Rule: Supabase photo_url only. Returns null when no Supabase image exists.
 * Never shows a local bundled asset as a substitute for a real entity photo.
 */

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

export type EntityImageSource = { uri: string } | null;

/**
 * Returns { uri: supabaseImageUrl } when a valid Supabase photo_url is present.
 * Returns null when no Supabase image exists — callers must handle null.
 *
 * @param supabaseImageUrl - Supabase photo_url / hero_image_url
 */
export function getImageForEntity(
  _type: EntityType,
  _name: string,
  _localizacao?: string,
  supabaseImageUrl?: string | null,
): EntityImageSource {
  if (supabaseImageUrl && supabaseImageUrl.trim().length > 0) {
    return { uri: supabaseImageUrl.trim() };
  }
  return null;
}
