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
  ScrollView,
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
import { HotelCard } from "@/components/HotelCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_H = Math.round(SCREEN_HEIGHT * 0.50);
const CARD_SIZE = SCREEN_WIDTH - 48; // Square card with padding

// Colors
const PETROL = "#1B4F72";
const TEAL = "#4ECDC4";
const BG_DARK = "#0A0A0A";

// Rio de Janeiro destino_id
const RIO_DESTINO_ID = "7f047742-427f-4b11-8286-781af899c57d";
const FALLBACK_IMAGE = "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero01.jpg";

<<<<<<< HEAD
type FlatHotel = Hotel & { localizacao: string; neighborhood: Neighborhood };

function flattenHotels(neighborhoods: Neighborhood[]): FlatHotel[] {
  const result: FlatHotel[] = [];
  for (const n of neighborhoods) {
    for (const h of n.hotels ?? []) {
      result.push({ ...h, localizacao: n.neighborhood_name, neighborhood: n });
=======
// ── Pill builders with emojis ─────────────────────────────────────────────────

function buildPills(bairro: Bairro): string[] {
  const pills: string[] = [];

  // Caminhavel
  if (bairro.caminhavel) {
    switch (bairro.caminhavel.toLowerCase()) {
      case "muito":
        pills.push("🚶 Muito caminhavel");
        break;
      case "razoavel":
        pills.push("🚶 Caminhavel");
        break;
>>>>>>> claude/plan-app-architecture-73RnI
    }
  }

  // Vida noturna
  if (bairro.vida_noturna) {
    switch (bairro.vida_noturna.toLowerCase()) {
      case "intensa":
        pills.push("🌙 Noite intensa");
        break;
      case "moderada":
        pills.push("🌙 Noite moderada");
        break;
    }
  }

  // Gastronomia
  if (bairro.gastronomia) {
    switch (bairro.gastronomia.toLowerCase()) {
      case "excelente":
        pills.push("🍽 Gastronomia top");
        break;
      case "boa":
        pills.push("🍽 Boa gastronomia");
        break;
    }
  }

  return pills;
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

  // Animation for card slide-up and cross-fade
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animate card when selection changes
  useEffect(() => {
    if (selectedBairro) {
      // Slide up + fade in
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedBairro?.id]);

  // Handle bairro selection from map
  function handleBairroPress(bairro: Bairro | null) {
    if (bairro) {
      // Cross-fade when changing bairro
      if (selectedBairro && selectedBairro.id !== bairro.id) {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      setSelectedBairro(bairro);
    }
  }

  // "Escolher por mim" — pick random bairro (not the current one)
  function handleChooseForMe() {
    if (bairros.length === 0) return;

    const available = selectedBairro
      ? bairros.filter((b) => b.id !== selectedBairro.id)
      : bairros;

    if (available.length === 0) return;

    const random = available[Math.floor(Math.random() * available.length)];

    // Cross-fade animation
    if (selectedBairro) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    setSelectedBairro(random);
  }

  // Navigate to bairro detail
  function handleViewHotels() {
    if (!selectedBairro) return;
    router.push(`/ondeFicar/bairro/${selectedBairro.slug}`);
  }

  // Build pills for selected bairro
  const pills = selectedBairro ? buildPills(selectedBairro) : [];

  // Card translate animation
  const cardTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
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
              Escolha no mapa o bairro{"\n"}que e a sua cara.
            </Text>
            <Pressable style={s.chooseBtn} onPress={handleChooseForMe}>
              <Text style={s.chooseBtnIcon}>✦</Text>
              <Text style={s.chooseBtnText}>Escolher por mim</Text>
            </Pressable>
          </View>
<<<<<<< HEAD
        </View>

        {/* List section */}
        <View style={s.listSection}>
          <Text style={s.listLabel}>Hospedagens selecionadas</Text>

          {loading && (
            <View style={s.centerWrap}>
              <ActivityIndicator size="small" color={C.terracotta} />
              <Text style={s.emptyText}>Carregando…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={s.centerWrap}>
              <Feather name="alert-circle" size={18} color="rgba(196,112,74,0.4)" />
              <Text style={s.emptyText}>{error}</Text>
            </View>
          )}

          {!loading && !error && allHotels.map((hotel) => {
            const imageUrl = hotel.photo_url ?? null;
            console.log("HOTEL CARD:", hotel.hotel_name, imageUrl);
            return (
              <HotelCard
                key={hotel.id}
                id={String(hotel.id)}
                nome={hotel.hotel_name}
                localizacao={hotel.localizacao}
                tipo={hotel.hotel_category}
                image={imageUrl ? { uri: imageUrl } : null}
                onPress={() =>
                  router.push({
                    pathname: "/ondeFicar/hotel/[hotelId]",
                    params: { hotelId: hotel.id },
                  })
                }
              />
            );
          })}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria para quem quer descansar em {destino.cidade} com estilo.
          </Text>
        </View>
      </ScrollView>
=======
        ) : (
          /* ── Bairro preview card (square style matching mockup) ── */
          <Animated.View
            style={[
              s.previewCard,
              {
                transform: [{ translateY: cardTranslate }],
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Square card with image */}
            <View style={s.squareCard}>
              <Image
                source={{ uri: selectedBairro.hero_image_url || FALLBACK_IMAGE }}
                style={s.squareCardImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
                locations={[0.3, 0.6, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Content at bottom of card */}
              <View style={s.squareCardContent}>
                {/* CTA Button */}
                <Pressable style={s.ctaBtn} onPress={handleViewHotels}>
                  <Text style={s.ctaBtnText}>Ver hoteis no →</Text>
                </Pressable>

                {/* Choose another link */}
                <Pressable style={s.chooseAnotherBtn} onPress={handleChooseForMe}>
                  <Text style={s.chooseAnotherText}>Escolher outro bairro</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
>>>>>>> claude/plan-app-architecture-73RnI
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
    paddingTop: 20,
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
    alignItems: "center",
    justifyContent: "center",
  },

  // Square card (matching mockup)
  squareCard: {
    width: CARD_SIZE,
    height: CARD_SIZE * 0.65,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  squareCardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  squareCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },

  // CTA
  ctaBtn: {
    backgroundColor: PETROL,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },

  // Choose another
  chooseAnotherBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  chooseAnotherText: {
    fontFamily: "Inter_500Medium",
<<<<<<< HEAD
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  centerWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.20)",
    textAlign: "center",
  },

  footer: {
    backgroundColor: "#000000",
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
=======
    fontSize: 14,
    color: TEAL,
>>>>>>> claude/plan-app-architecture-73RnI
  },
});
