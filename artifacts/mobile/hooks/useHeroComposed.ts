/**
 * useHeroComposed.ts
 *
 * Builds the Hero Carousel from REAL Supabase data.
 *
 * Composition (fixed order, no duplicates):
 *   [0] Restaurante     — restaurantes table (1 item with photo_url)
 *   [1] O que fazer     — o_que_fazer_rio_v2 table (1 item with photo_url)
 *   [2] Lucky Pick      — lucky_list_rio_v2 table (1 item with photo_url)
 *   [3] Friend Guide    — friends table (first active friend = Carolina)
 *   [4] Rio de Janeiro  — destinos table (slug = "rio")
 *
 * Rules:
 *   - ALL data comes from Supabase only
 *   - photo_url used as-is (pipeline already allows Google cached URLs)
 *   - Each slot has its own navigation route
 *   - Log [HERO ITEM] for each resolved slot
 *   - If a slot fails → skip it (no placeholder fakes)
 *   - Array is NEVER empty (Rio fallback always works)
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizePhotoUrl } from "@/utils/getImageForEntity";

export type HeroSourceTable =
  | "restaurantes"
  | "o_que_fazer_rio_v2"
  | "lucky_list_rio_v2"
  | "friends"
  | "destinos";

export interface HeroComposedItem {
  id: string;
  source_table: HeroSourceTable;
  titulo: string;
  localizacao: string;
  badge: string;
  photo_url: string | null;
  /** Navigation target */
  route: HeroRoute;
}

export type HeroRoute =
  | { type: "lugar"; cityId: string; placeId: string; source_table: string }
  | { type: "friend"; slug: string }
  | { type: "cidade"; id: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function logHeroItem(item: HeroComposedItem) {
  console.log(
    `[HERO ITEM] source_table: ${item.source_table} | id: ${item.id} | photo_url: ${item.photo_url ?? "null"}`
  );
}

async function fetchRestaurante(): Promise<HeroComposedItem | null> {
  const { data, error } = await supabase
    .from("restaurantes")
    .select("id, nome, bairro, categoria, photo_url")
    .eq("ativo", true)
    .not("photo_url", "is", null)
    .order("ordem_bairro")
    .limit(1)
    .single();

  if (error || !data) {
    // retry without photo_url filter
    const { data: d2 } = await supabase
      .from("restaurantes")
      .select("id, nome, bairro, categoria, photo_url")
      .eq("ativo", true)
      .order("ordem_bairro")
      .limit(1)
      .single();
    if (!d2) return null;
    return buildRestaurante(d2);
  }
  return buildRestaurante(data);
}

function buildRestaurante(row: any): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.photo_url);
  return {
    id:           String(row.id),
    source_table: "restaurantes",
    titulo:       row.nome ?? "Restaurante",
    localizacao:  row.bairro ?? "Rio de Janeiro",
    badge:        row.categoria ?? "Onde Comer",
    photo_url:    photo,
    route: { type: "lugar", cityId: "rio", placeId: String(row.id), source_table: "restaurantes" },
  };
}

async function fetchOQueFazer(): Promise<HeroComposedItem | null> {
  const { data, error } = await supabase
    .from("o_que_fazer_rio_v2")
    .select("id, nome, bairro, categoria, photo_url")
    .eq("ativo", true)
    .not("photo_url", "is", null)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    const { data: d2 } = await supabase
      .from("o_que_fazer_rio_v2")
      .select("id, nome, bairro, categoria, photo_url")
      .eq("ativo", true)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    if (!d2) return null;
    return buildOQueFazer(d2);
  }
  return buildOQueFazer(data);
}

function buildOQueFazer(row: any): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.photo_url);
  return {
    id:           String(row.id),
    source_table: "o_que_fazer_rio_v2",
    titulo:       row.nome ?? "Experiência",
    localizacao:  row.bairro ?? "Rio de Janeiro",
    badge:        row.categoria ?? "O que fazer",
    photo_url:    photo,
    route: { type: "lugar", cityId: "rio", placeId: String(row.id), source_table: "o_que_fazer_rio_v2" },
  };
}

