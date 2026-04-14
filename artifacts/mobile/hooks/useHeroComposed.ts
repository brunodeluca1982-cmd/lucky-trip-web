/**
 * useHeroComposed.ts
 *
 * Builds the Hero Carousel from mixed Supabase + curated data.
 *
 * Composition (FIXED ORDER — mandatory first):
 *   [0] Rio de Janeiro  — destinos.hero_image_url — navigate: cidade
 *   [1] Kyoto           — curated static           — navigate: comingsoon
 *   [2] Santorini       — curated static           — navigate: comingsoon
 *   [3] Carolina        — friend_guides.photo_url  — navigate: friend
 *   [4] Restaurante     — restaurantes (dynamic)
 *   [5] O que fazer     — o_que_fazer_rio_v2 (dynamic)
 *   [6] Lucky Pick      — lucky_list_rio_v2 (dynamic)
 *
 * Rules:
 *   - Rio, Kyoto, Santorini, Carolina are ALWAYS present (injected if missing)
 *   - Kyoto + Santorini are curated canonical entries (NOT mocks — real destinations)
 *   - Dynamic slots appended after mandatory items
 *   - Image pipeline: sanitizePhotoUrl passes ALL Supabase-stored URLs
 *   - [HERO FIX] logs injection status of mandatory items
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizePhotoUrl } from "@/utils/getImageForEntity";

export type HeroSourceTable =
  | "restaurantes"
  | "o_que_fazer_rio_v2"
  | "lucky_list_rio_v2"
  | "friends"
  | "friend_guides"
  | "destinos"
  | "curated";

export interface HeroComposedItem {
  id: string;
  source_table: HeroSourceTable;
  titulo: string;
  localizacao: string;
  badge: string;
  photo_url: string | null;
  route: HeroRoute;
}

export type HeroRoute =
  | { type: "lugar"; cityId: string; placeId: string; source_table: string }
  | { type: "friend"; slug: string }
  | { type: "cidade"; id: string }
  | { type: "comingsoon"; slug: string; nome: string };

// ── Logging ───────────────────────────────────────────────────────────────────

function logHeroItem(item: HeroComposedItem) {
  console.log(
    `[HERO ITEM] source_table: ${item.source_table} | id: ${item.id} | photo_url: ${item.photo_url ?? "null"}`
  );
}

// ── [0] Rio de Janeiro (MANDATORY — Supabase destinos) ───────────────────────

async function fetchRio(): Promise<HeroComposedItem | null> {
  const { data, error } = await supabase
    .from("destinos")
    .select("id, nome, slug, hero_image_url, photo_url")
    .eq("slug", "rio")
    .single();

  if (!error && data) return buildRio(data);

  const { data: d2 } = await supabase
    .from("destinos")
    .select("id, nome, slug, hero_image_url, photo_url")
    .eq("lancado", true)
    .order("priority", { ascending: false })
    .limit(1)
    .single();

  if (d2) return buildRio(d2);
  return null;
}

async function forceRio(): Promise<HeroComposedItem | null> {
  const { data } = await supabase
    .from("destinos")
    .select("id, nome, slug, hero_image_url, photo_url")
    .ilike("nome", "Rio de Janeiro")
    .limit(1)
    .single();
  return data ? buildRio(data) : null;
}

function buildRio(row: any): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.hero_image_url ?? row.photo_url ?? null);
  return {
    id:           String(row.id ?? row.slug ?? "rio"),
    source_table: "destinos",
    titulo:       row.nome ?? "Rio de Janeiro",
    localizacao:  "Brasil",
    badge:        "Destino",
    photo_url:    photo,
    route: { type: "cidade", id: row.slug ?? "rio" },
  };
}

// ── [1] Kyoto (CURATED STATIC — canonical coming-soon destination) ────────────

const KYOTO_ITEM: HeroComposedItem = {
  id:           "kyoto",
  source_table: "curated",
  titulo:       "Kyoto",
  localizacao:  "Japão",
  badge:        "Em Breve",
  // Reliable Unsplash CDN — Fushimi Inari Taisha
  photo_url:    sanitizePhotoUrl(
    "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&q=80"
  ),
  route: { type: "comingsoon", slug: "kyoto", nome: "Kyoto" },
};

// ── [2] Santorini (CURATED STATIC — canonical coming-soon destination) ────────

const SANTORINI_ITEM: HeroComposedItem = {
  id:           "santorini",
  source_table: "curated",
  titulo:       "Santorini",
  localizacao:  "Grécia",
  badge:        "Em Breve",
  // Reliable Unsplash CDN — Oia village blue domes
  photo_url:    sanitizePhotoUrl(
    "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=80"
  ),
  route: { type: "comingsoon", slug: "santorini", nome: "Santorini" },
};

// ── [3] Carolina Dieckmann (MANDATORY — friend_guides.photo_url) ──────────────

async function fetchFriend(): Promise<HeroComposedItem | null> {
  // Primary: friend_guides by slug (canonical image = photo_url)
  const { data: fg } = await supabase
    .from("friend_guides")
    .select("id, slug, display_name, photo_url")
    .eq("slug", "carolina-dieckmann")
    .limit(1)
    .single();

  if (fg) return buildFriendGuide(fg);

  // Secondary: first friend_guides row with photo
  const { data: fg2 } = await supabase
    .from("friend_guides")
    .select("id, slug, display_name, photo_url")
    .not("photo_url", "is", null)
    .order("id")
    .limit(1)
    .single();

  if (fg2) return buildFriendGuide(fg2);

  // Tertiary: friends table by sort_order
  const { data: fr } = await supabase
    .from("friends")
    .select("id, slug, display_name, profile_photo_url, cover_photo_url")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .single();

  if (fr) return buildFriend(fr, "friends");
  return null;
}

async function forceCarolina(): Promise<HeroComposedItem | null> {
  const { data: fr } = await supabase
    .from("friends")
    .select("id, slug, display_name, profile_photo_url, cover_photo_url")
    .eq("slug", "carolina-dieckmann")
    .limit(1)
    .single();
  if (fr) return buildFriend(fr, "friends");
  return null;
}

function buildFriendGuide(row: any): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.photo_url ?? null);
  console.log(`[CAROLINA IMAGE] photo_url: ${row.photo_url ?? "null"}`);
  return {
    id:           String(row.id),
    source_table: "friend_guides",
    titulo:       row.display_name ?? "Guia especial",
    localizacao:  "Rio de Janeiro",
    badge:        "Guia exclusivo",
    photo_url:    photo,
    route: { type: "friend", slug: row.slug },
  };
}

function buildFriend(row: any, table: HeroSourceTable): HeroComposedItem {
  const photo = sanitizePhotoUrl(row.profile_photo_url ?? row.cover_photo_url ?? null);
  console.log(`[CAROLINA IMAGE] photo_url (friends fallback): ${photo ?? "null"}`);
  return {
    id:           String(row.id),
    source_table: table,
    titulo:       row.display_name ?? "Guia especial",
    localizacao:  "Rio de Janeiro",
    badge:        "Guia exclusivo",
    photo_url:    photo,
    route: { type: "friend", slug: row.slug },
  };
}

// ── Dynamic supporting slots ──────────────────────────────────────────────────

async function fetchRestaurante(): Promise<HeroComposedItem | null> {
  const { data, error } = await supabase
    .from("restaurantes")
    .select("id, nome, bairro, categoria, photo_url")
    .eq("ativo", true)
    .not("photo_url", "is", null)
    .order("ordem_bairro")
    .limit(1)
    .single();

  if (!error && data) return buildRestaurante(data);

  const { data: d2 } = await supabase
    .from("restaurantes")
    .select("id, nome, bairro, categoria, photo_url")
    .eq("ativo", true)
    .order("ordem_bairro")
    .limit(1)
    .single();

  return d2 ? buildRestaurante(d2) : null;
}

function buildRestaurante(row: any): HeroComposedItem {
  return {
    id:           String(row.id),
    source_table: "restaurantes",
    titulo:       row.nome ?? "Restaurante",
    localizacao:  row.bairro ?? "Rio de Janeiro",
    badge:        row.categoria ?? "Onde Comer",
    photo_url:    sanitizePhotoUrl(row.photo_url),
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

  if (!error && data) return buildOQueFazer(data);

  const { data: d2 } = await supabase
    .from("o_que_fazer_rio_v2")
    .select("id, nome, bairro, categoria, photo_url")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  return d2 ? buildOQueFazer(d2) : null;
}

function buildOQueFazer(row: any): HeroComposedItem {
  return {
    id:           String(row.id),
    source_table: "o_que_fazer_rio_v2",
    titulo:       row.nome ?? "Experiência",
    localizacao:  row.bairro ?? "Rio de Janeiro",
    badge:        row.categoria ?? "O que fazer",
    photo_url:    sanitizePhotoUrl(row.photo_url),
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

  if (!error && data) return buildLucky(data);

  const { data: d2 } = await supabase
    .from("lucky_list_rio_v2")
    .select("id, nome, bairro, photo_url")
    .eq("ativo", true)
    .order("nome")
    .limit(1)
    .single();

  return d2 ? buildLucky(d2) : null;
}

function buildLucky(row: any): HeroComposedItem {
  return {
    id:           String(row.id),
    source_table: "lucky_list_rio_v2",
    titulo:       row.nome ?? "Lucky Pick",
    localizacao:  row.bairro ?? "Rio de Janeiro",
    badge:        "Lucky List",
    photo_url:    sanitizePhotoUrl(row.photo_url),
    route: { type: "lugar", cityId: "rio", placeId: String(row.id), source_table: "lucky_list_rio_v2" },
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
      // Fetch Supabase-dependent slots in parallel
      const [rio, friend, restaurante, oQueFazer, lucky] = await Promise.allSettled([
        fetchRio(),
        fetchFriend(),
        fetchRestaurante(),
        fetchOQueFazer(),
        fetchLucky(),
      ]);

      if (cancelled) return;

      const resolve = (r: PromiseSettledResult<HeroComposedItem | null>) => {
        if (r.status === "rejected") {
          console.warn("[HERO ITEM] slot failed:", r.reason);
          return null;
        }
        return r.value;
      };

      let rioItem         = resolve(rio);
      let carolinaItem    = resolve(friend);
      const restauranteItem = resolve(restaurante);
      const oQueFazerItem   = resolve(oQueFazer);
      const luckyItem       = resolve(lucky);

      // Force-inject mandatory Supabase items if missing
      let rioInjected      = false;
      let carolinaInjected = false;

      if (!rioItem) {
        rioItem = await forceRio();
        rioInjected = !!rioItem;
      }
      if (!carolinaItem) {
        carolinaItem = await forceCarolina();
        carolinaInjected = !!carolinaItem;
      }

      console.log(
        `[HERO FIX] rio_injected: ${rioInjected} | carolina_injected: ${carolinaInjected}`
      );

      // ── Build final ordered array ──────────────────────────────────────────
      // [0] Rio  [1] Kyoto  [2] Santorini  [3] Carolina  [4+] dynamic
      const items: HeroComposedItem[] = [];

      if (rioItem)          items.push(rioItem);
                            items.push(KYOTO_ITEM);
                            items.push(SANTORINI_ITEM);
      if (carolinaItem)     items.push(carolinaItem);
      if (restauranteItem)  items.push(restauranteItem);
      if (oQueFazerItem)    items.push(oQueFazerItem);
      if (luckyItem)        items.push(luckyItem);

      for (const item of items) logHeroItem(item);

      console.log(
        `[HERO] composed ${items.length} slots — Rio:${!!rioItem} Kyoto:✓ Santorini:✓ Carolina:${!!carolinaItem}`
      );

      if (!cancelled) setState({ items, loading: false });
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
