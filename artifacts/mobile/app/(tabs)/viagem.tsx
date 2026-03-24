/**
 * viagem.tsx — "Minha Viagem" planning hub.
 *
 * Order (both states):
 *   Header → Divider → Actions (AI primary + 3 chips) → Saved chips | Empty hint
 *
 * Background:
 *   When saved items exist → rotating blurred destination images (fade crossfade).
 *   When empty → plain cream.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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

const C = Colors.light;

const CATEGORY_ACCENT: Record<SavedCategory, string> = {
  oQueFazer:   C.terracotta,
  restaurante: "#8B6914",
  hotel:       "#2D5A3D",
  lucky:       C.gold,
};

const CATEGORY_LABEL: Record<SavedCategory, string> = {
  oQueFazer:   "Experiência",
  restaurante: "Restaurante",
  hotel:       "Hotel",
  lucky:       "Lucky List",
};

// ─────────────────────────────────────────────────────────────────────────────
// Rotating blurred background
// ─────────────────────────────────────────────────────────────────────────────

function RotatingBackground({ images }: { images: ImageSourcePropType[] }) {
  const [idx, setIdx]   = useState(0);
  const fadeAnim        = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: false,
      }).start(() => {
        setIdx((prev) => (prev + 1) % images.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }).start();
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  const current = images[idx] ?? images[0];

  return (
    <>
      <Animated.Image
        source={current}
        style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
        resizeMode="cover"
        blurRadius={Platform.OS === "ios" ? 28 : 16}
      />
      <LinearGradient
        colors={["rgba(245,240,232,0.58)", "rgba(245,240,232,0.97)"]}
        locations={[0, 0.50]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions — AI primary CTA + 3 secondary chips
// ─────────────────────────────────────────────────────────────────────────────

function ActionArea() {
  return (
    <View style={act.wrap}>
      {/* PRIMARY — AI itinerary CTA */}
      <Pressable
        style={({ pressed }) => [
          act.primaryBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => {}}
      >
        <LinearGradient
          colors={[C.terracotta, "#B5613E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={act.primaryGradient}
        >
          <Feather name="zap" size={17} color={C.white} />
          <Text style={act.primaryLabel}>Criar roteiro com IA</Text>
          <Feather name="arrow-right" size={15} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {/* SECONDARY ROW — 3 glass chips */}
      <View style={act.chipRow}>
        <GlassChip icon="instagram" label="Instagram" onPress={() => {}} />
        <GlassChip icon="video"     label="TikTok"    onPress={() => {}} />
        <GlassChip icon="link"      label="Link"       onPress={() => {}} />
      </View>
    </View>
  );
}

function GlassChip({
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
        act.chip,
        pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={14} color={C.terracotta} />
      <Text style={act.chipLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const act = StyleSheet.create({
  wrap: {
    gap: 10,
    marginBottom: 28,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: `0px 6px 18px rgba(196,112,74,0.32)`,
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.white,
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(196,112,74,0.07)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.16)",
  },
  chipLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.terracotta,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Saved chip card — compact, multiple visible at once
// ─────────────────────────────────────────────────────────────────────────────

function SavedChip({
  item,
  onRemove,
}: {
  item: SavedItem;
  onRemove: (id: string) => void;
}) {
  const accent   = CATEGORY_ACCENT[item.categoria];
  const catLabel = CATEGORY_LABEL[item.categoria];

  return (
    <Pressable
      style={({ pressed }) => [
        chip.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
      onPress={() => router.push(`/lugar/rio/${item.id}`)}
    >
      <Image source={item.image} style={chip.image} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(10,5,2,0.78)"]}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Pressable
        style={chip.removeBtn}
        onPress={(e) => { e.stopPropagation?.(); onRemove(item.id); }}
        hitSlop={8}
      >
        <Feather name="x" size={9} color="rgba(255,255,255,0.9)" />
      </Pressable>
      <View style={chip.footer}>
        <View style={[chip.badge, { borderColor: `${accent}60` }]}>
          <Text style={[chip.badgeText, { color: accent }]}>{catLabel}</Text>
        </View>
        <Text style={chip.name} numberOfLines={2}>{item.titulo}</Text>
      </View>
    </Pressable>
  );
}

const chip = StyleSheet.create({
  card: {
    width: 112,
    height: 148,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.sand,
    marginRight: 10,
    justifyContent: "flex-end",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  } as any,
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(10,5,2,0.50)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: 9,
    gap: 4,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: "rgba(10,5,2,0.32)",
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
    <View style={saved_s.wrap}>
      <Text style={saved_s.label}>
        {saved.length === 1 ? "1 lugar salvo" : `${saved.length} lugares salvos`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={saved_s.scroll}
      >
        {saved.map((item) => (
          <SavedChip key={item.id} item={item} onRemove={onRemove} />
        ))}
      </ScrollView>
    </View>
  );
}

const saved_s = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.warmGray,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  scroll: {
    paddingRight: 8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty hint — minimal, actions are already prominent above
// ─────────────────────────────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <View style={hint.wrap}>
      <View style={hint.iconWrap}>
        <Feather name="bookmark" size={22} color={C.terracotta} />
      </View>
      <Text style={hint.text}>
        Toque no{" "}
        <Text style={hint.bold}>marcador</Text>
        {" "}em qualquer cartão para guardar lugares aqui.
      </Text>
    </View>
  );
}

const hint = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(196,112,74,0.06)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.12)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(196,112,74,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    lineHeight: 22,
  },
  bold: {
    fontFamily: "Inter_600SemiBold",
    color: C.terracotta,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function MinhaViagemScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { saved, unsave } = useGuia();
  const totalSaved        = saved.length;
  const bgImages          = saved.map((s) => s.image);

  return (
    <View style={s.root}>

      {/* ── Rotating blurred background (only when saved places exist) ── */}
      {bgImages.length > 0 && <RotatingBackground images={bgImages} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
        ]}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Viagem</Text>
          <View style={s.titleRow}>
            <Text style={s.title}>Minha Viagem</Text>
            {totalSaved > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{totalSaved}</Text>
              </View>
            )}
          </View>
          <Text style={s.subtitle}>
            {totalSaved === 0
              ? "Suas ideias salvas para a próxima viagem"
              : totalSaved === 1
                ? "1 lugar salvo"
                : `${totalSaved} lugares salvos`}
          </Text>
        </View>

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Actions — always at top, always visible ── */}
        <ActionArea />

        {/* ── Saved chips or empty hint ── */}
        {totalSaved > 0 ? (
          <SavedSection saved={saved} onRemove={unsave} />
        ) : (
          <EmptyHint />
        )}

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
    backgroundColor: C.cream,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    gap: 6,
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.terracotta,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: C.darkBrown,
    lineHeight: 40,
  },
  badge: {
    backgroundColor: C.terracotta,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: C.white,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 24,
  },
});
