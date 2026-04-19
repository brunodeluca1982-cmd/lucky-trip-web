import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Destino {
  id: string;
  cidade: string;
  pais: string;
  descricao: string;
  image: string | null;
  lancado: boolean;
}

export function useDestinos() {
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch destinos metadata (no image fields — source of truth is media_assets only)
        const [destinosResult, mediaResult] = await Promise.all([
          supabase
            .from("destinos")
            .select("slug, nome, pais, lancado, descricao, priority, sort_order")
            .not("slug", "is", null),

          // DESTINATION IMAGE SOURCE: media_assets ONLY
          // role = 'hero', entity_type = 'destino', is_active = true
          supabase
            .from("media_assets")
            .select("entity_slug, url")
            .eq("entity_type", "destino")
            .eq("role", "hero")
            .eq("is_active", true),
        ]);

        if (destinosResult.error) throw destinosResult.error;
        if (mediaResult.error)    throw mediaResult.error;

        // Build slug → url map from media_assets
        const heroMap = new Map<string, string>();
        for (const asset of (mediaResult.data ?? [])) {
          if (asset.entity_slug && asset.url) {
            // Keep first entry per slug (in case of duplicates)
            if (!heroMap.has(asset.entity_slug)) {
              heroMap.set(asset.entity_slug, asset.url);
            }
          }
        }

        // Ordem obrigatória:
        // 1. Rio primeiro (slug = 'rio' → 0, resto → 1)
        // 2. priority desc
        // 3. sort_order asc
        // 4. nome asc
        const sorted = (destinosResult.data ?? []).slice().sort((a, b) => {
          const rioA = a.slug === "rio" ? 0 : 1;
          const rioB = b.slug === "rio" ? 0 : 1;
          if (rioA !== rioB) return rioA - rioB;

          const priA = a.priority ?? 0;
          const priB = b.priority ?? 0;
          if (priB !== priA) return priB - priA;

          const sortA = a.sort_order ?? 0;
          const sortB = b.sort_order ?? 0;
          if (sortA !== sortB) return sortA - sortB;

          return (a.nome ?? "").localeCompare(b.nome ?? "");
        });

        const normalized: Destino[] = sorted.map((item) => {
          const slug  = item.slug as string;
          const image = heroMap.get(slug) ?? null;

          console.log(`[DESTINATION IMAGE SOURCE] media_assets ONLY | ${slug} →`, image ?? "NO IMAGE");

          return {
            id:        slug,
            cidade:    item.nome,
            pais:      item.pais,
            descricao: item.descricao ?? "",
            image,
            lancado:   item.lancado ?? false,
          };
        });

        if (!cancelled) setDestinos(normalized);
      } catch (e: any) {
        if (!cancelled) {
          console.log("DESTINOS LOAD ERROR:", e.message);
          setError(e.message ?? "Erro ao carregar destinos");
          setDestinos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { destinos, loading, error };
}
