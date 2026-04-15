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
          .from("v_destinos_mvp")
          .select("slug, nome, pais, lancado, descricao, hero_image_url_effective")
          .not("slug", "is", null)
          .order("nome", { ascending: true });

        console.log("DESTINOS RAW:", data, "ERROR:", err);

        if (err) throw err;

        const normalized: Destino[] = (data ?? []).map((item) => ({
          id:        item.slug as string,
          cidade:    item.nome,
          pais:      item.pais,
          descricao: item.descricao ?? "",
          image:     (item as any).hero_image_url_effective ?? null,
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
