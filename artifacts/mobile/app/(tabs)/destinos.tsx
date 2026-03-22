import React from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { DestinationCard } from "@/components/DestinationCard";
import { FeaturedDestinationCard } from "@/components/FeaturedDestinationCard";
import Colors from "@/constants/colors";
import { destinos } from "@/data/mockData";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 12;
const GAP = 6;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - GAP * 2) / 3;

const featured = destinos[0]; // Rio de Janeiro
const grid = destinos.slice(1);  // Remaining 11

export default function DestinosScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const rows: (typeof grid)[] = [];
  for (let i = 0; i < grid.length; i += 3) {
    rows.push(grid.slice(i, i + 3));
  }

  function navigate(id: string) {
    router.push({ pathname: "/cidade/[id]", params: { id } });
  }

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 4, paddingBottom: bottomPad + 96 },
        ]}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>Destinos</Text>
          <Text style={s.subtitle}>
            Explore lugares selecionados ao redor do mundo
          </Text>
          <Text style={s.microcopy}>
            Lugares escolhidos a dedo, com base no momento
          </Text>
        </View>

        {/* ── Search — minimal, intentionally understated ── */}
        <View style={s.searchBar}>
          <Feather name="search" size={15} color={C.warmGray} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar destinos"
            placeholderTextColor={C.warmGray}
            editable={false}
            pointerEvents="none"
          />
        </View>

        {/* ── Featured destination — the cover story ── */}
        <View style={s.featuredWrap}>
          <FeaturedDestinationCard
            cidade={featured.cidade}
            pais={featured.pais}
            descricao={featured.descricao}
            image={featured.image}
            onPress={() => navigate(featured.id)}
          />
        </View>

        {/* ── Section separator ── */}
        <View style={s.sectionDivider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerLabel}>Mais destinos</Text>
          <View style={s.dividerLine} />
        </View>

        {/* ── Secondary grid ── */}
        <View style={s.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((d) => (
                <DestinationCard
                  key={d.id}
                  cidade={d.cidade}
                  pais={d.pais}
                  image={d.image}
                  onPress={() => navigate(d.id)}
                />
              ))}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, i) => (
                  <View key={`empty-${i}`} style={{ width: CARD_W }} />
                ))}
            </View>
          ))}
        </View>

        {/* ── Editorial footer ── */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria de destinos para viajantes com bom gosto.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  content: {
    paddingHorizontal: H_PAD,
  },

  // Header
  header: {
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 5,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: C.darkBrown,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    lineHeight: 20,
  },
  microcopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.terracotta,
    lineHeight: 17,
    letterSpacing: 0.1,
    fontStyle: "italic",
    marginTop: 2,
  },

  // Search — deliberately subtle so it doesn't dominate
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: 12,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.darkBrown,
    padding: 0,
  },

  // Featured
  featuredWrap: {
    marginBottom: 28,
  },

  // Section separator
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.warmGray,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Grid
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },

  // Footer
  footer: {
    marginTop: 36,
    marginHorizontal: 12,
    paddingTop: 20,
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
    maxWidth: 220,
  },
});
