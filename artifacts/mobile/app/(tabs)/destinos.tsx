import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { destinos } from "@/data/mockData";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const H_PAD = 16;
const GAP = 10;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;
const CARD_H = CARD_W * 1.28;

// The "selected" destination (Rio is the active curated pick)
const SELECTED_ID = "rio";

export default function DestinosScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? destinos.filter(
        (d) =>
          d.cidade.toLowerCase().includes(query.toLowerCase()) ||
          d.pais.toLowerCase().includes(query.toLowerCase())
      )
    : destinos;

  // Build rows of 2
  const rows: (typeof destinos)[] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }

  function navigate(id: string) {
    router.push({ pathname: "/cidade/[id]", params: { id } });
  }

  return (
    <View style={s.root}>
      {/* ── Full-screen atmospheric background — declared first so it sits behind ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={destinos[0].image}
          style={s.bgImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(8,4,2,0.84)", "rgba(8,4,2,0.76)", "rgba(8,4,2,0.90)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.scroll,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 96 },
        ]}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Vai pra onde?</Text>
            <Text style={s.subtitle}>
              Descubra lugares autênticos vividos pelo Bruno
            </Text>
          </View>
          <Pressable style={s.profileBtn} hitSlop={8}>
            <Feather name="user" size={20} color="rgba(255,255,255,0.80)" />
          </Pressable>
        </View>

        {/* ── Search bar — glassmorphism ── */}
        <View style={s.searchWrap}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.50)" />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar cidade, país..."
            placeholderTextColor="rgba(255,255,255,0.38)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={15} color="rgba(255,255,255,0.45)" />
            </Pressable>
          )}
        </View>

        {/* ── Grid ── */}
        {rows.length > 0 ? (
          <View style={s.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={s.row}>
                {row.map((d) => {
                  const selected = d.id === SELECTED_ID;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => navigate(d.id)}
                      style={({ pressed }) => [
                        s.card,
                        selected && s.cardSelected,
                        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Image source={d.image} style={s.cardImage} resizeMode="cover" />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.20)", "rgba(0,0,0,0.82)"]}
                        locations={[0.3, 0.6, 1]}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Selected badge */}
                      {selected && (
                        <View style={s.checkBadge}>
                          <Feather name="check" size={12} color="#2C1810" />
                        </View>
                      )}

                      {/* Card info */}
                      <View style={s.cardInfo}>
                        <Text style={s.cardCidade} numberOfLines={1}>
                          {d.cidade}
                        </Text>
                        <Text style={s.cardPais} numberOfLines={1}>
                          {d.pais}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {/* Spacer if odd row */}
                {row.length === 1 && <View style={{ width: CARD_W }} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={s.empty}>
            <Feather name="map-pin" size={28} color="rgba(255,255,255,0.30)" />
            <Text style={s.emptyText}>Nenhum destino encontrado</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080402",
  },
  bgImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    opacity: 0.55,
  },

  scroll: {
    paddingHorizontal: H_PAD,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 19,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  // ── Search ──
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFFFFF",
    padding: 0,
  },

  // ── Grid ──
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A120A",
  },
  cardSelected: {
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 13,
    gap: 3,
  },
  cardCidade: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  cardPais: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 15,
  },

  // ── Empty state ──
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.40)",
  },
});
