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
        const { data, error: err } = await supabase
          .from("destinos")
          .select("slug, nome, pais, lancado, descricao, priority, sort_order, hero_image_url, mobile_hero_image_url")
          .not("slug", "is", null);

        console.log("DESTINOS RAW:", data, "ERROR:", err);

        if (err) throw err;

        // Ordem obrigatória:
        // 1. Rio primeiro (slug = 'rio' → 0, resto → 1)
        // 2. priority desc
        // 3. sort_order asc
        // 4. nome asc
        const sorted = (data ?? []).slice().sort((a, b) => {
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

        const normalized: Destino[] = sorted.map((item) => ({
          id:        item.slug as string,
          cidade:    item.nome,
          pais:      item.pais,
          descricao: item.descricao ?? "",
          image:     item.mobile_hero_image_url?.trim() || item.hero_image_url?.trim() || null,
          lancado:   item.lancado ?? false,
        }));

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
