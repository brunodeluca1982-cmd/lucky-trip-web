/**
 * neighborhoodImages.ts — Single source of truth for neighborhood images.
 *
 * Only local bundled assets are used here — no external URLs, no network calls.
 * When Supabase provides a photo_url, callers use it directly before reaching
 * this file. This file is the final local fallback only.
 *
 * Rule: same neighborhood name = same image, everywhere, always.
 */

import { ImageRequireSource } from "react-native";

export type NeighborhoodImageSource = ImageRequireSource | { uri: string };

// ─────────────────────────────────────────────────────────────────────────────
// Local bundled assets — no network, no CORS, always available offline
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_ASSETS: Record<string, ImageRequireSource> = {
  ipanema:              require("../assets/images/ipanema.png"),
  leblon:               require("../assets/images/ipanema.png"),
  arpoador:             require("../assets/images/ipanema.png"),
  copacabana:           require("../assets/images/hero-rio.png"),
  leme:                 require("../assets/images/hero-rio.png"),
  "santa teresa":       require("../assets/images/cristo.png"),
  corcovado:            require("../assets/images/cristo.png"),
  "cosme velho":        require("../assets/images/cristo.png"),
  "floresta da tijuca": require("../assets/images/secret1.png"),
  "pedra da gavea":     require("../assets/images/secret1.png"),
  botafogo:             require("../assets/images/pao-acucar.png"),
  urca:                 require("../assets/images/pao-acucar.png"),
  flamengo:             require("../assets/images/hotel1.png"),
  catete:               require("../assets/images/hotel1.png"),
  laranjeiras:          require("../assets/images/hotel1.png"),
  "jardim botanico":    require("../assets/images/secret2.png"),
  lagoa:                require("../assets/images/secret2.png"),
  gavea:                require("../assets/images/secret2.png"),
  lapa:                 require("../assets/images/lapa.png"),
  centro:               require("../assets/images/lapa.png"),
  saude:                require("../assets/images/lapa.png"),
  gamboa:               require("../assets/images/lapa.png"),
  gloria:               require("../assets/images/hotel2.png"),
  "barra da tijuca":    require("../assets/images/secret1.png"),
  "sao conrado":        require("../assets/images/secret1.png"),
  recreio:              require("../assets/images/secret1.png"),
  maracana:             require("../assets/images/hero-rio.png"),
  tijuca:               require("../assets/images/hero-rio.png"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Returns the bundled image for a neighborhood, or null if not mapped.
 */
export function getRioNeighborhoodImage(
  neighborhoodName: string | undefined | null,
): NeighborhoodImageSource | null {
  if (!neighborhoodName) return null;
  const key = normalize(neighborhoodName);
  return LOCAL_ASSETS[key] ?? null;
}

/**
 * Like getRioNeighborhoodImage but always returns something — never null.
 * Use this everywhere place card images need a value.
 */
export function getNeighborhoodImage(
  neighborhoodName: string,
): NeighborhoodImageSource {
  const key = normalize(neighborhoodName);
  return LOCAL_ASSETS[key] ?? require("../assets/images/hero-rio.png");
}
