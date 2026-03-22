import React from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import type { DestaqueType } from "@/data/mockData";
import Colors from "@/constants/colors";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = SCREEN_WIDTH - 48;

interface CardProps {
  titulo: string;
  localizacao: string;
  descricao: string;
  image: ImageSourcePropType;
  onPress?: () => void;
}

// ─── Layout A: O que fazer ─────────────────────────────────────────────────
// Tall cinematic frame. Category is a numbered editorial counter.
// Gradient lives only in the bottom 55%. Photo breathes at top.
function OQueFazerCard({ titulo, localizacao, descricao, image }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        la.card,
        pressed && { opacity: 0.93, transform: [{ scale: 0.988 }] },
      ]}
    >
      <Image source={image} style={styles.image} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.88)"]}
        locations={[0.3, 0.48, 1]}
        style={styles.gradientBottom}
      />

      {/* Top-right editorial counter */}
      <View style={la.counter}>
        <Text style={la.counterNum}>01</Text>
        <View style={la.counterLine} />
      </View>

      {/* Bottom block */}
      <View style={la.bottom}>
        <Text style={la.categoryLabel}>O QUE FAZER</Text>
        <Text style={la.titulo}>{titulo}</Text>
        <View style={la.locationRow}>
          <View style={la.locationDot} />
          <Text style={la.location}>{localizacao}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const la = StyleSheet.create({
  card: {
    width: CARD_W,
    height: 300,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 7,
  },
  counter: {
    position: "absolute",
    top: 18,
    right: 18,
    alignItems: "flex-end",
    gap: 4,
  },
  counterNum: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1,
  },
  counterLine: {
    width: 20,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 22,
    gap: 7,
  },
  categoryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2.5,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
  },
  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    color: C.white,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  locationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.terracotta,
  },
  location: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.4,
  },
});

// ─── Layout B: Restaurante ────────────────────────────────────────────────
// More intimate height. Warm amber gradient tint.
// Category: thin horizontal rule that sits above the title — magazine section divider.
function RestauranteCard({ titulo, localizacao, descricao, image }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        lb.card,
        pressed && { opacity: 0.93, transform: [{ scale: 0.988 }] },
      ]}
    >
      <Image source={image} style={styles.image} />
      {/* Warm amber tint layer */}
      <View style={lb.tintLayer} />
      <LinearGradient
        colors={["transparent", "rgba(40,18,4,0.5)", "rgba(40,18,4,0.94)"]}
        locations={[0.2, 0.55, 1]}
        style={styles.gradientBottom}
      />

      {/* Top-right label: subtle, italic feel */}
      <View style={lb.topRight}>
        <Text style={lb.topRightText}>Restaurante</Text>
      </View>

      {/* Bottom block with rule separator */}
      <View style={lb.bottom}>
        <View style={lb.rule} />
        <Text style={lb.titulo}>{titulo}</Text>
        <Text style={lb.descricao} numberOfLines={1}>{descricao}</Text>
        <Text style={lb.location}>{localizacao}</Text>
      </View>
    </Pressable>
  );
}

const lb = StyleSheet.create({
  card: {
    width: CARD_W,
    height: 226,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#2A1000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  tintLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(180,90,20,0.07)",
  },
  topRight: {
    position: "absolute",
    top: 16,
    right: 18,
  },
  topRightText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 20,
    gap: 6,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(201,168,76,0.45)",
    marginBottom: 6,
    width: 36,
  },
  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  descricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
  },
  location: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#F5D98A",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
});

// ─── Layout C: Hotel ──────────────────────────────────────────────────────
// Expansive tall card. Deep vignette. Title is massive.
// Category: a paired `· Hotel ·` centered motif at top.
function HotelCard({ titulo, localizacao, descricao, image }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        lc.card,
        pressed && { opacity: 0.93, transform: [{ scale: 0.988 }] },
      ]}
    >
      <Image source={image} style={styles.image} />
      {/* Deep vignette: top + bottom */}
      <LinearGradient
        colors={["rgba(12,18,32,0.55)", "transparent"]}
        locations={[0, 0.4]}
        style={styles.gradientTop}
      />
      <LinearGradient
        colors={["transparent", "rgba(12,18,32,0.55)", "rgba(12,18,32,0.92)"]}
        locations={[0.3, 0.62, 1]}
        style={styles.gradientBottom}
      />

      {/* Top category centered */}
      <View style={lc.topCenter}>
        <Text style={lc.categoryText}>· HOTEL ·</Text>
      </View>

      {/* Bottom block */}
      <View style={lc.bottom}>
        <Text style={lc.titulo}>{titulo}</Text>
        <View style={lc.locationRow}>
          <View style={lc.badge}>
            <Text style={lc.badgeText}>Luxo</Text>
          </View>
          <Text style={lc.location}>{localizacao}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const lc = StyleSheet.create({
  card: {
    width: CARD_W,
    height: 276,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#0C1220",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  topCenter: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  categoryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 22,
    gap: 10,
  },
  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: C.white,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.5,
  },
  location: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
});

// ─── Layout D: Lucky Pick ─────────────────────────────────────────────────
// A colored accent stripe at the very top edge (brand mark).
// Smaller height, warmer mood.
// Category sits beside a star, all in amber.
function LuckyCard({ titulo, localizacao, descricao, image }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        ld.card,
        pressed && { opacity: 0.93, transform: [{ scale: 0.988 }] },
      ]}
    >
      <Image source={image} style={styles.image} />
      <LinearGradient
        colors={["transparent", "rgba(44,22,8,0.44)", "rgba(44,22,8,0.9)"]}
        locations={[0.2, 0.55, 1]}
        style={styles.gradientBottom}
      />

      {/* Gold accent stripe at very top */}
      <View style={ld.accentStripe} />

      {/* Lucky label beside stripe */}
      <View style={ld.topLabel}>
        <Feather name="star" size={10} color={C.gold} />
        <Text style={ld.topLabelText}>Lucky Pick</Text>
      </View>

      {/* Bottom block */}
      <View style={ld.bottom}>
        <Text style={ld.titulo}>{titulo}</Text>
        <Text style={ld.descricao} numberOfLines={2}>{descricao}</Text>
        <View style={ld.locationRow}>
          <Text style={ld.location}>{localizacao}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const ld = StyleSheet.create({
  card: {
    width: CARD_W,
    height: 248,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#2C1608",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 6,
  },
  accentStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.gold,
  },
  topLabel: {
    position: "absolute",
    top: 14,
    left: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  topLabelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: C.gold,
    letterSpacing: 0.8,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 20,
    gap: 5,
  },
  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: C.white,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  descricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 18,
  },
  locationRow: {
    marginTop: 4,
  },
  location: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,210,100,0.8)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});

// ─── Shared styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradientBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  gradientTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "45%",
  },
});

// ─── Public component ──────────────────────────────────────────────────────
interface DestaquesCardProps {
  titulo: string;
  localizacao: string;
  descricao: string;
  tipo: DestaqueType;
  image: ImageSourcePropType;
}

export function DestaquesCard(props: DestaquesCardProps) {
  const { tipo, ...rest } = props;
  switch (tipo) {
    case "oQueFazer":
      return <OQueFazerCard {...rest} />;
    case "restaurante":
      return <RestauranteCard {...rest} />;
    case "hotel":
      return <HotelCard {...rest} />;
    case "lucky":
      return <LuckyCard {...rest} />;
  }
}
