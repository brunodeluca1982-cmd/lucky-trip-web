/**
 * getImageForEntity.ts — Unified image resolver for all entity types.
 *
 * IMAGE PIPELINE:
 *   1. item.photo_url (Supabase column)         → source: supabase
 *   2. place_photos table (server-side cache)   → source: cache
 *   3. Google Places API (server-side only)     → source: google
 *
 * FRONTEND RULES:
 *   - Accept ANY url stored in Supabase photo_url (including cached Google)
 *   - NEVER call Google directly from the frontend
 *   - If photo_url is null → render premium placeholder
 */

export type EntityType = "neighborhood" | "restaurant" | "hotel" | "activity" | "city";

<<<<<<< HEAD
export type EntityImageSource = { uri: string } | null;
=======
// ─────────────────────────────────────────────────────────────────────────────
// Module-level result cache — keyed by "type:name:localizacao:platform"
// ─────────────────────────────────────────────────────────────────────────────
const _cache = new Map<string, NeighborhoodImageSource>();

function cacheKey(type: EntityType, name: string, localizacao = ""): string {
  return `${type}:${name.toLowerCase().trim()}:${localizacao.toLowerCase().trim()}:${Platform.OS}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated activity images (NATIVE ONLY — tier 2)
// Priority over neighborhood fallback — geographically precise.
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVITY_WEB_IMAGES: Record<string, string> = {
  "academia dos flintstones":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arpoador_Rocks.jpg",
  "pedra do arpoador":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arpoador_Rocks.jpg",
  "arpoador":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arpoador_Rocks.jpg",
  "praia de arpoador":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Arpoador_Rocks.jpg",
  "forte de copacabana":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Forte_de_Copacabana.jpg",
  "pão de açúcar":
    "https://commons.wikimedia.org/wiki/Special:FilePath/P%C3%A3o_de_A%C3%A7%C3%BAcar_(2009).jpg",
  "pao de acucar":
    "https://commons.wikimedia.org/wiki/Special:FilePath/P%C3%A3o_de_A%C3%A7%C3%BAcar_(2009).jpg",
  "morro da urca":
    "https://commons.wikimedia.org/wiki/Special:FilePath/P%C3%A3o_de_A%C3%A7%C3%BAcar_(2009).jpg",
  "cristo redentor":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro%2C_Brazil.jpg",
  "corcovado":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro%2C_Brazil.jpg",
  "escadaria selarón":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Escadaria_Seler%C3%B3n_1.jpg",
  "escadaria selaron":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Escadaria_Seler%C3%B3n_1.jpg",
  "jardim botânico":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Jardim_Bot%C3%A2nico_do_Rio_de_Janeiro_07_2009.jpg",
  "jardim botanico":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Jardim_Bot%C3%A2nico_do_Rio_de_Janeiro_07_2009.jpg",
  "lagoa rodrigo de freitas":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Lagoa_Rodrigo_de_Freitas_-_Rio_de_Janeiro%2C_Brazil.jpg",
  "lagoa":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Lagoa_Rodrigo_de_Freitas_-_Rio_de_Janeiro%2C_Brazil.jpg",
  "praia de ipanema":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Ipanema_from_Arpoador.jpg",
  "praia de copacabana":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Copacabana_beach_Aerial_2010.jpg",
  "museu do amanhã":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Museu_do_Amanh%C3%A3.jpg",
  "museu do amanha":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Museu_do_Amanh%C3%A3.jpg",
  "floresta da tijuca":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Floresta_da_Tijuca.jpg",
  "parque lage":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Parque_Lage_-_Rio_de_Janeiro.jpg",
  "mirante dona marta":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Botafogo_from_Dona_Marta.jpg",
  "pedra bonita":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Pedra_Bonita_Rio_de_Janeiro.jpg",
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
  "miami":           require("../assets/images/ipanema.png"),
  "paris":           require("../assets/images/secret2.png"),
  "bali":            require("../assets/images/secret1.png"),
  "ilhabela":        require("../assets/images/ipanema.png"),
  "são paulo":       require("../assets/images/rio-aerial-clean.png"),
  "sao paulo":       require("../assets/images/rio-aerial-clean.png"),
  "ibiza":           require("../assets/images/ipanema.png"),
  "nova york":       require("../assets/images/secret2.png"),
  "nova-york":       require("../assets/images/secret2.png"),
  "new york":        require("../assets/images/secret2.png"),
  "jericoacoara":    require("../assets/images/ipanema.png"),
  "amsterdam":       require("../assets/images/lapa.png"),
  "marrakech":       require("../assets/images/secret1.png"),
  "dubai":           require("../assets/images/secret2.png"),
  "maldivas":        require("../assets/images/ipanema.png"),
  "tokyo":           require("../assets/images/hero-kyoto.png"),
  "tóquio":          require("../assets/images/hero-kyoto.png"),
  "barcelona":       require("../assets/images/lapa.png"),
  "london":          require("../assets/images/secret2.png"),
  "londres":         require("../assets/images/secret2.png"),
};

// ─────────────────────────────────────────────────────────────────────────────
// URL upgrade rule — applied at Tier 1 (system-wide)
// ─────────────────────────────────────────────────────────────────────────────

// Ensures any Google Places Photo API URL uses maxwidth=800.
// URLs cached in Supabase may have maxwidth=80 (thumbnail quality).
// Non-Google-Places URLs are returned unchanged.
function upgradePhotoUrl(url: string): string {
  if (!url.includes("maps.googleapis.com/maps/api/place/photo")) return url;
  if (/maxwidth=\d+/i.test(url)) {
    return url.replace(/maxwidth=\d+/i, "maxwidth=800");
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}maxwidth=800`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public resolver
// ─────────────────────────────────────────────────────────────────────────────
>>>>>>> claude/plan-app-architecture-73RnI

/**
 * Accepts any photo_url from Supabase (including cached Google CDN URLs).
 * Logs the source for debugging. Returns null only if url is empty/falsy.
 */
export function sanitizePhotoUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const cleaned = url.trim();

  // ALLOW: Google image URLs (cached via Supabase) — valid for entity images
  if (cleaned.includes("googleusercontent.com") || cleaned.includes("lh3.google")) {
    console.log("[IMAGE PIPELINE] source: google", cleaned.slice(0, 80));
    return cleaned;
  }

  // ALLOW: Cloudinary — first-class image source (video frames + hero images)
  if (cleaned.includes("res.cloudinary.com")) {
    console.log("[IMAGE PIPELINE] source: cloudinary:", cleaned.slice(0, 80));
    return cleaned;
  }

  // ALLOW: Supabase Storage
  if (cleaned.includes("supabase.co")) {
    console.log("[IMAGE PIPELINE] source: supabase");
    return cleaned;
  }

  // ALLOW: all other CDN sources (Unsplash, etc.)
  return cleaned;
}

/**
 * Returns { uri: photoUrl } when a valid photo_url is present.
 * Returns null when no image exists — callers must show a premium placeholder.
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
