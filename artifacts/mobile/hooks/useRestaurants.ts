/**
 * useRestaurants.ts
 *
 * Fetches restaurants from Supabase `restaurantes` table.
 * Image: restaurantes.photo_url directly → null when absent.
 */

import { useEffect, useState } from "react";
import { supabase, type Restaurante } from "@/lib/supabase";
<<<<<<< HEAD
import { sanitizePhotoUrl } from "@/utils/getImageForEntity";
=======
import { buildMediaUrl } from "@/lib/mediaUrl";
>>>>>>> claude/plan-app-architecture-73RnI

type State = {
  restaurantes: Restaurante[];
  loading: boolean;
  error: string | null;
};

export function useRestaurants(cidadeId?: string): State {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // ── 1. Fetch restaurants ──────────────────────────────────────────────
      const { data: rows, error: rErr } = await supabase
        .from("restaurantes")
        .select(
          "id, nome, bairro, categoria, especialidade, perfil_publico, meu_olhar, preco_nivel, instagram, google_maps_url, photo_url, ativo, ordem_bairro",
        )
        .eq("ativo", true)
        .order("ordem_bairro")
        .order("id");

      if (cancelled) return;

      if (rErr) {
        setError(rErr.message);
        setLoading(false);
        return;
      }

      const rawRows = (rows ?? []) as Omit<Restaurante, "resolvedPhotoUri">[];

      if (cancelled) return;

<<<<<<< HEAD
      // ── 2. Map + sanitize photo_url (block Google CDN and invalid sources) ──
      const merged: Restaurante[] = rawRows.map((r) => {
        const safe = sanitizePhotoUrl(r.photo_url ?? null);
        if (r.photo_url && !safe) {
          console.error(
            `[useRestaurants][INVALID IMAGE SOURCE] Rejected photo for "${r.nome}": ${r.photo_url}`
          );
        }
        return { ...r, resolvedPhotoUri: safe };
      });
=======
      // ── 3. Render immediately with Supabase / place_photos ────────────────
      const merged: Restaurante[] = rawRows.map((r) => ({
        ...r,
        resolvedPhotoUri: buildMediaUrl(r.photo_url ?? photoMap[String(r.id)]) || null,
      }));
>>>>>>> claude/plan-app-architecture-73RnI

      setRestaurantes(merged);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [cidadeId]);

  return { restaurantes, loading, error };
}
