/**
 * viagem.tsx — "Minha Viagem" — premium trip planning dashboard.
 *
 * Layout order:
 *   Header → ActionArea (chips → AI CTA) → SavedGrid | EmptyHint → RoteiroSection
 *
 * Background:
 *   Empty  → static blurred Rio image + cinematic gradient
 *   Saved  → rotating fade through saved item images + cinematic gradient
 *
 * Style: dark editorial cinematic — matches luckyBlock / Home dark sections.
 *   rgba(0,0,0,x) panels · gold accent · cream text · no solid terracotta blocks.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGuia, sourceTableFromCategoria } from "@/context/GuiaContext";
import type { SavedCategory, SavedItem } from "@/context/GuiaContext";
import { buildRoteiro, PERIODO_LABEL, PERIODO_ICON } from "@/utils/buildRoteiro";
import type { DiaRoteiro, DiaPeriodo } from "@/utils/buildRoteiro";

const C    = Colors.light;
const GOLD = "#D4AF37";
const { width: SCREEN_W } = Dimensions.get("window");

const FALLBACK_BG = require("@/assets/images/ipanema.png");

// ─────────────────────────────────────────────────────────────────────────────
// Category label map
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<SavedCategory, string> = {
  oQueFazer:   "Experiência",
  restaurante: "Restaurante",
  hotel:       "Hotel",
  lucky:       "Lucky List",
};

// ─────────────────────────────────────────────────────────────────────────────
// Background — fades between saved images (or static fallback)
// ─────────────────────────────────────────────────────────────────────────────

function SceneBackground({ images }: { images: ImageSourcePropType[] }) {
  const hasSaved      = images.length > 0;
  const [idx, setIdx] = useState(0);
  // Start at 0 — fades to 1 on first image load, then used for crossfade rotation
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const firstLoaded   = useRef(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setIdx((prev) => (prev + 1) % images.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  const src = hasSaved ? (images[idx] ?? images[0]) : FALLBACK_BG;

  function handleLoad() {
    if (firstLoaded.current) return;
    firstLoaded.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }

  return (
    <>
      {/* Warm placeholder — always visible, matches Rio destination palette */}
      <LinearGradient
        colors={["#2D1A08", "#1A0E04"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Image + cinematic overlay fade in together after load */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Animated.Image
          source={src}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          blurRadius={Platform.OS === "ios" ? 30 : 18}
          onLoad={handleLoad}
        />
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.05)",
            "rgba(0,0,0,0.25)",
            "rgba(0,0,0,0.52)",
            "rgba(0,0,0,0.72)",
          ]}
          locations={[0, 0.30, 0.62, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </Animated.View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action area — Row 1: social chips · Row 2: AI primary CTA
// ─────────────────────────────────────────────────────────────────────────────

function SocialChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        act.socialChip,
        pressed && { opacity: 0.65, transform: [{ scale: 0.95 }] },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={13} color="rgba(255,255,255,0.75)" />
      <Text style={act.socialLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function ActionArea({ hasSaved }: { hasSaved: boolean }) {
  return (
    <View style={act.wrap}>
      {/* Row 1 — social import chips */}
      <View style={act.socialRow}>
        <SocialChip icon="instagram" label="Instagram" onPress={() => {}} />
        <SocialChip icon="video"     label="TikTok"    onPress={() => {}} />
        <SocialChip icon="link-2"    label="Link"      onPress={() => {}} />
      </View>

      {/* Row 2 — primary AI CTA (dark glass panel, gold accent) */}
      <Pressable
        style={({ pressed }) => [
          act.aiBtn,
          pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        ]}
        onPress={() =>
          hasSaved
            ? router.push({ pathname: "/roteiro", params: { contextual: "1" } })
            : router.push("/roteiro")
        }
      >
        <View style={act.aiLeft}>
          <View style={act.aiIconWrap}>
            <Feather name="zap" size={15} color={GOLD} />
          </View>
          <View>
            <Text style={act.aiLabel}>Criar roteiro inteligente</Text>
            <Text style={act.aiSub}>Baseado nos seus lugares salvos</Text>
          </View>
        </View>
        <Feather name="arrow-right" size={15} color={`${GOLD}90`} />
      </Pressable>
    </View>
  );
}

const act = StyleSheet.create({
  wrap: {
    gap: 10,
    marginBottom: 28,
  },

  // Social chips — glass, cream tint
  socialRow: {
    flexDirection: "row",
    gap: 8,
  },
  socialChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  socialLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },

  // AI CTA — dark glass, gold accent (matches home's luckyBlock aesthetic)
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.26)",
    borderWidth: 1,
    borderColor: `${GOLD}28`,
    boxShadow: `0px 4px 20px rgba(201,168,76,0.12)`,
  },
  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  aiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${GOLD}14`,
    borderWidth: 1,
    borderColor: `${GOLD}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  aiLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.cream,
    letterSpacing: 0.1,
  },
  aiSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.48)",
    marginTop: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Saved places — compact horizontal scroll
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = Math.round((SCREEN_W - 48 - 10) / 2.6);
const CARD_H = Math.round(CARD_W * 1.3);

