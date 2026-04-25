/**
<<<<<<< HEAD
 * useOQueFazer.ts — Fetches activities from Supabase `o_que_fazer_rio_v2` table.
 * Returns LugarPlace-compatible objects for use in O que fazer screens.
 * Photos: Supabase photo_url only. Returns null when no Supabase image exists.
=======
 * useOQueFazer.ts — Fetches activities, beaches, shopping, and secret tips from Supabase.
 * Filters: categoria IN ('atividade', 'praia', 'compras', 'dica_secreta'), destino_id = Rio, ativo = true
>>>>>>> claude/plan-app-architecture-73RnI
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
<<<<<<< HEAD
import type { LugarPlace } from "@/data/lugares";
import { resolvePin } from "@/data/lugares";
import { sanitizePhotoUrl } from "@/utils/getImageForEntity";
=======
import { buildMediaUrl } from "@/lib/mediaUrl";

const RIO_DESTINO_ID = "7f047742-427f-4b11-8286-781af899c57d";

export type Atividade = {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  meu_olhar: string | null;
  como_aproveitar: string[];
  tags_ia: string[];
  momento_ideal: string[];
  vibe: string[];
  energia: string | null;
  seguro_mulher_sozinha: string | null;
  com_criancas: boolean | null;
  google_maps_url: string | null;
  instagram: string | null;
  hero_image_url: string | null;
  place_id: string | null;
  bairro_id: string | null;
  bairro_nome: string | null;
  ordem_bairro: number | null;
};
>>>>>>> claude/plan-app-architecture-73RnI

type State = {
  atividades: Atividade[];
  loading: boolean;
  error: string | null;
};

export function useOQueFazer(destinoId: string = RIO_DESTINO_ID): State {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
<<<<<<< HEAD
        .from("o_que_fazer_rio_v2")
        .select("*")
        .eq("ativo", true)
        .order("nome");
=======
        .from("lugares")
        .select(`
          id,
          nome,
          slug,
          categoria,
          meu_olhar,
          como_aproveitar,
          tags_ia,
          momento_ideal,
          vibe,
          energia,
          seguro_mulher_sozinha,
          com_criancas,
          google_maps_url,
          instagram,
          hero_image_url,
          place_id,
          bairro_id,
          ordem_bairro,
          bairros (
            nome
          )
        `)
        .eq("destino_id", destinoId)
        .in("categoria", ["atividade", "praia", "compras", "dica_secreta"])
        .eq("ativo", true)
        .not("nome", "ilike", "%v2%")
        .order("categoria")
        .order("ordem_bairro");
>>>>>>> claude/plan-app-architecture-73RnI

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const mapped: Atividade[] = (data ?? []).map((row: any) => ({
        id: row.id,
        nome: row.nome,
        slug: row.slug,
        categoria: row.categoria,
        meu_olhar: row.meu_olhar,
        como_aproveitar: row.como_aproveitar ?? [],
        tags_ia: row.tags_ia ?? [],
        momento_ideal: row.momento_ideal ?? [],
        vibe: row.vibe ?? [],
        energia: row.energia,
        seguro_mulher_sozinha: row.seguro_mulher_sozinha,
        com_criancas: row.com_criancas,
        google_maps_url: row.google_maps_url,
        instagram: row.instagram,
        hero_image_url: buildMediaUrl(row.hero_image_url),
        place_id: row.place_id,
        bairro_id: row.bairro_id,
        bairro_nome: row.bairros?.nome ?? null,
        ordem_bairro: row.ordem_bairro,
      }));

<<<<<<< HEAD
      // ── Phase 1: Render immediately with Supabase / neighborhood fallbacks ──
      const initial: LugarPlace[] = rows.map((row, idx) => {
        const bairro    = (row.bairro as string | null) ?? "";
        const pin       = resolvePin("rio", bairro, idx % 6);
        const rawPhoto  = (row as any).photo_url as string | null ?? null;
        const safePhoto = sanitizePhotoUrl(rawPhoto);
        if (rawPhoto && !safePhoto) {
          console.error(
            `[useOQueFazer][INVALID IMAGE SOURCE] Rejected photo for "${row.nome}": ${rawPhoto}`
          );
        }
        return {
          id:            String(row.id),
          titulo:        (row.nome as string | null)                       ?? "Experiência",
          localizacao:   bairro                                            || "Rio de Janeiro",
          categoria:     ((row.categoria as string | null)?.toUpperCase()) ?? "EXPERIÊNCIA",
          descricao:     "Uma das experiências selecionadas para o Rio de Janeiro.",
          photo_url:     safePhoto,
          image:         safePhoto ? { uri: safePhoto } : null,
          xPct:          pin.xPct,
          yPct:          pin.yPct,
          tipo_item:     "experiencia",
          momento_ideal: (row.momento_ideal as string | null) ?? null,
        };
      });

      setLugares(initial);
=======
      setAtividades(mapped);
>>>>>>> claude/plan-app-architecture-73RnI
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [destinoId]);

  return { atividades, loading, error };
}