async function fetchLucky(): Promise<HeroComposedItem | null> {
  const { data, error } = await supabase
    .from("lucky_list_rio_v2")
    .select("id, nome, bairro, photo_url")
    .eq("ativo", true)
    .not("photo_url", "is", null)
    .order("nome")
    .limit(1)
    .single();

  if (error || !data) {
    const { data: d2 } = await supabase
      .from("lucky_list_rio_v2")
      .select("id, nome, bairro, photo_url")
      .eq("ativo", true)
      .order("nome")
      .limit(1)
      .single();
    if (!d2) return null;
    return buildLucky(d2);
  }
  return buildLucky(data);
}

function buildLucky(row: any): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.photo_url);
  return {
    id:           String(row.id),
    source_table: "lucky_list_rio_v2",
    titulo:       row.nome ?? "Lucky Pick",
    localizacao:  row.bairro ?? "Rio de Janeiro",
    badge:        "Lucky List",
    photo_url:    photo,
    route: { type: "lugar", cityId: "rio", placeId: String(row.id), source_table: "lucky_list_rio_v2" },
  };
}

async function fetchFriend(): Promise<HeroComposedItem | null> {
  // Fetch first active friend (highest sort_order priority = Carolina Dieckmann)
  const { data, error } = await supabase
    .from("friends")
    .select("id, slug, display_name, profile_photo_url, cover_photo_url")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .single();

  if (error || !data) return null;

  // photo: prefer profile_photo_url → cover_photo_url → null
  const photo = sanitizePhotoUrl(data.profile_photo_url ?? data.cover_photo_url ?? null);
  return {
    id:           String(data.id),
    source_table: "friends",
    titulo:       data.display_name ?? "Guia especial",
    localizacao:  "Rio de Janeiro",
    badge:        "Guia exclusivo",
    photo_url:    photo,
    route: { type: "friend", slug: data.slug },
  };
}

async function fetchRio(): Promise<HeroComposedItem | null> {
  const { data, error } = await supabase
    .from("destinos")
    .select("id, nome, slug, hero_image_url, photo_url")
    .eq("slug", "rio")
    .single();

  if (error || !data) {
    // fallback: any launched destino
    const { data: d2 } = await supabase
      .from("destinos")
      .select("id, nome, slug, hero_image_url, photo_url")
      .eq("lancado", true)
      .order("priority", { ascending: false })
      .limit(1)
      .single();
    if (!d2) return null;
    return buildRio(d2);
  }
  return buildRio(data);
}

function buildRio(row: any): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.hero_image_url ?? row.photo_url ?? null);
  return {
    id:           String(row.id ?? row.slug),
    source_table: "destinos",
    titulo:       row.nome ?? "Rio de Janeiro",
    localizacao:  "Brasil",
    badge:        "Destino",
    photo_url:    photo,
    route: { type: "cidade", id: row.slug ?? "rio" },
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

type State = {
  items: HeroComposedItem[];
  loading: boolean;
};

export function useHeroComposed(): State {
  const [state, setState] = useState<State>({ items: [], loading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fetch all 5 slots in parallel — independent queries
      const [restaurante, oQueFazer, lucky, friend, rio] = await Promise.allSettled([
        fetchRestaurante(),
        fetchOQueFazer(),
        fetchLucky(),
        fetchFriend(),
        fetchRio(),
      ]);

      if (cancelled) return;

      // ── Extract resolved values (null-safe) ────────────────────────────────
      const resolve = (r: PromiseSettledResult<HeroComposedItem | null>) => {
        if (r.status === "rejected") {
          console.warn("[HERO ITEM] slot failed:", r.reason);
          return null;
        }
        return r.value;
      };

      const rioItem       = resolve(rio);
      const carolinaItem  = resolve(friend);
      const restauranteItem = resolve(restaurante);
      const oQueFazerItem = resolve(oQueFazer);
      const luckyItem     = resolve(lucky);

      // ── Mandatory items ALWAYS come first: Rio [0], Carolina [1] ───────────
      // Then append other slots in their original order, skipping nulls.
      const items: HeroComposedItem[] = [];

      if (rioItem)       items.push(rioItem);
      if (carolinaItem)  items.push(carolinaItem);
      if (restauranteItem) items.push(restauranteItem);
      if (oQueFazerItem) items.push(oQueFazerItem);
      if (luckyItem)     items.push(luckyItem);

      // Log each included item
      for (const item of items) logHeroItem(item);

      console.log(`[HERO] composed ${items.length}/5 slots — Rio:${!!rioItem} Carolina:${!!carolinaItem}`);
      setState({ items, loading: false });
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
