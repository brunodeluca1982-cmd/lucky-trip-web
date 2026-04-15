import React, { memo, useCallback } from "react";
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
import { useDestinos } from "@/hooks/useDestinos";
import { RotatingBackground } from "@/components/RotatingBackground";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const H_PAD = 14;
const GAP = 10;
const COLS = 2;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = Math.round(CARD_W * 1.55); // portrait ratio

const SELECTED_ID = "rio";
const MAX_ITEMS = 20;

// ── Skeleton placeholder ────────────────────────────────────────────────────────
function SkeletonCard() {
  return <View style={[s.card, s.skeleton]} />;
}

// ── Memoized card ──────────────────────────────────────────────────────────────
interface DestCardProps {
  id: string;
  cidade: string;
  pais: string;
  heroImageUrl?: string | null;
  selected: boolean;
  lancado: boolean;
}

const DestCard = memo(function DestCard({
  id,
  cidade,
  pais,
  heroImageUrl,
  selected,
  lancado,
}: DestCardProps) {
  const handlePress = useCallback(() => {
    router.push({ pathname: "/cidade/[id]", params: { id } });
  }, [id]);

  const imageUrl = heroImageUrl ?? null;

  if (!imageUrl) {
    console.log("❌ MISSING IMAGE:", id);
  }
  console.log("✅ FINAL IMAGE:", id, imageUrl);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        s.card,
        selected && s.cardSelected,
        !lancado && s.cardComingSoon,
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[{ width: "100%", height: "100%" }, !lancado && { opacity: 0.68 }]}
          resizeMode="cover"
          onError={() => console.log(`[IMAGE] load error for ${id}`)}
        />
      ) : (
        <View style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />
      )}

      {/* Bottom gradient — bottom 45% only */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.88)"]}
        locations={[0.40, 0.68, 1]}
        style={s.cardGradient}
      />

      {/* Selected badge */}
      {selected && (
        <View style={s.checkBadge}>
          <Feather name="check" size={10} color="#000000" />
        </View>
      )}

      {/* Em breve badge */}
      {!lancado && (
        <View style={s.comingSoonBadge}>
          <Text style={s.comingSoonText}>Em breve</Text>
        </View>
      )}

      {/* Labels — bottom-left */}
      <View style={s.cardInfo}>
        <Text style={s.cardCidade} numberOfLines={2}>
          {cidade}
        </Text>
        <Text style={s.cardPais} numberOfLines={1}>
          {pais}
        </Text>
      </View>
    </Pressable>
  );
});

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function DestinosScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { destinos, loading } = useDestinos();
  const [query, setQuery] = React.useState("");

  const filtered = (
    query.trim()
      ? destinos.filter(
          (d) =>
            d.cidade.toLowerCase().includes(query.toLowerCase()) ||
            d.pais.toLowerCase().includes(query.toLowerCase())
        )
      : destinos
  ).slice(0, MAX_ITEMS);

  const rows: typeof filtered[] = [];
  for (let i = 0; i < filtered.length; i += COLS) {
    rows.push(filtered.slice(i, i + COLS));
  }

  const showSkeleton = loading && destinos.length === 0;

  return (
    <View style={s.root}>
      {/* Full-screen atmospheric background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <RotatingBackground />
        <LinearGradient
          colors={["rgba(0,0,0,0.74)", "rgba(0,0,0,0.66)", "rgba(0,0,0,0.86)"]}
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
        {/* Header */}
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

        {/* Search bar */}
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

        {/* Grid */}
        {showSkeleton ? (
          <View style={s.grid}>
            {[0, 1].map((ri) => (
              <View key={ri} style={s.row}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ))}
          </View>
        ) : rows.length > 0 ? (
          <View style={s.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={s.row}>
                {row.map((d) => (
                  <DestCard
                    key={d.id}
                    id={d.id}
                    cidade={d.cidade}
                    pais={d.pais}
                    heroImageUrl={d.image}
                    selected={d.id === SELECTED_ID}
                    lancado={d.lancado}
                  />
                ))}
                {/* Fill trailing empty slot in last row */}
                {row.length < COLS &&
                  Array.from({ length: COLS - row.length }).map((_, i) => (
                    <View key={`fill-${i}`} style={{ width: CARD_W }} />
                  ))}
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
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: H_PAD,
  },

  // Header
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
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 38,
    letterSpacing: -0.4,
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

  // Search
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
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFFFFF",
    padding: 0,
  },

  // Grid — 2 columns
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },

  // Card
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111111",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  skeleton: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
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
    paddingBottom: 14,
    gap: 3,
  },
  cardCidade: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  cardPais: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 15,
  },

  // Coming soon
  cardComingSoon: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  comingSoonBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  comingSoonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.4,
  },

  // Empty state
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
