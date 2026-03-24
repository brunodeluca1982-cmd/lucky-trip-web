import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useNeighborhoods } from "@/hooks/useNeighborhoods";

const C = Colors.light;

export default function BairroDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets    = useSafeAreaInsets();
  const topInset  = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { neighborhoods, loading, error } = useNeighborhoods();
  const neighborhood = neighborhoods.find((n) => n.neighborhood_slug === slug) ?? null;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back bar */}
      <View style={[s.topBar, { paddingTop: topInset + 12 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={16} color={C.white} />
          <Text style={s.backText}>Voltar</Text>
        </Pressable>
        {neighborhood && (
          <Text style={s.topCategory}>
            {neighborhood.category_neighborhood?.toUpperCase()}
          </Text>
        )}
      </View>

      {loading && (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={C.terracotta} />
          <Text style={s.statusText}>Carregando bairro…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={s.centerWrap}>
          <Feather name="alert-circle" size={28} color="rgba(196,112,74,0.5)" />
          <Text style={s.statusText}>{error}</Text>
        </View>
      )}

      {!loading && !error && !neighborhood && (
        <View style={s.centerWrap}>
          <Text style={s.statusText}>Bairro não encontrado.</Text>
        </View>
      )}

      {!loading && !error && neighborhood && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + 48 }}
        >
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroInner}>
              <Text style={s.heroName}>{neighborhood.neighborhood_name}</Text>
              <Text style={s.heroPhrase}>{neighborhood.identity_phrase}</Text>
            </View>

            {/* Best for */}
            <View style={s.bestForRow}>
              {[neighborhood.best_for_1, neighborhood.best_for_2, neighborhood.best_for_3]
                .filter(Boolean)
                .map((b, i) => (
                  <View key={i} style={s.bestForTag}>
                    <Text style={s.bestForText}>{b}</Text>
                  </View>
                ))}
            </View>
          </View>

          <View style={s.divider} />

          {/* Editorial my_view */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Por dentro</Text>
            {neighborhood.my_view
              .replace(/\r\n/g, "\n")
              .split("\n")
              .map((p, i) =>
                p.trim() ? (
                  <Text key={i} style={s.bodyText}>{p.trim()}</Text>
                ) : null,
              )}
          </View>

          {/* How to live */}
          {neighborhood.how_to_live && neighborhood.how_to_live.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Como viver o bairro</Text>
              {neighborhood.how_to_live.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Neighborhood stats */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Perfil do bairro</Text>
            <View style={s.statsGrid}>
              <StatPill label="Vida noturna"   value={formatLevel(neighborhood.nightlife)} />
              <StatPill label="Gastronomia"    value={formatLevel(neighborhood.gastronomy)} />
              <StatPill label="Paisagem"       value={formatLevel(neighborhood.scenery)} />
              <StatPill label="A pé"           value={formatLevel(neighborhood.walkable)} />
              <StatPill label="Solo feminino"  value={formatLevel(neighborhood.safety_solo_woman)} />
            </View>
          </View>

          {/* Ver hoteis CTA */}
          <View style={s.ctaSection}>
            <Pressable
              style={s.verHoteisBtn}
              onPress={() => router.back()}
            >
              <Feather name="list" size={15} color="#0A0502" />
              <Text style={s.verHoteisBtnText}>Ver hospedagens</Text>
            </Pressable>

            {neighborhood.google_maps && (
              <Pressable
                style={s.mapsBtn}
                onPress={() => Linking.openURL(neighborhood.google_maps!)}
              >
                <Feather name="map-pin" size={14} color={C.terracotta} />
                <Text style={s.mapsBtnText}>Ver no mapa</Text>
              </Pressable>
            )}
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerL}>L.</Text>
            <Text style={s.footerPhrase}>{neighborhood.identity_phrase}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function formatLevel(val: string): string {
  const m: Record<string, string> = {
    alto:      "Alta",
    media:     "Média",
    baixa:     "Baixa",
    alta:      "Alta",
    muito_alta: "Muito alta",
  };
  return m[val?.toLowerCase()] ?? val ?? "—";
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statPill}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0502" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
  },
  backText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.white,
  },
  topCategory: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 1.5,
  },

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  statusText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.30)",
    textAlign: "center",
  },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: "#0D0805",
  },
  heroInner: { marginBottom: 20 },
  heroName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: C.white,
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 44,
  },
  heroPhrase: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 16,
    color: C.gold,
    letterSpacing: 0.1,
    fontStyle: "italic",
  },
  bestForRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bestForTag: {
    backgroundColor: "rgba(196,112,74,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.25)",
  },
  bestForText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(196,112,74,0.90)",
  },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)" },

  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 18,
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
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.terracotta,
    marginTop: 9,
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    minWidth: 110,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.32)",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.78)",
  },

  ctaSection: { paddingHorizontal: 24, paddingTop: 28, gap: 12 },
  verHoteisBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: C.terracotta,
    borderRadius: 14,
    paddingVertical: 16,
  },
  verHoteisBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#0A0502",
    letterSpacing: 0.2,
  },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.28)",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(196,112,74,0.06)",
  },
  mapsBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: C.terracotta,
    letterSpacing: 0.1,
  },

  footer: {
    marginTop: 36,
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
    color: C.terracotta,
  },
  footerPhrase: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 14,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
    fontStyle: "italic",
  },
});
