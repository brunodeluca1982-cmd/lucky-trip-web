/**
 * O essencial do [cidade] — curated first entry point into a destination.
 *
 * Structure:
 *  1. Cinematic hero header (back button + title + intro)
 *  2. Section: Clássicos do Rio — 2-col image grid (reference card style)
 *  3. Section: 3 achados Lucky no Rio — editorial Lucky cards
 *
 * Data: Classic items are inline mock (Supabase-ready). Lucky items are
 * pulled from LUGARES_LUCKY filtered by IDs l7, l8, l9.
 */

import React from "react";
import {
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
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { destinos } from "@/data/mockData";
import { LUGARES_LUCKY } from "@/data/lugares";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Classic Rio items (Supabase-ready mock) ───────────────────────────────────
interface ClassicoItem {
  id: string;
  titulo: string;
  localizacao: string;
  categoria: string;
  image: ImageSourcePropType;
}

// IDs map directly to LUGARES_O_QUE_FAZER["rio"] entries — resolved by getLugar()
const CLASSICOS_RIO: ClassicoItem[] = [
  {
    id: "2",
    titulo: "Cristo Redentor",
    localizacao: "Corcovado",
    categoria: "ÍCONE",
    image: require("../../assets/images/cristo.png"),
  },
  {
    id: "3",
    titulo: "Pão de Açúcar",
    localizacao: "Urca",
    categoria: "MIRANTE",
    image: require("../../assets/images/pao-acucar.png"),
  },
  {
    id: "1",
    titulo: "Praia de Ipanema",
    localizacao: "Ipanema",
    categoria: "PRAIA",
    image: require("../../assets/images/ipanema.png"),
  },
  {
    id: "6",
    titulo: "Arpoador",
    localizacao: "Arpoador",
    categoria: "RITUAL",
    image: require("../../assets/images/ipanema.png"),
  },
  {
    id: "7",
    titulo: "Santa Teresa",
    localizacao: "Santa Teresa",
    categoria: "BAIRRO",
    image: require("../../assets/images/lapa.png"),
  },
  {
    id: "8",
    titulo: "Jardim Botânico",
    localizacao: "Jardim Botânico",
    categoria: "NATUREZA",
    image: require("../../assets/images/secret2.png"),
  },
];

// Lucky items shown on this page (Supabase-ready: filter by id)
const LUCKY_ESSENCIAL_IDS = ["l7", "l8", "l9"];

// ── 2-column card (reference style) ──────────────────────────────────────────
const CARD_W = (SCREEN_WIDTH - 48 - 12) / 2;

function ClassicoCard({ item }: { item: ClassicoItem }) {
  return (
    <Pressable
      style={({ pressed }) => [
        s.classicoCard,
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
      onPress={() => router.push(`/lugar/rio/${item.id}`)}
    >
      <Image source={item.image} style={s.classicoImage} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.02)", "rgba(10,5,2,0.82)"]}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.classicoOverlay}>
        <Text style={s.classicoCategoria}>{item.categoria}</Text>
        <Text style={s.classicoTitulo} numberOfLines={2}>
          {item.titulo}
        </Text>
        <Text style={s.classicoBairro}>{item.localizacao}</Text>
      </View>
    </Pressable>
  );
}

// ── Lucky editorial card (full-width, gold accent) ────────────────────────────
function LuckyCard({
  item,
  index,
  cityId,
}: {
  item: ReturnType<typeof LUGARES_LUCKY["rio"]>[number];
  index: number;
  cityId: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        s.luckyCard,
        pressed && { opacity: 0.90 },
      ]}
      onPress={() => router.push(`/lugar/${cityId}/${item.id}`)}
    >
      {/* Image */}
      <View style={s.luckyImageWrap}>
        <Image source={item.image} style={s.luckyImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.06)", "rgba(10,5,2,0.55)"]}
          locations={[0.2, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Gold number badge */}
        <View style={s.luckyNumBadge}>
          <Text style={s.luckyNumText}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        {/* Category pill */}
        <View style={s.luckyCatPill}>
          <Text style={s.luckyCatText}>{item.categoria}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={s.luckyBody}>
        <View style={s.luckyMeta}>
          <Text style={s.luckyStar}>✦</Text>
          <Text style={s.luckyLoc}>{item.localizacao}</Text>
        </View>
        <Text style={s.luckyTitulo}>{item.titulo}</Text>
        <Text style={s.luckyDesc} numberOfLines={3}>
          {item.descricao}
        </Text>
        <View style={s.luckyAction}>
          <Text style={s.luckyActionText}>Ver detalhes</Text>
          <Feather name="arrow-right" size={12} color={C.gold} />
        </View>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EssencialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];

  // Classic items: currently from inline mock — swap for Supabase fetch here
  const classicos = CLASSICOS_RIO;

  // Lucky picks: filter the 3 Supabase-ready items from the Lucky List
  const allLucky = LUGARES_LUCKY[destino.id] ?? [];
  const luckyPicks = LUCKY_ESSENCIAL_IDS
    .map((lid) => allLucky.find((l) => l.id === lid))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fullscreen background ── */}
      <Image source={destino.image} style={s.bgImage} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(10,5,2,0.78)", "rgba(10,5,2,0.60)", "#0A0502"]}
        locations={[0, 0.30, 0.55]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Back button — fixed ── */}
      <Pressable
        onPress={() => router.back()}
        style={[s.backBtn, { top: topInset + 12 }]}
        hitSlop={8}
      >
        <Feather name="arrow-left" size={18} color={C.white} />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: topInset + 64, paddingBottom: bottomPad + 60 },
        ]}
      >
        {/* ── Hero header ── */}
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>COMECE POR AQUI</Text>
          <Text style={s.heroTitle}>O essencial{"\n"}do Rio</Text>
          <Text style={s.heroSub}>
            Os clássicos que definem o Rio — com um toque Lucky para quem quer
            começar pelo que realmente importa.
          </Text>
        </View>

        {/* ── Section 1: Clássicos do Rio ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>CLÁSSICOS DO RIO</Text>
          <Text style={s.sectionCount}>{classicos.length} lugares</Text>
        </View>

        <View style={s.grid2}>
          {classicos.map((item) => (
            <ClassicoCard key={item.id} item={item} />
          ))}
        </View>

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Section 2: 3 achados Lucky no Rio ── */}
        <View style={s.sectionHeader}>
          <View style={s.luckyHeaderRow}>
            <Text style={s.luckyHeaderStar}>✦</Text>
            <Text style={s.luckyHeaderLabel}>3 ACHADOS LUCKY NO RIO</Text>
          </View>
          <Text style={s.luckyHeaderSub}>
            Segredos que poucos conhecem. Escolhidos com razão.
          </Text>
        </View>

        <View style={s.luckyList}>
          {luckyPicks.map((item, i) => (
            <LuckyCard
              key={item.id}
              item={item}
              index={i}
              cityId={destino.id}
            />
          ))}
        </View>

        {/* ── Editorial footer ── */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria para quem quer começar o Rio pelo que realmente importa.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0502",
  },

  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    opacity: 0.22,
  },

  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.40)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {},

  // ── Hero ──
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 10,
  },
  heroEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 2.5,
  },
  heroTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 38,
    color: C.white,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 22,
    maxWidth: 300,
  },

  // ── Section header ──
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 4,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: C.terracotta,
    letterSpacing: 2.2,
  },
  sectionCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.36)",
    letterSpacing: 0.3,
  },

  // ── 2-column grid ──
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 4,
  },

  // ── Classico card (reference style) ──
  classicoCard: {
    width: CARD_W,
    height: CARD_W * 1.28,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A1208",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  classicoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  classicoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 13,
    gap: 2,
  },
  classicoCategoria: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  classicoTitulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 15,
    color: C.white,
    lineHeight: 20,
  },
  classicoBairro: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.50)",
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 24,
    marginVertical: 32,
  },

  // ── Lucky section header ──
  luckyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  luckyHeaderStar: {
    fontSize: 11,
    color: C.gold,
  },
  luckyHeaderLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: C.gold,
    letterSpacing: 2.2,
  },
  luckyHeaderSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.42)",
    lineHeight: 20,
  },

  // ── Lucky list ──
  luckyList: {
    paddingHorizontal: 24,
    gap: 16,
  },

  // ── Lucky card (editorial full-width) ──
  luckyCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.16)",
  },

  luckyImageWrap: {
    height: 160,
    position: "relative",
  },
  luckyImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  luckyNumBadge: {
    position: "absolute",
    bottom: 12,
    left: 14,
  },
  luckyNumText: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 28,
    color: "rgba(201,168,76,0.55)",
    letterSpacing: -0.5,
  },
  luckyCatPill: {
    position: "absolute",
    top: 12,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
  },
  luckyCatText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: C.gold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  luckyBody: {
    padding: 18,
    gap: 6,
  },
  luckyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  luckyStar: {
    fontSize: 9,
    color: C.gold,
  },
  luckyLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(201,168,76,0.65)",
    letterSpacing: 0.3,
  },
  luckyTitulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: C.white,
    lineHeight: 25,
    letterSpacing: -0.1,
  },
  luckyDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 20,
  },
  luckyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  luckyActionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.gold,
    letterSpacing: 0.2,
  },

  // ── Footer ──
  footer: {
    marginTop: 40,
    marginHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  footerL: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: C.terracotta,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});
