import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useBackground } from "@/context/BackgroundContext";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 1.1);

interface HeroItem {
  id: string;
  cidade: string;
  pais: string;
  badge: string;
  image: ImageSourcePropType | null;
  cityId?: string;
  route?: string;
}

interface HeroCarouselProps {
  items: HeroItem[];
  onIndexChange?: (index: number) => void;
}

function HeroSlide({ item }: { item: HeroItem }) {
  // ── Image resolution priority ─────────────────────────────────────────────
  // 1. Rio items → BackgroundContext.pool (Cloudinary + local fallback)
  // 2. Non-Rio with photo_url → { uri: item.image }
  // 3. null → premium placeholder (dark gradient card)
  const { pool, currentIdx } = useBackground();

  const usePool = item.cityId === "rio" && !item.route && pool.length > 0;
  const imageSource: ImageSourcePropType | null = usePool
    ? pool[currentIdx]
    : item.image ?? null;

  return (
    <Pressable
      style={({ pressed }) => [styles.slide, pressed && { opacity: 0.94 }]}
      onPress={() => {
        if (!item.cityId) return;
        if (item.cityId !== "rio") {
          Alert.alert(
            "Em breve disponível",
            "Estamos preparando esse destino com o cuidado do The Lucky Trip",
            [{ text: "OK" }]
          );
          return;
        }
        if (item.route) {
          router.push(item.route as any);
        } else {
          router.push({ pathname: "/cidade/[id]", params: { id: item.cityId } });
        }
      }}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
      ) : (
        // Premium placeholder — dark warm background when no image available
        <View style={[styles.image, styles.placeholder]} />
      )}
      <View style={styles.dimOverlay} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.50)", "rgba(0,0,0,0.88)"]}
        style={styles.gradient}
        locations={[0.20, 0.58, 1]}
      />
      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
        <Text style={styles.cidade}>{item.cidade}</Text>
        <Text style={styles.pais}>{item.pais}</Text>
      </View>
    </Pressable>
  );
}

export function HeroCarousel({ items, onIndexChange }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index;
        setActiveIndex(idx);
        onIndexChangeRef.current?.(idx);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useEffect(() => {
    const len = items.length;
    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % len;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        onIndexChangeRef.current?.(next);
        return next;
      });
    }, 4000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [items.length]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <HeroSlide item={item} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      <View style={styles.dots}>
        {items.map((item, i) => (
          <View
            key={item.id}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  image: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  placeholder: {
    backgroundColor: "#1A0E04",
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.80,
  },
  content: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  badgeContainer: {
    backgroundColor: "rgba(212,175,55,0.14)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  badgeText: {
    color: "#D4AF37",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  cidade: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 46,
    color: C.white,
    textAlign: "center",
    lineHeight: 54,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.90)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  pais: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.80)",
    marginTop: 6,
    marginBottom: 24,
    letterSpacing: 3,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.70)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dots: {
    position: "absolute",
    bottom: 38,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  dotActive: {
    backgroundColor: "#D4AF37",
    width: 26,
    height: 5,
    borderRadius: 2.5,
  },
});
