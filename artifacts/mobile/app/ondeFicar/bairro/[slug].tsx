/**
 * ondeFicar/bairro/[slug].tsx — Neighborhood detail for "Onde ficar"
 *
 * Layout:
 *   Hero image → neighborhood name + phrase
 *   ACTION BUTTONS: "Ver X hotéis" (scroll) | "Por dentro do bairro" (toggle editorial)
 *   [Collapsible editorial: my_view + how_to_live + stats]
 *   Hotels list
 *
 * URL params:
 *   slug     — neighborhood_slug
 *   cityId   — destination id for hero image
 *   focusHotels — "true" to auto-scroll to hotels on mount
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import type { Hotel } from "@/lib/supabase";
import { getNeighborhoodHero } from "@/utils/neighborhoodHero";

const C = Colors.light;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_H = Math.round(SCREEN_HEIGHT * 0.46);

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

function formatLevel(val: string): string {
  const m: Record<string, string> = {
    alto: "Alta", alta: "Alta", media: "Média", baixa: "Baixa", muito_alta: "Muito alta",
  };
  return m[val?.toLowerCase()] ?? val ?? "—";
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BairroDetailScreen() {
  const { slug, cityId, focusHotels } = useLocalSearchParams<{
    slug: string;
    cityId?: string;
    focusHotels?: string;
  }>();
  const insets    = useSafeAreaInsets();
  const topInset  = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { neighborhoods, loading, error } = useNeighborhoods();
  const neighborhood = neighborhoods.find((n) => n.neighborhood_slug === slug) ?? null;

  const destino = destinos.find((d) => d.id === (cityId ?? "rio")) ?? destinos[0];

  const heroImage = getNeighborhoodHero(neighborhood?.image_url);

  const [editorialOpen, setEditorialOpen] = useState(false);

  const scrollRef    = useRef<ScrollView>(null);
  const hotelsSectionY = useRef(0);
  const hasScrolled  = useRef(false);

  useEffect(() => {
    if (focusHotels === "true" && neighborhood && !hasScrolled.current) {
      hasScrolled.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: hotelsSectionY.current, animated: true });
      }, 400);
    }
  }, [neighborhood, focusHotels]);

  const hotelCount = neighborhood?.hotels?.length ?? 0;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Full-screen background (persists while scrolling) ── */}
      {heroImage != null && (
        <Image
          source={heroImage}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.82)", "rgba(0,0,0,0.95)"]}
        locations={[0, 0.30, 0.54, 1.0]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {loading && (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.30)" />
        </View>
      )}

      {error && !loading && (
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>{error}</Text>
        </View>
      )}

      {!loading && !error && !neighborhood && (
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>Bairro não encontrado.</Text>
        </View>
      )}

      {!loading && !error && neighborhood && (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + 56 }}
        >
          {/* ── Hero ── */}
          <View style={[s.hero, { height: HERO_H }]}>
            <Pressable
              style={[s.backBtn, { top: topInset + 12 }]}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Feather name="arrow-left" size={15} color="rgba(255,255,255,0.88)" />
              <Text style={s.backText}>Voltar</Text>
            </Pressable>

            <View style={s.heroContent}>
              <View style={s.categoryBadge}>
                <Text style={s.categoryText}>
                  {neighborhood.category_neighborhood?.toUpperCase() ?? "BAIRRO"}
                </Text>
              </View>
              <Text style={s.heroName}>{neighborhood.neighborhood_name}</Text>
              <Text style={s.heroPhrase}>{neighborhood.identity_phrase}</Text>
              <View style={s.tagsRow}>
                {[neighborhood.best_for_1, neighborhood.best_for_2, neighborhood.best_for_3]
                  .filter(Boolean)
                  .map((b, i) => (
                    <View key={i} style={s.tag}>
                      <Text style={s.tagText}>{b}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>

          {/* ── Action buttons ── */}
          <View style={s.actionRow}>
            <Pressable
              style={s.actionPrimary}
              onPress={() =>
                setTimeout(
                  () => scrollRef.current?.scrollTo({ y: hotelsSectionY.current, animated: true }),
                  60,
                )
              }
            >
              <Feather name="home" size={14} color="#18120C" />
              <Text style={s.actionPrimaryText}>
                Ver {hotelCount > 0 ? `${hotelCount} ` : ""}hotel{hotelCount !== 1 ? "s" : ""}
              </Text>
            </Pressable>
            <Pressable
              style={[s.actionGhost, editorialOpen && s.actionGhostActive]}
              onPress={() => setEditorialOpen((v) => !v)}
            >
              <Text style={s.actionGhostText}>Por dentro do bairro</Text>
              <Feather
                name={editorialOpen ? "chevron-up" : "chevron-down"}
                size={13}
                color="rgba(255,255,255,0.55)"
              />
            </Pressable>
          </View>

          {/* ── Collapsible editorial ── */}
          {editorialOpen && (
            <View style={s.editorial}>
              <Text style={s.sectionLabel}>Por dentro do bairro</Text>
              {neighborhood.my_view
                .replace(/\r\n/g, "\n")
                .split("\n")
                .map((p, i) =>
                  p.trim() ? (
                    <Text key={i} style={s.bodyText}>{p.trim()}</Text>
                  ) : null,
                )}

              {neighborhood.how_to_live && neighborhood.how_to_live.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 24 }]}>Como viver o bairro</Text>
                  {neighborhood.how_to_live.map((tip, i) => (
                    <View key={i} style={s.tipRow}>
                      <View style={s.tipDot} />
                      <Text style={s.tipText}>{tip}</Text>
                    </View>
                  ))}
                </>
              )}

              <Text style={[s.sectionLabel, { marginTop: 24 }]}>Perfil do bairro</Text>
              <View style={s.statsGrid}>
                <StatPill label="Vida noturna"  value={formatLevel(neighborhood.nightlife)} />
                <StatPill label="Gastronomia"   value={formatLevel(neighborhood.gastronomy)} />
                <StatPill label="Paisagem"      value={formatLevel(neighborhood.scenery)} />
                <StatPill label="A pé"          value={formatLevel(neighborhood.walkable)} />
                <StatPill label="Solo feminino" value={formatLevel(neighborhood.safety_solo_woman)} />
              </View>
            </View>
          )}

          {/* ── Hotels section ── */}
          <View
            style={s.hotelsSection}
            onLayout={(e) => { hotelsSectionY.current = e.nativeEvent.layout.y; }}
          >
            <View style={s.hotelsSectionHeader}>
              <Text style={s.sectionLabel}>
                Hospedagens em {neighborhood.neighborhood_name}
              </Text>
              {hotelCount > 0 && (
                <Text style={s.hotelCount}>
                  {hotelCount} opção{hotelCount !== 1 ? "ões" : ""}
                </Text>
              )}
            </View>

            {hotelCount === 0 && (
              <View style={s.emptyHotels}>
                <Text style={s.emptyHotelsText}>
                  Nenhuma hospedagem cadastrada neste bairro por enquanto.
                </Text>
              </View>
            )}

            {(neighborhood.hotels ?? []).map((hotel, idx) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                index={idx}
                neighborhoodName={neighborhood.neighborhood_name}
                onPress={() =>
                  router.push({
                    pathname: "/ondeFicar/hotel/[hotelId]",
                    params: { hotelId: hotel.id },
                  })
                }
              />
            ))}
          </View>

          {/* ── Google Maps CTA ── */}
          {neighborhood.google_maps && (
            <View style={s.ctaSection}>
              <Pressable
                style={s.mapsBtn}
                onPress={() => Linking.openURL(neighborhood.google_maps!)}
              >
                <Feather name="map-pin" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={s.mapsBtnText}>Ver no Google Maps</Text>
              </Pressable>
            </View>
          )}

          {/* ── Footer ── */}
          <View style={s.footer}>
            <Text style={s.footerL}>L.</Text>
            <Text style={s.footerPhrase}>{neighborhood.identity_phrase}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statPill}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// ── HotelCard ─────────────────────────────────────────────────────────────────

