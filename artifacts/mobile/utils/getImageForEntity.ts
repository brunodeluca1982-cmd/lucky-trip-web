/**
 * getImageForEntity.ts — Unified image resolver for all entity types.
 */

export type EntityType =
  | "neighborhood"
  | "restaurant"
  | "hotel"
  | "activity"
  | "city";

export type EntityImageSource = { uri: string } | null;

/**
 * Sanitiza qualquer URL vinda do Supabase ou cache
 */
export function sanitizePhotoUrl(
  url: string | null | undefined,
): string | null {
  if (!url || !url.trim()) return null;

  const cleaned = url.trim();

  // 🚫 BLOQUEIA apenas Google Maps API (custo)
  if (cleaned.includes("maps.googleapis.com")) {
    console.log("[BLOCKED maps API]");
    return null;
  }

  // ✅ Google CDN (cache válido)
  if (
    cleaned.includes("googleusercontent.com") ||
    cleaned.includes("lh3.google")
  ) {
    console.log("[IMAGE PIPELINE] source: google");
    return cleaned;
  }

  // ✅ Cloudinary
  if (cleaned.includes("res.cloudinary.com")) {
    console.log("[IMAGE PIPELINE] source: cloudinary");
    return cleaned;
  }

  // ✅ Supabase
  if (cleaned.includes("supabase.co")) {
    console.log("[IMAGE PIPELINE] source: supabase");
    return cleaned;
  }

  // ✅ qualquer CDN (Unsplash etc)
  return cleaned;
}

/**
 * Retorna imagem final da entidade
 */
export function getImageForEntity(
  _type: EntityType,
  _name: string,
  _localizacao?: string,
  supabaseImageUrl?: string | null,
): EntityImageSource {
  const safe = sanitizePhotoUrl(supabaseImageUrl);
  if (safe) return { uri: safe };

  // 🔥 FALLBACK PARA CIDADES
  if (_type === "city") {
    const CITY_FALLBACKS: Record<string, string> = {
      "Rio de Janeiro":
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      Miami: "https://images.unsplash.com/photo-1506929562872-bb421503ef21",
      Paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
      Lisboa: "https://images.unsplash.com/photo-1513735492246-483525079686",
      Kyoto: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e",
      Sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9",
    };

    const match = CITY_FALLBACKS[_name];
    if (match) return { uri: match };
  }

  // fallback final universal
  return {
    uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
  };
}
