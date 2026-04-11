/**
 * getImageForEntity.ts — Unified image resolver for all entity types.
 *
 * Priority chain (strict, two tiers only):
 *   1. Supabase photo_url — if set and non-empty, always wins.
 *   2. Local bundled asset — neighborhood or city-specific; CORS-safe, offline-safe.
 *
 * No external URLs. No Google. No Wikipedia. No Unsplash.
 * When Supabase has no photo_url, a local bundled asset is shown.
 *
 * Stability guarantee:
 *   All local resolutions are cached in a module-level Map keyed by
 *   (type:name:localizacao). Same entity → same image on every render.
 */

import { Platform } from "react-native";
import {
  getNeighborhoodImage,
  type NeighborhoodImageSource,
} from "@/data/neighborhoodImages";

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level result cache — keyed by "type:name:localizacao"
// ─────────────────────────────────────────────────────────────────────────────
const _cache = new Map<string, NeighborhoodImageSource>();

function cacheKey(type: EntityType, name: string, localizacao = ""): string {
  return `${type}:${name.toLowerCase().trim()}:${localizacao.toLowerCase().trim()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local bundled city assets — used when Supabase has no photo_url for a city
// ─────────────────────────────────────────────────────────────────────────────
const CITY_LOCAL_ASSETS: Record<string, NeighborhoodImageSource> = {
  "rio de janeiro":  require("../assets/images/hero-rio.png"),
  "santorini":       require("../assets/images/hero-santorini.png"),
  "kyoto":           require("../assets/images/hero-kyoto.png"),
  "lisboa":          require("../assets/images/lapa.png"),
  "buenos aires":    require("../assets/images/secret2.png"),
  "florianopolis":   require("../assets/images/ipanema.png"),
  "florianópolis":   require("../assets/images/ipanema.png"),
  "paraty":          require("../assets/images/lapa.png"),
  "gramado":         require("../assets/images/secret1.png"),
  "miami":           require("../assets/images/hero-rio.png"),
  "paris":           require("../assets/images/secret2.png"),
  "bali":            require("../assets/images/secret1.png"),
  "ilhabela":        require("../assets/images/ipanema.png"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Public resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the canonical image for any entity.
 *
 * @param type             - Entity category for correct local fallback chain
 * @param name             - Entity name (restaurant, hotel, city name, etc.)
 * @param localizacao      - Neighborhood / bairro (used for local asset fallback)
 * @param supabaseImageUrl - Supabase photo_url; overrides everything if non-empty
 */
export function getImageForEntity(
  type: EntityType,
  name: string,
  localizacao?: string,
  supabaseImageUrl?: string | null,
): NeighborhoodImageSource {
  // Tier 1: Supabase photo_url — direct URI, no transformation
  if (supabaseImageUrl && supabaseImageUrl.trim().length > 0) {
    return { uri: supabaseImageUrl.trim() };
  }

  // Tier 2: local bundled asset (cached per entity)
  const key = cacheKey(type, name, localizacao);
  const cached = _cache.get(key);
  if (cached !== undefined) return cached;

  const resolved = _resolveLocal(type, name, localizacao);
  _cache.set(key, resolved);
  return resolved;
}

function _resolveLocal(
  type: EntityType,
  name: string,
  localizacao?: string,
): NeighborhoodImageSource {
  const nameLower = name.toLowerCase().trim();
  const loc = localizacao ?? "";

  switch (type) {
    case "neighborhood":
      return getNeighborhoodImage(name);

    case "restaurant":
    case "hotel":
    case "activity":
      // No Supabase photo: show neighborhood-based bundled asset
      return getNeighborhoodImage(loc || name);

    case "city":
      return (
        CITY_LOCAL_ASSETS[nameLower] ??
        require("../assets/images/hero-rio.png")
      );
  }
}
