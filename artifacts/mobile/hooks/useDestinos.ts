import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { destinos as staticDestinos } from "@/data/mockData";
import { getImageForEntity } from "@/utils/getImageForEntity";

export interface Destino {
  id: string;
  cidade: string;
  pais: string;
  descricao: string;
  image: any;
  lancado: boolean;
}

const SLUG_IMAGE: Record<string, any> = {
  "rio":       require("../assets/images/hero-rio.png"),
  "santorini": require("../assets/images/hero-santorini.png"),
  "kyoto":     require("../assets/images/hero-kyoto.png"),
};

function destinoImage(slug: string, nome: string): any {
  return SLUG_IMAGE[slug] ?? getImageForEntity("city", nome);
}

const STATIC_COMING_SOON: Destino[] = staticDestinos.filter((d) => !d.lancado);
const STATIC_RIO_FALLBACK: Destino = {
  id:       "rio",
  cidade:   "Rio de Janeiro",
  pais:     "Brasil",
  descricao: "A cidade maravilhosa — praias douradas, florestas urbanas e o carnaval mais famoso do mundo.",
  image:    require("../assets/images/hero-rio.png"),
  lancado:  true,
};

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
          .select("id, nome, pais, lancado, descricao, slug")
          .order("lancado", { ascending: false })
          .order("nome");

        if (err) throw err;

        const supabaseRows: Destino[] = (data ?? []).map((row) => ({
          id:       row.slug ?? String(row.id),
          cidade:   row.nome,
          pais:     row.pais,
          descricao: row.descricao ?? "",
          image:    destinoImage(row.slug ?? String(row.id), row.nome),
          lancado:  row.lancado ?? false,
        }));

        const launchedIds = new Set(supabaseRows.filter((d) => d.lancado).map((d) => d.id));
        const comingSoon  = STATIC_COMING_SOON.filter((d) => !launchedIds.has(d.id));

        const combined = supabaseRows.length > 0
          ? [...supabaseRows, ...comingSoon]
          : [STATIC_RIO_FALLBACK, ...comingSoon];

        if (!cancelled) setDestinos(combined);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Erro ao carregar destinos");
          setDestinos([STATIC_RIO_FALLBACK, ...STATIC_COMING_SOON]);
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
