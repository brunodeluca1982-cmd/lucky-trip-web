/**
 * getImageForEntity.ts — Unified, stable image resolver for all entity types.
 *
 * Priority chain (strict, never skipped):
 *   1. Supabase image_url / photo_url  — if set and non-empty, always wins
 *   2. Curated entity-specific web URI — stable Wikipedia Commons permalink
 *   3. Neighborhood-based web URI      — via getNeighborhoodImage(localizacao)
 *   4. Local asset fallback            — bundled .png, always available offline
 *
 * Stability guarantee:
 *   - All resolutions are cached in a module-level Map keyed by (type:name:localizacao).
 *   - Same entity → same image on every screen, every render, every session.
 *   - No random images, no variation between renders.
 *
 * TEMPORARY: entity-specific images use Wikipedia Commons Special:FilePath links
 * (permanent redirect URLs, guaranteed by Wikipedia policy) until official photos
 * are uploaded to Supabase.
 */

import {
  getNeighborhoodImage,
  type NeighborhoodImageSource,
} from "@/data/neighborhoodImages";

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level result cache — keyed by "type:name:localizacao"
// Populated once per entity; subsequent calls return the cached value instantly.
// ─────────────────────────────────────────────────────────────────────────────
const _cache = new Map<string, NeighborhoodImageSource>();

function cacheKey(type: EntityType, name: string, localizacao = ""): string {
  return `${type}:${name.toLowerCase().trim()}:${localizacao.toLowerCase().trim()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated entity images (tier 2)
// Wikipedia Commons Special:FilePath links — deterministic, permanent URLs.
// ─────────────────────────────────────────────────────────────────────────────

const RESTAURANT_WEB_IMAGES: Record<string, string> = {
  "confeitaria colombo":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Confeitaria_Colombo_Rio_de_Janeiro.jpg",
  "oro restaurant":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Ipanema_from_Arpoador.jpg",
  "beco das sardinhas":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",
  "cobri":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arcos_da_Lapa_-_Rio_de_Janeiro.jpg",
  "banzeiro":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Pao_de_Acucar_-_Rio_de_Janeiro_-_Brasil.jpg",
};

const HOTEL_WEB_IMAGES: Record<string, string> = {
  "copacabana palace":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Copacabana_Palace_Hotel.jpg",
  "santa teresa hotel":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Santa_Teresa_Rio_de_Janeiro_Brasil.jpg",
  "hotel santa teresa":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Santa_Teresa_Rio_de_Janeiro_Brasil.jpg",
};

const CITY_WEB_IMAGES: Record<string, string> = {
  "rio de janeiro":  "https://commons.wikimedia.org/wiki/Special:FilePath/Ipanema_from_Arpoador.jpg",
  "santorini":       "https://commons.wikimedia.org/wiki/Special:FilePath/Oia_Santorini.jpg",
  "kyoto":           "https://commons.wikimedia.org/wiki/Special:FilePath/Kyoto_-_Fushimi_Inari_-_Torii.jpg",
  "lisboa":          "https://commons.wikimedia.org/wiki/Special:FilePath/Lisboa-Alfama-Church-dsc04453.jpg",
  "buenos aires":    "https://commons.wikimedia.org/wiki/Special:FilePath/Buenos_Aires_Montage_2015.jpg",
  "florianopolis":   "https://commons.wikimedia.org/wiki/Special:FilePath/Florianopolis-SC.jpg",
  "florianópolis":   "https://commons.wikimedia.org/wiki/Special:FilePath/Florianopolis-SC.jpg",
  "paraty":          "https://commons.wikimedia.org/wiki/Special:FilePath/Paraty_-_Igreja_de_Santa_Rita.jpg",
  "gramado":         "https://commons.wikimedia.org/wiki/Special:FilePath/Gramado_RS_Brasil.jpg",
  "miami":           "https://commons.wikimedia.org/wiki/Special:FilePath/South_Beach_20080315.jpg",
  "paris":           "https://commons.wikimedia.org/wiki/Special:FilePath/Paris_-_Eiffelturm_und_Marsfeld2.jpg",
  "bali":            "https://commons.wikimedia.org/wiki/Special:FilePath/Tanah_Lot_Bali.jpg",
};

// ─────────────────────────────────────────────────────────────────────────────
// Public resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the canonical image for any entity.
 *
 * @param type           - Entity category for correct fallback chain
 * @param name           - Entity name (restaurant, hotel, city name, etc.)
 * @param localizacao    - Neighborhood / bairro (used for neighborhood fallback)
 * @param supabaseImageUrl - Direct Supabase photo_url; overrides everything if set
 */
export function getImageForEntity(
  type: EntityType,
  name: string,
  localizacao?: string,
  supabaseImageUrl?: string | null,
): NeighborhoodImageSource {
  // ── Tier 1: Supabase image (always wins, not cached — may change between syncs) ──
  if (supabaseImageUrl && supabaseImageUrl.trim().length > 0) {
    return { uri: supabaseImageUrl };
  }

  // ── Check module cache for tiers 2-4 ──────────────────────────────────────
  const key = cacheKey(type, name, localizacao);
  const cached = _cache.get(key);
  if (cached !== undefined) return cached;

  // ── Tiers 2-4: resolve once, then cache ───────────────────────────────────
  const resolved = _resolve(type, name, localizacao);
  _cache.set(key, resolved);
  return resolved;
}

function _resolve(
  type: EntityType,
  name: string,
  localizacao?: string,
): NeighborhoodImageSource {
  const nameLower = name.toLowerCase().trim();
  const loc = localizacao ?? "";

  switch (type) {
    case "neighborhood":
      return getNeighborhoodImage(name);

    case "restaurant": {
      const uri = RESTAURANT_WEB_IMAGES[nameLower];
      if (uri) return { uri };
      return getNeighborhoodImage(loc || name);
    }

    case "hotel": {
      const uri = HOTEL_WEB_IMAGES[nameLower];
      if (uri) return { uri };
      return getNeighborhoodImage(loc || name);
    }

    case "city": {
      const uri = CITY_WEB_IMAGES[nameLower];
      if (uri) return { uri };
      // Generic city: use the best-matching neighborhood image or hero-rio
      return getNeighborhoodImage(name);
    }

    case "activity":
    default:
      return getNeighborhoodImage(loc || name);
  }
}
