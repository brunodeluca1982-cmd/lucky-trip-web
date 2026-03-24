/**
 * neighborhoodImages.ts — Single source of truth for all neighborhood images.
 *
 * Priority chain for getNeighborhoodHero() (bairro pages):
 *   1. image_url from Supabase (set by content team in stay_neighborhoods)
 *   2. getRioNeighborhoodImage(name)  ← this file
 *   3. city destino.image fallback
 *
 * getNeighborhoodImage() is the only place where neighborhood ↔ image is mapped.
 * Do NOT assign neighborhood images anywhere else in the codebase.
 *
 * Rule: same neighborhood name = same image, everywhere, always.
 */

import { ImageRequireSource } from "react-native";

export type NeighborhoodImageSource = ImageRequireSource | { uri: string };

/**
 * Canonical map of Rio de Janeiro neighborhoods → curated local asset.
 * Keys are normalized (lowercase, accent-stripped).
 * Covering every localizacao used across lugares.ts and bairro pages.
 */
const RIO_IMAGES: Record<string, NeighborhoodImageSource> = {
  // ── Zona Sul beaches ──────────────────────────────────────────────────────
  ipanema:           require("../assets/images/ipanema.png"),
  leblon:            require("../assets/images/ipanema.png"),
  arpoador:          require("../assets/images/ipanema.png"),
  copacabana:        require("../assets/images/hero-rio.png"),
  leme:              require("../assets/images/hero-rio.png"),

  // ── Hillside & forest ─────────────────────────────────────────────────────
  "santa teresa":    require("../assets/images/cristo.png"),
  corcovado:         require("../assets/images/cristo.png"),
  "floresta da tijuca": require("../assets/images/secret1.png"),
  "pedra da gavea":  require("../assets/images/secret1.png"),

  // ── Baía / Sugarloaf area ─────────────────────────────────────────────────
  botafogo:          require("../assets/images/pao-acucar.png"),
  urca:              require("../assets/images/pao-acucar.png"),
  flamengo:          require("../assets/images/hotel1.png"),
  catete:            require("../assets/images/hotel1.png"),
  laranjeiras:       require("../assets/images/hotel1.png"),

  // ── Lagoa / Jardim ────────────────────────────────────────────────────────
  "jardim botanico": require("../assets/images/secret2.png"),
  lagoa:             require("../assets/images/secret2.png"),
  gavea:             require("../assets/images/secret2.png"),

  // ── Lapa / Centro ─────────────────────────────────────────────────────────
  lapa:              require("../assets/images/lapa.png"),
  centro:            require("../assets/images/lapa.png"),
  saude:             require("../assets/images/lapa.png"),
  gamboa:            require("../assets/images/lapa.png"),
  gloria:            require("../assets/images/hotel2.png"),

  // ── Zona Oeste ────────────────────────────────────────────────────────────
  "barra da tijuca": require("../assets/images/secret1.png"),
  "sao conrado":     require("../assets/images/secret1.png"),
  recreio:           require("../assets/images/secret1.png"),

  // ── Zona Norte ────────────────────────────────────────────────────────────
  maracana:          require("../assets/images/hero-rio.png"),
  tijuca:            require("../assets/images/hero-rio.png"),
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Returns the canonical neighborhood image for the given name, or null.
 * Deterministic: same input → same output, every time, every screen.
 */
export function getRioNeighborhoodImage(
  neighborhoodName: string | undefined | null,
): NeighborhoodImageSource | null {
  if (!neighborhoodName) return null;
  return RIO_IMAGES[normalize(neighborhoodName)] ?? null;
}

/**
 * Like getRioNeighborhoodImage but always returns something.
 * Use this for place card images in lugares.ts.
 */
export function getNeighborhoodImage(
  neighborhoodName: string,
): NeighborhoodImageSource {
  return RIO_IMAGES[normalize(neighborhoodName)]
    ?? require("../assets/images/hero-rio.png");
}
