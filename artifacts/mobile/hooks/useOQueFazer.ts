/**
 * useOQueFazer.ts — Fetches activities from Supabase `o_que_fazer_rio` table.
 * Returns LugarPlace-compatible objects for use in O que fazer screens.
 * Only selects confirmed columns (validated from edge function schema).
 */

import { useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabase";
import type { LugarPlace } from "@/data/lugares";
import { resolvePin } from "@/data/lugares";
import { getImageForEntity } from "@/utils/getImageForEntity";

type State = {
  lugares: LugarPlace[];
  loading: boolean;
  error: string | null;
};

export function useOQueFazer(): State {
  const [lugares, setLugares] = useState<LugarPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("o_que_fazer_rio")
        .select("*")
        .order("nome");

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const mapped: LugarPlace[] = (data ?? []).map((row, idx) => {
        const bairro   = (row.bairro as string | null) ?? "";
        const pin      = resolvePin("rio", bairro, idx % 6);
        const photoUri = null; // photo_url not confirmed in o_que_fazer_rio schema
        const descricao = "Uma das experiências selecionadas para o Rio de Janeiro.";
        return {
          id:          String(row.id),
          titulo:      (row.nome as string | null)            ?? "Experiência",
          localizacao: bairro                                 || "Rio de Janeiro",
          categoria:   ((row.categoria as string | null)?.toUpperCase()) ?? "EXPERIÊNCIA",
          descricao,
          image:       getImageForEntity("activity", row.nome ?? "", bairro, photoUri) as ImageSourcePropType,
          xPct:        pin.xPct,
          yPct:        pin.yPct,
          tipo_item:   "experiencia",
        };
      });

      setLugares(mapped);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { lugares, loading, error };
}
