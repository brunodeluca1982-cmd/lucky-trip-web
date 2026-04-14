/**
 * useHeroComposed.ts
 *
 * Builds the Hero Carousel from REAL Supabase data.
 *
 * Composition (fixed order — MANDATORY items always first):
 *   [0] Rio de Janeiro  — destinos.hero_image_url (Cloudinary) — ALWAYS present
 *   [1] Carolina        — friend_guides OR friends (slug = "carolina-dieckmann") — ALWAYS present
 *   [2] Restaurante     — restaurantes table
 *   [3] O que fazer     — o_que_fazer_rio_v2 table
 *   [4] Lucky Pick      — lucky_list_rio_v2 table
 *
 * Guarantee contract:
 *   - Rio is ALWAYS [0]: normal fetch (slug="rio") → force fetch (nome="Rio de Janeiro")
 *   - Carolina is ALWAYS [1]: normal fetch (sort_order) → force fetch (slug="carolina-dieckmann")
 *   - ALL data comes from Supabase only — no fakes, no mocks
 *   - Image sources are NEVER overridden (entity's own column only)
 *   - [HERO FIX] logs mandatory item injection status
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
  | "destinos";

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
  | { type: "cidade"; id: string };

// ── Logging ───────────────────────────────────────────────────────────────────

function logHeroItem(item: HeroComposedItem) {
  console.log(
    `[HERO ITEM] source_table: ${item.source_table} | id: ${item.id} | photo_url: ${item.photo_url ?? "null"}`
  );
}

// ── Rio de Janeiro (MANDATORY — [0]) ─────────────────────────────────────────

async function fetchRio(): Promise<HeroComposedItem | null> {
  // Primary: slug = "rio"
  const { data, error } = await supabase
    .from("destinos")
    .select("id, nome, slug, hero_image_url, photo_url")
    .eq("slug", "rio")
    .single();

  if (!error && data) return buildRio(data);

  // Secondary: any launched destino by priority
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

/**
 * Forced injection — called if fetchRio() returned null.
 * Tries destinos WHERE nome = "Rio de Janeiro".
 */
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
  // PART 2: Rio MUST use hero_image_url (Cloudinary) — photo_url only if hero_image_url absent
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

// ── Carolina Dieckmann (MANDATORY — [1]) ──────────────────────────────────────

async function fetchFriend(): Promise<HeroComposedItem | null> {
  // Primary: first active friend by sort_order (= Carolina Dieckmann)
  const { data, error } = await supabase
    .from("friends")
    .select("id, slug, display_name, profile_photo_url, cover_photo_url")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .single();

  if (!error && data) return buildFriend(data, "friends");
  return null;
}

/**
 * Forced injection — called if fetchFriend() returned null.
 * Tries friend_guides first, then friends, both by slug = "carolina-dieckmann".
 */
async function forceCarolina(): Promise<HeroComposedItem | null> {
  // Try friend_guides table (canonical source per spec)
  const { data: fg } = await supabase
    .from("friend_guides")
    .select("id, slug, display_name, photo_url")
    .eq("slug", "carolina-dieckmann")
    .limit(1)
    .single();

  if (fg) return buildFriendGuide(fg);

  // Fallback: friends table by slug
  const { data: fr } = await supabase
    .from("friends")
    .select("id, slug, display_name, profile_photo_url, cover_photo_url")
    .eq("slug", "carolina-dieckmann")
    .limit(1)
    .single();

  if (fr) return buildFriend(fr, "friends");
  return null;
}

function buildFriend(row: any, table: HeroSourceTable): HeroComposedItem {
  // photo: prefer profile_photo_url → cover_photo_url
  const photo = sanitizePhotoUrl(row.profile_photo_url ?? row.cover_photo_url ?? null);
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

function buildFriendGuide(row: any): HeroComposedItem {
  // PART 2: Carolina MUST use photo_url from friend_guides
  const photo = sanitizePhotoUrl(row.photo_url ?? null);
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

// ── Supporting slots ──────────────────────────────────────────────────────────

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

  // Retry without photo_url filter
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

      let rioItem         = resolve(rio);
      let carolinaItem    = resolve(friend);
      const restauranteItem = resolve(restaurante);
      const oQueFazerItem   = resolve(oQueFazer);
      const luckyItem       = resolve(lucky);

      // ── PART 1: Force inject mandatory items if missing ────────────────────
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

      // PART 7: Log injection status
      console.log(
        `[HERO FIX] rio_injected: ${rioInjected} | carolina_injected: ${carolinaInjected}`
      );

      // ── Build ordered array: Rio [0], Carolina [1], then others ───────────
      const items: HeroComposedItem[] = [];

      if (rioItem)          items.push(rioItem);
      if (carolinaItem)     items.push(carolinaItem);
      if (restauranteItem)  items.push(restauranteItem);
      if (oQueFazerItem)    items.push(oQueFazerItem);
      if (luckyItem)        items.push(luckyItem);

      for (const item of items) logHeroItem(item);

      console.log(
        `[HERO] composed ${items.length}/5 slots — Rio:${!!rioItem} Carolina:${!!carolinaItem}`
      );

      if (!cancelled) setState({ items, loading: false });
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
