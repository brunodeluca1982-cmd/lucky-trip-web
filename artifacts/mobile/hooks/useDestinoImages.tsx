import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useDestinoImages(destinoSlug: string) {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    async function fetchImages() {
      const { data, error } = await supabase
        .from("destino_images")
        .select("image_url")
        .eq("destino_slug", destinoSlug)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (!error && data) {
        setImages(data.map((item) => item.image_url));
      }
    }

    if (destinoSlug) fetchImages();
  }, [destinoSlug]);

  return images;
}
