import React, { useRef, useState } from "react";
import {
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
import { LUGARES_O_QUE_FAZER } from "@/data/lugares";
import { MapZoneOverlay, NeighborhoodCard, RIO_HOTSPOTS, MAP_ZONE_H } from "@/components/MapZoneOverlay";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_IMAGE_H = 210;


const DESCRICOES: Record<string, string[]> = {
  rio: [
    "O Rio de Janeiro é muito mais que praias paradisíacas e o Cristo Redentor. É uma cidade que respira música, dança e uma energia contagiante que mistura modernidade com tradição.",
    "Cada bairro carrega uma identidade própria — de Santa Teresa com seus artistas e ladeiras de pedra, ao Leblon com seu charme discretamente exclusivo.",
    "Aqui, natureza e vida urbana coexistem com uma harmonia rara no mundo. Uma caminhada pelo Parque Lage revela uma cachoeira no coração da Floresta da Tijuca.",
  ],
};

const DEFAULT_DESCRICAO = [
  "Uma cidade que convida à exploração lenta e curiosa. Cada esquina revela algo inesperado — um café escondido, uma vista que rouba o fôlego.",
  "A verdadeira experiência começa quando você abandona o roteiro previsível e segue o instinto. Esta seleção foi pensada para guiar sem restringir.",
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OQueFazerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const allLugares = LUGARES_O_QUE_FAZER[destino.id] ?? [];
  const descricao = DESCRICOES[destino.id] ?? DEFAULT_DESCRICAO;

  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const activeHotspot = RIO_HOTSPOTS.find((h) => h.id === selectedHotspot) ?? null;
  const activeBairros = activeHotspot?.bairros ?? null;
  const lugares = activeBairros
    ? allLugares.filter((p) => activeBairros.includes(p.localizacao))
    : allLugares;

  const scrollViewRef = useRef<ScrollView>(null);
  const cardsSectionY = useRef<number>(0);

  function handleHotspotPress(id: string | null) {
    setSelectedHotspot(id);
  }

  function handleVerHoteis() {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: cardsSectionY.current, animated: true }), 80);
  }

  function handlePorDentro() {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 80);
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapZoneOverlay
        onBack={() => router.back()}
        topInset={topInset}
        locaisLabel={`${allLugares.length} locais`}
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
          <Text style={s.descTitle}>O que fazer em {destino.cidade}</Text>
          {descricao.map((para, i) => (
            <Text key={i} style={s.descPara}>{para}</Text>
          ))}
          <View style={s.descNoteWrap}>
            <View style={s.descNoteDot} />
            <Text style={s.descNoteText}>Seleção curada · {lugares.length} lugares</Text>
          </View>
        </View>

        {/* ── Place cards ── */}
        <View
          style={s.cardsSection}
          onLayout={(e) => { cardsSectionY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={s.cardsSectionLabel}>
            {selectedHotspot
              ? `${lugares.length} local${lugares.length !== 1 ? "is" : ""} em ${RIO_HOTSPOTS.find(h => h.id === selectedHotspot)?.name ?? ""}`
              : "Locais selecionados"}
          </Text>

          {lugares.length === 0 && selectedHotspot && (
            <View style={s.emptyState}>
              <Feather name="map-pin" size={22} color="rgba(255,255,255,0.15)" />
              <Text style={s.emptyTitle}>Nenhum local aqui</Text>
              <Text style={s.emptyText}>
                Esta zona não tem experiências nesta categoria. Toque no mapa para explorar outra área.
              </Text>
            </View>
          )}

          {lugares.map((place, index) => (
            <Pressable
              key={place.id}
              style={s.card}
              onPress={() =>
                router.push(`/lugar/${destino.id}/${place.id}`)
              }
            >
              {/* Image area */}
              <View style={s.cardImageWrap}>
                <Image source={place.image} style={s.cardImage} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.12)", "transparent"]}
                  locations={[0, 0.4]}
                  style={StyleSheet.absoluteFill}
                />

                <View style={s.bookmarkBtn} hitSlop={8}>
                  <Feather name="bookmark" size={15} color={C.white} />
                </View>

                {place.preco && (
                  <View style={s.priceBadge}>
                    <Text style={s.priceText}>{place.preco}</Text>
                  </View>
                )}

                <View style={s.orderBadge}>
                  <Text style={s.orderText}>{String(index + 1).padStart(2, "0")}</Text>
                </View>
              </View>

              {/* Text area */}
              <View style={s.cardBody}>
                <View style={s.cardMeta}>
                  <Text style={s.cardCategoria}>{place.categoria}</Text>
                  <View style={s.cardLocWrap}>
                    <Feather name="map-pin" size={10} color={C.warmGray} />
                    <Text style={s.cardLocText}>{place.localizacao}</Text>
                  </View>
                </View>

                <Text style={s.cardTitulo}>{place.titulo}</Text>
                <Text style={s.cardDesc}>{place.descricao}</Text>

                {/* Ver no mapa → opens detail screen with map revealed */}
                <Pressable
                  style={s.verNoMapaBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    router.push({
                      pathname: "/lugar/[cityId]/[placeId]",
                      params: {
                        cityId: destino.id,
                        placeId: place.id,
                        showMap: "true",
                      },
                    });
                  }}
                >
                  <Feather name="map-pin" size={13} color={C.terracotta} />
                  <Text style={s.verNoMapaText}>Ver no mapa</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Editorial footer ── */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria para quem quer viver {destino.cidade} com profundidade.
          </Text>
        </View>
      </ScrollView>

      {/* ── Floating neighborhood card — overlaps map bottom + content top ── */}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_OVERLAP = 48; // px the card peeks into the map from the bottom

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#100A06",
  },

  // Floating card overlay — positioned between map bottom and content
  cardOverlay: {
    position: "absolute",
    top: MAP_ZONE_H - CARD_OVERLAP,
    left: 16,
    right: 16,
    zIndex: 100,
    boxShadow: "0px 8px 32px rgba(0,0,0,0.28)",
  },

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

  cardsSection: {
    backgroundColor: C.cream,
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

  card: {
    backgroundColor: "#1C1410",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
  },

  cardImageWrap: {
    height: CARD_IMAGE_H,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bookmarkBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  priceBadge: {
    position: "absolute",
    top: 14,
    right: 58,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  priceText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.5,
  },
  orderBadge: {
    position: "absolute",
    bottom: 14,
    left: 14,
  },
  orderText: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1,
  },

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

  verNoMapaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.30)",
    borderRadius: 10,
    paddingVertical: 11,
    backgroundColor: "rgba(196,112,74,0.06)",
  },
  verNoMapaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.terracotta,
    letterSpacing: 0.2,
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

  footer: {
    backgroundColor: C.cream,
    marginTop: 4,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
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
