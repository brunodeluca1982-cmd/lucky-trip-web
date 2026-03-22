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
// Zone format: { xMin, xMax, yMin, yMax } — visual bounding box on the image,
// all values as % of image dimensions. Pins are placed at the center of the
// zone by default. When multiple places share a bairro, they are spread across
// the zone using an offset pattern so they never overlap.
//
// To add a new city: create a separate zone table (e.g. SANTORINI_ZONES).
// To add new places: set the "localizacao" to a bairro name — no manual coords.
// Future Supabase integration: place rows just need a "bairro" field.

interface Zone {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
}
type ZoneMap = Record<string, Zone>;

const RIO_ZONES: ZoneMap = {
  // ── Beaches — bottom coastline, horizontal strips ──────────────────────────
  "Barra da Tijuca":    { xMin:  4, xMax: 23, yMin: 66, yMax: 80 },
  "São Conrado":        { xMin: 22, xMax: 33, yMin: 71, yMax: 83 },
  "Leblon":             { xMin: 35, xMax: 45, yMin: 67, yMax: 77 },
  "Ipanema":            { xMin: 43, xMax: 53, yMin: 67, yMax: 77 },
  "Arpoador":           { xMin: 52, xMax: 58, yMin: 71, yMax: 79 },
  "Copacabana":         { xMin: 57, xMax: 67, yMin: 67, yMax: 77 },
  "Leme":               { xMin: 65, xMax: 72, yMin: 64, yMax: 74 },

  // ── Mountains & parks ──────────────────────────────────────────────────────
  "Corcovado":          { xMin: 31, xMax: 42, yMin: 19, yMax: 34 }, // Cristo Redentor
  "Floresta da Tijuca": { xMin: 13, xMax: 27, yMin: 21, yMax: 38 },
  "Pedra da Gávea":     { xMin: 29, xMax: 38, yMin: 57, yMax: 70 },
  "Morro Dois Irmãos":  { xMin: 32, xMax: 40, yMin: 53, yMax: 64 },

  // ── Zona Sul ───────────────────────────────────────────────────────────────
  "Urca":               { xMin: 74, xMax: 88, yMin: 47, yMax: 62 }, // Pão de Açúcar
  "Botafogo":           { xMin: 54, xMax: 66, yMin: 41, yMax: 54 },
  "Flamengo":           { xMin: 63, xMax: 72, yMin: 41, yMax: 52 },
  "Catete":             { xMin: 64, xMax: 72, yMin: 36, yMax: 46 },
  "Glória":             { xMin: 65, xMax: 73, yMin: 31, yMax: 42 },
  "Jardim Botânico":    { xMin: 42, xMax: 51, yMin: 51, yMax: 63 },
  "Lagoa":              { xMin: 47, xMax: 56, yMin: 53, yMax: 65 },
  "Gávea":              { xMin: 41, xMax: 50, yMin: 42, yMax: 54 },
  "Laranjeiras":        { xMin: 58, xMax: 67, yMin: 35, yMax: 46 },

  // ── Santa Teresa & Lapa ────────────────────────────────────────────────────
  "Santa Teresa":       { xMin: 50, xMax: 61, yMin: 24, yMax: 36 },
  "Lapa":               { xMin: 58, xMax: 68, yMin: 34, yMax: 46 }, // "LAPA" label

  // ── Centro & port area ─────────────────────────────────────────────────────
  "Centro":             { xMin: 71, xMax: 83, yMin: 17, yMax: 30 }, // Museu do Amanhã
  "Saúde":              { xMin: 74, xMax: 83, yMin: 13, yMax: 23 },
  "Gamboa":             { xMin: 73, xMax: 81, yMin: 15, yMax: 24 },

  // ── Zona Norte ─────────────────────────────────────────────────────────────
  "Maracanã":           { xMin: 46, xMax: 57, yMin: 12, yMax: 24 },
  "Tijuca":             { xMin: 39, xMax: 50, yMin: 15, yMax: 27 },
  "São Cristóvão":      { xMin: 58, xMax: 70, yMin: 17, yMax: 28 },

  // ── Zona Oeste ─────────────────────────────────────────────────────────────
  "Recreio":            { xMin:  1, xMax: 10, yMin: 60, yMax: 72 },
  "Parque Olímpico":    { xMin:  6, xMax: 16, yMin: 50, yMax: 63 },
};

