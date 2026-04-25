// app/lugar/[cityId]/[placeId].tsx — Tela de detalhe do lugar (entidade)
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { supabase } from "@/lib/supabase";
import { useLugar } from "@/hooks/useLugar";
import { useLugarFotos } from "@/hooks/useLugarFotos";

<<<<<<< HEAD
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
  if (source_table === "restaurantes")       return "restaurante";
  if (source_table === "stay_hotels")        return "hotel";
  if (source_table === "o_que_fazer_rio_v2") return "oQueFazer";
  if (source_table === "o_que_fazer_rio")    return "oQueFazer";
  if (source_table === "lucky_list_rio_v2")  return "lucky";
  if (source_table === "lucky_list_rio")     return "lucky";
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
      : categoria === "oQueFazer" ? "o_que_fazer_rio_v2"
      : categoria === "lucky"    ? "lucky_list_rio_v2"
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
        } else if (effectiveTable === "o_que_fazer_rio_v2") {
          const { data, error: err } = await supabase
            .from("o_que_fazer_rio_v2")
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] o_que_fazer_rio_v2 error:", err.message);
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
        } else if (effectiveTable === "lucky_list_rio_v2") {
          const { data, error: err } = await supabase
            .from("lucky_list_rio_v2")
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] lucky_list_rio_v2 error:", err.message);
          if (data) {
            const pin = resolvePin("rio", (data as any).bairro ?? "", 0);
            // photo_url IS present in lucky_list_rio_v2 — always use it when available
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
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] stay_hotels error:", err.message);
          if (data) {
            // Use neighborhood_slug as location display (no join needed)
            const neighborhoodSlug =
              (data as any).neighborhood_slug as string | null ?? "rio-de-janeiro";
            const neighborhoodDisplay = neighborhoodSlug
              .split("-")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
            const pin = resolvePin("rio", neighborhoodDisplay, 0);
            // photo_url IS present in stay_hotels — always use it when available
            const photoUri = (data as any).photo_url as string | null ?? null;
            // Use my_view as description (hotel editorial text)
            const myView   = (data as any).my_view as string | null;
            const descricao = myView ?? "Uma das hospedagens selecionadas para a sua estadia no Rio de Janeiro.";
            resolved = {
              id:              String((data as any).id),
              titulo:          (data as any).hotel_name as string | null ?? "Hotel",
              localizacao:     neighborhoodDisplay,
              categoria:       ((data as any).hotel_category as string | null)?.toUpperCase() ?? "HOTEL",
              descricao,
              image:           getImageForEntity("hotel", (data as any).hotel_name ?? "", neighborhoodDisplay, photoUri),
              xPct:            pin.xPct,
              yPct:            pin.yPct,
              tipo_item:       "hotel",
              google_maps_url: (data as any).google_maps_url ?? null,
              booking_url:     (data as any).reserve_url ?? null,
            };
          }
        } else if (effectiveTable === "o_que_fazer_rio") {
          // Legacy UUID-keyed table — same column structure as o_que_fazer_rio_v2
          const { data, error: err } = await supabase
            .from("o_que_fazer_rio")
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] o_que_fazer_rio error:", err.message);
          if (data) {
            const pin = resolvePin("rio", (data as any).bairro ?? "", 0);
            const photoUri = (data as any).photo_url as string | null ?? null;
            const meuOlhar = (data as any).meu_olhar as string | null;
            const descricao = meuOlhar ?? "Uma das experiências selecionadas para o seu roteiro no Rio.";
            resolved = {
              id:              String((data as any).id),
              titulo:          (data as any).nome ?? "Experiência",
              localizacao:     (data as any).bairro ?? "Rio de Janeiro",
              categoria:       ((data as any).categoria as string | null)?.toUpperCase() ?? "EXPERIÊNCIA",
              descricao,
              image:           getImageForEntity("activity", (data as any).nome ?? "", (data as any).bairro ?? "", photoUri),
              xPct:            pin.xPct,
              yPct:            pin.yPct,
              tipo_item:       "experiencia",
              google_maps_url: (data as any).google_maps_url ?? null,
            };
          }
        } else if (effectiveTable === "lucky_list_rio") {
          // Legacy UUID-keyed table — same column structure as lucky_list_rio_v2
          const { data, error: err } = await supabase
            .from("lucky_list_rio")
            .select("*")
            .eq("id", placeId)
            .maybeSingle();
          if (err) console.warn("[useSupabaseLugar] lucky_list_rio error:", err.message);
          if (data) {
            const pin = resolvePin("rio", (data as any).bairro ?? "", 0);
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
              id:              String((data as any).id),
              titulo:          (data as any).nome ?? "Lucky Pick",
              localizacao:     (data as any).bairro ?? "Rio de Janeiro",
              categoria:       (tipoItem?.toUpperCase()) ?? "LUCKY LIST",
              descricao,
              image:           getImageForEntity(entityType, (data as any).nome ?? "", (data as any).bairro ?? "", photoUri),
              xPct:            pin.xPct,
              yPct:            pin.yPct,
              tipo_item:       resolvedTipo,
              google_maps_url: (data as any).google_maps_url ?? null,
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
=======
>>>>>>> claude/plan-app-architecture-73RnI
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FALLBACK_IMG = require("../../../assets/images/ipanema.png");

const GOLD = "#C9A84C";

// ── Badge labels por tipo ────────────────────────────────────────────────────
const TIPO_LABELS: Record<string, string> = {
  restaurante: "RESTAURANTE",
  bar: "BAR",
  hotel: "HOTEL",
  atividade: "ATIVIDADE",
  passeio: "PASSEIO",
  luckylist: "LUCKY LIST",
};

// ══════════════════════════════════════════════════════════════════════════════
// ── COMPONENTS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Hero Background com carrossel de fotos ───────────────────────────────────
function HeroCarousel({
  fotos,
  currentIdx,
  prevIdx,
  fadeAnim,
}: {
  fotos: string[];
  currentIdx: number;
  prevIdx: number;
  fadeAnim: Animated.Value;
}) {
  if (fotos.length === 0) {
    return (
      <View style={styles.heroContainer}>
        <Image source={FALLBACK_IMG} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.65)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
<<<<<<< HEAD
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
=======
    <View style={styles.heroContainer}>
      {/* Imagem anterior (saindo) */}
      <Animated.Image
        source={{ uri: fotos[prevIdx] || fotos[0] }}
        style={[
          styles.heroImage,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
>>>>>>> claude/plan-app-architecture-73RnI
        ]}
        resizeMode="cover"
      />
      {/* Imagem atual (entrando) */}
      <Animated.Image
        source={{ uri: fotos[currentIdx] || fotos[0] }}
        style={[styles.heroImage, { opacity: fadeAnim }]}
        resizeMode="cover"
      />
      {/* Gradientes para legibilidade */}
      <LinearGradient
        colors={["rgba(0,0,0,0.35)", "transparent"]}
        locations={[0, 0.5]}
        style={[StyleSheet.absoluteFill, { height: SCREEN_HEIGHT * 0.2 }]}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.65)"]}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Dots indicator */}
      {fotos.length > 1 && (
        <View style={styles.dotsContainer}>
          {fotos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIdx && styles.dotActive]}
            />
          ))}
        </View>
      )}
