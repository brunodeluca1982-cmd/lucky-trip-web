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

// ── [3] Carolina Dieckmann (MANDATORY — friend_guides.cover_photo_url) ──────────
//
// SCHEMA REALITY (verified via Supabase API):
//   friend_guides: cover_photo_url (TEXT) — the correct image column
//                  hero_video_url (TEXT)   — also exists, may hold same url
//                  NO "photo_url" column   — that column does NOT exist
//   friends:       profile_photo_url (null), cover_photo_url (null) — both empty
//
// CORRECT STRATEGY:
//   1. Fetch friend_guides WHERE status='published' + cover_photo_url IS NOT NULL
//   2. Join to friends via friend_id to get slug (for navigation)
//   3. Navigate to /friend/[friends.slug]

async function fetchFriend(): Promise<HeroComposedItem | null> {
  // Step 1: First published friend guide with a real image (cover_photo_url)
  const { data: fg, error: fgErr } = await supabase
    .from("friend_guides")
    .select("id, friend_id, cover_photo_url")
    .eq("status", "published")
    .not("cover_photo_url", "is", null)
    .order("sort_order")
    .limit(1)
    .single();

  if (fgErr || !fg?.cover_photo_url) {
    console.warn("[CAROLINA IMAGE] friend_guides query failed or no cover_photo_url:", fgErr?.message);
    return null;
  }

  // Step 2: Get friend details (slug for navigation, display_name for title)
  const { data: fr, error: frErr } = await supabase
    .from("friends")
    .select("id, slug, display_name")
    .eq("id", fg.friend_id)
    .single();

  if (frErr || !fr) {
    console.warn("[CAROLINA IMAGE] could not resolve friend from friend_id:", fg.friend_id);
    // Still render with the image, use a fallback slug
    const photo = sanitizePhotoUrl(fg.cover_photo_url);
    console.log(`[CAROLINA IMAGE] source: friend_guides | cover_photo_url: ${fg.cover_photo_url}`);
    return {
      id:           String(fg.id),
      source_table: "friend_guides",
      titulo:       "Guia exclusivo",
      localizacao:  "Rio de Janeiro",
      badge:        "Guia exclusivo",
      photo_url:    photo,
      route:        { type: "friend", slug: "carolina-dieckmann" },
    };
  }

  const photo = sanitizePhotoUrl(fg.cover_photo_url);
  console.log(
    `[CAROLINA IMAGE] source: friend_guides | cover_photo_url: ${fg.cover_photo_url}`
  );
  return {
    id:           String(fr.id),
    source_table: "friend_guides",
    titulo:       fr.display_name ?? "Guia exclusivo",
    localizacao:  "Rio de Janeiro",
    badge:        "Guia exclusivo",
    photo_url:    photo,
    route:        { type: "friend", slug: fr.slug },
  };
}

async function forceCarolina(): Promise<HeroComposedItem | null> {
  // Last-resort: try any friend_guides row regardless of status, with cover_photo_url
  const { data: fg } = await supabase
    .from("friend_guides")
    .select("id, friend_id, cover_photo_url")
    .not("cover_photo_url", "is", null)
    .order("sort_order")
    .limit(1)
    .single();

  if (!fg?.cover_photo_url) return null;

  const { data: fr } = await supabase
    .from("friends")
    .select("id, slug, display_name")
    .eq("id", fg.friend_id)
    .single();

  const photo = sanitizePhotoUrl(fg.cover_photo_url);
  console.log(`[CAROLINA IMAGE] force-injected | cover_photo_url: ${fg.cover_photo_url}`);
  return {
    id:           String(fr?.id ?? fg.id),
    source_table: "friend_guides",
    titulo:       fr?.display_name ?? "Guia exclusivo",
    localizacao:  "Rio de Janeiro",
    badge:        "Guia exclusivo",
    photo_url:    photo,
    route:        { type: "friend", slug: fr?.slug ?? "carolina-dieckmann" },
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

      // ── FINAL ARRAY FIX: Rio ALWAYS first ─────────────────────────────────
      // STEP 1 — check if Rio is present
      let heroItems = items;
      const hasRio = heroItems.some(
        item =>
          item.source_table === "destinos" &&
          (item.titulo === "Rio de Janeiro" || item.id === "rio-de-janeiro")
      );

      if (!hasRio) {
        // STEP 2 — fetch Rio from destinos
        const { data: rioData } = await supabase
          .from("destinos")
          .select("*")
          .eq("slug", "rio-de-janeiro")
          .single();

        if (rioData) {
          // STEP 3 — map to hero item  STEP 4 — force insert at front
          heroItems = [buildRio(rioData), ...heroItems];
          console.log("[HERO FIX] Rio force-inserted via final array check");
        }
      } else if (heroItems[0]?.source_table !== "destinos") {
        // STEP 5 — Rio exists but not first — move it
        const found = heroItems.find(item => item.source_table === "destinos");
        if (found) {
          heroItems = [found, ...heroItems.filter(item => item !== found)];
          console.log("[HERO FIX] Rio moved to first position");
        }
      }
      // ── End final array fix ────────────────────────────────────────────────

      for (const item of heroItems) logHeroItem(item);

      console.log(
        `[HERO] composed ${heroItems.length} slots — Rio:${!!rioItem} Kyoto:✓ Santorini:✓ Carolina:${!!carolinaItem}`
      );

      console.log("[HERO DEBUG]", heroItems.map(i => ({
        titulo: i.titulo,
        source: i.source_table,
        slug:   (i as any).slug,
      })));

      // FINAL ENFORCEMENT — DO NOT REMOVE
      const rioIndex = heroItems.findIndex(
        item =>
          item.source_table === "destinos" &&
          item.titulo === "Rio de Janeiro"
      );

      if (rioIndex > -1) {
        const [rioItem] = heroItems.splice(rioIndex, 1);
        heroItems.unshift(rioItem);
        console.log("[HERO FINAL FIX] Rio forced to index 0");
      }

      if (!cancelled) setState({ items: heroItems, loading: false });
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
