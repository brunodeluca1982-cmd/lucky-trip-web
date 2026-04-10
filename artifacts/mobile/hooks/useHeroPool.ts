import { useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabase";

const LOCAL_FALLBACK: ImageSourcePropType[] = [
  require("@/assets/images/ipanema.png"),
  require("@/assets/images/lapa.png"),
  require("@/assets/images/pao-acucar.png"),
  require("@/assets/images/cristo.png"),
];

export function useHeroPool(): ImageSourcePropType[] {
  const [pool, setPool] = useState<ImageSourcePropType[]>(LOCAL_FALLBACK);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("home_hero_items")
          .select("thumbnail_url")
          .eq("is_active", true)
          .eq("destination_slug", "rio")
          .order("sort_order", { ascending: true })
          .limit(8);

        if (error || !data || data.length === 0) return;

        const remote = data
          .map((row) => (row.thumbnail_url ? { uri: row.thumbnail_url as string } : null))
          .filter(Boolean) as ImageSourcePropType[];

        if (!cancelled && remote.length > 0) setPool(remote);
      } catch {
        // keep LOCAL_FALLBACK already set as initial state
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return pool;
}
