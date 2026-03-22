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

const TIPO_CONFIG: Record<
  DestaqueType,
  {
    label: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    pill: string;
    pillText: string;
    gradientColors: [string, string, string];
    gradientLocations: [number, number, number];
    height: number;
  }
> = {
  oQueFazer: {
    label: "O que fazer",
    icon: "sun",
    pill: "rgba(255,255,255,0.18)",
    pillText: C.white,
    gradientColors: ["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.82)"],
    gradientLocations: [0.15, 0.55, 1],
    height: 240,
  },
  restaurante: {
    label: "Restaurante",
    icon: "coffee",
    pill: "rgba(201,168,76,0.28)",
    pillText: "#F5E4A8",
    gradientColors: ["transparent", "rgba(30,15,0,0.32)", "rgba(30,15,0,0.88)"],
    gradientLocations: [0.15, 0.5, 1],
    height: 260,
  },
  hotel: {
    label: "Hotel",
    icon: "moon",
    pill: "rgba(255,255,255,0.14)",
    pillText: C.white,
    gradientColors: ["transparent", "rgba(20,30,50,0.35)", "rgba(20,30,50,0.9)"],
    gradientLocations: [0.2, 0.52, 1],
    height: 240,
  },
  lucky: {
    label: "Lucky Pick",
    icon: "star",
    pill: "rgba(201,168,76,0.32)",
    pillText: "#F5E4A8",
    gradientColors: ["transparent", "rgba(44,24,16,0.28)", "rgba(44,24,16,0.85)"],
    gradientLocations: [0.15, 0.5, 1],
    height: 260,
  },
};

interface DestaquesCardProps {
  titulo: string;
  localizacao: string;
  descricao: string;
  tipo: DestaqueType;
  image: ImageSourcePropType;
}

export function DestaquesCard({
  titulo,
  localizacao,
  descricao,
  tipo,
  image,
}: DestaquesCardProps) {
  const config = TIPO_CONFIG[tipo];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { height: config.height },
        pressed && { opacity: 0.93, transform: [{ scale: 0.988 }] },
      ]}
    >
      <Image source={image} style={styles.image} />

      <LinearGradient
        colors={config.gradientColors}
        style={styles.gradient}
        locations={config.gradientLocations}
      />

      {/* Category chip — top left */}
      <View style={styles.topRow}>
        <View style={[styles.categoryPill, { backgroundColor: config.pill }]}>
          <Feather name={config.icon} size={10} color={config.pillText} />
          <Text style={[styles.categoryLabel, { color: config.pillText }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Bottom editorial block */}
      <View style={styles.bottomBlock}>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={10} color="rgba(255,255,255,0.6)" />
          <Text style={styles.location}>{localizacao}</Text>
        </View>
        <Text style={styles.titulo} numberOfLines={2}>
          {titulo}
        </Text>
        <Text style={styles.descricao} numberOfLines={2}>
          {descricao}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 48,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  topRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignSelf: "flex-start",
  },
  categoryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  bottomBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    gap: 5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  location: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
    marginTop: 2,
  },
});
