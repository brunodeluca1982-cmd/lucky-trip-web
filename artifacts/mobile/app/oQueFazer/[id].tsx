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

const C = Colors.light;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.30);
const CARD_IMAGE_H = 210;

// ── Curated place data per city ─────────────────────────────────────────────

interface Place {
  id: string;
  titulo: string;
  localizacao: string;
  categoria: string;
  descricao: string;
  image: ImageSourcePropType;
  preco?: string;
}

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
    },
    {
      id: "2",
      titulo: "Confeitaria Colombo",
      localizacao: "Centro Histórico",
      categoria: "RESTAURANTE",
      descricao:
        "Ícone belle époque do centro histórico com doces tradicionais e ambiente majestoso.",
      image: require("../../assets/images/restaurante1.png"),
      preco: "$$",
    },
    {
      id: "3",
      titulo: "Copacabana Palace",
      localizacao: "Copacabana",
      categoria: "HOTEL",
      descricao:
        "O endereço mais icônico do Rio. Elegância à beira-mar desde 1923.",
      image: require("../../assets/images/hotel1.png"),
      preco: "$$$",
    },
    {
      id: "4",
      titulo: "Beco das Sardinhas",
      localizacao: "Centro",
      categoria: "SEGREDO LOCAL",
      descricao:
        "Ruelas históricas onde cariocas se reúnem ao pôr do sol para petiscos e cerveja gelada.",
      image: require("../../assets/images/secret1.png"),
    },
    {
      id: "5",
      titulo: "Escadaria Selarón",
      localizacao: "Lapa",
      categoria: "ARTE & CULTURA",
      descricao:
        "Mosaico de azulejos de mais de 60 países, criado por Jorge Selarón ao longo de décadas.",
      image: require("../../assets/images/secret2.png"),
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
  },
];

const DEFAULT_DESCRICAO = [
  "Uma cidade que convida à exploração lenta e curiosa. Cada esquina revela algo inesperado — um café escondido, uma vista que rouba o fôlego.",
  "A verdadeira experiência começa quando você abandona o roteiro previsível e segue o instinto. Esta seleção foi pensada para guiar sem restringir.",
];

// ── Map pin positions (static decorative, simulates placed markers) ───────────

const PIN_POSITIONS = [
  { top: "28%", left: "22%" },
  { top: "45%", left: "55%" },
  { top: "60%", left: "32%" },
  { top: "38%", left: "74%" },
  { top: "70%", left: "62%" },
];

// ── Screen ───────────────────────────────────────────────────────────────────