function SavedCard({
  item,
  onRemove,
}: {
  item: SavedItem;
  onRemove: (id: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        sc.card,
        { width: CARD_W, height: CARD_H },
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
      onPress={() => {
        const table = item.source_table ?? sourceTableFromCategoria(item.categoria);
        console.log("[viagem tap]", { id: item.id, source_table: table, titulo: item.titulo });
        // UUID regex — real Supabase IDs are 36-char UUIDs; static hotel IDs are h1/h2 etc.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        if (table === "stay_hotels" && isUUID) {
          router.push({ pathname: "/ondeFicar/hotel/[hotelId]", params: { hotelId: item.id } });
        } else {
          router.push({
            pathname: "/lugar/[cityId]/[placeId]",
            params: { cityId: "rio", placeId: item.id, source_table: table },
          });
        }
      }}
    >
      <Image source={item.image} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.62)"]}
        locations={[0.28, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Pressable
        style={sc.removeBtn}
        onPress={(e) => { e.stopPropagation?.(); onRemove(item.id); }}
        hitSlop={8}
      >
        <Feather name="x" size={9} color="rgba(255,255,255,0.80)" />
      </Pressable>
      <View style={sc.footer}>
        <Text style={sc.catLabel} numberOfLines={1}>
          {CATEGORY_LABEL[item.categoria].toUpperCase()}
        </Text>
        <Text style={sc.name} numberOfLines={2}>{item.titulo}</Text>
      </View>
    </Pressable>
  );
}

const sc = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#100D09",
    marginRight: 10,
    justifyContent: "flex-end",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.20)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  footer: {
    padding: 10,
    gap: 3,
  },
  catLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    color: GOLD,
    letterSpacing: 1.2,
  },
  name: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 12,
    color: C.cream,
    lineHeight: 16,
  },
});

function SavedSection({
  saved,
  onRemove,
}: {
  saved: SavedItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <View style={ss.wrap}>
      <View style={ss.labelRow}>
        <Text style={ss.label}>
          {saved.length === 1 ? "1 lugar salvo" : `${saved.length} lugares salvos`}
        </Text>
        <View style={ss.dot} />
        <Text style={ss.sublabel}>toque para ver</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ss.scroll}
        decelerationRate="fast"
      >
        {saved.map((item) => (
          <SavedCard key={item.id} item={item} onRemove={onRemove} />
        ))}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  sublabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },
  scroll: {
    paddingRight: 8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty hint — dark glass, cream text, gold icon
// ─────────────────────────────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <View style={eh.wrap}>
      <View style={eh.iconRing}>
        <Feather name="bookmark" size={20} color={GOLD} />
      </View>
      <View style={eh.body}>
        <Text style={eh.title}>Nenhum lugar salvo ainda</Text>
        <Text style={eh.desc}>
          Toque no{" "}
          <Text style={eh.bold}>marcador</Text>
          {" "}em qualquer cartão para guardar aqui.
        </Text>
      </View>
    </View>
  );
}

