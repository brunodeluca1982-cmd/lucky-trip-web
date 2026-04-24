/**
 * ondeFicar/[id].tsx — "Onde ficar" redesigned
 *
 * Top half: Map with bairro pins (light cartographic style)
 * Bottom half: Either "Escolha no mapa..." prompt or bairro preview card
 */

import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useBairros, type Bairro } from "@/hooks/useBairros";
import RioMapView from "@/components/RioMapView";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.50);

// Colors
const PETROL = "#1B4F72";
const SAND = "#F5F0E8";
const TEAL = "#4ECDC4";
const BG_DARK = "#0A0A0A";
const CARD_BG = "#141414";

// Rio de Janeiro destino_id
const RIO_DESTINO_ID = "7f047742-427f-4b11-8286-781af899c57d";
const FALLBACK_IMAGE = "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero01.jpg";

// ── Pill label mappers ────────────────────────────────────────────────────────

function getCaminhavelLabel(value?: string): string | null {
  if (!value) return null;
  switch (value.toLowerCase()) {
    case "muito": return "Muito caminhavel";
    case "razoavel": return "Caminhavel";
    case "pouco": return "Pouco caminhavel";
    default: return null;
  }
}

function getVidaNoturnaLabel(value?: string): string | null {
  if (!value) return null;
  switch (value.toLowerCase()) {
    case "intensa": return "Noite intensa";
    case "moderada": return "Noite moderada";
    case "tranquila": return "Tranquilo";
    default: return null;
  }
}

function getGastronomiaLabel(value?: string): string | null {
  if (!value) return null;
  switch (value.toLowerCase()) {
    case "excelente": return "Gastronomia top";
    case "boa": return "Boa gastronomia";
    default: return null;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OndeFicarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // Fetch bairros from Supabase
  const { bairros, loading: loadingBairros } = useBairros(RIO_DESTINO_ID);

  // Selected bairro state
  const [selectedBairro, setSelectedBairro] = useState<Bairro | null>(null);

  // Animation for card slide-up
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Animate card when selection changes
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: selectedBairro ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedBairro]);

  // Handle bairro selection from map
  function handleBairroPress(bairro: Bairro | null) {
    if (bairro) {
      setSelectedBairro(bairro);
    }
    // Don't deselect on map background tap
  }

  // "Escolher por mim" — pick random bairro (not the current one)
  function handleChooseForMe() {
    if (bairros.length === 0) return;

    const available = selectedBairro
      ? bairros.filter((b) => b.id !== selectedBairro.id)
      : bairros;

    if (available.length === 0) return;

    const random = available[Math.floor(Math.random() * available.length)];
    setSelectedBairro(random);
  }

  // Navigate to bairro detail
  function handleViewHotels() {
    if (!selectedBairro) return;
    router.push(`/ondeFicar/bairro/${selectedBairro.slug}`);
  }

  // Build pills array
  const pills: { icon: string; label: string }[] = [];
  if (selectedBairro) {
    const caminhavel = getCaminhavelLabel(selectedBairro.caminhavel);
    const vidaNoturna = getVidaNoturnaLabel(selectedBairro.vida_noturna);
    const gastronomia = getGastronomiaLabel(selectedBairro.gastronomia);
    if (caminhavel) pills.push({ icon: "user", label: caminhavel });
    if (vidaNoturna) pills.push({ icon: "moon", label: vidaNoturna });
    if (gastronomia) pills.push({ icon: "coffee", label: gastronomia });
  }

  // Card translate animation
  const cardTranslate = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Map section (top 50%) ── */}
      <View style={s.mapSection}>
        <RioMapView
          bairros={bairros}
          selectedBairroId={selectedBairro?.id ?? null}
          onBairroPress={handleBairroPress}
          loading={loadingBairros}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Back button */}
        <View style={[s.mapControls, { top: topInset + 12 }]} pointerEvents="box-none">
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={PETROL} />
            <Text style={s.backText}>Voltar</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Content section (bottom 50%) ── */}
      <View style={[s.contentSection, { paddingBottom: bottomInset + 20 }]}>
        {!selectedBairro ? (
          /* ── Empty state: no bairro selected ── */
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>
              Escolha no mapa o bairro que e a sua cara.
            </Text>
            <Pressable style={s.chooseBtn} onPress={handleChooseForMe}>
              <Text style={s.chooseBtnIcon}>✦</Text>
              <Text style={s.chooseBtnText}>Escolher por mim</Text>
            </Pressable>
          </View>
        ) : (
          /* ── Bairro preview card ── */
          <Animated.View
            style={[
              s.previewCard,
              { transform: [{ translateY: cardTranslate }], opacity: cardAnim },
            ]}
          >
            {/* Hero image */}
            <View style={s.heroImageWrap}>
              <Image
                source={{ uri: selectedBairro.hero_image_url || FALLBACK_IMAGE }}
                style={s.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={s.heroName}>{selectedBairro.nome}</Text>
            </View>

            {/* Identidade */}
            {selectedBairro.identidade && (
              <Text style={s.identidade}>{selectedBairro.identidade}</Text>
            )}

            {/* Pills */}
            {pills.length > 0 && (
              <View style={s.pillsRow}>
                {pills.map((pill, i) => (
                  <View key={i} style={s.pill}>
                    <Feather name={pill.icon as any} size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={s.pillText}>{pill.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* CTA Button */}
            <Pressable style={s.ctaBtn} onPress={handleViewHotels}>
              <Text style={s.ctaBtnText}>
                Ver hoteis no {selectedBairro.nome} →
              </Text>
            </Pressable>

            {/* Choose another link */}
            <Pressable style={s.chooseAnotherBtn} onPress={handleChooseForMe}>
              <Text style={s.chooseAnotherText}>Escolher outro bairro</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
  },

  // Map
  mapSection: {
    width: "100%",
    height: MAP_H,
    position: "relative",
  },
  mapControls: {
    position: "absolute",
    left: 16,
    zIndex: 30,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: PETROL,
  },

  // Content
  contentSection: {
    flex: 1,
    backgroundColor: BG_DARK,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 24,
    maxWidth: 280,
  },
  chooseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PETROL,
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    gap: 10,
  },
  chooseBtnIcon: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  chooseBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Preview card
  previewCard: {
    flex: 1,
  },
  heroImageWrap: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroName: {
    position: "absolute",
    bottom: 16,
    left: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  identidade: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
  },

  // Pills
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },

  // CTA
  ctaBtn: {
    backgroundColor: PETROL,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Choose another
  chooseAnotherBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  chooseAnotherText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: TEAL,
  },
});