export default function OQueFazerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const lugares = LUGARES[destino.id] ?? DEFAULT_LUGARES;
  const descricao = DESCRICOES[destino.id] ?? DEFAULT_DESCRICAO;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ════ MAP SECTION — ~30% height, reduced visual dominance ════ */}
      <View style={[s.map, { height: MAP_H }]}>
        {/* City image, desaturated to a warm muted map-like tone */}
        <Image source={destino.image} style={s.mapImage} />

        {/* Warm cream overlay — desaturates & tones the image like a map tile */}
        <View style={s.mapWarmOverlay} />

        {/* Edge darkening for depth and frame */}
        <LinearGradient
          colors={[
            "rgba(10,5,2,0.45)",
            "rgba(10,5,2,0.05)",
            "rgba(10,5,2,0.05)",
            "rgba(10,5,2,0.30)",
          ]}
          locations={[0, 0.20, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Soft bottom fade into the description block */}
        <LinearGradient
          colors={["transparent", "rgba(16,10,6,0.70)"]}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative map pin markers */}
        {PIN_POSITIONS.map((pos, i) => (
          <View key={i} style={[s.mapPin, { top: pos.top as any, left: pos.left as any }]}>
            <View style={s.mapPinDot} />
            <View style={s.mapPinTail} />
          </View>
        ))}

        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={[s.backBtn, { top: topInset + 10 }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={16} color={C.darkBrown} />
          <Text style={s.backLabel}>Voltar</Text>
        </Pressable>

        {/* "N locais" badge */}
        <View style={[s.localsBadge, { top: topInset + 10 }]}>
          <Feather name="map-pin" size={11} color={C.darkBrown} />
          <Text style={s.localsBadgeText}>{lugares.length} locais</Text>
        </View>

        {/* Zoom controls */}
        <View style={s.zoomControls}>
          <Pressable style={s.zoomBtn}>
            <Text style={s.zoomBtnText}>+</Text>
          </Pressable>
          <View style={s.zoomDivider} />
          <Pressable style={s.zoomBtn}>
            <Text style={s.zoomBtnText}>−</Text>
          </Pressable>
        </View>
      </View>

      {/* ════ SCROLLABLE CONTENT ════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* ── Description block — dark editorial background ── */}
        <View style={s.descBlock}>
          <Text style={s.descTitle}>
            O que fazer em {destino.cidade}
          </Text>
          {descricao.map((para, i) => (
            <Text key={i} style={s.descPara}>
              {para}
            </Text>
          ))}
          {/* Editorial note icon */}
          <View style={s.descNoteWrap}>
            <View style={s.descNoteDot} />
            <Text style={s.descNoteText}>
              Seleção curada · {lugares.length} lugares
            </Text>
          </View>
        </View>

        {/* ── Place cards — generous spacing, curated feel ── */}
        <View style={s.cardsSection}>
          <Text style={s.cardsSectionLabel}>Locais selecionados</Text>

          {lugares.map((place, index) => (
            <View key={place.id} style={s.card}>
              {/* Image area */}
              <View style={s.cardImageWrap}>
                <Image source={place.image} style={s.cardImage} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.12)", "transparent"]}
                  locations={[0, 0.4]}
                  style={StyleSheet.absoluteFill}
                />

                {/* Bookmark button */}
                <Pressable style={s.bookmarkBtn} hitSlop={8}>
                  <Feather name="bookmark" size={15} color={C.white} />
                </Pressable>

                {/* Price badge */}
                {place.preco && (
                  <View style={s.priceBadge}>
                    <Text style={s.priceText}>{place.preco}</Text>
                  </View>
                )}

                {/* Order number */}
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

                {/* Ver no mapa button */}
                <Pressable style={s.verNoMapaBtn}>
                  <Feather name="map-pin" size={13} color="rgba(255,255,255,0.65)" />
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

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#100A06",
  },

  // ── Map ──
  map: {
    width: SCREEN_WIDTH,
    position: "relative",
    overflow: "hidden",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    opacity: 0.72,
  },
  mapWarmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(218, 200, 172, 0.52)",
  },

  // Map pin markers
  mapPin: {
    position: "absolute",
    alignItems: "center",
  },
  mapPinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.terracotta,
    borderWidth: 2,
    borderColor: C.white,
    shadowColor: C.darkBrown,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  mapPinTail: {
    width: 2,
    height: 5,
    backgroundColor: C.terracotta,
    borderRadius: 1,
    marginTop: 0,
  },

  // Map controls
  backBtn: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  backLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.darkBrown,
    letterSpacing: 0.1,
  },
  localsBadge: {
    position: "absolute",
    left: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  localsBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.darkBrown,
  },
  zoomControls: {
    position: "absolute",
    right: 16,
    bottom: 20,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 20,
    color: C.darkBrown,
    lineHeight: 24,
  },
  zoomDivider: {
    height: 1,
    marginHorizontal: 6,
    backgroundColor: C.border,
  },

  // ── Description block ──
  descBlock: {
    backgroundColor: "#100A06",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
    gap: 0,
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

  // ── Cards ──
  cardsSection: {
    backgroundColor: C.cream,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 0,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },

  // Card image area
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

  // Card text area
  cardBody: {
    padding: 18,
    paddingTop: 16,
    gap: 0,
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

  // Ver no mapa
  verNoMapaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingVertical: 11,
  },
  verNoMapaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
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
