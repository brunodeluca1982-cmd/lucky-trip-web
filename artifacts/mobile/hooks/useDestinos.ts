import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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

const STATIC_RIO_FALLBACK: Destino[] = [
  {
    id:        "rio",
    cidade:    "Rio de Janeiro",
    pais:      "Brasil",
    descricao: "A cidade maravilhosa — praias douradas, florestas urbanas e o carnaval mais famoso do mundo.",
    image:     require("../assets/images/hero-rio.png"),
    lancado:   true,
  },
];

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
          .not("slug", "is", null)
          .order("lancado", { ascending: false })
          .order("nome");

        if (err) throw err;

        const rows: Destino[] = (data ?? []).map((row) => ({
          id:        row.slug as string,
          cidade:    row.nome,
          pais:      row.pais,
          descricao: row.descricao ?? "",
          image:     destinoImage(row.slug as string, row.nome),
          lancado:   row.lancado ?? false,
        }));

        if (!cancelled) setDestinos(rows.length > 0 ? rows : STATIC_RIO_FALLBACK);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Erro ao carregar destinos");
          setDestinos(STATIC_RIO_FALLBACK);
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
