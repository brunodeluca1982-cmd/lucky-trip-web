/**
 * neighborhoodImages.ts
 *
 * Per-neighborhood hero images for Rio de Janeiro.
 * Used as the second tier in the hero image priority chain:
 *   1. image_url from Supabase (if populated)
 *   2. Curated image from this file  ← here
 *   3. City-wide destino.image fallback
 */

import { ImageRequireSource } from "react-native";

type LocalImage = ImageRequireSource;
type RemoteImage = { uri: string };
export type NeighborhoodImageSource = LocalImage | RemoteImage;

/**
 * Maps lowercase + accent-stripped neighborhood names to their curated images.
 * Keys are matched case-insensitively after normalizing.
 */
const RIO_IMAGES: Record<string, NeighborhoodImageSource> = {
  ipanema:         require("../assets/images/ipanema.png"),
  leblon:          require("../assets/images/ipanema.png"),
  lapa:            require("../assets/images/lapa.png"),
  "santa teresa":  require("../assets/images/cristo.png"),
  botafogo:        require("../assets/images/pao-acucar.png"),
  urca:            require("../assets/images/pao-acucar.png"),
  flamengo:        require("../assets/images/hotel1.png"),
  "barra da tijuca": require("../assets/images/secret1.png"),
  gloria:          require("../assets/images/hotel2.png"),
  centro:          require("../assets/images/lapa.png"),
  copacabana:      require("../assets/images/hero-rio.png"),
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Returns the curated per-neighborhood image for Rio, or null if not found.
 */
export function getRioNeighborhoodImage(
  neighborhoodName: string | undefined | null,
): NeighborhoodImageSource | null {
  if (!neighborhoodName) return null;
  return RIO_IMAGES[normalize(neighborhoodName)] ?? null;
}
