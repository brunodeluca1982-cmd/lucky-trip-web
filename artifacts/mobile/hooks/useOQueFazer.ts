/**
 * useOQueFazer.ts — Fetches activities from Supabase `o_que_fazer_rio` table.
 * Returns LugarPlace-compatible objects for use in O que fazer screens.
 * Photos: Supabase photo_url first, then Wikipedia image search (background, non-blocking).
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

      const rows = data ?? [];

      // ── Phase 1: Render immediately with Supabase / neighborhood fallbacks ──
      const initial: LugarPlace[] = rows.map((row, idx) => {
        const bairro    = (row.bairro as string | null) ?? "";
        const pin       = resolvePin("rio", bairro, idx % 6);
        const supaPhoto = (row as any).photo_url as string | null ?? null;
        return {
          id:            String(row.id),
          titulo:        (row.nome as string | null)                    ?? "Experiência",
          localizacao:   bairro                                         || "Rio de Janeiro",
          categoria:     ((row.categoria as string | null)?.toUpperCase()) ?? "EXPERIÊNCIA",
          descricao:     "Uma das experiências selecionadas para o Rio de Janeiro.",
          image:         getImageForEntity("activity", row.nome ?? "", bairro, supaPhoto) as ImageSourcePropType,
          xPct:          pin.xPct,
          yPct:          pin.yPct,
          tipo_item:     "experiencia",
          momento_ideal: (row.momento_ideal as string | null) ?? null,
        };
      });

      setLugares(initial);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { lugares, loading, error };
}
