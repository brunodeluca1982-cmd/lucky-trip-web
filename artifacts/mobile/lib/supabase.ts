import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Shared types ──────────────────────────────────────────────────────────────

export type Hotel = {
  id: string;
  hotel_name: string;
  my_view: string;
  how_to_enjoy: string[];
  reserve_url: string;
  rooftop: boolean;
  front_beach: boolean;
  audience: string;
  hotel_category: string;
  safety_solo_woman: string;
  featured_restaurant: string | null;
  instagram: string | null;
  google_maps: string | null;
  ai_tags: string[];
  display_order: number;
};

export type Neighborhood = {
  id: string;
  neighborhood_name: string;
  neighborhood_slug: string;
  title: string;
  identity_phrase: string;
  best_for_1: string;
  best_for_2: string;
  best_for_3: string;
  my_view: string;
  how_to_live: string[];
  category_neighborhood: string;
  better_for: string;
  walkable: string;
  nightlife: string;
  gastronomy: string;
  scenery: string;
  safety_solo_woman: string;
  google_maps: string | null;
  active: boolean;
  display_order: number;
  hotels: Hotel[];
};
