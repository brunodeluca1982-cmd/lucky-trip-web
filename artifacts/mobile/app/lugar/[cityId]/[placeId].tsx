/**
 * Place Detail Screen — unified reusable template for the entire app.
 *
 * Route:  /lugar/[cityId]/[placeId]
 * Used by: O que fazer / Onde comer / Onde ficar / Lucky List / Agora no Rio / O essencial
 *
 * Layout (all layers stacked on one root View):
 *   1. Horizontal paging carousel — full-width images/videos
 *   2. Gradient overlay — transparent at top, solid dark at ~50%
 *   3. Fixed "< Voltar" back button — top-left
 *   4. Photo counter — top-right (only when multiple images)
 *   5. Carousel dots — centered at bottom of hero zone
 *   6. Vertical ScrollView — spacer → content card (tags / title / desc / actions)
 *   7. AppTabBar — fixed bottom navigation (same as main tabs)
 *
 * Content is fully dynamic — identical layout for all categories.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getLugar, LugarPlace, resolvePin } from "@/data/lugares";
import { useGuia, sourceTableFromCategoria } from "@/context/GuiaContext";
import type { SavedCategory, SourceTable } from "@/context/GuiaContext";
import { AppTabBar, TAB_BAR_HEIGHT } from "@/components/AppTabBar";
import { ActionBlock } from "@/components/ActionBlock";
import { normalizeLugarPlace, tipoFromPlaceId } from "@/data/normalizePlace";
import { getImageForEntity } from "@/utils/getImageForEntity";
import { supabase } from "@/lib/supabase";

/**
 * Resolve the SavedCategory for the Save button.
 * Priority: explicit source_table > explicit categoria > placeId prefix (legacy static routes).
 */
function resolveSaveCategory(
  placeId: string,
  source_table?: string,
  categoria?: string,
): SavedCategory {
  // Preferred: derive from source_table (authoritative)
  if (source_table === "restaurantes")    return "restaurante";
  if (source_table === "stay_hotels")     return "hotel";
  if (source_table === "o_que_fazer_rio") return "oQueFazer";
  if (source_table === "lucky_list_rio")  return "lucky";
  // Legacy: categoria param from older navigation paths
  if (categoria === "restaurante") return "restaurante";
  if (categoria === "hotel")       return "hotel";
  if (categoria === "lucky")       return "lucky";
  if (categoria === "oQueFazer")   return "oQueFazer";
  // Fallback: static placeId prefixes
  if (placeId.startsWith("c"))     return "restaurante";
  if (placeId.startsWith("h"))     return "hotel";
  if (placeId.startsWith("l"))     return "lucky";
  return "oQueFazer";
}

// ── Supabase lookup ─────────────────────────────────────────────────────────
// When a Supabase item is navigated to (real row ID instead of a static prefix
// like "c1"), this hook fetches the actual row and builds a LugarPlace from it.
// Returns null while loading, undefined when not found / not applicable.
/**
 * Fetches a single entity from Supabase by (placeId, source_table).
 * source_table is the authoritative routing key — always set for Supabase items.
 * categoria is accepted as a legacy fallback for items saved before source_table existed.
 *
 * Table-specific ID casting:
 *   restaurantes → bigint → cast to Number()
 *   all others  → UUID  → pass as string
 */
