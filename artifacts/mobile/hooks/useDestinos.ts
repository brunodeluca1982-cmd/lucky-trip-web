import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Destino {
  id: string;
  cidade: string;
  pais: string;
  descricao: string;
  image: null;
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
          .select("id, nome, pais, lancado, descricao, slug")
          .not("slug", "is", null)
          .order("priority", { ascending: false })
          .order("nome", { ascending: true });

        if (err) throw err;

        const rows: Destino[] = (data ?? []).map((row) => ({
          id:        row.slug as string,
          cidade:    row.nome,
          pais:      row.pais,
          descricao: row.descricao ?? "",
          image:     null,
          lancado:   row.lancado ?? false,
        }));

        if (!cancelled) setDestinos(rows);
      } catch (e: any) {
        if (!cancelled) {
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