function HotelCard({
  hotel,
  index,
  neighborhoodName,
  onPress,
}: {
  hotel: Hotel;
  index: number;
  neighborhoodName: string;
  onPress: () => void;
}) {
  const rawView = hotel.my_view ?? "";
  const firstLine = rawView
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
  const preview = firstLine.length > 120 ? firstLine.slice(0, 117) + "…" : firstLine;

  return (
    <Pressable style={hc.card} onPress={onPress}>
      <View style={hc.header}>
        <View style={hc.headerLeft}>
          <Text style={hc.category}>{categoryLabel(hotel.hotel_category)}</Text>
          <Text style={hc.name}>{hotel.hotel_name}</Text>
        </View>
        <Text style={hc.index}>{String(index + 1).padStart(2, "0")}</Text>
      </View>

      {preview ? <Text style={hc.preview}>{preview}</Text> : null}

      <View style={hc.badgeRow}>
        {hotel.front_beach && (
          <View style={hc.badge}><Text style={hc.badgeTxt}>Frente ao mar</Text></View>
        )}
        {hotel.rooftop && (
          <View style={hc.badge}><Text style={hc.badgeTxt}>Terraço</Text></View>
        )}
      </View>

      <View style={hc.footer}>
        <View style={hc.locRow}>
          <Feather name="map-pin" size={10} color="rgba(255,255,255,0.32)" />
          <Text style={hc.locText}>{neighborhoodName}</Text>
        </View>
        {hotel.reserve_url ? (
          <Pressable
            style={hc.reserveBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Linking.openURL(hotel.reserve_url);
            }}
          >
            <Feather name="external-link" size={11} color={C.gold} />
            <Text style={hc.reserveTxt}>Reservar</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
  },

  hero: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    zIndex: 10,
  },
  backText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
  },
  heroContent: { paddingHorizontal: 24, paddingBottom: 28 },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 14,
  },
  categoryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 1.6,
  },
  heroName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 38,
    color: C.white,
    letterSpacing: -0.6,
    lineHeight: 46,
    marginBottom: 8,
  },
  heroPhrase: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 16,
    color: C.gold,
    letterSpacing: 0.1,
    fontStyle: "italic",
    opacity: 0.85,
    marginBottom: 18,
    lineHeight: 24,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
  },

  // ── Action buttons ──
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 50,
    paddingVertical: 13,
  },
  actionPrimaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    color: "#18120C",
    letterSpacing: 0.1,
  },
  actionGhost: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 50,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  actionGhostActive: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: "rgba(255,255,255,0.20)",
  },
  actionGhostText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.1,
  },

  // ── Editorial ──
  editorial: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 26,
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginTop: 10,
    flexShrink: 0,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 22,
    flex: 1,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    minWidth: 110,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.30)",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },

  // ── Hotels ──
  hotelsSection: {
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    marginTop: 16,
  },
  hotelsSectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  hotelCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
  },
  emptyHotels: { paddingVertical: 24, alignItems: "center" },
  emptyHotelsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.22)",
    textAlign: "center",
    lineHeight: 20,
  },

  ctaSection: { paddingHorizontal: 24, paddingTop: 12 },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mapsBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.1,
  },

  footer: {
    marginTop: 32,
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
    color: "rgba(255,255,255,0.18)",
  },
  footerPhrase: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.30)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
    fontStyle: "italic",
  },
});

const hc = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 16,
    padding: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  category: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: C.white,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  index: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.20)",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  preview: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.52)",
    lineHeight: 20,
    marginBottom: 12,
  },
  badgeRow: { flexDirection: "row", gap: 7, marginBottom: 14, flexWrap: "wrap" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.28)",
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.22)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(201,168,76,0.04)",
  },
  reserveTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.gold,
    letterSpacing: 0.1,
  },
});
