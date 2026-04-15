/**
 * ondeFicar/[id].tsx — "Onde ficar" map + hotel list screen
 *
 * Map: RioMapView (Leaflet satellite).
 * Tap a neighborhood → navigate directly to ondeFicar/bairro/[slug] (no floating card).
 * The scrollable section below the map always shows ALL hotels.
 */

import React, { useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import { useNeighborhoods } from "@/hooks/useNeighborhoods";
import type { Hotel, Neighborhood } from "@/lib/supabase";
import RioMapView from "@/components/RioMapView";
import { HotelCard } from "@/components/HotelCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.50);

const C = Colors.light;

// ── Helpers ───────────────────────────────────────────────────────────────────

type FlatHotel = Hotel & { localizacao: string; neighborhood: Neighborhood };

function flattenHotels(neighborhoods: Neighborhood[]): FlatHotel[] {
  const result: FlatHotel[] = [];
  for (const n of neighborhoods) {
    for (const h of n.hotels ?? []) {
      result.push({ ...h, localizacao: n.neighborhood_name, neighborhood: n });
    }
  }
  result.sort((a, b) => {
    const nd = a.neighborhood.display_order - b.neighborhood.display_order;
    return nd !== 0 ? nd : a.display_order - b.display_order;
  });
  return result;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OndeFicarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets    = useSafeAreaInsets();
  const topInset  = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const { neighborhoods, loading, error } = useNeighborhoods();
  const allHotels = flattenHotels(neighborhoods);

  const listRef = useRef<ScrollView>(null);

  // Tap a neighborhood → navigate directly to its detail page
  function handleNeighborhoodPress(name: string | null) {
    if (!name) return;
    const neighborhood = neighborhoods.find((n) => n.neighborhood_name === name);
    if (!neighborhood) return;
    router.push({
      pathname: "/ondeFicar/bairro/[slug]",
      params: { slug: neighborhood.neighborhood_slug, cityId: destino.id },
    });
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fixed map section ── */}
      <View style={s.mapSection}>
        <RioMapView
          selectedNeighborhood={null}
          onNeighborhoodPress={handleNeighborhoodPress}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[s.mapControls, { top: topInset + 10 }]} pointerEvents="box-none">
          <Pressable style={s.pill} onPress={() => router.back()} hitSlop={8}>
            <Text style={s.pillText}>← Voltar</Text>
          </Pressable>
          <View style={s.pill}>
            <View style={s.badgeDot} />
            <Text style={s.pillText}>
              {loading ? "carregando…" : `${allHotels.length} hospedagens`}
            </Text>
          </View>
        </View>

        <View style={[s.mapHint, { pointerEvents: "none" }]}>
          <Text style={s.mapHintText}>Toque num bairro para explorar</Text>
        </View>
      </View>

      {/* ── Scrollable hotel list ── */}
      <ScrollView
        ref={listRef}
        style={s.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 96 }}
      >
        {/* Photo hero intro */}
        <View style={s.introHeroWrap}>
          <Image
            source={destino.image}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.28)", "rgba(0,0,0,0.92)"]}
            locations={[0.05, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[s.intro, s.introAbsolute]}>
            <Text style={s.introTitle}>Onde ficar em {destino.cidade}</Text>
            <Text style={s.introPara}>
              Onde você dorme define como você acorda. No Rio, cada bairro tem
              um ritmo próprio — escolher bem o hotel muda toda a experiência.
            </Text>
            <View style={s.introMeta}>
              <View style={s.introDot} />
              <Text style={s.introMetaText}>
                Seleção curada ·{" "}
                {loading ? "…" : `${allHotels.length} hospedagem${allHotels.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
          </View>
        </View>

        {/* List section */}
        <View style={s.listSection}>
          <Text style={s.listLabel}>Hospedagens selecionadas</Text>

          {loading && (
            <View style={s.centerWrap}>
              <ActivityIndicator size="small" color={C.terracotta} />
              <Text style={s.emptyText}>Carregando…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={s.centerWrap}>
              <Feather name="alert-circle" size={18} color="rgba(196,112,74,0.4)" />
              <Text style={s.emptyText}>{error}</Text>
            </View>
          )}

          {!loading && !error && allHotels.map((hotel) => {
            const imageUrl = hotel.photo_url ?? null;
            console.log("HOTEL CARD:", hotel.hotel_name, imageUrl);
            return (
              <HotelCard
                key={hotel.id}
                id={String(hotel.id)}
                nome={hotel.hotel_name}
                localizacao={hotel.localizacao}
                tipo={hotel.hotel_category}
                image={imageUrl ? { uri: imageUrl } : null}
                onPress={() =>
                  router.push({
                    pathname: "/ondeFicar/hotel/[hotelId]",
                    params: { hotelId: hotel.id },
                  })
                }
              />
            );
          })}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria para quem quer descansar em {destino.cidade} com estilo.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },

  mapSection: {
    width: "100%",
    height: MAP_H,
    position: "relative",
  },
  mapControls: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 30,
    pointerEvents: "box-none",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    boxShadow: "0px 2px 16px rgba(0,0,0,0.38), 0px 0px 0px 1px rgba(255,255,255,0.06)",
  } as any,
  pillText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.terracotta,
  },
  mapHint: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  mapHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.52)",
    letterSpacing: 0.4,
  },

  listScroll: { flex: 1, backgroundColor: "#000000" },

  introHeroWrap: {
    width: "100%",
    height: 260,
    position: "relative",
    overflow: "hidden",
  },
  introAbsolute: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  intro: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 26,
  },
  introTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: C.white,
    lineHeight: 36,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  introPara: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 26,
    marginBottom: 14,
  },
  introMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  introDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(201,168,76,0.55)",
  },
  introMetaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
  },

  listSection: {
    backgroundColor: "#000000",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  listLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  centerWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.20)",
    textAlign: "center",
  },

  footer: {
    backgroundColor: "#000000",
    marginTop: 4,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    gap: 8,
  },
  footerL: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: "rgba(255,255,255,0.25)",
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
