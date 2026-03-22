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
import Colors from "@/constants/colors";
import { destinos } from "@/data/mockData";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 12;
const GAP = 6;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - GAP * 2) / 3;

export default function DestinosScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const rows: (typeof destinos)[] = [];
  for (let i = 0; i < destinos.length; i += 3) {
    rows.push(destinos.slice(i, i + 3));
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
        </View>

        {/* ── Search ── */}
        <View style={s.searchBar}>
          <Feather name="search" size={16} color={C.warmGray} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar destinos"
            placeholderTextColor={C.warmGray}
            editable={false}
            pointerEvents="none"
          />
        </View>

        {/* ── Grid ── */}
        <View style={s.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((d) => (
                <DestinationCard
                  key={d.id}
                  cidade={d.cidade}
                  pais={d.pais}
                  image={d.image}
                  featured={d.id === "rio"}
                  onPress={() =>
                    router.push({
                      pathname: "/cidade/[id]",
                      params: { id: d.id },
                    })
                  }
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
  header: {
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 4,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: C.darkBrown,
    padding: 0,
  },
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
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
