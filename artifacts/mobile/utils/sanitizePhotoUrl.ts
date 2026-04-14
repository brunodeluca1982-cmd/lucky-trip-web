export function sanitizePhotoUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const clean = url.trim();

    // ❌ BLOQUEIA Google API (quebra imagem + custa dinheiro)
    if (clean.includes("maps.googleapis.com")) {
      console.log("[IMAGE BLOCKED] maps API:", clean);
      return null;
    }

    // ✅ PERMITE Google CDN (funciona)
    if (clean.includes("googleusercontent.com")) {
      return clean;
    }

    // ✅ PERMITE Cloudinary
    if (clean.includes("res.cloudinary.com")) {
      return clean;
    }

    // ✅ PERMITE Supabase
    if (clean.includes("supabase.co")) {
      return clean;
    }

    // ✅ fallback
    return clean;

  } catch (e) {
    console.log("[IMAGE ERROR]", e);
    return null;
  }
}
