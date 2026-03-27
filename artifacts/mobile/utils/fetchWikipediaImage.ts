/**
 * fetchWikipediaImage.ts — Wikipedia image search, no API key required.
 *
 * Uses the Wikipedia OpenSearch + PageImages API to find the best photo
 * for a given entity name. Returns a direct `upload.wikimedia.org` URL
 * (CORS-enabled, works on both web and native).
 *
 * Used as free Google/Supabase image fallback for entities without photo_url.
 */

const _cache = new Map<string, string | null>();

/**
 * Fetch the best Wikipedia thumbnail for a search query.
 *
 * @param name        - Entity name (e.g. "AquaRio", "Academia dos Flintstones")
 * @param contextHint - Optional location hint appended to the search (e.g. "Rio de Janeiro")
 * @returns Direct image URL or null if not found
 */
export async function fetchWikipediaImage(
  name: string,
  contextHint = "Rio de Janeiro",
): Promise<string | null> {
  const key = `${name.toLowerCase().trim()}::${contextHint}`;
  if (_cache.has(key)) return _cache.get(key) ?? null;

  try {
    const query = encodeURIComponent(`${name} ${contextHint}`);
    const url =
      `https://en.wikipedia.org/w/api.php` +
      `?action=query&format=json&origin=*` +
      `&generator=search&gsrsearch=${query}&gsrlimit=3` +
      `&prop=pageimages&piprop=thumbnail&pithumbsize=800`;

    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();

    const pages = data?.query?.pages ?? {};
    const sorted = Object.values(pages).sort(
      (a: any, b: any) => (a.index ?? 99) - (b.index ?? 99),
    );

    for (const page of sorted as any[]) {
      const src = page?.thumbnail?.source;
      if (src) {
        _cache.set(key, src);
        return src;
      }
    }

    _cache.set(key, null);
    return null;
  } catch {
    _cache.set(key, null);
    return null;
  }
}
