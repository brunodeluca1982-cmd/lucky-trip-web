/**
 * useLuckyList.ts — Fetches lucky picks from Supabase `lucky_list_rio` table.
 * Returns LugarPlace-compatible objects for use in Lucky List screens.
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

export function useLuckyList(): State {
  const [lugares, setLugares] = useState<LugarPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("lucky_list_rio")
        .select("*")
        .order("nome");

      if (cancelled) return;

      if (err) {
        console.warn("[useLuckyList] query error:", err.message, err.details, err.hint);
        setError(err.message);
        setLoading(false);
        return;
      }

      const mapped: LugarPlace[] = (data ?? []).map((row, idx) => {
        const bairro   = (row.bairro as string | null) ?? "";
        const pin      = resolvePin("rio", bairro, idx % 6);
        const photoUri = (row as any).photo_url as string | null ?? null;
        const descricao = "Um dos achados especiais da Lucky List — lugares que só quem sabe, sabe.";
        return {
          id:          String(row.id),
          titulo:      (row.nome as string | null)     ?? "Lucky Pick",
          localizacao: bairro                          || "Rio de Janeiro",
          categoria:   "LUCKY LIST",
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
