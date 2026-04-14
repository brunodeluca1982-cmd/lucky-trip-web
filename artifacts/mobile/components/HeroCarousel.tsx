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
import type { HeroComposedItem, HeroRoute } from "@/hooks/useHeroComposed";
import { useBackground } from "@/context/BackgroundContext";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 1.1);

interface HeroCarouselProps {
  items: HeroComposedItem[];
  onIndexChange?: (index: number) => void;
}

// ── Navigation handler — one function per route type ─────────────────────────
function navigateHeroRoute(route: HeroRoute) {
  switch (route.type) {
    case "lugar":
      router.push({
        pathname: "/lugar/[cityId]/[placeId]",
        params: {
          cityId:       route.cityId,
          placeId:      route.placeId,
          source_table: route.source_table,
        },
      });
      break;
    case "friend":
      router.push({
        pathname: "/friend/[slug]",
        params: { slug: route.slug },
      });
      break;
    case "cidade":
      router.push({
        pathname: "/cidade/[id]",
        params: { id: route.id },
      });
      break;
    case "comingsoon":
      router.push({
        pathname: "/comingsoon/[slug]",
        params: { slug: route.slug },
      });
      break;
  }
}

// ── Single slide ──────────────────────────────────────────────────────────────
function HeroSlide({
  item,
  overrideSource,
}: {
  item: HeroComposedItem;
  overrideSource?: ImageSourcePropType;
}) {
  // overrideSource: used for the Rio card to sync with the background pool frame.
  // Fallback: entity's own photo_url. null → premium dark placeholder.
  const imageSource: ImageSourcePropType | null =
    overrideSource ?? (item.photo_url ? { uri: item.photo_url } : null);

  return (
    <Pressable
      style={({ pressed }) => [styles.slide, pressed && { opacity: 0.94 }]}
      onPress={() => navigateHeroRoute(item.route)}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onError={() =>
            console.log(`[IMAGE] source: fallback (load error) | id: ${item.id}`)
          }
        />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}

      {/* Subtle dim layer */}
      <View style={styles.dimOverlay} />

      {/* Bottom gradient */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.50)", "rgba(0,0,0,0.88)"]}
        style={styles.gradient}
        locations={[0.20, 0.58, 1]}
      />

      {/* Text content */}
      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
        <Text style={styles.cidade}>{item.titulo}</Text>
        <Text style={styles.pais}>{item.localizacao}</Text>
      </View>
    </Pressable>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────
export function HeroCarousel({ items, onIndexChange }: HeroCarouselProps) {
  const { pool, currentIdx } = useBackground();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onIndexChangeRef = useRef(onIndexChange);
onIndexChangeRef.current = onIndexChange;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setActiveIndex(idx);
        onIndexChangeRef.current?.(idx);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useEffect(() => {
    if (items.length <= 1) return;
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

  if (items.length === 0) return null;

  let safeItems = [...items];

  const hasRio = safeItems.some(
    item =>
      item.source_table === "destinos" &&
      item.titulo === "Rio de Janeiro"
  );

  if (!hasRio) {
    safeItems.unshift({
      id:           "rio-fixed",
      titulo:       "Rio de Janeiro",
      source_table: "destinos",
      localizacao:  "Brasil",
      badge:        "Destino",
      photo_url:    null,
      route:        { type: "cidade", id: "rio-de-janeiro" },
    });
    console.log("[HERO FIX] Rio injected manually");
  }

  const finalItems = [...safeItems];
  const rioIndex = finalItems.findIndex(
    item =>
      item.source_table === "destinos" &&
      item.titulo === "Rio de Janeiro"
  );
  if (rioIndex > -1) {
    const [rioItem] = finalItems.splice(rioIndex, 1);
    finalItems.unshift(rioItem);
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={finalItems}
        keyExtractor={(item) => `${item.source_table}-${item.id}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <HeroSlide
            item={item}
            overrideSource={
              index === 0 && item.source_table === "destinos"
                ? pool[currentIdx]
                : undefined
            }
          />
        )}
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
        {finalItems.map((item, i) => (
          <View
            key={`dot-${item.source_table}-${item.id}`}
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
