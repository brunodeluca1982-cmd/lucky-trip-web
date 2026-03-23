/**
 * Place Detail Screen
 *
 * Route: /lugar/[cityId]/[placeId]
 * Reached from: O que fazer card tap, or "Ver no mapa" button.
 *
 * Layout:
 * - Cinematic hero image (fullscreen, gradient overlay)
 * - Scrollable content floats over: tags → title → description → actions
 * - "Ver no mapa" toggles the illustrated map with a single pin for this place
 * - Map is hidden by default; appears only when the user explicitly requests it
 */

import React, { useState } from "react";
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
import { getLugar, LugarPlace } from "@/data/lugares";
import { IllustratedMap, MapPlace } from "@/components/IllustratedMap";

const C = Colors.light;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAP_RIO = require("../../../assets/images/map-rio.png");

function getMapImage(cityId: string): ImageSourcePropType {
  switch (cityId) {
    case "rio": return MAP_RIO;
    default:    return MAP_RIO;
  }
}

// ── Fallback place for unknown ids ────────────────────────────────────────────
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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LugarDetailScreen() {
  const { cityId, placeId, showMap: showMapParam } =
    useLocalSearchParams<{ cityId: string; placeId: string; showMap?: string }>();

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const place = getLugar(cityId, placeId) ?? FALLBACK;

  // Map starts visible if navigated here via "Ver no mapa"
  const [showMap, setShowMap] = useState(showMapParam === "true");

  // Single-pin data for the illustrated map
  const mapPin: MapPlace = {
    id: place.id,
    titulo: place.titulo,
    localizacao: place.localizacao,
    categoria: place.categoria,
    xPct: place.xPct,
    yPct: place.yPct,
  };

  const HERO_HEIGHT = SCREEN_HEIGHT * 0.44;
  const SPACER_H = HERO_HEIGHT - 60; // scroll content starts 60px before hero ends

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Hero image — fullscreen background ── */}
      <Image
        source={place.image}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* ── Gradient overlay — transparent at top, solid dark at ~45% ── */}
      <LinearGradient
        colors={["transparent", "rgba(10,5,2,0.72)", "#0A0502"]}
        locations={[0.18, 0.46, 0.68]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Fixed back button ── */}
      <Pressable
        style={[s.backBtn, { top: topInset + 10 }]}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Feather name="arrow-left" size={15} color={C.white} />
        <Text style={s.backBtnText}>Voltar</Text>
      </Pressable>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={StyleSheet.absoluteFill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* Spacer: lets the hero show behind the content */}
        <View style={{ height: SPACER_H }} />

        {/* Tags row */}
        <View style={s.tags}>
          <View style={s.tag}>
            <Text style={s.tagText}>{place.categoria}</Text>
          </View>
          <View style={s.tag}>
            <Text style={s.tagText}>{place.localizacao}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.titulo}>{place.titulo}</Text>

        {/* Description */}
        <Text style={s.descricao}>{place.descricao}</Text>

        {/* ── Illustrated map — revealed when user taps "Ver no mapa" ── */}
        {showMap && (
          <View style={s.mapSection}>
            <IllustratedMap
              mapImage={getMapImage(cityId)}
              places={[mapPin]}
              selectedId={place.id}
            />
          </View>
        )}

        {/* ── Action buttons ── */}
        <View style={s.actions}>
          {/* Salvar */}
          <Pressable style={s.btnSalvar}>
            <Feather name="bookmark" size={16} color={C.darkBrown} />
            <Text style={s.btnSalvarText}>Salvar</Text>
          </Pressable>

          {/* Ver no mapa / Ocultar mapa */}
          <Pressable
            style={s.btnMapa}
            onPress={() => setShowMap((v) => !v)}
          >
            <Feather
              name="map-pin"
              size={16}
              color={showMap ? C.terracotta : "rgba(255,255,255,0.70)"}
            />
            <Text style={[s.btnMapaText, showMap && s.btnMapaTextActive]}>
              {showMap ? "Ocultar mapa" : "Ver no mapa"}
            </Text>
          </Pressable>
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

  backBtn: {
    position: "absolute",
    left: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.36)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.white,
    letterSpacing: 0.2,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: C.white,
    lineHeight: 46,
    letterSpacing: -0.5,
    paddingHorizontal: 22,
    marginBottom: 18,
  },

  descricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 26,
    letterSpacing: 0.1,
    paddingHorizontal: 22,
    marginBottom: 28,
  },

  mapSection: {
    marginBottom: 24,
    borderRadius: 0,
    overflow: "hidden",
  },

  actions: {
    paddingHorizontal: 22,
    gap: 12,
  },

  btnSalvar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.cream,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnSalvarText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.darkBrown,
    letterSpacing: 0.3,
  },

  btnMapa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  btnMapaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.3,
  },
  btnMapaTextActive: {
    color: C.terracotta,
  },
});