function useSupabaseLugar(
  placeId: string,
  source_table: string | undefined,
  categoria: string | undefined,
  skip: boolean,
): { place: LugarPlace | null; loading: boolean } {
  const [place, setPlace] = useState<LugarPlace | null>(null);
  const [loading, setLoading] = useState(!skip);

  // Effective table: source_table wins; fall back to categoria→table mapping
  const effectiveTable: string | undefined =
    source_table ??
    (categoria === "restaurante" ? "restaurantes"
      : categoria === "hotel"    ? "stay_hotels"
      : categoria === "oQueFazer" ? "o_que_fazer_rio"
      : categoria === "lucky"    ? "lucky_list_rio"
      : undefined);

  useEffect(() => {
    if (skip) { setLoading(false); return; }
    if (!effectiveTable) { setLoading(false); return; }
    setLoading(true);

    console.log("[useSupabaseLugar] fetching", { placeId, effectiveTable });

    (async () => {
      try {
        let resolved: LugarPlace | null = null;

        if (effectiveTable === "restaurantes") {
          // restaurantes uses integer PK — skip query if ID is not a valid number
          const numId = Number(placeId);
          if (isNaN(numId)) {
            // Legacy string ID (e.g. "colombo") — static data handles this; no Supabase query needed
          } else {
          // Confirmed columns from edge function + previous working code
          const { data, error: err } = await supabase
            .from("restaurantes")
            .select("*")
            .eq("id", numId)
            .maybeSingle();
          if (err) {
            console.warn("[useSupabaseLugar] restaurantes error:", err.message);
          } else if (data) {
            const pin = resolvePin("rio", (data as any).bairro ?? "", 0);
            const photoUri = (data as any).photo_url as string | null ?? null;
            const meuOlhar = (data as any).meu_olhar as string | null;
            const especialidade = (data as any).especialidade as string | null;
            const descricao = meuOlhar
              ?? (especialidade ? `Especialidade: ${especialidade}` : null)
              ?? "Um dos restaurantes curados da nossa seleção no Rio de Janeiro.";
            resolved = {
              id:               String((data as any).id),
              titulo:           (data as any).nome ?? "Restaurante",
              localizacao:      (data as any).bairro ?? "Rio de Janeiro",
              categoria:        ((data as any).categoria as string | null)?.toUpperCase() ?? "RESTAURANTE",
              descricao,
              image:            getImageForEntity("restaurant", (data as any).nome ?? "", (data as any).bairro ?? "", photoUri),
              xPct:             pin.xPct,
              yPct:             pin.yPct,
              tipo_item:        "restaurante",
              google_maps_url:  (data as any).google_maps_url ?? null,
              instagram_handle: (data as any).instagram as string | null ?? null,
              preco:            (data as any).perfil_publico ?? null,
            };
          }
          } // closes the `else { // numId valid }` block
        } else if (effectiveTable === "o_que_fazer_rio") {
          const { data, error: err } = await supabase
            .from("o_que_fazer_rio")
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] o_que_fazer_rio error:", err.message);
          if (data) {
            const pin = resolvePin("rio", (data as any).bairro ?? "", 0);
            // photo_url IS present in o_que_fazer_rio — always use it when available
            const photoUri = (data as any).photo_url as string | null ?? null;
            const meuOlhar = (data as any).meu_olhar as string | null;
            const descricao = meuOlhar ?? "Uma das experiências selecionadas para o seu roteiro no Rio.";
            resolved = {
              id:          String((data as any).id),
              titulo:      (data as any).nome ?? "Experiência",
              localizacao: (data as any).bairro ?? "Rio de Janeiro",
              categoria:   ((data as any).categoria as string | null)?.toUpperCase() ?? "EXPERIÊNCIA",
              descricao,
              image:       getImageForEntity("activity", (data as any).nome ?? "", (data as any).bairro ?? "", photoUri),
              xPct:        pin.xPct,
              yPct:        pin.yPct,
              tipo_item:   "experiencia",
              google_maps_url: (data as any).google_maps_url ?? null,
            };
          }
        } else if (effectiveTable === "lucky_list_rio") {
          // Confirmed columns from edge function enrichment
          const { data, error: err } = await supabase
            .from("lucky_list_rio")
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] lucky_list_rio error:", err.message);
          if (data) {
            const pin = resolvePin("rio", (data as any).bairro ?? "", 0);
            // photo_url IS present in lucky_list_rio — always use it when available
            const photoUri  = (data as any).photo_url as string | null ?? null;
            const meuOlhar  = (data as any).meu_olhar as string | null;
            const descricao = meuOlhar ?? "Um dos achados especiais da Lucky List — lugares que só quem sabe, sabe.";
            const tipoItem  = (data as any).tipo_item as string | null;
            const entityType =
              tipoItem === "restaurante" ? "restaurant" :
              tipoItem === "hotel"       ? "hotel"       :
              "activity";
            const resolvedTipo =
              tipoItem === "restaurante" ? "restaurante" :
              tipoItem === "hotel"       ? "hotel"       :
              "experiencia";
            resolved = {
              id:          String((data as any).id),
              titulo:      (data as any).nome ?? "Lucky Pick",
              localizacao: (data as any).bairro ?? "Rio de Janeiro",
              categoria:   (tipoItem?.toUpperCase()) ?? "LUCKY LIST",
              descricao,
              image:       getImageForEntity(entityType, (data as any).nome ?? "", (data as any).bairro ?? "", photoUri),
              xPct:        pin.xPct,
              yPct:        pin.yPct,
              tipo_item:   resolvedTipo,
              google_maps_url: (data as any).google_maps_url ?? null,
            };
          }
        } else if (effectiveTable === "stay_hotels") {
          const { data, error: err } = await supabase
            .from("stay_hotels")
            .select("id, hotel_name, hotel_category, photo_url, reserve_url, neighborhoods(neighborhood_name)")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] stay_hotels error:", err.message);
          if (data) {
            const neighborhoodName =
              ((data as any).neighborhoods as { neighborhood_name: string } | null)
                ?.neighborhood_name ?? "Rio de Janeiro";
            const pin = resolvePin("rio", neighborhoodName, 0);
            // photo_url IS present in stay_hotels — always use it when available
            const photoUri = (data as any).photo_url as string | null ?? null;
            resolved = {
              id:          String((data as any).id),
              titulo:      (data as any).hotel_name as string | null ?? "Hotel",
              localizacao: neighborhoodName,
              categoria:   ((data as any).hotel_category as string | null)?.toUpperCase() ?? "HOTEL",
              descricao:   "Uma das hospedagens selecionadas para a sua estadia no Rio de Janeiro.",
              image:       getImageForEntity("hotel", (data as any).hotel_name ?? "", neighborhoodName, photoUri),
              xPct:        pin.xPct,
              yPct:        pin.yPct,
              tipo_item:   "hotel",
              booking_url: (data as any).reserve_url ?? null,
            };
          }
        } else if (effectiveTable === "friend_guide_places") {
          const { data, error: err } = await supabase
            .from("friend_guide_places")
            .select("id, nome, bairro, categoria, meu_olhar, photo_url, google_maps_url, instagram_handle, website_url, reserve_url")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] friend_guide_places error:", err.message);
          if (data) {
            const bairro    = (data as any).bairro as string | null ?? "Rio de Janeiro";
            const pin       = resolvePin("rio", bairro, 0);
            const photoUri  = (data as any).photo_url as string | null ?? null;
            const meuOlhar  = (data as any).meu_olhar as string | null;
            const catRaw    = (data as any).categoria as string | null;
            const descricao = meuOlhar ?? "Um dos lugares desta curadoria especial no Rio de Janeiro.";
            const entityType =
              catRaw === "hotel"       ? "hotel"      :
              catRaw === "restaurante" ? "restaurant" :
              "activity";
            const tipoItem =
              catRaw === "hotel"       ? "hotel"       :
              catRaw === "restaurante" ? "restaurante"  :
              "experiencia";
            resolved = {
              id:               String((data as any).id),
              titulo:           (data as any).nome ?? "Lugar",
              localizacao:      bairro,
              categoria:        catRaw?.toUpperCase() ?? "LUGAR",
              descricao,
              image:            getImageForEntity(entityType, (data as any).nome ?? "", bairro, photoUri),
              xPct:             pin.xPct,
              yPct:             pin.yPct,
              tipo_item:        tipoItem,
              google_maps_url:  (data as any).google_maps_url ?? null,
              instagram_handle: (data as any).instagram_handle ?? null,
              booking_url:      (data as any).reserve_url ?? (data as any).website_url ?? null,
            };
          }
        }

        console.log("[useSupabaseLugar] resolved", resolved ? resolved.id : "null");
        setPlace(resolved);
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId, effectiveTable, skip]);

  return { place, loading };
}


