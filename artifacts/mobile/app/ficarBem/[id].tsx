import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import {
  MapZoneOverlay,
  NeighborhoodCard,
  RIO_HOTSPOTS,
  MAP_ZONE_H,
} from "@/components/MapZoneOverlay";
import { useNeighborhoods } from "@/hooks/useNeighborhoods";
import type { Hotel, Neighborhood } from "@/lib/supabase";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Category display label ─────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  luxo:      "LUXO",
  boutique:  "BOUTIQUE",
  design:    "DESIGN",
  ícone:     "ÍCONE",
  icone:     "ÍCONE",
  pousada:   "POUSADA",
  budget:    "ECONÔMICO",
};

function categoryLabel(raw: string): string {
  return CATEGORY_LABEL[raw?.toLowerCase()] ?? raw?.toUpperCase() ?? "HOTEL";
}

// ── Flatten neighborhoods → hotel list with localizacao ────────────────────

type FlatHotel = Hotel & {
  localizacao: string;
  neighborhood: Neighborhood;
};

function flattenHotels(neighborhoods: Neighborhood[]): FlatHotel[] {
  const result: FlatHotel[] = [];
  for (const n of neighborhoods) {
    for (const h of n.hotels ?? []) {
      result.push({ ...h, localizacao: n.neighborhood_name, neighborhood: n });
    }
  }
  // sort by neighborhood display_order, then hotel display_order
  result.sort((a, b) => {
    const nd = a.neighborhood.display_order - b.neighborhood.display_order;
    if (nd !== 0) return nd;
    return a.display_order - b.display_order;
  });
  return result;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FicarBemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets   = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];

  const { neighborhoods, loading, error } = useNeighborhoods();

  const allFlat = flattenHotels(neighborhoods);

  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const activeHotspot  = RIO_HOTSPOTS.find((h) => h.id === selectedHotspot) ?? null;
  const activeBairros  = activeHotspot?.bairros ?? null;

  const lugares = activeBairros
    ? allFlat.filter((h) => activeBairros.includes(h.localizacao))
    : allFlat;

  const scrollViewRef  = useRef<ScrollView>(null);
  const cardsSectionY  = useRef<number>(0);

  function handleHotspotPress(hid: string | null) {
    setSelectedHotspot(hid);
  }

  function handleVerHoteis() {
    setTimeout(
      () => scrollViewRef.current?.scrollTo({ y: cardsSectionY.current, animated: true }),
      80,
    );
  }

  function handlePorDentro() {
    setTimeout(
      () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
      80,
    );
  }

  const totalHotels = allFlat.length;
  const activeNeighborhood =
    selectedHotspot && neighborhoods.length > 0
      ? neighborhoods.find((n) =>
          (activeHotspot?.bairros ?? []).includes(n.neighborhood_name),
        )
      : null;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapZoneOverlay
        onBack={() => router.back()}
        topInset={topInset}
        locaisLabel={loading ? "carregando…" : `${totalHotels} hospedagens`}
        selectedHotspot={selectedHotspot}
        onHotspotPress={handleHotspotPress}
        filteredCount={selectedHotspot ? lugares.length : undefined}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* ── Description block ── */}
        <View style={s.descBlock}>
          {activeNeighborhood ? (
            <>
              <Text style={s.descTitle}>{activeNeighborhood.title}</Text>
              <Text style={s.descPhrase}>{activeNeighborhood.identity_phrase}</Text>
              {activeNeighborhood.my_view.split("\n").slice(0, 3).map((para, i) =>
                para.trim() ? (
                  <Text key={i} style={s.descPara}>{para.trim()}</Text>
                ) : null,
              )}
            </>
          ) : (
            <>
              <Text style={s.descTitle}>Onde ficar em {destino.cidade}</Text>
              <Text style={s.descPara}>
                Onde você dorme define como você acorda. No Rio, cada bairro tem um ritmo
                próprio — e a escolha do hotel muda completamente a experiência da cidade.
              </Text>
              <Text style={s.descPara}>
                Esta seleção reúne endereços com alma, não apenas quartos.
                Aqui, a hospedagem é parte da memória da viagem.
              </Text>
            </>
          )}

          <View style={s.descNoteWrap}>
            <View style={s.descNoteDot} />
            <Text style={s.descNoteText}>
              Seleção curada · {loading ? "…" : `${lugares.length} hospedagem${lugares.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* ── Hotel cards ── */}
        <View
          style={s.cardsSection}
          onLayout={(e) => { cardsSectionY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={s.cardsSectionLabel}>
            {selectedHotspot
              ? `${lugares.length} hospedagem${lugares.length !== 1 ? "s" : ""} em ${activeHotspot?.name ?? ""}`
              : "Hospedagens selecionadas"}
          </Text>

          {/* Loading state */}
          {loading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={C.terracotta} />
              <Text style={s.loadingText}>Carregando hospedagens…</Text>
            </View>
          )}

          {/* Error state */}
          {error && !loading && (
            <View style={s.emptyState}>
              <Feather name="alert-circle" size={22} color="rgba(196,112,74,0.45)" />
              <Text style={s.emptyTitle}>Erro ao carregar</Text>
              <Text style={s.emptyText}>{error}</Text>
            </View>
          )}

          {/* Empty state — filtered to zone with no hotels */}
          {!loading && !error && lugares.length === 0 && selectedHotspot && (
            <View style={s.emptyState}>
              <Feather name="map-pin" size={22} color="rgba(255,255,255,0.15)" />
              <Text style={s.emptyTitle}>Nenhum local aqui</Text>
              <Text style={s.emptyText}>
                Esta zona não tem hospedagens selecionadas. Toque no mapa para
                explorar outra área.
              </Text>
            </View>
          )}

          {/* Hotel cards */}
          {!loading && !error && lugares.map((hotel, index) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              index={index}
              onPress={() =>
                router.push({
                  pathname: "/ficarBem/hotel/[hotelId]",
                  params: { hotelId: hotel.id },
                })
              }
            />
          ))}
        </View>

        {/* ── Editorial footer ── */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria para quem quer descansar em {destino.cidade} com estilo.
          </Text>
        </View>
      </ScrollView>

      {/* ── Floating neighborhood card ── */}
      {activeHotspot && (
        <View style={s.cardOverlay}>
          <NeighborhoodCard
            hotspot={activeHotspot}
            filteredCount={lugares.length}
            onVerHoteis={handleVerHoteis}
            onPorDentro={handlePorDentro}
            onDismiss={() => setSelectedHotspot(null)}
          />
        </View>
      )}
    </View>
  );
}

// ── Hotel Card ────────────────────────────────────────────────────────────────

const HOTEL_IMAGES: Record<string, string> = {
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
  const gradStart = HOTEL_IMAGES[hotel.hotel_category] ?? "#1C120A";
  const shortView = hotel.my_view
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
  const preview = shortView.length > 130 ? shortView.slice(0, 127) + "…" : shortView;

  return (
    <Pressable style={s.card} onPress={onPress}>
      {/* ── Header visual ── */}
      <LinearGradient
        colors={[gradStart, "#0A0502"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardHeader}
      >
        {/* Feature badges top-right */}
        <View style={s.badgeRow}>
          {hotel.front_beach && (
            <View style={s.featureBadge}>
              <Text style={s.featureBadgeText}>Frente ao mar</Text>
            </View>
          )}
          {hotel.rooftop && (
            <View style={s.featureBadge}>
              <Text style={s.featureBadgeText}>Rooftop</Text>
            </View>
          )}
        </View>

        {/* Neighborhood watermark */}
        <Text style={s.cardNeighWatermark} numberOfLines={1}>
          {hotel.localizacao}
        </Text>

        {/* Bottom row */}
        <View style={s.cardHeaderBottom}>
          <Text style={s.orderText}>{String(index + 1).padStart(2, "0")}</Text>
          {hotel.featured_restaurant && (
            <View style={s.restaurantBadge}>
              <Feather name="coffee" size={9} color="rgba(201,168,76,0.7)" />
              <Text style={s.restaurantBadgeText}>{hotel.featured_restaurant}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── Text body ── */}
      <View style={s.cardBody}>
        <View style={s.cardMeta}>
          <Text style={s.cardCategoria}>{categoryLabel(hotel.hotel_category)}</Text>
          <View style={s.cardLocWrap}>
            <Feather name="map-pin" size={10} color={C.warmGray} />
            <Text style={s.cardLocText}>{hotel.localizacao}</Text>
          </View>
        </View>

        <Text style={s.cardTitulo}>{hotel.hotel_name}</Text>
        <Text style={s.cardDesc}>{preview}</Text>

        {/* Reserve CTA */}
        {hotel.reserve_url ? (
          <Pressable
            style={s.reservarBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Linking.openURL(hotel.reserve_url);
            }}
          >
            <Feather name="external-link" size={13} color={C.gold} />
            <Text style={s.reservarText}>Reservar</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_OVERLAP = 48;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#100A06",
  },

  cardOverlay: {
    position: "absolute",
    top: MAP_ZONE_H - CARD_OVERLAP,
    left: 16,
    right: 16,
    zIndex: 100,
    boxShadow: "0px 8px 32px rgba(0,0,0,0.28)",
  },

  // ── Description block
  descBlock: {
    backgroundColor: "#100A06",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
  },
  descTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 30,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  descPhrase: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 14,
    color: C.gold,
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  descPara: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 26,
    letterSpacing: 0.1,
    marginBottom: 14,
  },
  descNoteWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  descNoteDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.terracotta,
  },
  descNoteText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.40)",
    letterSpacing: 0.5,
  },

  // ── Cards section
  cardsSection: {
    backgroundColor: "#0A0502",
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  cardsSectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.warmGray,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 20,
  },

  // ── Loading / error / empty
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 14,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.30)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 17,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.22)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },

  // ── Hotel card
  card: {
    backgroundColor: "#1C1410",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  // Card header (editorial visual)
  cardHeader: {
    height: 158,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 7,
    justifyContent: "flex-end",
  },
  featureBadge: {
    backgroundColor: "rgba(196,112,74,0.22)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.35)",
  },
  featureBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 0.4,
  },
  cardNeighWatermark: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 42,
    color: "rgba(255,255,255,0.07)",
    letterSpacing: -1,
    position: "absolute",
    bottom: 36,
    left: 14,
    right: 14,
  },
  cardHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderText: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
  },
  restaurantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.22)",
  },
  restaurantBadgeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(201,168,76,0.75)",
    letterSpacing: 0.3,
  },

  // Card body
  cardBody: {
    padding: 18,
    paddingTop: 16,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardCategoria: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 1.4,
  },
  cardLocWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardLocText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
  },
  cardTitulo: {
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
    color: "rgba(255,255,255,0.62)",
    lineHeight: 20,
    marginBottom: 16,
  },

  reservarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.28)",
    borderRadius: 10,
    paddingVertical: 11,
    backgroundColor: "rgba(201,168,76,0.06)",
  },
  reservarText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.gold,
    letterSpacing: 0.2,
  },

  // Footer
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
