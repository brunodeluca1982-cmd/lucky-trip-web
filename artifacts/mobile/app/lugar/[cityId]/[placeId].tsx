/**
 * Place Detail Screen — unified reusable template for the entire app.
 *
 * Route:  /lugar/[cityId]/[placeId]
 * Used by: O que fazer / Comer bem / Ficar bem / Lucky List / Agora no Rio / O essencial
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
import { useGuia } from "@/context/GuiaContext";
import type { SavedCategory } from "@/context/GuiaContext";
import { AppTabBar, TAB_BAR_HEIGHT } from "@/components/AppTabBar";
import { ActionBlock } from "@/components/ActionBlock";
import { normalizeLugarPlace, tipoFromPlaceId } from "@/data/normalizePlace";
import { getImageForEntity } from "@/utils/getImageForEntity";
import { supabase } from "@/lib/supabase";

// Derive the SavedCategory from the placeId prefix (static) or from an
// explicit categoria query param passed when navigating from Supabase items.
//   "1"–"8"   → oQueFazer
//   "c1"–"c5" → restaurante
//   "h1"–"h5" → hotel
//   "l1"–"l9" → lucky
function resolveSaveCategory(placeId: string, categoria?: string): SavedCategory {
  if (categoria === "restaurante") return "restaurante";
  if (categoria === "hotel")       return "hotel";
  if (categoria === "lucky")       return "lucky";
  if (categoria === "oQueFazer")   return "oQueFazer";
  if (placeId.startsWith("c"))     return "restaurante";
  if (placeId.startsWith("h"))     return "hotel";
  if (placeId.startsWith("l"))     return "lucky";
  return "oQueFazer";
}

// ── Supabase lookup ─────────────────────────────────────────────────────────
// When a Supabase item is navigated to (real row ID instead of a static prefix
// like "c1"), this hook fetches the actual row and builds a LugarPlace from it.
// Returns null while loading, undefined when not found / not applicable.
function useSupabaseLugar(
  placeId: string,
  categoria: string | undefined,
  skip: boolean,
): { place: LugarPlace | null; loading: boolean } {
  const [place, setPlace] = useState<LugarPlace | null>(null);
  const [loading, setLoading] = useState(!skip);

  useEffect(() => {
    if (skip) { setLoading(false); return; }
    setLoading(true);

    (async () => {
      try {
        let resolved: LugarPlace | null = null;

        if (categoria === "restaurante") {
          const { data } = await supabase
            .from("restaurantes")
            .select("id, nome, bairro, especialidade, categoria")
            .eq("id", Number(placeId))
            .maybeSingle();
          if (data) {
            const pin = resolvePin("rio", data.bairro ?? "", 0);
            resolved = {
              id:         String(data.id),
              titulo:     data.nome ?? "Restaurante",
              localizacao: data.bairro ?? "Rio de Janeiro",
              categoria:  "RESTAURANTE",
              descricao:  data.especialidade
                ? `Especialidade: ${data.especialidade}`
                : "Um dos restaurantes curados da nossa seleção no Rio de Janeiro.",
              image: getImageForEntity("restaurant", data.nome ?? "", data.bairro ?? "", null),
              xPct: pin.xPct,
              yPct: pin.yPct,
              tipo_item: "restaurante",
            };
          }
        } else if (categoria === "oQueFazer") {
          const { data } = await supabase
            .from("o_que_fazer_rio")
            .select("id, nome, bairro, categoria, descricao")
            .eq("id", placeId)
            .maybeSingle();
          if (data) {
            const pin = resolvePin("rio", data.bairro ?? "", 0);
            resolved = {
              id:          String(data.id),
              titulo:      data.nome ?? "Experiência",
              localizacao: data.bairro ?? "Rio de Janeiro",
              categoria:   (data.categoria as string | null)?.toUpperCase() ?? "EXPERIÊNCIA",
              descricao:   (data.descricao as string | null)
                ?? "Uma das experiências selecionadas para o seu roteiro no Rio.",
              image: getImageForEntity("activity", data.nome ?? "", data.bairro ?? "", null),
              xPct: pin.xPct,
              yPct: pin.yPct,
              tipo_item: "experiencia",
            };
          }
        } else if (categoria === "lucky") {
          const { data } = await supabase
            .from("lucky_list_rio")
            .select("id, nome, bairro, tipo, descricao")
            .eq("id", placeId)
            .maybeSingle();
          if (data) {
            const pin = resolvePin("rio", data.bairro ?? "", 0);
            resolved = {
              id:          String(data.id),
              titulo:      data.nome ?? "Lucky Pick",
              localizacao: data.bairro ?? "Rio de Janeiro",
              categoria:   "LUCKY LIST",
              descricao:   (data.descricao as string | null)
                ?? "Um dos achados especiais da Lucky List — lugares que só quem sabe, sabe.",
              image: getImageForEntity("activity", data.nome ?? "", data.bairro ?? "", null),
              xPct: pin.xPct,
              yPct: pin.yPct,
              tipo_item: "experiencia",
            };
          }
        }

        setPlace(resolved);
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId, categoria, skip]);

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
  const { cityId, placeId, categoria } =
    useLocalSearchParams<{ cityId: string; placeId: string; categoria?: string }>();

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // ── Step 1: try static lookup (handles all legacy prefix-based routes) ──
  const staticPlace = getLugar(cityId, placeId);

  // ── Step 2: if static lookup failed, query Supabase using `categoria` ──
  const needsSupabase = !staticPlace;
  const { place: supabasePlace, loading: supabaseLoading } =
    useSupabaseLugar(placeId ?? "", categoria, !needsSupabase);

  // ── Resolved place — static wins, then Supabase, then FALLBACK ──
  const place: LugarPlace = staticPlace ?? supabasePlace ?? FALLBACK;
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
  const saveCategory = resolveSaveCategory(placeId ?? "", categoria);

  function toggleSave() {
    if (saved) {
      unsave(place.id);
    } else {
      save({
        id: place.id,
        categoria: saveCategory,
        titulo: place.titulo,
        localizacao: place.localizacao,
        image: place.image,
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
            key={i}
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
            key={i}
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