const C = Colors.light;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Hero occupies ~50% of screen height; content scrolls up from below
const HERO_HEIGHT = SCREEN_HEIGHT * 0.50;
// How far the content spacer pushes down before the card starts
const SPACER_H = HERO_HEIGHT - 72;

const FALLBACK: LugarPlace = {
  id: "0",
  titulo: "Local",
  localizacao: "Rio de Janeiro",
  categoria: "EXPERIÊNCIA",
  descricao: "Um dos destinos mais memoráveis do Rio.",
  image: require("../../../assets/images/hero-rio.png"),
  xPct: 50,
  yPct: 50,
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function LugarDetailScreen() {
  const { cityId, placeId, source_table, categoria, titulo: tituloPar, localizacao: localizacaoPar, from_guide_slug } =
    useLocalSearchParams<{ cityId: string; placeId: string; source_table?: string; categoria?: string; titulo?: string; localizacao?: string; from_guide_slug?: string }>();

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // ── Step 1: try static lookup (handles all legacy prefix-based routes) ──
  const staticPlace = getLugar(cityId, placeId);

  // ── Step 2: Supabase-first when source_table is explicitly set.
  //    When navigating from a Supabase-driven screen, source_table is always present.
  //    In that case we always query Supabase, even if a static entry exists for the same
  //    ID, because the Supabase row has richer content (meu_olhar, photo_url, etc.).
  const hasExplicitSourceTable = !!source_table;
  const needsSupabase = !staticPlace || hasExplicitSourceTable;
  const { place: supabasePlace, loading: supabaseLoading } =
    useSupabaseLugar(placeId ?? "", source_table, categoria, !needsSupabase);

  // ── Resolved place:
  //    When source_table is set: prefer Supabase (richer data), fall back to static.
  //    Otherwise: prefer static (instant, no network), fall back to Supabase.
  const place: LugarPlace =
    (hasExplicitSourceTable && supabasePlace)
      ? supabasePlace
      : (staticPlace ?? supabasePlace ?? FALLBACK);
  const images: ImageSourcePropType[] = place.images ?? [place.image];

  // Carousel state
  const [imgIndex, setImgIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  // Normalized place object — single source of truth for all UI actions.
  const normalized = normalizeLugarPlace(
    place,
    tipoFromPlaceId(placeId ?? "", categoria),
  );

  // Save to Trip — backed by GuiaContext (persists across navigation)
  const { isSaved, save, unsave } = useGuia();
  const saved = isSaved(place.id);
  const saveCategory = resolveSaveCategory(placeId ?? "", source_table, categoria);
  // Derive the authoritative source_table for the SavedItem (use param > resolve from saveCategory)
  const resolvedSourceTable: SourceTable =
    (source_table as SourceTable | undefined) ?? sourceTableFromCategoria(saveCategory);

  function toggleSave() {
    if (saved) {
      unsave(place.id);
    } else {
      save({
        id:           place.id,
        categoria:    saveCategory,
        source_table: resolvedSourceTable,
        titulo:       place.titulo,
        localizacao:  place.localizacao,
        image:        place.image,
      });
    }
  }

  // Scroll sync for carousel
  function handleCarouselScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setImgIndex(idx);
  }

  // ── Loading state while Supabase fetch is in progress ──
  if (supabaseLoading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="rgba(212,175,55,0.9)" />
      </View>
    );
  }

  // ── "Em breve" — entity does not exist in static data or Supabase ──
  if (!staticPlace && !supabasePlace) {
    const fallbackTitulo = Array.isArray(tituloPar) ? tituloPar[0] : (tituloPar ?? "");
    const fallbackLoc    = Array.isArray(localizacaoPar) ? localizacaoPar[0] : (localizacaoPar ?? "Rio de Janeiro");
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image
          source={require("../../../assets/images/hero-rio.png")}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.72)" }]} />
        <Pressable
          style={{ position: "absolute", top: Platform.OS === "web" ? 20 : 54, left: 20, padding: 8 }}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={{ color: "rgba(255,255,255,0.80)", fontSize: 15 }}>← Voltar</Text>
        </Pressable>
        {fallbackTitulo ? (
          <>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              {fallbackLoc}
            </Text>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: "#fff", textAlign: "center", marginBottom: 14 }}>
              {fallbackTitulo}
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 22 }}>
              Página de detalhes em breve.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: "#fff", textAlign: "center", marginBottom: 14 }}>
              Em breve disponível
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 22 }}>
              Este lugar ainda não tem página de detalhes.{"\n"}Em breve estará disponível no app.
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ══════════════════════════════════════════════════════
          1. HERO CAROUSEL — horizontal paging ScrollView.
             Each image is SCREEN_WIDTH wide; shows fullscreen.
             Falls back to single image when place.images is absent.
      ══════════════════════════════════════════════════════ */}
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleCarouselScroll}
        style={s.carousel}
        scrollEnabled={images.length > 1}
      >
        {images.map((src, i) => (
          <Image
            key={`img-${i}`}
            source={src}
            style={s.carouselImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          2. GRADIENT — transparent at top, solid dark at ~52%
      ══════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.06)",
          "rgba(0,0,0,0.55)",
          "#000000",
          "#000000",
        ]}
        locations={[0.12, 0.44, 0.64, 1]}
        style={s.gradient}
      />

      {/* ══════════════════════════════════════════════════════
          3. BACK BUTTON — fixed top-left
      ══════════════════════════════════════════════════════ */}
      <Pressable
        style={[s.backBtn, { top: topInset + 12 }]}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Feather name="arrow-left" size={14} color={C.white} />
        <Text style={s.backBtnText}>Voltar</Text>
      </Pressable>

      {/* Photo counter — top-right (only when multiple images) */}
      {images.length > 1 && (
        <View style={[s.photoCounter, { top: topInset + 18 }]}>
          <Text style={s.photoCounterText}>
            {imgIndex + 1} / {images.length}
          </Text>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════
          4. CAROUSEL DOTS — sits at the bottom of the hero zone,
             above the gradient fade, centered horizontally.
      ══════════════════════════════════════════════════════ */}
      <View style={[s.dotsRow, { top: HERO_HEIGHT - 48 }]}>
        {images.map((_, i) => (
          <Pressable
            key={`dot-${i}`}
            hitSlop={8}
            onPress={() => {
              setImgIndex(i);
              carouselRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
            }}
          >
            <View style={[s.dot, i === imgIndex ? s.dotActive : s.dotInactive]} />
          </Pressable>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════
          5. VERTICAL SCROLL — content card lifts from below hero.
             paddingBottom accounts for the fixed tab bar.
      ══════════════════════════════════════════════════════ */}
      <ScrollView
        style={s.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 12 }}
      >
        {/* Spacer: preserves hero visibility */}
        <View style={{ height: SPACER_H }} />

        {/* ── Content card ── */}
        <View style={s.contentCard}>

          {/* Guide attribution badge — only when entered from a friend guide */}
          {from_guide_slug ? (
            <View style={s.guideBadge}>
              <Feather name="star" size={10} color="#C9A84C" />
              <Text style={s.guideBadgeText}>Curadoria Exclusiva</Text>
            </View>
          ) : null}

          {/* Tags row: CATEGORIA + LOCALIZACAO */}
          <View style={s.tagsRow}>
            <View style={s.tag}>
              <Text style={s.tagText}>{place.categoria}</Text>
            </View>
            <View style={s.tagSep} />
            <View style={s.tag}>
              <Feather
                name="map-pin"
                size={9}
                color="rgba(255,255,255,0.55)"
                style={{ marginRight: 4 }}
              />
              <Text style={s.tagText}>{place.localizacao}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={s.titulo}>{place.titulo}</Text>

          {/* Divider */}
          <View style={s.titleDivider} />

          {/* Description */}
          <Text style={s.descricao}>{place.descricao}</Text>

          {/* ── ActionBlock — single normalized object, never raw fields ── */}
          <ActionBlock place={normalized} />

          {/* ── Action buttons ── */}
          <View style={s.actions}>

            {/* PRIMARY — Salvar */}
            <Pressable
              style={[s.btnPrimary, saved && s.btnPrimarySaved]}
              onPress={toggleSave}
            >
              <Feather
                name={saved ? "check" : "bookmark"}
                size={16}
                color={saved ? "rgba(255,255,255,0.75)" : C.darkBrown}
              />
              <Text style={[s.btnPrimaryText, saved && s.btnPrimaryTextSaved]}>
                {saved ? "Salvo" : "Salvar"}
              </Text>
            </Pressable>

            {/* SECONDARY — Voltar */}
            <Pressable style={s.btnSecondary} onPress={() => router.back()}>
              <Text style={s.btnSecondaryText}>Voltar</Text>
              <Feather name="corner-down-left" size={15} color="rgba(255,255,255,0.55)" />
            </Pressable>

          </View>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          6. BOTTOM TAB BAR — persistent navigation
      ══════════════════════════════════════════════════════ */}
      <AppTabBar />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // ── Hero carousel ──
  carousel: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    zIndex: 0,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },

  // ── Gradient ──
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 1,
  },

  // ── Back button ──
  backBtn: {
    position: "absolute",
    left: 18,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.white,
    letterSpacing: 0.1,
  },

  // ── Photo counter ──
  photoCounter: {
    position: "absolute",
    right: 18,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  photoCounterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.5,
  },

  // ── Carousel dots ──
  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    borderRadius: 4,
    height: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: C.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.38)",
  },

  // ── Content scroll ──
  contentScroll: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },

  // ── Content card ──
  contentCard: {
    backgroundColor: "#000000",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  // ── Guide attribution badge ──
  guideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.24)",
    marginBottom: 14,
  },
  guideBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#C9A84C",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // ── Tags ──
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 16,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  tagSep: {
    width: 8,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // ── Title ──
  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: C.white,
    lineHeight: 44,
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  // ── Divider ──
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 18,
  },

  // ── Description ──
  descricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 26,
    letterSpacing: 0.1,
    marginBottom: 28,
  },

  // ── Actions ──
  actions: {
    gap: 12,
  },

  // Primary — Salvar
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.cream,
    borderRadius: 14,
    paddingVertical: 17,
  },
  btnPrimarySaved: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  btnPrimaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.darkBrown,
    letterSpacing: 0.2,
  },
  btnPrimaryTextSaved: {
    color: "rgba(255,255,255,0.75)",
  },

  // Secondary — Voltar
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  btnSecondaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    letterSpacing: 0.2,
  },
});
