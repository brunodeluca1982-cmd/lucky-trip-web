/**
 * useLuckyList.ts — Fetches lucky picks from Supabase `lucky_list_rio` table.
 * Returns LugarPlace-compatible objects for use in Lucky List screens.
 * Photos: Supabase photo_url only. Returns null when no Supabase image exists.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LugarPlace } from "@/data/lugares";
import { resolvePin } from "@/data/lugares";

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

      const rows = data ?? [];

      // ── Phase 1: Render immediately with Supabase / neighborhood fallbacks ──
      const initial: LugarPlace[] = rows.map((row, idx) => {
        const bairro    = (row.bairro as string | null) ?? "";
        const pin       = resolvePin("rio", bairro, idx % 6);
        const supaPhoto = (row as any).photo_url as string | null ?? null;
        const tipoItem  = (row as any).tipo_item as string | null;
        const entityType =
          tipoItem === "restaurante" ? "restaurant" :
          tipoItem === "hotel"       ? "hotel"       :
          "activity";
        const resolvedTipo =
          tipoItem === "restaurante" ? "restaurante" :
          tipoItem === "hotel"       ? "hotel"       :
          "experiencia";
        return {
          id:          String(row.id),
          titulo:      (row.nome as string | null)     ?? "Lucky Pick",
          localizacao: bairro                          || "Rio de Janeiro",
          categoria:   "LUCKY LIST",
          descricao:   "Um dos achados especiais da Lucky List — lugares que só quem sabe, sabe.",
          image:       supaPhoto ? { uri: supaPhoto } : null,
          xPct:        pin.xPct,
          yPct:        pin.yPct,
          tipo_item:   resolvedTipo,
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
