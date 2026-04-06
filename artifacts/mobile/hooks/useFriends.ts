import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface FriendCard {
  id: string;
  slug: string;
  display_name: string;
  full_name: string;
  bio: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  guide_count: number;
}

export function useFriends() {
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: friendsData, error: friendsErr } = await supabase
          .from("friends")
          .select("id, slug, display_name, full_name, bio, profile_photo_url, cover_photo_url")
          .eq("is_active", true)
          .order("sort_order");

        if (friendsErr) throw friendsErr;

        const { data: guidesData, error: guidesErr } = await supabase
          .from("v_friend_guides_cards")
          .select("friend_id")
          .eq("status", "published");

        if (guidesErr) throw guidesErr;

        const countMap: Record<string, number> = {};
        for (const g of guidesData ?? []) {
          countMap[g.friend_id] = (countMap[g.friend_id] ?? 0) + 1;
        }

        const merged: FriendCard[] = (friendsData ?? []).map((f) => ({
          ...f,
          guide_count: countMap[f.id] ?? 0,
        }));

        if (!cancelled) setFriends(merged);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Erro ao carregar amigos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { friends, loading, error };
}
