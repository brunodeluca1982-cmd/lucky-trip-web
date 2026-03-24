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
  Linking,
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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.50);

const C = Colors.light;

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  luxo:     "LUXO",
  boutique: "BOUTIQUE",
  design:   "DESIGN",
  ícone:    "ÍCONE",
  icone:    "ÍCONE",
  pousada:  "POUSADA",
  budget:   "ECONÔMICO",
};

function categoryLabel(raw: string): string {
  return CATEGORY_LABEL[raw?.toLowerCase()] ?? raw?.toUpperCase() ?? "HOTEL";
}

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
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* Photo hero intro */}
        <View style={s.introHeroWrap}>
          <Image
            source={destino.image}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(10,5,2,0.28)", "rgba(10,5,2,0.92)"]}
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

          {!loading && !error && allHotels.map((hotel, idx) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              index={idx}
              onPress={() =>
                router.push({
                  pathname: "/ondeFicar/hotel/[hotelId]",
                  params: { hotelId: hotel.id },
                })
              }
            />
          ))}
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

// ── Hotel card ────────────────────────────────────────────────────────────────

const GRAD_BY_CATEGORY: Record<string, string> = {
  luxo:     "#2A1410",
  boutique: "#1A1820",
  design:   "#0F1A18",
};

function HotelCard({
  hotel,
  index,
  onPress,
}: {
  hotel: FlatHotel;
  index: number;
  onPress: () => void;
}) {
  const gradStart = GRAD_BY_CATEGORY[hotel.hotel_category] ?? "#1C120A";
  const rawView = hotel.my_view ?? "";
  const firstLine = rawView
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
  const preview = firstLine.length > 130 ? firstLine.slice(0, 127) + "…" : firstLine;

  return (
    <Pressable style={s.card} onPress={onPress}>
      <LinearGradient
        colors={[gradStart, "#0A0502"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardTop}
      >
        <View style={s.badgeRow}>
          {hotel.front_beach && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>Frente ao mar</Text>
            </View>
          )}
          {hotel.rooftop && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>Rooftop</Text>
            </View>
          )}
        </View>
        <Text style={s.watermark} numberOfLines={1}>
          {hotel.localizacao}
        </Text>
        <View style={s.cardTopBottom}>
          <Text style={s.orderNum}>{String(index + 1).padStart(2, "0")}</Text>
          {hotel.featured_restaurant && (
            <View style={s.restBadge}>
              <Feather name="coffee" size={9} color="rgba(201,168,76,0.65)" />
              <Text style={s.restTxt}>{hotel.featured_restaurant}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={s.cardBody}>
        <View style={s.cardMeta}>
          <Text style={s.cardCat}>{categoryLabel(hotel.hotel_category)}</Text>
          <View style={s.cardLoc}>
            <Feather name="map-pin" size={10} color={C.warmGray} />
            <Text style={s.cardLocTxt}>{hotel.localizacao}</Text>
          </View>
        </View>
        <Text style={s.cardName}>{hotel.hotel_name}</Text>
        <Text style={s.cardDesc}>{preview}</Text>

        {hotel.reserve_url ? (
          <Pressable
            style={s.reserveBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Linking.openURL(hotel.reserve_url);
            }}
          >
            <Feather name="external-link" size={13} color={C.gold} />
            <Text style={s.reserveTxt}>Reservar</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0502" },

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
    backgroundColor: "rgba(10,5,2,0.46)",
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

  listScroll: { flex: 1, backgroundColor: "#0A0502" },

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
    backgroundColor: "#0A0502",
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

  card: {
    backgroundColor: "#1C1410",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardTop: {
    height: 144,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  badgeRow: { flexDirection: "row", gap: 7, justifyContent: "flex-end" },
  badge: {
    backgroundColor: "rgba(196,112,74,0.20)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.30)",
  },
  badgeTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 0.3,
  },
  watermark: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: "rgba(255,255,255,0.055)",
    letterSpacing: -1,
    position: "absolute",
    bottom: 32,
    left: 14,
    right: 14,
  },
  cardTopBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderNum: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 1,
  },
  restBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(201,168,76,0.09)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
  },
  restTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(201,168,76,0.72)",
    letterSpacing: 0.2,
  },
  cardBody: { padding: 18, paddingTop: 16 },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardCat: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 1.4,
  },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardLocTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
  },
  cardName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 19,
    color: C.white,
    lineHeight: 26,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
    marginBottom: 14,
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.22)",
    borderRadius: 10,
    paddingVertical: 11,
    backgroundColor: "rgba(201,168,76,0.04)",
  },
  reserveTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.gold,
    letterSpacing: 0.1,
  },

  footer: {
    backgroundColor: "#0A0502",
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
