import React, { useRef, useState } from "react";
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
import { IllustratedMap, MapPlace } from "@/components/IllustratedMap";

const C = Colors.light;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_IMAGE_H = 210;

// ── Illustrated map images ────────────────────────────────────────────────────
const MAP_RIO = require("../../assets/images/map-rio.png");

function getMapImage(cityId: string): ImageSourcePropType {
  switch (cityId) {
    case "rio": return MAP_RIO;
    default:    return MAP_RIO;
  }
}

// ── Neighborhood zone table ───────────────────────────────────────────────────
// Defines the VISUAL CENTER of each bairro on the illustrated map image.
// Coordinates are percentages of image width/height — not geographic precision.
// This is a curated map: markers belong to a neighborhood zone, not a lat/lng.
//
// To add a new city: create a separate zone table (e.g. SANTORINI_ZONES).
// To add new places: only the "localizacao" field is needed — no manual coords.
//
// Future Supabase integration: store bairro on the place row; zone table stays here.

type ZoneMap = Record<string, { xPct: number; yPct: number }>;

const RIO_ZONES: ZoneMap = {
  // ── Beaches (bottom coastline) ──
  "Ipanema":          { xPct: 48, yPct: 73 },
  "Leblon":           { xPct: 41, yPct: 72 },
  "Arpoador":         { xPct: 55, yPct: 76 },
  "Copacabana":       { xPct: 62, yPct: 73 },
  "Leme":             { xPct: 68, yPct: 71 },
  "Barra da Tijuca":  { xPct: 13, yPct: 73 },
  "São Conrado":      { xPct: 28, yPct: 79 },

  // ── Mountains / parks ──
  "Corcovado":        { xPct: 36, yPct: 26 },  // "Cristo Redentor" label
  "Floresta da Tijuca": { xPct: 20, yPct: 30 },
  "Pedra da Gávea":   { xPct: 34, yPct: 64 },
  "Morro Dois Irmãos": { xPct: 36, yPct: 60 },

  // ── South Zone (Zona Sul) ──
  "Urca":             { xPct: 80, yPct: 55 },  // Pão de Açúcar area
  "Botafogo":         { xPct: 60, yPct: 47 },
  "Flamengo":         { xPct: 68, yPct: 47 },
  "Catete":           { xPct: 68, yPct: 42 },
  "Glória":           { xPct: 69, yPct: 38 },
  "Jardim Botânico":  { xPct: 46, yPct: 57 },
  "Lagoa":            { xPct: 51, yPct: 59 },
  "Gávea":            { xPct: 45, yPct: 48 },
  "Laranjeiras":      { xPct: 63, yPct: 41 },

  // ── Santa Teresa & Lapa ──
  "Santa Teresa":     { xPct: 55, yPct: 30 },
  "Lapa":             { xPct: 63, yPct: 40 },  // "LAPA" label on map

  // ── Centro & surroundings ──
  "Centro":           { xPct: 76, yPct: 24 },  // near "Museu do Amanhã" label
  "Saúde":            { xPct: 79, yPct: 20 },
  "Gamboa":           { xPct: 77, yPct: 21 },
  "Caju":             { xPct: 80, yPct: 17 },

  // ── North Zone (Zona Norte) ──
  "Maracanã":         { xPct: 51, yPct: 19 },
  "Tijuca":           { xPct: 44, yPct: 22 },
  "São Cristóvão":    { xPct: 63, yPct: 24 },

  // ── West Zone ──
  "Recreio":          { xPct: 5,  yPct: 67 },
  "Parque Olímpico":  { xPct: 10, yPct: 58 },
};

// Helper: resolve a place's pin position from its bairro zone.
// Falls back to map center if the bairro isn't defined yet.
function zone(cityId: string, bairro: string): { xPct: number; yPct: number } {
  const table = cityId === "rio" ? RIO_ZONES : RIO_ZONES;
  return table[bairro] ?? { xPct: 50, yPct: 50 };
}

// ── Place data ───────────────────────────────────────────────────────────────

interface Place extends MapPlace {
  descricao: string;
  image: ImageSourcePropType;
  preco?: string;
}

// ── Category separation ───────────────────────────────────────────────────────
// "o_que_fazer" → this screen  |  "comer" → Comer bem  |  "ficar" → Ficar bem
// Pin positions come from the zone table above — not hardcoded per-place.

const LUGARES: Record<string, Place[]> = {
  rio: [
    {
      id: "1",
      titulo: "Praia de Ipanema",
      localizacao: "Ipanema",
      categoria: "EXPERIÊNCIA",
      descricao:
        "O encontro perfeito entre o mar e a alma carioca. Cheia de vida do nascer ao pôr do sol.",
      image: require("../../assets/images/ipanema.png"),
      ...zone("rio", "Ipanema"),
    },
    {
      id: "2",
      titulo: "Cristo Redentor",
      localizacao: "Corcovado",
      categoria: "MONUMENTO",
      descricao:
        "A sétima maravilha do mundo moderna abraça o Rio de braços abertos. A vista do topo para a Guanabara é inesquecível.",
      image: require("../../assets/images/cristo.png"),
      ...zone("rio", "Corcovado"),
    },
    {
      id: "3",
      titulo: "Pão de Açúcar",
      localizacao: "Urca",
      categoria: "EXPERIÊNCIA",
      descricao:
        "Dois picos, dois bondilhos e uma das vistas mais dramáticas do planeta. O Rio em panorama completo.",
      image: require("../../assets/images/pao-acucar.png"),
      ...zone("rio", "Urca"),
    },
    {
      id: "4",
      titulo: "Beco das Sardinhas",
      localizacao: "Centro",
      categoria: "SEGREDO LOCAL",
      descricao:
        "Ruelas históricas onde cariocas se reúnem ao pôr do sol para petiscos e cerveja gelada.",
      image: require("../../assets/images/secret1.png"),
      ...zone("rio", "Centro"),
    },
    {
      id: "5",
      titulo: "Escadaria Selarón",
      localizacao: "Lapa",
      categoria: "ARTE & CULTURA",
      descricao:
        "Mosaico de azulejos de mais de 60 países, criado por Jorge Selarón ao longo de décadas.",
      image: require("../../assets/images/secret2.png"),
      ...zone("rio", "Lapa"),
    },
  ],
};

