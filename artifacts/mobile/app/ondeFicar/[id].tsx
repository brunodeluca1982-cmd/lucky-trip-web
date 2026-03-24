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
import { useNeighborhoods } from "@/hooks/useNeighborhoods";
import type { Hotel, Neighborhood } from "@/lib/supabase";
import RioMapView from "@/components/RioMapView";

const C = Colors.light;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_HEIGHT = SCREEN_HEIGHT * 0.52;

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
  const insets     = useSafeAreaInsets();
  const topInset   = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad  = Platform.OS === "web" ? 34 : insets.bottom;

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

  const scrollRef   = useRef<ScrollView>(null);
  const listSectionY = useRef<number>(0);

  function handleNeighborhoodPress(name: string | null) {
    setSelected((prev) => (prev === name ? null : name));
  }

  function handleVerHoteis() {
    setTimeout(
      () => scrollRef.current?.scrollTo({ y: listSectionY.current, animated: true }),
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

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fullscreen content ── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* ── Sticky map section ── */}
        <View>
          {/* Back bar */}
          <View style={[s.topBar, { paddingTop: topInset + 10 }]}>
            <Pressable style={s.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={15} color={C.white} />
              <Text style={s.backText}>Voltar</Text>
            </Pressable>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>
                {loading
                  ? "carregando…"
                  : selected
                  ? `${hotels.length} hotel${hotels.length !== 1 ? "s" : ""}`
                  : `${allHotels.length} hospedagens`}
              </Text>
            </View>
          </View>

          {/* Interactive map */}
          <RioMapView
            selectedNeighborhood={selected}
            onNeighborhoodPress={handleNeighborhoodPress}
            style={s.map}
          />

          {/* Map hint */}
          {!selected && (
            <View style={s.hintBar} pointerEvents="none">
              <Text style={s.hintText}>Toque num bairro para explorar</Text>
            </View>
          )}
        </View>

        {/* ── Neighborhood card (floating over map/list boundary) ── */}
        {activeNeighborhood && (
          <NeighborhoodCard
            neighborhood={activeNeighborhood}
            hotelCount={hotels.length}
            onVerHoteis={handleVerHoteis}
            onPorDentro={handlePorDentro}
            onDismiss={() => setSelected(null)}
          />
        )}

        {/* ── Editorial intro ── */}
        <View style={s.introBlock}>
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
                um ritmo próprio — e a escolha do hotel muda completamente a
                experiência da cidade.
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

        {/* ── Hotel list ── */}
        <View
          style={s.listSection}
          onLayout={(e) => {
            listSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={s.listLabel}>
            {selected
              ? `${hotels.length} hospedagem${hotels.length !== 1 ? "s" : ""} em ${selected}`
              : "Hospedagens selecionadas"}
          </Text>

          {loading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={C.terracotta} />
              <Text style={s.loadingText}>Carregando…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={s.emptyState}>
              <Feather name="alert-circle" size={20} color="rgba(196,112,74,0.4)" />
              <Text style={s.emptyTitle}>Erro ao carregar</Text>
              <Text style={s.emptyText}>{error}</Text>
            </View>
          )}

          {!loading && !error && hotels.length === 0 && selected && (
            <View style={s.emptyState}>
              <Feather name="map-pin" size={20} color="rgba(255,255,255,0.12)" />
              <Text style={s.emptyTitle}>Nenhum local aqui</Text>
              <Text style={s.emptyText}>
                Esta área não tem hospedagens selecionadas. Toque em outro
                bairro no mapa.
              </Text>
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

        {/* ── Footer ── */}
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

// ── Neighborhood floating card ─────────────────────────────────────────────────

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
    <View style={nc.wrap}>
      {/* Dismiss tap target on edges */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

      <View style={nc.card}>
        {/* Header */}
        <View style={nc.header}>
          <View style={nc.headerLeft}>
            <Text style={nc.name}>{neighborhood.neighborhood_name}</Text>
            <Text style={nc.phrase}>{neighborhood.identity_phrase}</Text>
          </View>
          <Pressable style={nc.closeBtn} onPress={onDismiss}>
            <Feather name="x" size={15} color="rgba(255,255,255,0.45)" />
          </Pressable>
        </View>

        {/* Best for tags */}
        <View style={nc.tagsRow}>
          {[neighborhood.best_for_1, neighborhood.best_for_2, neighborhood.best_for_3]
            .filter(Boolean)
            .map((tag, i) => (
              <View key={i} style={nc.tag}>
                <Text style={nc.tagText}>{tag}</Text>
              </View>
            ))}
        </View>

        {/* Actions */}
        <View style={nc.actions}>
          <Pressable style={nc.verBtn} onPress={onVerHoteis}>
            <Feather name="list" size={13} color="#0A0502" />
            <Text style={nc.verBtnText}>
              {hotelCount} hotel{hotelCount !== 1 ? "s" : ""}
            </Text>
          </Pressable>
          <Pressable style={nc.dentroBtn} onPress={onPorDentro}>
            <Text style={nc.dentroBtnText}>Por dentro do bairro</Text>
            <Feather name="arrow-right" size={13} color={C.terracotta} />
          </Pressable>
        </View>
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
  const shortView = hotel.my_view
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
  const preview =
    shortView.length > 130 ? shortView.slice(0, 127) + "…" : shortView;

  return (
    <Pressable style={s.card} onPress={onPress}>
      {/* Header visual */}
      <LinearGradient
        colors={[gradStart, "#0A0502"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardHeader}
      >
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
        <Text style={s.cardNeighWatermark} numberOfLines={1}>
          {hotel.localizacao}
        </Text>
        <View style={s.cardHeaderBottom}>
          <Text style={s.orderText}>{String(index + 1).padStart(2, "0")}</Text>
          {hotel.featured_restaurant && (
            <View style={s.restaurantBadge}>
              <Feather name="coffee" size={9} color="rgba(201,168,76,0.7)" />
              <Text style={s.restaurantBadgeText}>
                {hotel.featured_restaurant}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Body */}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0502" },

  // Top bar (floats above map)
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(10,5,2,0.72)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.40)",
  },
  backText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.white,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(10,5,2,0.72)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.40)",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.terracotta,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.80)",
  },

  map: { height: MAP_HEIGHT },

  hintBar: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    letterSpacing: 0.3,
    backgroundColor: "rgba(10,5,2,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },

  // Intro block
  introBlock: {
    backgroundColor: "#0A0502",
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
    color: "rgba(255,255,255,0.72)",
    lineHeight: 26,
    marginBottom: 14,
  },
  introMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  introDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.terracotta,
  },
  introMetaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 0.5,
  },

  // List section
  listSection: {
    backgroundColor: "#0A0502",
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  listLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.warmGray,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 20,
  },

  // Loading/empty
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 14,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.28)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 17,
    color: "rgba(255,255,255,0.30)",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.20)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },

  // Hotel card
  card: {
    backgroundColor: "#1C1410",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    height: 148,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  badgeRow: { flexDirection: "row", gap: 7, justifyContent: "flex-end" },
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
    fontSize: 38,
    color: "rgba(255,255,255,0.06)",
    letterSpacing: -1,
    position: "absolute",
    bottom: 34,
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
    color: "rgba(255,255,255,0.30)",
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
    borderColor: "rgba(201,168,76,0.20)",
  },
  restaurantBadgeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(201,168,76,0.75)",
    letterSpacing: 0.3,
  },
  cardBody: { padding: 18, paddingTop: 16 },
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
  cardLocWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
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
    color: "rgba(255,255,255,0.60)",
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
    borderTopColor: "rgba(255,255,255,0.05)",
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

// ── Neighborhood card styles ──────────────────────────────────────────────────

const nc = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: -28,
    marginBottom: 0,
    zIndex: 30,
  },
  card: {
    backgroundColor: "#1E1510",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.22)",
    boxShadow: "0px 8px 32px rgba(0,0,0,0.55)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: { flex: 1, paddingRight: 12 },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: C.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  phrase: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 19,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 18,
  },
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
    color: "rgba(255,255,255,0.55)",
  },
  actions: { flexDirection: "row", gap: 10 },
  verBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.terracotta,
    borderRadius: 12,
    paddingVertical: 12,
  },
  verBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#0A0502",
    letterSpacing: 0.1,
  },
  dentroBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.30)",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(196,112,74,0.06)",
  },
  dentroBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.terracotta,
  },
});
