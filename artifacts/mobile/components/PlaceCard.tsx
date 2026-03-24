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
import { BookmarkButton } from "@/components/BookmarkButton";
import type { SavedCategory } from "@/context/GuiaContext";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PlaceCardProps {
  id?: string;
  saveCategoria?: SavedCategory;
  titulo: string;
  localizacao?: string;
  categoria?: string;
  descricao?: string;
  image: ImageSourcePropType;
  size?: "small" | "medium" | "large";
  variant?: "default" | "horizontal" | "secret";
}

export function PlaceCard({
  id,
  saveCategoria,
  titulo,
  localizacao,
  categoria,
  descricao,
  image,
  size = "medium",
  variant = "default",
}: PlaceCardProps) {
  const cardWidth =
    size === "small"
      ? SCREEN_WIDTH * 0.44
      : size === "large"
      ? SCREEN_WIDTH - 48
      : SCREEN_WIDTH * 0.56;

  const cardHeight =
    size === "small"
      ? cardWidth * 1.25
      : size === "large"
      ? cardWidth * 0.72
      : cardWidth * 1.18;

  const showBookmark = !!id && !!saveCategoria && !!localizacao;

  if (variant === "secret") {
    return (
      <Pressable style={[styles.secretCard, { width: SCREEN_WIDTH - 48 }]}>
        <Image source={image} style={styles.secretImage} resizeMode="cover" />
        <View style={styles.secretContent}>
          {localizacao ? (
            <View style={styles.tagRow}>
              <Tag label={localizacao} type="location" />
            </View>
          ) : null}
          <Text style={styles.secretTitle}>{titulo}</Text>
          {descricao ? <Text style={styles.secretDesc}>{descricao}</Text> : null}
        </View>
        {showBookmark && (
          <View style={styles.secretBookmark}>
            <BookmarkButton
              item={{
                id: id!,
                titulo,
                localizacao: localizacao!,
                image,
                categoria: saveCategoria!,
              }}
            />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, height: cardHeight },
        pressed && { opacity: 0.93, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Image source={image} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.72)"]}
        style={styles.gradient}
        locations={[0.35, 1]}
      />
      <View style={styles.overlay}>
        <View style={styles.tagRow}>
          {localizacao ? <Tag label={localizacao} type="location" /> : null}
          {categoria ? <Tag label={categoria} type="category" /> : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {titulo}
        </Text>
      </View>
      {showBookmark && (
        <View style={styles.bookmark}>
          <BookmarkButton
            item={{
              id: id!,
              titulo,
              localizacao: localizacao!,
              image,
              categoria: saveCategoria!,
            }}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.sand,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
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
    height: "65%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 6,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  title: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 16,
    color: C.white,
    lineHeight: 21,
  },
  bookmark: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  secretCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.white,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  secretImage: {
    width: 100,
    height: 112,
    resizeMode: "cover",
  },
  secretContent: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-start",
    gap: 6,
  },
  secretTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 16,
    color: C.darkBrown,
    lineHeight: 21,
  },
  secretDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    lineHeight: 18,
  },
  secretBookmark: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});
