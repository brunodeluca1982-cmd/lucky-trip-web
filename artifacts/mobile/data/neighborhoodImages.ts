/**
 * neighborhoodImages.ts — Single source of truth for all neighborhood images.
 *
 * Priority chain for getNeighborhoodHero() (bairro pages):
 *   1. image_url from Supabase  (set by content team in stay_neighborhoods)
 *   2. getRioNeighborhoodImage(name)  ← web URI from this file
 *   3. city destino.image fallback
 *
 * getNeighborhoodImage() is the only place where neighborhood ↔ image is mapped.
 * Do NOT assign neighborhood images anywhere else in the codebase.
 *
 * Rule: same neighborhood name = same image, everywhere, always.
 *
 * TEMPORARY: until official photos are uploaded to Supabase, each neighborhood
 * maps to one stable Wikipedia Commons image (Special:FilePath permalink format —
 * guaranteed permanent by Wikipedia policy). Priority:
 *   1. Supabase image_url (when set)
 *   2. Web URI below (Google-indexed Wikipedia Commons photo)
 *   3. Local asset fallback (LOCAL_FALLBACK) — safety net if network fails
 */

import { ImageRequireSource } from "react-native";

export type NeighborhoodImageSource = ImageRequireSource | { uri: string };

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2 — Stable Google/Wikipedia image per neighborhood cluster.
// One URI per zone; every neighborhood in a zone shares the same image so the
// look is consistent across all screens.
// URLs use Wikipedia Commons Special:FilePath (permanent redirect, no expiry).
// ─────────────────────────────────────────────────────────────────────────────
const RIO_WEB_IMAGES: Record<string, string> = {
  // ── Zona Sul — beach arc ──────────────────────────────────────────────────
  ipanema:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Ipanema_from_Arpoador.jpg",
  leblon:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Ipanema_from_Arpoador.jpg",
  arpoador:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Ipanema_from_Arpoador.jpg",

  copacabana:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Copacabana_beach_Aerial_2010.jpg",
  leme:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Copacabana_beach_Aerial_2010.jpg",

  // ── Hillside / Cristo ─────────────────────────────────────────────────────
  corcovado:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro,_Brazil.jpg",
  "cosme velho":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro,_Brazil.jpg",
  "santa teresa":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Santa_Teresa_Rio_de_Janeiro_Brasil.jpg",

  // ── Forest / Serra ────────────────────────────────────────────────────────
  "floresta da tijuca":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Floresta_da_Tijuca.jpg",
  "pedra da gavea":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Pedra_da_Gavea_Rio_de_Janeiro.jpg",

  // ── Baía / Sugarloaf ──────────────────────────────────────────────────────
  botafogo:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Pao_de_Acucar_-_Rio_de_Janeiro_-_Brasil.jpg",
  urca:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Pao_de_Acucar_-_Rio_de_Janeiro_-_Brasil.jpg",
  flamengo:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Parque_do_Flamengo_Rio_de_Janeiro.jpg",
  catete:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Parque_do_Flamengo_Rio_de_Janeiro.jpg",
  laranjeiras:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Parque_do_Flamengo_Rio_de_Janeiro.jpg",

  // ── Lagoa / Jardim Botânico ───────────────────────────────────────────────
  "jardim botanico":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Jardim_Botanico_Rio_de_Janeiro.jpg",
  lagoa:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Lagoa_Rodrigo_de_Freitas.jpg",
  gavea:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Lagoa_Rodrigo_de_Freitas.jpg",

  // ── Lapa / Centro ─────────────────────────────────────────────────────────
  lapa:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",
  centro:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",
  saude:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",
  gamboa:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",
  gloria:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",

  // ── Zona Oeste ────────────────────────────────────────────────────────────
  "barra da tijuca":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Barra_da_Tijuca_-_Rio_de_Janeiro_-_Brasil.jpg",
  "sao conrado":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Barra_da_Tijuca_-_Rio_de_Janeiro_-_Brasil.jpg",
  recreio:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Barra_da_Tijuca_-_Rio_de_Janeiro_-_Brasil.jpg",

  // ── Zona Norte ────────────────────────────────────────────────────────────
  maracana:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Maracana_Rio_de_Janeiro.jpg",
  tijuca:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Floresta_da_Tijuca.jpg",
};

// ─────────────────────────────────────────────────────────────────────────────
// Tier 3 — Local asset safety net (used only when no web URI is in the map).
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_FALLBACK: Record<string, ImageRequireSource> = {
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
 * Returns the canonical neighborhood image for the given name, or null.
 * Prefers the stable web URI (tier 2). Falls back to local asset (tier 3).
 * Deterministic: same input → same output, every time, every screen.
 */
export function getRioNeighborhoodImage(
  neighborhoodName: string | undefined | null,
): NeighborhoodImageSource | null {
  if (!neighborhoodName) return null;
  const key = normalize(neighborhoodName);
  const webUri = RIO_WEB_IMAGES[key];
  if (webUri) return { uri: webUri };
  return LOCAL_FALLBACK[key] ?? null;
}

/**
 * Like getRioNeighborhoodImage but always returns something.
 * Use this for place card images in data files (lugares.ts, mockData.ts, etc.).
 */
export function getNeighborhoodImage(
  neighborhoodName: string,
): NeighborhoodImageSource {
  const key = normalize(neighborhoodName);
  const webUri = RIO_WEB_IMAGES[key];
  if (webUri) return { uri: webUri };
  return LOCAL_FALLBACK[key] ?? require("../assets/images/hero-rio.png");
}
