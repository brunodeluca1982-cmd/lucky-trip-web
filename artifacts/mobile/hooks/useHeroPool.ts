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
          .select("video_url")
          .eq("is_active", true)
          .eq("destination_slug", "rio-de-janeiro")
          .order("sort_order", { ascending: true })
          .limit(8);

        if (error || !data || data.length === 0) return;

        const CLOUD = "https://res.cloudinary.com/dufxamwaf/video/upload/so_1,w_1080,h_1920,c_fill,g_auto,q_80,f_jpg";
        const remote = data
          .map((row) => {
            if (!row.video_url) return null;
            return { uri: `${CLOUD}/${encodeURIComponent(row.video_url as string)}` };
          })
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
