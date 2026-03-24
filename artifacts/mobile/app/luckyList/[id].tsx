/**
 * luckyList/[id].tsx — Lucky List curated picks screen
 *
 * Map: RioMapView (Leaflet satellite) — same component as ondeFicar.
 * Layout: fixed map section (50% screen) + scrollable list below.
 * Visual: gold Lucky List branding with ✦ marks preserved.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
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
import { LUGARES_LUCKY } from "@/data/lugares";
import RioMapView from "@/components/RioMapView";

const C = Colors.light;
const GOLD = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.18)";
const GOLD_BORDER = "rgba(201,168,76,0.28)";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.50);
const CARD_IMAGE_H = 218;

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

// ── Floating neighborhood card (Lucky styling) ────────────────────────────────

function LuckyNeighborhoodCard({
  name,
  count,
  onVerLocais,
  onDismiss,
}: {
  name: string;
  count: number;
  onVerLocais: () => void;
  onDismiss: () => void;
}) {
  return (
    <LinearGradient
      colors={["rgba(26,18,8,0.97)", "rgba(10,5,2,0.98)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={nc.card}
    >
      {/* Gold top accent line */}
      <View style={nc.goldLine} />

      <View style={nc.header}>
        <View style={nc.headerLeft}>
          <Text style={nc.accentLabel}>✦ LUCKY LIST</Text>
          <Text style={nc.name}>{name}</Text>
          <Text style={nc.sub}>
            {count === 0
              ? "Sem picks nesta área"
              : `${count} pick${count !== 1 ? "s" : ""} selecionado${count !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <Pressable style={nc.closeBtn} onPress={onDismiss} hitSlop={12}>
          <Feather name="x" size={13} color="rgba(255,255,255,0.35)" />
        </Pressable>
      </View>
      <View style={nc.actions}>
        <Pressable style={nc.goldBtn} onPress={onVerLocais}>
          <Text style={nc.goldBtnText}>
            {count > 0 ? `Ver ${count} pick${count !== 1 ? "s" : ""}` : "Ver todos"}
          </Text>
        </Pressable>
        <Pressable style={nc.ghostBtn} onPress={onDismiss}>
          <Text style={nc.ghostBtnText}>Explorar mapa</Text>
          <Feather name="map" size={12} color={GOLD} style={{ opacity: 0.7 }} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LuckyListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const allLugares = LUGARES_LUCKY[destino.id] ?? [];
  const editorial = EDITORIAIS[destino.id] ?? DEFAULT_EDITORIAL;

  const [selected, setSelected] = useState<string | null>(null);

  const lugares = selected
    ? allLugares.filter((p) => p.localizacao === selected)
    : allLugares;

  const cardAnim = useRef(new Animated.Value(0)).current;
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    if (selected && selected !== prevSelected.current) {
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

  const listRef = useRef<ScrollView>(null);
  const listY = useRef(0);

  function handleNeighborhoodPress(name: string | null) {
    setSelected((prev) => (prev === name ? null : name));
  }

  function handleVerLocais() {
    setTimeout(
      () => listRef.current?.scrollTo({ y: listY.current + MAP_H, animated: true }),
      80,
    );
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
        <RioMapView
          selectedNeighborhood={selected}
          onNeighborhoodPress={handleNeighborhoodPress}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[s.mapControls, { top: topInset + 10 }]} pointerEvents="box-none">
          <Pressable style={s.pill} onPress={() => router.back()} hitSlop={8}>
            <Text style={s.pillText}>← Voltar</Text>
          </Pressable>
          <View style={[s.pill, s.pillGold]}>
            <Text style={s.pillGoldText}>
              ✦{" "}
              {selected
                ? `${lugares.length} pick${lugares.length !== 1 ? "s" : ""}`
                : `${allLugares.length} picks`}
            </Text>
          </View>
        </View>

        {!selected && (
          <View style={[s.mapHint, { pointerEvents: "none" }]}>
            <Text style={s.mapHintText}>✦ Toque num bairro para filtrar picks</Text>
          </View>
        )}

        {selected && (
          <Animated.View style={[s.cardWrap, cardStyle]} pointerEvents="box-none">
            <LuckyNeighborhoodCard
              name={selected}
              count={lugares.length}
              onVerLocais={handleVerLocais}
              onDismiss={() => setSelected(null)}
            />
          </Animated.View>
        )}
      </View>

      {/* ── Scrollable list ── */}
      <ScrollView
        ref={listRef}
        style={s.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* Hero editorial block */}
        <View style={s.heroBlock}>
          <View style={s.heroAccent}>
            <Text style={s.heroAccentText}>✦ LUCKY LIST</Text>
            <View style={s.heroAccentLine} />
          </View>

          {selected ? (
            <>
              <Text style={s.heroHeadline}>{selected}</Text>
              <Text style={s.heroPara}>
                {lugares.length === 0
                  ? "Nenhum pick Lucky neste bairro. Explore o mapa para descobrir outros."
                  : `${lugares.length} pick${lugares.length !== 1 ? "s" : ""} Lucky neste bairro — selecionados para quem sabe escolher.`}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.heroHeadline}>{editorial.headline}</Text>
              {editorial.paras.map((para, i) => (
                <Text key={i} style={s.heroPara}>{para}</Text>
              ))}
            </>
          )}

          <View style={s.curatorBadge}>
            <View style={s.curatorDot} />
            <Text style={s.curatorText}>
              Curadoria Lucky Trip · {destino.cidade} · {lugares.length} picks selecionados
            </Text>
          </View>
        </View>

        {/* Lucky picks cards */}
        <View
          style={s.cardsSection}
          onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}
        >
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>
              {selected ? `${lugares.length} Picks em ${selected}` : "Lucky Picks"}
            </Text>
            <View style={s.sectionLabelLine} />
          </View>

          {lugares.length === 0 && selected && (
            <View style={s.centerWrap}>
              <Text style={s.emptyGold}>✦</Text>
              <Text style={s.emptyTitle}>Nenhum pick em {selected}</Text>
              <Text style={s.emptyText}>Toque em outro bairro no mapa.</Text>
            </View>
          )}

          {lugares.map((place, index) => (
            <Pressable
              key={place.id}
              style={s.card}
              onPress={() => router.push(`/lugar/${destino.id}/${place.id}`)}
            >
              <View style={s.cardImageWrap}>
                <Image source={place.image} style={s.cardImage} resizeMode="cover" />
                <LinearGradient
                  colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)"]}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.bookmarkBtn}>
                  <Feather name="bookmark" size={15} color={C.white} />
                </View>
                <View style={s.luckyNumber}>
                  <Text style={s.luckyNumberText}>✦</Text>
                  <Text style={s.luckyIndexText}>{String(index + 1).padStart(2, "0")}</Text>
                </View>
                <View style={s.categoriaBadge}>
                  <Text style={s.categoriaText}>{place.categoria}</Text>
                </View>
              </View>

              <View style={s.cardBody}>
                <View style={s.cardLocRow}>
                  <Feather name="map-pin" size={10} color={GOLD} />
                  <Text style={s.cardLocText}>{place.localizacao}</Text>
                </View>
                <Text style={s.cardTitulo}>{place.titulo}</Text>
                <Text style={s.cardDesc}>{place.descricao}</Text>
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

        {/* Editorial footer */}
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
  pillGold: {
    borderColor: GOLD_BORDER,
    backgroundColor: "rgba(201,168,76,0.12)",
  },
  pillGoldText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: GOLD,
    letterSpacing: 0.3,
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
    color: "rgba(201,168,76,0.55)",
    letterSpacing: 0.4,
  },

  // ── Scrollable list ──
  listScroll: {
    flex: 1,
    backgroundColor: "#0A0502",
  },

  // ── Hero editorial ──
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
  centerWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyGold: {
    fontSize: 22,
    color: GOLD,
    opacity: 0.35,
    marginBottom: 4,
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
    color: "rgba(255,255,255,0.18)",
    textAlign: "center",
  },

  // ── Lucky pick card ──
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
  luckyNumberText: { fontSize: 9, color: GOLD },
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
  cardBody: { padding: 18, paddingTop: 16 },
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
  actionsRow: { flexDirection: "row", gap: 10 },
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

// ── Lucky neighborhood card styles ────────────────────────────────────────────

const nc = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  goldLine: {
    height: 1,
    backgroundColor: GOLD_BORDER,
    marginBottom: 14,
    marginHorizontal: -18,
    marginTop: -14,
    // positioned above the card content as a decorative top accent
    display: "none", // kept for future use; gold border on card handles it
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  accentLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 2.2,
    marginBottom: 4,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: C.white,
    lineHeight: 26,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(201,168,76,0.55)",
  },
  closeBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 13,
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: 10 },
  goldBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 50,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  goldBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    color: "#18120C",
    letterSpacing: 0.1,
  },
  ghostBtn: {
    flex: 1,
    backgroundColor: "rgba(201,168,76,0.06)",
    borderRadius: 50,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    flexDirection: "row",
    gap: 6,
  },
  ghostBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
    color: "rgba(201,168,76,0.75)",
    letterSpacing: 0.1,
  },
});
