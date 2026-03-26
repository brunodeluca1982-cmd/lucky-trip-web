import React, { useEffect, useRef, useState } from "react";
import {
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

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 1.1);

interface HeroItem {
  id: string;
  cidade: string;
  pais: string;
  badge: string;
  image: ImageSourcePropType;
  cityId?: string;
}

interface HeroCarouselProps {
  items: HeroItem[];
  onIndexChange?: (index: number) => void;
}

function HeroSlide({ item }: { item: HeroItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.slide, pressed && { opacity: 0.94 }]}
      onPress={() => item.cityId && router.push({ pathname: "/cidade/[id]", params: { id: item.cityId } })}
    >
      <Image source={item.image} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.72)"]}
        style={styles.gradient}
        locations={[0.3, 0.6, 1]}
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

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index;
        setActiveIndex(idx);
        onIndexChange?.(idx);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useEffect(() => {
    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        onIndexChange?.(next);
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
        {items.map((_, i) => (
          <View
            key={i}
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
    resizeMode: "cover",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.7,
  },
  content: {
    position: "absolute",
    bottom: 68,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  badgeContainer: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  badgeText: {
    color: C.white,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cidade: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 42,
    color: C.white,
    textAlign: "center",
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  pais: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.82)",
    marginTop: 4,
    marginBottom: 24,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  dots: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: C.white,
    width: 22,
    borderRadius: 3,
  },
});