const eh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${GOLD}12`,
    borderWidth: 1,
    borderColor: `${GOLD}28`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.cream,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.50)",
    lineHeight: 20,
  },
  bold: {
    fontFamily: "Inter_600SemiBold",
    color: GOLD,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Roteiro Base — dark glass cards matching home's luckyBlock aesthetic
// ─────────────────────────────────────────────────────────────────────────────

function PeriodoBlock({ periodo, items }: DiaPeriodo) {
  const label = PERIODO_LABEL[periodo];
  const icon  = PERIODO_ICON[periodo] as keyof typeof Feather.glyphMap;
  return (
    <View style={rot.periodoWrap}>
      <View style={rot.periodoHeader}>
        <Feather name={icon} size={10} color={GOLD} />
        <Text style={rot.periodoLabel}>{label}</Text>
      </View>
      {items.map((item) => (
        <View key={item.id} style={rot.itemRow}>
          <View style={rot.itemDot} />
          <Text style={rot.itemNome} numberOfLines={1}>{item.titulo}</Text>
        </View>
      ))}
    </View>
  );
}

function DiaCard({ dia }: { dia: DiaRoteiro }) {
  return (
    <View style={rot.diaCard}>
      <View style={rot.diaHeader}>
        <Text style={rot.diaNum}>DIA {dia.numero}</Text>
        <Text style={rot.diaBairro}>{dia.bairro}</Text>
      </View>
      <View style={rot.separator} />
      {dia.periodos.map((p) => (
        <PeriodoBlock key={p.periodo} {...p} />
      ))}
    </View>
  );
}

function RoteiroSection({ dias }: { dias: DiaRoteiro[] }) {
  if (dias.length === 0) return null;
  return (
    <View style={rot.wrap}>
      <View style={rot.titleRow}>
        <Text style={rot.sectionLabel}>Roteiro Base</Text>
        <View style={rot.pill}>
          <Text style={rot.pillText}>{dias.length} {dias.length === 1 ? "dia" : "dias"}</Text>
        </View>
      </View>
      {dias.map((dia) => (
        <DiaCard key={dia.bairro} dia={dia} />
      ))}
    </View>
  );
}

const rot = StyleSheet.create({
  wrap: {
    marginTop: 28,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  pill: {
    backgroundColor: `${GOLD}10`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${GOLD}24`,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: GOLD,
  },
  diaCard: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: `${GOLD}18`,
    paddingHorizontal: 18,
    paddingVertical: 16,
    boxShadow: `0px 2px 12px rgba(0,0,0,0.20)`,
  },
  diaHeader: {
    marginBottom: 10,
    gap: 1,
  },
  diaNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  diaBairro: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 20,
    color: C.cream,
    lineHeight: 26,
  },
  separator: {
    height: 1,
    backgroundColor: `${GOLD}14`,
    marginBottom: 12,
  },
  periodoWrap: {
    marginBottom: 10,
  },
  periodoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  periodoLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  itemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    flexShrink: 0,
  },
  itemNome: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    flex: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function MinhaViagemScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top + 12;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { saved, unsave } = useGuia();
  const totalSaved        = saved.length;
  const bgImages          = saved.map((s) => s.image);
  const dias              = buildRoteiro(saved);

  return (
    <View style={s.root}>

      {/* ── Cinematic background — always present ── */}
      <SceneBackground images={bgImages} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 90 },
        ]}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>VIAGEM</Text>
          <View style={s.titleRow}>
            <Text style={s.title}>Minha Viagem</Text>
            {totalSaved > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countText}>{totalSaved}</Text>
              </View>
            )}
          </View>
          <Text style={s.subtitle}>
            {totalSaved === 0
              ? "Suas ideias salvas para a próxima viagem"
              : totalSaved === 1
                ? "1 lugar salvo · Rio de Janeiro"
                : `${totalSaved} lugares salvos · Rio de Janeiro`}
          </Text>
        </View>

        {/* ── Thin rule ── */}
        <View style={s.rule} />

        {/* ── Actions (social chips → AI CTA) ── */}
        <ActionArea hasSaved={totalSaved > 0} />

        {/* ── Saved places or empty hint ── */}
        {totalSaved > 0 ? (
          <SavedSection saved={saved} onRemove={unsave} />
        ) : (
          <EmptyHint />
        )}

        {/* ── Roteiro Base ── */}
        <RoteiroSection dias={dias} />

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen-level styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A0E04",
  },
  content: {
    paddingHorizontal: 24,
  },

  // Header — cream text on dark cinematic background
  header: {
    gap: 5,
    marginBottom: 22,
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 2.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: C.cream,
    lineHeight: 42,
  },
  countBadge: {
    backgroundColor: `${GOLD}22`,
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: `${GOLD}40`,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: GOLD,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.50)",
    lineHeight: 20,
  },

  // Rule
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 22,
  },
});
