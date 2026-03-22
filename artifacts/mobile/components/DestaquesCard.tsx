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
import { Tag } from "./Tag";
import Colors from "@/constants/colors";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DestaquesCardProps {
  titulo: string;
  localizacao: string;
  categoria: string;
  image: ImageSourcePropType;
}

export function DestaquesCard({
  titulo,
  localizacao,
  categoria,
  image,
}: DestaquesCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.92, transform: [{ scale: 0.987 }] },
      ]}
    >
      <Image source={image} style={styles.image} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.78)"]}
        style={styles.gradient}
        locations={[0.2, 1]}
      />
      <View style={styles.overlay}>
        <View style={styles.tagRow}>
          <Tag label={localizacao} type="location" />
          <Tag label={categoria} type="category" />
        </View>
        <Text style={styles.titulo} numberOfLines={2}>
          {titulo}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 48,
    height: 220,
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
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
    height: "70%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 8,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
  },
  titulo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 28,
  },
});
