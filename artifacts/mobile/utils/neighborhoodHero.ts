/**
 * neighborhoodHero.ts
 *
 * Resolves the correct hero image for a neighborhood page.
 *
 * Priority:
 *   1. image_url from Supabase  (populated by content team)
 *   2. Curated per-neighborhood image  (local asset map)
 *   3. Safe city-wide fallback  (destino.image — never null)
 */

import { getRioNeighborhoodImage } from "@/data/neighborhoodImages";

type AnyImageSource = { uri: string } | number;

export function getNeighborhoodHero(
  supabaseImageUrl: string | null | undefined,
  neighborhoodName: string | null | undefined,
  destinoImage: AnyImageSource,
): AnyImageSource {
  if (supabaseImageUrl) return { uri: supabaseImageUrl };

  const curated = getRioNeighborhoodImage(neighborhoodName);
  if (curated !== null) return curated;

  return destinoImage;
}