const DESCRICOES: Record<string, string[]> = {
  rio: [
    "O Rio de Janeiro é muito mais que praias paradisíacas e o Cristo Redentor. É uma cidade que respira música, dança e uma energia contagiante que mistura modernidade com tradição.",
    "Cada bairro carrega uma identidade própria — de Santa Teresa com seus artistas e ladeiras de pedra, ao Leblon com seu charme discretamente exclusivo.",
    "Aqui, natureza e vida urbana coexistem com uma harmonia rara no mundo. Uma caminhada pelo Parque Lage revela uma cachoeira no coração da Floresta da Tijuca.",
  ],
};

const DEFAULT_LUGARES: Place[] = [
  {
    id: "1",
    titulo: "Ponto imperdível",
    localizacao: "Centro",
    categoria: "EXPERIÊNCIA",
    descricao: "Uma das experiências mais memoráveis desta cidade.",
    image: require("../../assets/images/ipanema.png"),
    xPct: 50,
    yPct: 50,
  },
];

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
  const lugares = LUGARES[destino.id] ?? DEFAULT_LUGARES;
  const descricao = DESCRICOES[destino.id] ?? DEFAULT_DESCRICAO;

  // ── Controlled pin selection ──
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // ── Scroll-to-card ──
  const scrollRef = useRef<ScrollView>(null);
  const cardsSectionY = useRef(0);       // y of cardsSection within scroll content
  const cardYOffsets = useRef<Record<string, number>>({});  // y of each card within cardsSection

  function scrollToCard(placeId: string) {
    const sectionY = cardsSectionY.current;
    const cardY = cardYOffsets.current[placeId] ?? 0;
    scrollRef.current?.scrollTo({ y: sectionY + cardY - 16, animated: true });
  }

  function handlePinPress(pinId: string | null) {
    setSelectedPinId(pinId);
  }

  function handlePopupPress(placeId: string) {
    scrollToCard(placeId);
  }

  // "Ver no mapa" tapped on a card → select that pin (map is at top, always visible)
  function handleVerNoMapa(placeId: string) {
    setSelectedPinId(placeId);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  // Map places (only id + titulo + localizacao + categoria + coords needed by map)
  const mapPlaces: MapPlace[] = lugares.map(({ id, titulo, localizacao, categoria, xPct, yPct }) => ({
    id, titulo, localizacao, categoria, xPct, yPct,
  }));

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ════════════════════════════════════════════════════
          ILLUSTRATED MAP — fixed at top, always visible.
          Uses the curated Rio illustration as the base layer.
          Pins are interactive; tapping reveals a popup card.
      ════════════════════════════════════════════════════ */}
      <IllustratedMap
        mapImage={getMapImage(destino.id)}
        places={mapPlaces}
        selectedId={selectedPinId}
        onPinPress={handlePinPress}
        onPopupPress={handlePopupPress}
        onBack={() => router.back()}
        topInset={topInset}
        locaisLabel={`${lugares.length} locais`}
      />

      {/* ════════════════════════════════════════════════════
          SCROLLABLE CONTENT — editorial text + place cards
      ════════════════════════════════════════════════════ */}
      <ScrollView
        ref={scrollRef}
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
          onLayout={(e) => {
            cardsSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={s.cardsSectionLabel}>Locais selecionados</Text>

          {lugares.map((place, index) => (
            <View
              key={place.id}
              style={[
                s.card,
                selectedPinId === place.id && s.cardHighlighted,
              ]}
              onLayout={(e) => {
                cardYOffsets.current[place.id] = e.nativeEvent.layout.y;
              }}
            >
              {/* Image area */}
              <View style={s.cardImageWrap}>
                <Image source={place.image} style={s.cardImage} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.12)", "transparent"]}
                  locations={[0, 0.4]}
                  style={StyleSheet.absoluteFill}
                />

                <Pressable style={s.bookmarkBtn} hitSlop={8}>
                  <Feather name="bookmark" size={15} color={C.white} />
                </Pressable>

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

                {/* Ver no mapa — selects the pin and scrolls back up to the map */}
                <Pressable
                  style={s.verNoMapaBtn}
                  onPress={() => handleVerNoMapa(place.id)}
                >
                  <Feather name="map-pin" size={13} color={C.terracotta} />
                  <Text style={s.verNoMapaText}>Ver no mapa</Text>
                </Pressable>
              </View>
            </View>
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
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#100A06",
  },

  // ── Description ──
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

  // ── Cards section ──
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

  // ── Card ──
  card: {
    backgroundColor: "#1C1410",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
  },
  cardHighlighted: {
    borderWidth: 1.5,
    borderColor: "rgba(196,112,74,0.55)",
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

  // ── Footer ──
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