// Offset pattern for multiple pins inside the same zone.
// Each entry is a fraction of the zone's width/height, applied from center.
// Pattern ensures no two pins land on the same spot up to 6 places per bairro.
const ZONE_OFFSETS = [
  { dx:  0.00, dy:  0.00 },  // 1st → zone center
  { dx:  0.28, dy: -0.20 },  // 2nd → upper-right quadrant
  { dx: -0.28, dy:  0.20 },  // 3rd → lower-left quadrant
  { dx:  0.28, dy:  0.22 },  // 4th → lower-right quadrant
  { dx: -0.28, dy: -0.22 },  // 5th → upper-left quadrant
  { dx:  0.00, dy:  0.28 },  // 6th → bottom-center
];

// Resolve pin coordinates for a place.
//   bairro       — neighborhood name matching a key in the zone table
//   indexInZone  — 0-based rank of this place among others in the same bairro
//                  (pass 0 when each bairro has only one place)
function resolvePin(
  cityId: string,
  bairro: string,
  indexInZone: number,
): { xPct: number; yPct: number } {
  const zones: ZoneMap = RIO_ZONES; // extend with other cities here
  const z = zones[bairro] ?? { xMin: 45, xMax: 55, yMin: 45, yMax: 55 };

  const cx = (z.xMin + z.xMax) / 2;
  const cy = (z.yMin + z.yMax) / 2;
  const zw = z.xMax - z.xMin;
  const zh = z.yMax - z.yMin;

  const off = ZONE_OFFSETS[indexInZone % ZONE_OFFSETS.length];
  return {
    xPct: Math.round(cx + off.dx * zw),
    yPct: Math.round(cy + off.dy * zh),
  };
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

// Each place calls resolvePin(cityId, bairro, indexInZone).
// indexInZone = 0 when it's the only place in that bairro.
// If two places share a bairro, use 0 and 1 — they'll be offset within the zone.

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
      ...resolvePin("rio", "Ipanema", 0),
    },
    {
      id: "2",
      titulo: "Cristo Redentor",
      localizacao: "Corcovado",
      categoria: "MONUMENTO",
      descricao:
        "A sétima maravilha do mundo moderna abraça o Rio de braços abertos. A vista do topo para a Guanabara é inesquecível.",
      image: require("../../assets/images/cristo.png"),
      ...resolvePin("rio", "Corcovado", 0),
    },
    {
      id: "3",
      titulo: "Pão de Açúcar",
      localizacao: "Urca",
      categoria: "EXPERIÊNCIA",
      descricao:
        "Dois picos, dois bondilhos e uma das vistas mais dramáticas do planeta. O Rio em panorama completo.",
      image: require("../../assets/images/pao-acucar.png"),
      ...resolvePin("rio", "Urca", 0),
    },
    {
      id: "4",
      titulo: "Beco das Sardinhas",
      localizacao: "Centro",
      categoria: "SEGREDO LOCAL",
      descricao:
        "Ruelas históricas onde cariocas se reúnem ao pôr do sol para petiscos e cerveja gelada.",
      image: require("../../assets/images/secret1.png"),
      ...resolvePin("rio", "Centro", 0),
    },
    {
      id: "5",
      titulo: "Escadaria Selarón",
      localizacao: "Lapa",
      categoria: "ARTE & CULTURA",
      descricao:
        "Mosaico de azulejos de mais de 60 países, criado por Jorge Selarón ao longo de décadas.",
      image: require("../../assets/images/secret2.png"),
      ...resolvePin("rio", "Lapa", 0),
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