<<<<<<< HEAD

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
=======
>>>>>>> claude/plan-app-architecture-73RnI
    </View>
  );
}

// ── Botão Salvar ─────────────────────────────────────────────────────────────
function SaveButton({ lugarId, initialSaved = false }: { lugarId: string; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Usuário não logado - apenas toggle visual
        setSaved(!saved);
        setLoading(false);
        return;
      }

      if (saved) {
        // Remover
        await supabase
          .from("user_saved_places")
          .delete()
          .eq("user_id", session.user.id)
          .eq("lugar_id", lugarId);
      } else {
        // Adicionar
        await supabase
          .from("user_saved_places")
          .insert({ user_id: session.user.id, lugar_id: lugarId });
      }
      setSaved(!saved);
    } catch (e) {
      console.error("Erro ao salvar lugar:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.saveButton} onPress={handleToggle} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={22}
          color={saved ? GOLD : "#FFFFFF"}
        />
      )}
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function LugarDetailScreen() {
  const { placeId } = useLocalSearchParams<{ cityId: string; placeId: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 20 : insets.top;
  const bottomInset = Platform.OS === "web" ? 20 : insets.bottom;

  // ── Hooks ──
  const { lugar, loading, error } = useLugar(placeId || null);
  const { fotos, loading: loadingFotos } = useLugarFotos(
    lugar ? { ...lugar, destino_slug: lugar.destino?.slug } : null
  );

  // ── Photo carousel state ──
  const [photoIdx, setPhotoIdx] = useState(0);
  const [prevPhotoIdx, setPrevPhotoIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Auto-rotate photos every 6s ──
  useEffect(() => {
    if (fotos.length <= 1) return;

    const interval = setInterval(() => {
      const nextIdx = (photoIdx + 1) % fotos.length;
      setPrevPhotoIdx(photoIdx);
      fadeAnim.setValue(0);
      setPhotoIdx(nextIdx);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 6000);

    return () => clearInterval(interval);
  }, [photoIdx, fotos.length, fadeAnim]);

  // ── Action handlers ──
  const openMaps = useCallback(() => {
    if (lugar?.google_maps_url) {
      Linking.openURL(lugar.google_maps_url);
    } else if (lugar?.google_place_id) {
      Linking.openURL(`https://www.google.com/maps/place/?q=place_id:${lugar.google_place_id}`);
    } else if (lugar?.lat && lugar?.lng) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lugar.lat},${lugar.lng}`);
    }
  }, [lugar]);

  const openInstagram = useCallback(() => {
    if (lugar?.instagram) {
      const handle = lugar.instagram.replace("@", "").trim();
      Linking.openURL(`https://instagram.com/${handle}`);
    }
  }, [lugar]);

  const openReservation = useCallback(() => {
    if (lugar?.url_reserva) {
      Linking.openURL(lugar.url_reserva);
    }
  }, [lugar]);

  // ── Loading state ──
  if (loading || loadingFotos) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  // ── Not found ──
  if (!lugar || error) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={FALLBACK_IMG} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={20} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]} />
        <Pressable style={[styles.backButton, { top: topInset + 12 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.notFoundContent}>
          <Text style={styles.notFoundTitle}>Lugar não encontrado</Text>
          <Text style={styles.notFoundText}>Este lugar ainda não está disponível.</Text>
        </View>
      </View>
    );
  }

  const tipoLabel = TIPO_LABELS[lugar.tipo || lugar.categoria] || lugar.categoria?.toUpperCase() || "LUGAR";
  const hasMaps = lugar.google_maps_url || lugar.google_place_id || (lugar.lat && lugar.lng);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ══════════════════════════════════════════════════════════════════════
          Hero — Carrossel de fotos nítidas
          ══════════════════════════════════════════════════════════════════════ */}
      <HeroCarousel
        fotos={fotos}
        currentIdx={photoIdx}
        prevIdx={prevPhotoIdx}
        fadeAnim={fadeAnim}
      />

      {/* ── Back Button ── */}
      <Pressable
        style={[styles.backButton, { top: topInset + 12 }]}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={20} color="#FFFFFF" />
      </Pressable>

      {/* ── Save Button ── */}
      <View style={[styles.saveButtonWrapper, { top: topInset + 12 }]}>
        <SaveButton lugarId={lugar.id} />
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          Content Container
          ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.contentWrapper}>
        <View style={styles.contentContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 40 }]}
          >
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Badge — Tipo */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tipoLabel}</Text>
            </View>

            {/* Title — Nome */}
            <Text style={styles.title}>{lugar.nome}</Text>

            {/* Bairro */}
            {lugar.bairro?.nome && (
              <View style={styles.bairroRow}>
                <Feather name="map-pin" size={12} color="rgba(255,255,255,0.5)" />
                <Text style={styles.bairroText}>{lugar.bairro.nome}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* ══════════════════════════════════════════════════════════════════
                MEU OLHAR — Texto editorial do Bruno
                ══════════════════════════════════════════════════════════════════ */}
            {lugar.meu_olhar && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MEU OLHAR</Text>
                <Text style={styles.sectionText}>{lugar.meu_olhar}</Text>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                COMO APROVEITAR — Dicas em bullet points
                ══════════════════════════════════════════════════════════════════ */}
            {lugar.como_aproveitar && lugar.como_aproveitar.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>COMO APROVEITAR</Text>
                {lugar.como_aproveitar.map((item, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                INFO — Momento ideal, Vibe, Preço
                ══════════════════════════════════════════════════════════════════ */}
            {(lugar.momento_ideal || lugar.vibe || lugar.preco_nivel) && (
              <View style={styles.infoGrid}>
                {lugar.momento_ideal && lugar.momento_ideal.length > 0 && (
                  <View style={styles.infoItem}>
                    <Feather name="clock" size={14} color={GOLD} />
                    <Text style={styles.infoText}>{lugar.momento_ideal.join(", ")}</Text>
                  </View>
                )}
                {lugar.vibe && lugar.vibe.length > 0 && (
                  <View style={styles.infoItem}>
                    <Feather name="heart" size={14} color={GOLD} />
                    <Text style={styles.infoText}>{lugar.vibe.join(", ")}</Text>
                  </View>
                )}
                {lugar.preco_nivel && (
                  <View style={styles.infoItem}>
                    <Text style={styles.precoText}>{"$".repeat(lugar.preco_nivel)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                ACTION BUTTONS
                ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.actions}>
              {/* Ver no Maps */}
              {hasMaps && (
                <Pressable style={styles.btnPrimary} onPress={openMaps}>
                  <Feather name="map" size={16} color="#FFFFFF" />
                  <Text style={styles.btnPrimaryText}>Ver no Maps</Text>
                </Pressable>
              )}

              {/* Reservar — para hotéis e restaurantes com reserva */}
              {lugar.url_reserva && (
                <Pressable style={styles.btnGold} onPress={openReservation}>
                  <Feather name="calendar" size={16} color="#000000" />
                  <Text style={styles.btnGoldText}>Reservar</Text>
                </Pressable>
              )}

              {/* Instagram */}
              {lugar.instagram && (
                <Pressable style={styles.btnSecondary} onPress={openInstagram}>
                  <Feather name="instagram" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.btnSecondaryText}>
                    {lugar.instagram.startsWith("@") ? lugar.instagram : `@${lugar.instagram}`}
                  </Text>
                </Pressable>
              )}

              {/* Website */}
              {lugar.website && (
                <Pressable
                  style={styles.btnSecondary}
                  onPress={() => Linking.openURL(lugar.website!)}
                >
                  <Feather name="globe" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.btnSecondaryText}>Website</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Hero Carousel ──
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    width: 18,
    backgroundColor: GOLD,
  },

  // ── Back Button ──
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Save Button ──
  saveButtonWrapper: {
    position: "absolute",
    right: 20,
    zIndex: 20,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Content Container ──
  contentWrapper: {
    flex: 1,
    marginTop: SCREEN_HEIGHT * 0.38,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.95)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 24,
  },

  // ── Badge ──
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2,
    color: GOLD,
  },

  // ── Content ──
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 40,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bairroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  bairroText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
  },

  // ── Sections ──
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
    color: GOLD,
    marginBottom: 12,
  },
  sectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: GOLD,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
  },

  // ── Info Grid ──
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  precoText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: GOLD,
  },

  // ── Actions ──
  actions: {
    marginTop: 8,
    gap: 12,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2C5F6E",
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnPrimaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  btnGold: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnGoldText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#000000",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnSecondaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },

  // ── Not Found ──
  notFoundContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  notFoundTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  notFoundText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
