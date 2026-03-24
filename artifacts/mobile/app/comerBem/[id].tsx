/**
 * comerBem/[id].tsx — Onde comer category screen
 *
 * Map: RioMapView (Leaflet satellite) — same component as ondeFicar.
 * Layout: fixed map section (50% screen) + scrollable place list below.
 * Filtering: by neighborhood name selected on the map.
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
import { useRestaurants } from "@/hooks/useRestaurants";
import RioMapView from "@/components/RioMapView";

const C = Colors.light;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.50);
const CARD_IMAGE_H = 210;

const DESCRICOES: Record<string, string[]> = {
  rio: [
    "A cena gastronômica carioca vai muito além das barracas de praia. Chefs autorais, bistrôs escondidos e botecos com décadas de história compõem um mapa de sabores único.",
    "De Santa Teresa ao Leblon, cada bairro tem seu ritmo à mesa — do almoço demorado ao jantar que vira noite entre histórias e vinho.",
    "Esta seleção reúne os lugares onde comer bem é também uma experiência de cidade.",
  ],
};

const DEFAULT_DESCRICAO = [
  "Uma cena gastronômica que reflete a diversidade e a alma do destino. Cada restaurante aqui foi escolhido pela experiência que oferece, não apenas pelo prato.",
  "Ingredientes locais, chefs comprometidos e ambientes que valem a visita — mesmo antes de sentar à mesa.",
];

// ── Floating neighborhood card ────────────────────────────────────────────────

function SectionNeighborhoodCard({
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
      colors={["rgba(28,16,8,0.97)", "rgba(10,5,2,0.98)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={nc.card}
    >
      <View style={nc.header}>
        <View style={nc.headerLeft}>
          <Text style={nc.name}>{name}</Text>
          <Text style={nc.sub}>
            {count === 0
              ? "Sem restaurantes nesta área"
              : `${count} restaurante${count !== 1 ? "s" : ""} selecionado${count !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <Pressable style={nc.closeBtn} onPress={onDismiss} hitSlop={12}>
          <Feather name="x" size={13} color="rgba(255,255,255,0.35)" />
        </Pressable>
      </View>
      <View style={nc.actions}>
        <Pressable style={nc.hotBtn} onPress={onVerLocais}>
          <Text style={nc.hotBtnText}>
            {count > 0
              ? `Ver ${count} restaurante${count !== 1 ? "s" : ""}`
              : "Ver todos"}
          </Text>
        </Pressable>
        <Pressable style={nc.ghostBtn} onPress={onDismiss}>
          <Text style={nc.ghostBtnText}>Explorar mapa</Text>
          <Feather name="map" size={12} color="rgba(255,255,255,0.55)" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ComerBemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const descricao = DESCRICOES[destino.id] ?? DEFAULT_DESCRICAO;

  const { restaurantes: allRestaurantes, loading, error } = useRestaurants(destino.id);

  const [selected, setSelected] = useState<string | null>(null);

  const lugares = selected
    ? allRestaurantes.filter((r) => r.bairro === selected)
    : allRestaurantes;

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
          <View style={s.pill}>
            <View style={[s.badgeDot, selected ? s.badgeDotActive : null]} />
            <Text style={s.pillText}>
              {selected
                ? `${lugares.length} restaurante${lugares.length !== 1 ? "s" : ""}`
                : loading
                ? "carregando..."
                : `${allRestaurantes.length} locais`}
            </Text>
          </View>
        </View>

        {!selected && (
          <View style={[s.mapHint, { pointerEvents: "none" }]}>
            <Text style={s.mapHintText}>Toque num bairro para explorar</Text>
          </View>
        )}

        {selected && (
          <Animated.View style={[s.cardWrap, cardStyle]} pointerEvents="box-none">
            <SectionNeighborhoodCard
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
        {/* Intro hero */}
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
            {selected ? (
              <>
                <Text style={s.introTitle}>{selected}</Text>
                <Text style={s.introPara}>
                  {lugares.length === 0
                    ? "Nenhum restaurante neste bairro por enquanto."
                    : `${lugares.length} restaurante${lugares.length !== 1 ? "s" : ""} para descobrir.`}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.introTitle}>Onde comer em {destino.cidade}</Text>
                <Text style={s.introPara}>{descricao[0]}</Text>
              </>
            )}
            <View style={s.introMeta}>
              <View style={s.introDot} />
              <Text style={s.introMetaText}>
                {loading
                  ? "Carregando seleção…"
                  : `Seleção curada · ${lugares.length} restaurante${lugares.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Cards section */}
        <View
          style={s.listSection}
          onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={s.listLabel}>
            {selected
              ? `${lugares.length} restaurante${lugares.length !== 1 ? "s" : ""} em ${selected}`
              : "Restaurantes selecionados"}
          </Text>

          {!selected && descricao.slice(1).map((para, i) => (
            <Text key={i} style={s.descPara}>{para}</Text>
          ))}

          {/* Loading state */}
          {loading && (
            <View style={s.centerWrap}>
              <Feather name="coffee" size={18} color="rgba(255,255,255,0.10)" />
              <Text style={s.emptyText}>Carregando restaurantes…</Text>
            </View>
          )}

          {/* Error state */}
          {!loading && error && (
            <View style={s.centerWrap}>
              <Feather name="alert-circle" size={18} color="rgba(255,255,255,0.10)" />
              <Text style={s.emptyTitle}>Erro ao carregar</Text>
              <Text style={s.emptyText}>{error}</Text>
            </View>
          )}

          {/* Empty neighborhood filter state */}
          {!loading && !error && lugares.length === 0 && selected && (
            <View style={s.centerWrap}>
              <Feather name="map-pin" size={18} color="rgba(255,255,255,0.10)" />
              <Text style={s.emptyTitle}>Nenhum restaurante em {selected}</Text>
              <Text style={s.emptyText}>Toque em outro bairro no mapa.</Text>
            </View>
          )}

          {/* Restaurant cards */}
          {!loading && !error && lugares.map((r, index) => {
            const precoStr = "€".repeat(Math.max(1, Math.min(4, r.preco_nivel)));
            const imageSource = r.resolvedPhotoUri
              ? { uri: r.resolvedPhotoUri }
              : require("../../assets/images/restaurante1.png");

            return (
              <Pressable
                key={r.id}
                style={s.card}
                onPress={() =>
                  router.push({
                    pathname: "/lugar/[cityId]/[placeId]",
                    params: { cityId: destino.id, placeId: String(r.id) },
                  })
                }
              >
                <View style={s.cardImageWrap}>
                  <Image source={imageSource} style={s.cardImage} resizeMode="cover" />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.12)", "transparent"]}
                    locations={[0, 0.4]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={s.bookmarkBtn}>
                    <Feather name="bookmark" size={15} color={C.white} />
                  </View>
                  <View style={s.priceBadge}>
                    <Text style={s.priceText}>{precoStr}</Text>
                  </View>
                  <View style={s.orderBadge}>
                    <Text style={s.orderText}>{String(index + 1).padStart(2, "0")}</Text>
                  </View>
                </View>

                <View style={s.cardBody}>
                  <View style={s.cardMeta}>
                    <Text style={s.cardCategoria}>{r.categoria.toUpperCase()}</Text>
                    <View style={s.cardLocWrap}>
                      <Feather name="map-pin" size={10} color={C.warmGray} />
                      <Text style={s.cardLocText}>{r.bairro}</Text>
                    </View>
                  </View>
                  <Text style={s.cardTitulo}>{r.nome}</Text>
                  <Text style={s.cardDesc}>{r.meu_olhar}</Text>
                  <Pressable
                    style={s.verNoMapaBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.push({
                        pathname: "/lugar/[cityId]/[placeId]",
                        params: { cityId: destino.id, placeId: String(r.id), showMap: "true" },
                      });
                    }}
                  >
                    <Feather name="map-pin" size={13} color={C.terracotta} />
                    <Text style={s.verNoMapaText}>Ver no mapa</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria para quem quer saborear {destino.cidade} com profundidade.
          </Text>
        </View>
      </ScrollView>
    </View>
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
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.terracotta,
  },
  badgeDotActive: {
    backgroundColor: C.gold,
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

  listScroll: {
    flex: 1,
    backgroundColor: "#0A0502",
  },

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
    marginBottom: 16,
  },
  descPara: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 26,
    letterSpacing: 0.1,
    marginBottom: 14,
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

  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    color: "rgba(255,255,255,0.50)",
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
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingVertical: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  verNoMapaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.2,
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

// ── Neighborhood card styles ───────────────────────────────────────────────────

const nc = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 8 },
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
    color: "rgba(255,255,255,0.45)",
  },
  closeBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  hotBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 50,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  hotBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    color: "#18120C",
    letterSpacing: 0.1,
  },
  ghostBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 50,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    gap: 6,
  },
  ghostBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.1,
  },
});
