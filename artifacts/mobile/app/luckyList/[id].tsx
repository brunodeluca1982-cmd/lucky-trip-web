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
import { LUGARES_LUCKY } from "@/data/lugares";
import { IllustratedMap } from "@/components/IllustratedMap";

const C = Colors.light;
const GOLD = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.18)";
const GOLD_BORDER = "rgba(201,168,76,0.28)";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_IMAGE_H = 218;

const MAP_RIO = require("../../assets/images/map-rio.png");

function getMapImage(cityId: string): ImageSourcePropType {
  switch (cityId) {
    case "rio": return MAP_RIO;
    default:    return MAP_RIO;
  }
}

// Editorial intros — one per city
const EDITORIAIS: Record<string, { headline: string; paras: string[] }> = {
  rio: {
    headline: "Os lugares que só quem sabe, sabe",
    paras: [
      "Não é o que está no guia turístico. É o que o carioca te conta no terceiro dia — quando já confia em você.",
      "A Lucky List reúne os achados que merecem ser vividos pelo menos uma vez: mirantes sem fila, rituais locais, endereços que parecem segredo mas são simplesmente bem guardados.",
      "Curadoria feita à mão. Atualizada quando vale a pena.",
    ],
  },
};

const DEFAULT_EDITORIAL = {
  headline: "Curadoria especial para este destino",
  paras: [
    "Cada pick da Lucky List foi escolhido por um motivo — não apenas por ser popular, mas por ser a experiência certa no lugar certo.",
    "Aqui estão os endereços que transformam uma viagem boa em uma viagem que você vai contar para todo mundo.",
  ],
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function LuckyListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const lugares = LUGARES_LUCKY[destino.id] ?? [];
  const editorial = EDITORIAIS[destino.id] ?? DEFAULT_EDITORIAL;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ════════════════════════════════════════════════════
          ILLUSTRATED MAP — clean, no pins by default.
      ════════════════════════════════════════════════════ */}
      <IllustratedMap
        mapImage={getMapImage(destino.id)}
        places={[]}
        onBack={() => router.back()}
        topInset={topInset}
        locaisLabel={`✦ ${lugares.length} picks`}
      />

      {/* ════════════════════════════════════════════════════
          SCROLLABLE CONTENT
      ════════════════════════════════════════════════════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* ── Hero editorial block ── */}
        <View style={s.heroBlock}>
          {/* Gold accent bar */}
          <View style={s.heroAccent}>
            <Text style={s.heroAccentText}>✦ LUCKY LIST</Text>
            <View style={s.heroAccentLine} />
          </View>

          <Text style={s.heroHeadline}>{editorial.headline}</Text>

          {editorial.paras.map((para, i) => (
            <Text key={i} style={s.heroPara}>{para}</Text>
          ))}

          {/* Curator badge */}
          <View style={s.curatorBadge}>
            <View style={s.curatorDot} />
            <Text style={s.curatorText}>
              Curadoria Lucky Trip · {destino.cidade} · {lugares.length} picks selecionados
            </Text>
          </View>
        </View>

        {/* ── Lucky picks cards ── */}
        <View style={s.cardsSection}>
          {/* Section header */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Lucky Picks</Text>
            <View style={s.sectionLabelLine} />
          </View>

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
                <Image source={place.image} style={s.cardImage} resizeMode="cover" />

                {/* Vignette */}
                <LinearGradient
                  colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)"]}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />

                {/* Bookmark */}
                <View style={s.bookmarkBtn}>
                  <Feather name="bookmark" size={15} color={C.white} />
                </View>

                {/* Gold lucky number */}
                <View style={s.luckyNumber}>
                  <Text style={s.luckyNumberText}>✦</Text>
                  <Text style={s.luckyIndexText}>{String(index + 1).padStart(2, "0")}</Text>
                </View>

                {/* Categoria badge — bottom left */}
                <View style={s.categoriaBadge}>
                  <Text style={s.categoriaText}>{place.categoria}</Text>
                </View>
              </View>

              {/* Card body */}
              <View style={s.cardBody}>
                <View style={s.cardLocRow}>
                  <Feather name="map-pin" size={10} color={GOLD} />
                  <Text style={s.cardLocText}>{place.localizacao}</Text>
                </View>

                <Text style={s.cardTitulo}>{place.titulo}</Text>
                <Text style={s.cardDesc}>{place.descricao}</Text>

                {/* Actions row */}
                <View style={s.actionsRow}>
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

                  <Pressable style={s.saveBtn}>
                    <Feather name="bookmark" size={13} color={GOLD} />
                    <Text style={s.saveBtnText}>Salvar</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Editorial footer ── */}
        <View style={s.footer}>
          <Text style={s.footerGold}>✦</Text>
          <Text style={s.footerTitle}>Lucky Trip</Text>
          <Text style={s.footerSub}>
            Curadoria de lugares que fazem a diferença em {destino.cidade}.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0502",
  },

  // ── Hero editorial block ──
  heroBlock: {
    backgroundColor: "#0A0502",
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.12)",
  },
  heroAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  heroAccentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 2.5,
  },
  heroAccentLine: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD_BORDER,
  },
  heroHeadline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: C.white,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  heroPara: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 26,
    letterSpacing: 0.1,
    marginBottom: 14,
  },
  curatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  curatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  curatorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(201,168,76,0.60)",
    letterSpacing: 0.4,
    flexShrink: 1,
  },

  // ── Cards section ──
  cardsSection: {
    backgroundColor: "#0F0A06",
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 13,
    color: GOLD,
    letterSpacing: 1.2,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD_BORDER,
  },

  // ── Card ──
  card: {
    backgroundColor: "#1A1208",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.10)",
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
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  luckyNumber: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  luckyNumberText: {
    fontSize: 9,
    color: GOLD,
  },
  luckyIndexText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 0.8,
  },
  categoriaBadge: {
    position: "absolute",
    bottom: 14,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.54)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  categoriaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.6,
  },

  cardBody: {
    padding: 18,
    paddingTop: 16,
  },
  cardLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  cardLocText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(201,168,76,0.72)",
  },
  cardTitulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: C.white,
    lineHeight: 28,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 21,
    marginBottom: 18,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  verNoMapaBtn: {
    flex: 1,
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
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 10,
    paddingVertical: 11,
    backgroundColor: GOLD_DIM,
  },
  saveBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: GOLD,
  },

  // ── Footer ──
  footer: {
    backgroundColor: "#0A0502",
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(201,168,76,0.12)",
    alignItems: "center",
    gap: 6,
  },
  footerGold: {
    fontSize: 22,
    color: GOLD,
    marginBottom: 2,
  },
  footerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: C.white,
    letterSpacing: 0.5,
  },
  footerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(201,168,76,0.50)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 250,
    marginTop: 4,
  },
});
