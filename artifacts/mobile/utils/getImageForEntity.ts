/**
 * getImageForEntity.ts — Unified, stable image resolver for all entity types.
 *
 * Priority chain (strict, never skipped):
 *   1. Supabase image_url / photo_url  — if set and non-empty, always wins
 *   2. Curated entity-specific web URI — Wikipedia Commons permalink (NATIVE ONLY)
 *   3. Neighborhood-based image        — via getNeighborhoodImage(localizacao)
 *      On native: Wikipedia Commons URI for the neighborhood zone.
 *      On web:    Local bundled .png (CORS-safe, always visible).
 *   4. Local asset fallback            — bundled .png, always available offline
 *
 * PLATFORM RULE (critical):
 *   Expo web cannot reliably load external image URIs — Wikipedia Commons
 *   Special:FilePath URLs involve redirect chains that trigger CORS failures,
 *   causing the Image component to render nothing (shows card background color).
 *   On web: all external URI tiers are skipped; local bundled assets are used.
 *   On native: external URIs work fine — higher quality images are preferred.
 *
 * Stability guarantee:
 *   All resolutions are cached in a module-level Map keyed by
 *   (type:name:localizacao:platform). Same entity → same image on every
 *   screen, every render, every session.
 */

import { Platform } from "react-native";
import {
  getNeighborhoodImage,
  type NeighborhoodImageSource,
} from "@/data/neighborhoodImages";

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level result cache — keyed by "type:name:localizacao:platform"
// ─────────────────────────────────────────────────────────────────────────────
const _cache = new Map<string, NeighborhoodImageSource>();

function cacheKey(type: EntityType, name: string, localizacao = ""): string {
  return `${type}:${name.toLowerCase().trim()}:${localizacao.toLowerCase().trim()}:${Platform.OS}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated entity web images (NATIVE ONLY — tier 2)
// Wikipedia Commons Special:FilePath links — deterministic, permanent URLs.
// Skipped on Expo web (CORS failures make images blank, which is worse than
// the local neighborhood image fallback).
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
// Local asset fallbacks for non-Rio cities (WEB — CORS-safe, always visible).
// Used on Expo web where external URIs fail. These are bundled at build time.
// ─────────────────────────────────────────────────────────────────────────────
const CITY_LOCAL_ASSETS: Record<string, NeighborhoodImageSource> = {
  "rio de janeiro":  require("../assets/images/hero-rio.png"),
  "santorini":       require("../assets/images/hero-santorini.png"),
  "kyoto":           require("../assets/images/hero-kyoto.png"),
  // Non-Rio cities: best available local asset — contextually adjacent in mood
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
  // ── Tier 1: Supabase image — native only.
  // On web, external URIs can fail silently (CORS / redirect chains) and the
  // Image component renders blank with no recoverable error. Local assets are
  // used on web instead (tiers 2-4 below).
  if (supabaseImageUrl && supabaseImageUrl.trim().length > 0 && Platform.OS !== "web") {
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
  const isNative = Platform.OS !== "web";

  switch (type) {
    case "neighborhood":
      return getNeighborhoodImage(name);

    case "restaurant": {
      // On native: try curated Wikipedia Commons URL first
      if (isNative) {
        const uri = RESTAURANT_WEB_IMAGES[nameLower];
        if (uri) return { uri };
      }
      // Web + native fallback: neighborhood local/web image
      return getNeighborhoodImage(loc || name);
    }

    case "hotel": {
      if (isNative) {
        const uri = HOTEL_WEB_IMAGES[nameLower];
        if (uri) return { uri };
      }
      return getNeighborhoodImage(loc || name);
    }

    case "city": {
      if (isNative) {
        const uri = CITY_WEB_IMAGES[nameLower];
        if (uri) return { uri };
      }
      // Web: use local bundled city asset (always visible)
      return (
        CITY_LOCAL_ASSETS[nameLower] ??
        require("../assets/images/hero-rio.png")
      );
    }

    case "activity":
    default:
      return getNeighborhoodImage(loc || name);
  }
}
