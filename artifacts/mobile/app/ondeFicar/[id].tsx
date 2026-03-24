import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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
import OndeFicarMap, { MAP_H } from "@/components/OndeFicarMap";

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

  const [selected, setSelected] = useState<string | null>(null);

  const activeNeighborhood = neighborhoods.find(
    (n) => n.neighborhood_name === selected,
  ) ?? null;

  const hotels = selected
    ? allHotels.filter((h) => h.localizacao === selected)
    : allHotels;

  // Card animation
  const cardAnim = useRef(new Animated.Value(0)).current;
  const prevSelected = useRef<string | null>(null);

  useEffect(() => {
    if (selected && selected !== prevSelected.current) {
      // New selection: animate card in
      cardAnim.setValue(0);
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    prevSelected.current = selected;
  }, [selected]);

  const listRef   = useRef<ScrollView>(null);
  const listY     = useRef(0);

  function handleNeighborhoodPress(name: string | null) {
    setSelected((prev) => (prev === name ? null : name));
  }

  function handleVerHoteis() {
    setTimeout(
      () => listRef.current?.scrollTo({ y: listY.current + MAP_H, animated: true }),
      80,
    );
  }

  function handlePorDentro() {
    if (!activeNeighborhood) return;
    router.push({
      pathname: "/ondeFicar/bairro/[slug]",
      params: { slug: activeNeighborhood.neighborhood_slug },
    });
  }

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fixed map section ── */}
      <View style={s.mapSection}>
        <OndeFicarMap
          selectedNeighborhood={selected}
          onNeighborhoodPress={handleNeighborhoodPress}
          onBack={() => router.back()}
          topInset={topInset}
          badgeText={
            loading
              ? "carregando…"
              : selected
              ? `${hotels.length} hotel${hotels.length !== 1 ? "s" : ""}`
              : `${allHotels.length} hospedagens`
          }
        />

        {/* Floating neighborhood card */}
        {activeNeighborhood && (
          <Animated.View style={[s.cardWrap, cardStyle]} pointerEvents="box-none">
            <NeighborhoodCard
              neighborhood={activeNeighborhood}
              hotelCount={hotels.length}
              onVerHoteis={handleVerHoteis}
              onPorDentro={handlePorDentro}
              onDismiss={() => setSelected(null)}
            />
          </Animated.View>
        )}
      </View>

      {/* ── Scrollable hotel list ── */}
      <ScrollView
        ref={listRef}
        style={s.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* Editorial intro */}
        <View style={s.intro}>
          {activeNeighborhood ? (
            <>
              <Text style={s.introTitle}>{activeNeighborhood.title}</Text>
              <Text style={s.introPhrase}>{activeNeighborhood.identity_phrase}</Text>
            </>
          ) : (
            <>
              <Text style={s.introTitle}>Onde ficar em {destino.cidade}</Text>
              <Text style={s.introPara}>
                Onde você dorme define como você acorda. No Rio, cada bairro tem
                um ritmo próprio — escolher bem o hotel muda toda a experiência.
              </Text>
            </>
          )}
          <View style={s.introMeta}>
            <View style={s.introDot} />
            <Text style={s.introMetaText}>
              Seleção curada ·{" "}
              {loading ? "…" : `${hotels.length} hospedagem${hotels.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* List section */}
        <View
          style={s.listSection}
          onLayout={(e) => {
            listY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={s.listLabel}>
            {selected
              ? `${hotels.length} hospedagem${hotels.length !== 1 ? "s" : ""} em ${selected}`
              : "Hospedagens selecionadas"}
          </Text>

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

          {!loading && !error && hotels.length === 0 && selected && (
            <View style={s.centerWrap}>
              <Feather name="map-pin" size={18} color="rgba(255,255,255,0.10)" />
              <Text style={s.emptyTitle}>Nenhum local em {selected}</Text>
              <Text style={s.emptyText}>Toque em outro bairro no mapa.</Text>
            </View>
          )}

          {!loading &&
            !error &&
            hotels.map((hotel, idx) => (
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

// ── Neighborhood card ─────────────────────────────────────────────────────────

function NeighborhoodCard({
  neighborhood,
  hotelCount,
  onVerHoteis,
  onPorDentro,
  onDismiss,
}: {
  neighborhood: Neighborhood;
  hotelCount: number;
  onVerHoteis: () => void;
  onPorDentro: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={nc.card}>
      {/* Header */}
      <View style={nc.header}>
        <View style={nc.headerLeft}>
          <Text style={nc.name}>{neighborhood.neighborhood_name}</Text>
          <Text style={nc.phrase} numberOfLines={2}>
            {neighborhood.identity_phrase}
          </Text>
        </View>
        <Pressable style={nc.closeBtn} onPress={onDismiss} hitSlop={10}>
          <Feather name="x" size={14} color="rgba(255,255,255,0.40)" />
        </Pressable>
      </View>

      {/* Best-for tags */}
      <View style={nc.tags}>
        {[neighborhood.best_for_1, neighborhood.best_for_2, neighborhood.best_for_3]
          .filter(Boolean)
          .map((tag, i) => (
            <View key={i} style={nc.tag}>
              <Text style={nc.tagText}>{tag}</Text>
            </View>
          ))}
      </View>

      {/* Action buttons */}
      <View style={nc.actions}>
        <Pressable style={nc.hotBtn} onPress={onVerHoteis}>
          <Feather name="list" size={13} color="#0A0502" />
          <Text style={nc.hotBtnText}>
            {hotelCount} hotel{hotelCount !== 1 ? "s" : ""}
          </Text>
        </Pressable>
        <Pressable style={nc.ghostBtn} onPress={onPorDentro}>
          <Text style={nc.ghostBtnText}>Por dentro</Text>
          <Feather name="arrow-right" size={13} color={C.terracotta} />
        </Pressable>
      </View>
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

  // ── Map section ──
  mapSection: {
    width: "100%",
    height: MAP_H,
    position: "relative",
  },
  cardWrap: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    zIndex: 20,
  },

  // ── Scrollable list ──
  listScroll: {
    flex: 1,
    backgroundColor: "#0A0502",
  },

  // ── Intro ──
  intro: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 26,
  },
  introTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 30,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  introPhrase: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 14,
    color: C.gold,
    letterSpacing: 0.2,
    marginBottom: 14,
    fontStyle: "italic",
  },
  introPara: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 26,
    marginBottom: 14,
  },
  introMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  introDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.terracotta,
  },
  introMetaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
  },

  // ── List section ──
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
  emptyTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 16,
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.20)",
    textAlign: "center",
  },

  // ── Hotel card ──
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
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 20,
    marginBottom: 16,
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 10,
    paddingVertical: 11,
    backgroundColor: "rgba(201,168,76,0.06)",
  },
  reserveTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.gold,
    letterSpacing: 0.2,
  },

  // ── Footer ──
  footer: {
    marginTop: 4,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    gap: 8,
  },
  footerL: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    color: C.terracotta,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});

// ── Neighborhood card styles ──────────────────────────────────────────────────

const nc = StyleSheet.create({
  card: {
    backgroundColor: "rgba(14, 9, 5, 0.94)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.28)",
    boxShadow: "0px 6px 28px rgba(0,0,0,0.62), 0px 0px 0px 1px rgba(255,255,255,0.06)",
  } as any,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 19,
    color: C.white,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  phrase: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.50)",
    lineHeight: 18,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.50)",
  },
  actions: { flexDirection: "row", gap: 10 },
  hotBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.terracotta,
    borderRadius: 12,
    paddingVertical: 11,
  },
  hotBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#0A0502",
  },
  ghostBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.28)",
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: "rgba(196,112,74,0.06)",
  },
  ghostBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.terracotta,
  },
});
