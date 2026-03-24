/**
 * viagem.tsx — "Minha Viagem" — premium trip planning dashboard.
 *
 * Layout order:
 *   Header → ActionArea (chips → AI CTA) → SavedGrid | EmptyHint → RoteiroSection
 *
 * Background:
 *   Empty  → static blurred Rio image + gradient overlay
 *   Saved  → rotating fade through saved item images + gradient
 *
 * Style system:
 *   Glassmorphism panels, transparent blocks, cream + terracotta + gold palette.
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
import { useGuia } from "@/context/GuiaContext";
import type { SavedCategory, SavedItem } from "@/context/GuiaContext";
import { buildRoteiro, PERIODO_LABEL, PERIODO_ICON } from "@/utils/buildRoteiro";
import type { DiaRoteiro, DiaPeriodo } from "@/utils/buildRoteiro";

const C    = Colors.light;
const GOLD = "#C9A84C";
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
  const hasSaved   = images.length > 0;
  const [idx, setIdx] = useState(0);
  const fadeAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }).start(() => {
        setIdx((prev) => (prev + 1) % images.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }).start();
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  const src = hasSaved ? (images[idx] ?? images[0]) : FALLBACK_BG;

  return (
    <>
      <Animated.Image
        source={src}
        style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
        resizeMode="cover"
        blurRadius={Platform.OS === "ios" ? 32 : 20}
      />
      {/* 4-stop gradient: let image breathe at top, opaque cream at bottom */}
      <LinearGradient
        colors={[
          "rgba(245,240,232,0.30)",
          "rgba(245,240,232,0.62)",
          "rgba(245,240,232,0.88)",
          "rgba(245,240,232,0.97)",
        ]}
        locations={[0, 0.28, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
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
        pressed && { opacity: 0.72, transform: [{ scale: 0.95 }] },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={13} color={C.terracotta} />
      <Text style={act.socialLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function ActionArea() {
  return (
    <View style={act.wrap}>
      {/* Row 1 — social import chips */}
      <View style={act.socialRow}>
        <SocialChip icon="instagram" label="Instagram" onPress={() => {}} />
        <SocialChip icon="video"     label="TikTok"    onPress={() => {}} />
        <SocialChip icon="link-2"    label="Link"      onPress={() => {}} />
      </View>

      {/* Row 2 — primary AI CTA */}
      <Pressable
        style={({ pressed }) => [
          act.aiBtn,
          pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
        ]}
        onPress={() => {}}
      >
        <LinearGradient
          colors={[C.terracotta, "#B85D3A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={act.aiGradient}
        >
          <View style={act.aiLeft}>
            <View style={act.aiIconWrap}>
              <Feather name="zap" size={15} color={C.white} />
            </View>
            <View>
              <Text style={act.aiLabel}>Criar roteiro com IA</Text>
              <Text style={act.aiSub}>Baseado nos seus lugares salvos</Text>
            </View>
          </View>
          <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.65)" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const act = StyleSheet.create({
  wrap: {
    gap: 10,
    marginBottom: 28,
  },

  // Social chips row
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
    backgroundColor: "rgba(245,240,232,0.72)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.18)",
  },
  socialLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.terracotta,
  },

  // AI CTA
  aiBtn: {
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: `0px 8px 24px rgba(196,112,74,0.30)`,
  },
  aiGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.1,
  },
  aiSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.68)",
    marginTop: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Saved places — compact horizontal scroll
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = Math.round((SCREEN_W - 48 - 10) / 2.6); // ~2.6 cards visible
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
      onPress={() => router.push(`/lugar/rio/${item.id}`)}
    >
      {/* Image */}
      <Image source={item.image} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />

      {/* Bottom gradient */}
      <LinearGradient
        colors={["transparent", "rgba(10,5,2,0.85)"]}
        locations={[0.32, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Remove × */}
      <Pressable
        style={sc.removeBtn}
        onPress={(e) => { e.stopPropagation?.(); onRemove(item.id); }}
        hitSlop={8}
      >
        <Feather name="x" size={9} color="rgba(255,255,255,0.88)" />
      </Pressable>

      {/* Footer */}
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
    backgroundColor: "#1C1410",
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
    backgroundColor: "rgba(10,5,2,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
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
    color: C.white,
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
      {/* Section label */}
      <View style={ss.labelRow}>
        <Text style={ss.label}>
          {saved.length === 1 ? "1 lugar salvo" : `${saved.length} lugares salvos`}
        </Text>
        <View style={ss.dot} />
        <Text style={ss.sublabel}>toque para ver</Text>
      </View>

      {/* Horizontal scroll */}
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
    color: C.darkBrown,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.warmGray,
    opacity: 0.5,
  },
  sublabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
  },
  scroll: {
    paddingRight: 8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty hint — minimal, elegant, space-efficient
// ─────────────────────────────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <View style={eh.wrap}>
      <View style={eh.iconRing}>
        <Feather name="bookmark" size={20} color={C.terracotta} />
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
    backgroundColor: "rgba(245,240,232,0.68)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.14)",
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(196,112,74,0.10)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.18)",
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
    color: C.darkBrown,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    lineHeight: 20,
  },
  bold: {
    fontFamily: "Inter_600SemiBold",
    color: C.terracotta,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Roteiro Base — glass cards, day-by-day timetable
// ─────────────────────────────────────────────────────────────────────────────

function PeriodoBlock({ periodo, items }: DiaPeriodo) {
  const label = PERIODO_LABEL[periodo];
  const icon  = PERIODO_ICON[periodo] as keyof typeof Feather.glyphMap;
  return (
    <View style={rot.periodoWrap}>
      <View style={rot.periodoHeader}>
        <Feather name={icon} size={10} color={C.terracotta} />
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
    color: C.darkBrown,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  pill: {
    backgroundColor: "rgba(196,112,74,0.10)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.16)",
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
  },
  diaCard: {
    borderRadius: 16,
    backgroundColor: "rgba(245,240,232,0.78)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.12)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    boxShadow: `0px 2px 12px rgba(10,5,2,0.06)`,
  },
  diaHeader: {
    marginBottom: 10,
    gap: 1,
  },
  diaNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  diaBairro: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 20,
    color: C.darkBrown,
    lineHeight: 26,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(196,112,74,0.12)",
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
    color: C.terracotta,
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
    backgroundColor: C.warmGray,
    opacity: 0.45,
    flexShrink: 0,
  },
  itemNome: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.darkBrown,
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

      {/* ── Ambient background — always present ── */}
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
        <ActionArea />

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
// Screen styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#100A06",
  },
  content: {
    paddingHorizontal: 24,
  },

  // Header
  header: {
    gap: 5,
    marginBottom: 22,
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: C.terracotta,
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
    color: C.darkBrown,
    lineHeight: 42,
  },
  countBadge: {
    backgroundColor: C.terracotta,
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: C.white,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: C.warmGray,
    lineHeight: 20,
  },

  // Divider
  rule: {
    height: 1,
    backgroundColor: "rgba(196,112,74,0.14)",
    marginBottom: 22,
  },
});
