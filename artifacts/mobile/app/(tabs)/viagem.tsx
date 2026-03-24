/**
 * viagem.tsx — "Meu Guia" travel planning hub.
 *
 * Layout:
 *   Header (kept) → Divider → [SavedPlacesGrid | EmptyState] → ActionButtons
 *
 * States:
 *   Empty  → compact icon + message + all action buttons clearly visible
 *   Filled → saved places horizontal grid + action buttons below
 *
 * Background:
 *   When saved items exist → first saved item's image (blurred) + cream overlay.
 *   When empty → plain cream.
 */

import React from "react";
import {
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
// Action Buttons — glassmorphism secondary + filled primary
// ─────────────────────────────────────────────────────────────────────────────

interface ActionBtnProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  primary?: boolean;
  onPress: () => void;
}

function ActionBtn({ icon, label, primary, onPress }: ActionBtnProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        act.btn,
        primary ? act.btnPrimary : act.btnGlass,
        pressed && { opacity: 0.80, transform: [{ scale: 0.96 }] },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={16} color={primary ? C.white : C.terracotta} />
      <Text style={[act.label, primary && act.labelPrimary]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionButtons() {
  return (
    <View style={act.wrap}>
      <Text style={act.sectionLabel}>FERRAMENTAS</Text>
      <View style={act.grid}>
        <View style={act.row}>
          <ActionBtn
            icon="instagram"
            label="Colar Instagram"
            onPress={() => {}}
          />
          <ActionBtn
            icon="video"
            label="Colar TikTok"
            onPress={() => {}}
          />
        </View>
        <View style={act.row}>
          <ActionBtn
            icon="link"
            label="Colar link"
            onPress={() => {}}
          />
          <ActionBtn
            icon="zap"
            label="✦  Criar com IA"
            primary
            onPress={() => {}}
          />
        </View>
      </View>
    </View>
  );
}

const act = StyleSheet.create({
  wrap: {
    marginTop: 28,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.warmGray,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  btnGlass: {
    backgroundColor: "rgba(196,112,74,0.07)",
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.15)",
  },
  btnPrimary: {
    backgroundColor: C.terracotta,
    shadowColor: C.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 5,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.terracotta,
  },
  labelPrimary: {
    color: C.white,
    fontFamily: "Inter_600SemiBold",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Saved Places — horizontal thumbnail cards
// ─────────────────────────────────────────────────────────────────────────────

function SavedThumbCard({
  item,
  onRemove,
}: {
  item: SavedItem;
  onRemove: (id: string) => void;
}) {
  const accent = CATEGORY_ACCENT[item.categoria];
  const catLabel = CATEGORY_LABEL[item.categoria];

  return (
    <Pressable
      style={({ pressed }) => [
        thumb.card,
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
      onPress={() => router.push(`/lugar/rio/${item.id}`)}
    >
      <Image source={item.image} style={thumb.image} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(10,5,2,0.80)"]}
        locations={[0.28, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Remove button */}
      <Pressable
        style={thumb.removeBtn}
        onPress={(e) => { e.stopPropagation?.(); onRemove(item.id); }}
        hitSlop={8}
      >
        <Feather name="x" size={10} color="rgba(255,255,255,0.9)" />
      </Pressable>

      {/* Category badge */}
      <View style={[thumb.catBadge, { borderColor: `${accent}55` }]}>
        <Text style={[thumb.catText, { color: accent }]}>{catLabel}</Text>
      </View>

      {/* Name */}
      <Text style={thumb.name} numberOfLines={2}>{item.titulo}</Text>
    </Pressable>
  );
}

const thumb = StyleSheet.create({
  card: {
    width: 120,
    height: 156,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.sand,
    marginRight: 10,
    justifyContent: "flex-end",
    padding: 10,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  } as any,
  removeBtn: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(10,5,2,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  catBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 5,
    backgroundColor: "rgba(10,5,2,0.35)",
  },
  catText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 13,
    color: C.white,
    lineHeight: 17,
  },
});

function SavedPlacesGrid({
  saved,
  onRemove,
}: {
  saved: SavedItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <View style={grid.wrap}>
      <Text style={grid.label}>
        {saved.length === 1 ? "1 lugar salvo" : `${saved.length} lugares salvos`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={grid.scroll}
      >
        {saved.map((item) => (
          <SavedThumbCard key={item.id} item={item} onRemove={onRemove} />
        ))}
      </ScrollView>
    </View>
  );
}

const grid = StyleSheet.create({
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
// Empty state — compact, leaves room for action buttons below
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={emp.wrap}>
      <View style={emp.iconWrap}>
        <Feather name="bookmark" size={28} color={C.terracotta} />
      </View>
      <Text style={emp.title}>Salve lugares para{"\n"}montar sua viagem</Text>
      <Text style={emp.desc}>
        Toque no{" "}
        <Text style={emp.descBold}>marcador</Text>
        {" "}em qualquer cartão para guardar aqui.
      </Text>
    </View>
  );
}

const emp = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 8,
    gap: 12,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(196,112,74,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.darkBrown,
    textAlign: "center",
    lineHeight: 30,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
  descBold: {
    fontFamily: "Inter_600SemiBold",
    color: C.terracotta,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function MeuGuiaScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { saved, unsave } = useGuia();
  const totalSaved = saved.length;

  const bgSource: ImageSourcePropType | null =
    totalSaved > 0 ? saved[0].image : null;

  return (
    <View style={s.root}>

      {/* ── Blurred destination background ── */}
      {bgSource && (
        <>
          <Image
            source={bgSource}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            blurRadius={Platform.OS === "ios" ? 26 : 14}
          />
          <LinearGradient
            colors={[
              "rgba(245,240,232,0.62)",
              "rgba(245,240,232,0.96)",
            ]}
            locations={[0, 0.48]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      )}

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
            <Text style={s.title}>Meu Guia</Text>
            {totalSaved > 0 && (
              <View style={s.totalBadge}>
                <Text style={s.totalBadgeText}>{totalSaved}</Text>
              </View>
            )}
          </View>
          {totalSaved > 0 && (
            <Text style={s.subtitle}>
              {totalSaved === 1
                ? "1 lugar salvo"
                : `${totalSaved} lugares salvos`}
            </Text>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Saved places grid or compact empty state ── */}
        {totalSaved > 0 ? (
          <SavedPlacesGrid saved={saved} onRemove={unsave} />
        ) : (
          <EmptyState />
        )}

        {/* ── Action buttons — always visible ── */}
        <ActionButtons />

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
  totalBadge: {
    backgroundColor: C.terracotta,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  totalBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: C.white,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 28,
  },
});
