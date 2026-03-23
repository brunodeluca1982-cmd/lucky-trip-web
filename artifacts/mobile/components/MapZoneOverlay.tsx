/**
 * MapZoneOverlay
 *
 * Editorial aerial-photo map with invisible hotspot touch areas.
 *
 * Interaction model:
 *   • Tap a hotspot → fake-zoom (scale + translate + dim) + parent receives onHotspotPress
 *   • Tap another  → update zoom to new hotspot + update card
 *   • Tap outside  → reset zoom + onHotspotPress(null)
 *
 * No visible markers, dots, or labels on the map at any time.
 * Zoom is simulated (CSS transform) — no real tile zoom occurs.
 *
 * The floating NeighborhoodCard is rendered at SCREEN level (also exported here)
 * so it can overlap between the map and the scrollable content below.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const MAP_ZONE_W = SCREEN_WIDTH;
// Portrait image fills ~58% of screen height — generous space for card below
export const MAP_ZONE_H = Math.round(SCREEN_HEIGHT * 0.58);

// Touch target size — meets mobile accessibility minimum
const HIT_SIZE = 52;

// Zoom parameters
const ZOOM_SCALE      = 1.38;
const NATIVE_DRIVER   = Platform.OS !== "web";
const SPRING_CFG      = { tension: 45, friction: 9, useNativeDriver: NATIVE_DRIVER } as const;
const TIMING_CFG      = { duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: NATIVE_DRIVER } as const;

// ── Data types ──────────────────────────────────────────────────────────────────

export interface Hotspot {
  id: string;
  name: string;
  description: string;
  tagline: string;
  xPct: number;   // % from left
  yPct: number;   // % from top
  bairros: string[];
}

// ── Rio de Janeiro — hotspot data (portrait image positions) ────────────────────
//
// Positions estimated visually from the portrait aerial photo.
// Upper-left = open ocean. The image shows Rio from SW looking NE.

export const RIO_HOTSPOTS: Hotspot[] = [
  {
    id: "barra",
    name: "Barra da Tijuca",
    description: "Praias extensas, natureza preservada e modernidade à beira-mar — o Rio além do cartão postal.",
    tagline: "Espaço, natureza e tranquilidade",
    xPct: 20, yPct: 16,
    bairros: ["Barra da Tijuca", "São Conrado"],
  },
  {
    id: "cristoredentor",
    name: "Cristo Redentor",
    description: "O símbolo maior do Rio — de lá em cima, a cidade toda se revela de uma vez ao pé da floresta.",
    tagline: "Vista que para o tempo",
    xPct: 34, yPct: 43,
    bairros: ["Corcovado", "Urca"],
  },
  {
    id: "lagoa",
    name: "Lagoa",
    description: "Espelho d'água entre as montanhas e os bairros nobres. Restaurantes flutuantes, pistas de corrida e pôr do sol irreal.",
    tagline: "Para quem prefere o Rio escondido",
    xPct: 50, yPct: 59,
    bairros: ["Lagoa", "Jardim Botânico", "Gávea"],
  },
  {
    id: "leblon",
    name: "Leblon",
    description: "O bairro mais exclusivo do Rio — restaurantes premiados, livrarias e a melhor vista para o Dois Irmãos.",
    tagline: "Ideal para uma estadia sofisticada",
    xPct: 32, yPct: 67,
    bairros: ["Leblon"],
  },
  {
    id: "ipanema",
    name: "Ipanema",
    description: "Boemia, moda e a praia que inspirou a bossa nova. Vibrante de manhã à noite.",
    tagline: "Clássico e imprescindível",
    xPct: 45, yPct: 70,
    bairros: ["Ipanema", "Arpoador"],
  },
  {
    id: "copacabana",
    name: "Copacabana",
    description: "Energia 24 horas, frente de mar icônica e uma mistura única de história e modernidade.",
    tagline: "A experiência carioca completa",
    xPct: 59, yPct: 72,
    bairros: ["Copacabana"],
  },
  {
    id: "centro",
    name: "Centro",
    description: "O coração histórico do Rio — igrejas centenárias, o porto revitalizado e a memória viva da cidade.",
    tagline: "Rio além da praia",
    xPct: 76, yPct: 80,
    bairros: ["Centro", "Lapa", "Santa Teresa", "Botafogo", "Flamengo"],
  },
];

// ── Zoom helper ────────────────────────────────────────────────────────────────

function calcTranslate(hotspot: Hotspot) {
  // Move the map so the hotspot is near the center of the visible frame.
  // Formula: shift by (center - hotspot_pos) * (1 - 1/scale) 
  const cx = MAP_ZONE_W / 2;
  const cy = MAP_ZONE_H / 2;
  const hx = (hotspot.xPct / 100) * MAP_ZONE_W;
  const hy = (hotspot.yPct / 100) * MAP_ZONE_H;
  const factor = 1 - 1 / ZOOM_SCALE;
  return {
    tx: (cx - hx) * factor,
    ty: (cy - hy) * factor,
  };
}

// ── MapZoneOverlay (main export) ────────────────────────────────────────────────

interface MapZoneOverlayProps {
  onBack?: () => void;
  topInset?: number;
  locaisLabel?: string;
  selectedHotspot?: string | null;
  onHotspotPress?: (id: string | null) => void;
  filteredCount?: number;
}

export function MapZoneOverlay({
  onBack,
  topInset = 14,
  locaisLabel,
  selectedHotspot,
  onHotspotPress,
  filteredCount,
}: MapZoneOverlayProps) {
  const controlTop = topInset + 10;

  // ── Animation values ──────────────────────────────────────────────────────
  const mapScale      = useRef(new Animated.Value(1)).current;
  const mapTranslateX = useRef(new Animated.Value(0)).current;
  const mapTranslateY = useRef(new Animated.Value(0)).current;
  const dimOpacity    = useRef(new Animated.Value(0)).current;

  // ── React to selectedHotspot changes ─────────────────────────────────────
  useEffect(() => {
    if (selectedHotspot) {
      const hs = RIO_HOTSPOTS.find((h) => h.id === selectedHotspot);
      if (!hs) return;
      const { tx, ty } = calcTranslate(hs);
      Animated.parallel([
        Animated.spring(mapScale,      { toValue: ZOOM_SCALE, ...SPRING_CFG }),
        Animated.spring(mapTranslateX, { toValue: tx,         ...SPRING_CFG }),
        Animated.spring(mapTranslateY, { toValue: ty,         ...SPRING_CFG }),
        Animated.timing(dimOpacity,    { toValue: 0.30,       ...TIMING_CFG }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(mapScale,      { toValue: 1, ...SPRING_CFG }),
        Animated.spring(mapTranslateX, { toValue: 0, ...SPRING_CFG }),
        Animated.spring(mapTranslateY, { toValue: 0, ...SPRING_CFG }),
        Animated.timing(dimOpacity,    { toValue: 0, ...TIMING_CFG }),
      ]).start();
    }
  }, [selectedHotspot]);

  const activeHotspot = RIO_HOTSPOTS.find((h) => h.id === selectedHotspot) ?? null;
  const badgeLabel =
    activeHotspot && filteredCount !== undefined
      ? `${filteredCount} local${filteredCount !== 1 ? "is" : ""}`
      : locaisLabel;

  return (
    <View style={s.root}>

      {/* ── Zoomable map layer ── */}
      <Animated.View
        style={[
          s.mapInner,
          {
            transform: [
              { translateX: mapTranslateX },
              { translateY: mapTranslateY },
              { scale: mapScale },
            ],
          },
        ]}
      >
        {/* The editorial aerial photo */}
        <Animated.Image
          source={require("../assets/images/map-rio-portrait.png")}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore — resizeMode prop vs style differs per RN version
          resizeMode="cover"
          style={s.mapImage}
        />

        {/* Dim overlay — deepens when any hotspot is active */}
        <Animated.View style={[s.dimOverlay, { opacity: dimOpacity }]} />

        {/* Full-map background Pressable — tap anywhere to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => onHotspotPress?.(null)}
          accessibilityLabel="Fechar bairro"
        />

        {/* Invisible hotspot touch areas (rendered on top of background Pressable) */}
        {RIO_HOTSPOTS.map((hotspot) => {
          const left = (hotspot.xPct / 100) * MAP_ZONE_W - HIT_SIZE / 2;
          const top  = (hotspot.yPct / 100) * MAP_ZONE_H - HIT_SIZE / 2;
          return (
            <Pressable
              key={hotspot.id}
              style={[s.hotspotHit, { left, top }]}
              onPress={() =>
                onHotspotPress?.(
                  hotspot.id === selectedHotspot ? null : hotspot.id
                )
              }
              accessibilityLabel={hotspot.name}
              accessibilityRole="button"
            />
          );
        })}
      </Animated.View>

      {/* ── Controls (above zoom layer, unaffected by transform) ── */}

      {/* Voltar */}
      {onBack && (
        <Pressable
          onPress={onBack}
          style={[s.controlPill, { top: controlTop, left: 16 }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={15} color={C.white} />
          <Text style={s.controlPillText}>Voltar</Text>
        </Pressable>
      )}

      {/* Count badge */}
      <View style={[s.controlPill, { top: controlTop, right: 16 }]}>
        <View style={[s.badgeDot, activeHotspot && s.badgeDotActive]} />
        <Text style={s.controlPillText}>{badgeLabel}</Text>
      </View>

      {/* Hint strip (inside map, bottom) — only when idle */}
      {!activeHotspot && (
        <View style={s.hintStrip}>
          <Feather name="map-pin" size={10} color="rgba(255,255,255,0.32)" />
          <Text style={s.hintText}>Toque num bairro para explorar</Text>
        </View>
      )}
    </View>
  );
}

// ── NeighborhoodCard (exported — rendered at screen level) ────────────────────

export interface NeighborhoodCardProps {
  hotspot: Hotspot;
  filteredCount?: number;
  onVerHoteis?: () => void;
  onPorDentro?: () => void;
  onDismiss?: () => void;
}

export function NeighborhoodCard({
  hotspot,
  filteredCount,
  onVerHoteis,
  onPorDentro,
  onDismiss,
}: NeighborhoodCardProps) {
  return (
    <BlurView
      intensity={Platform.OS === "web" ? 58 : 70}
      tint="light"
      style={nc.card}
    >
      {/* Header: name + X */}
      <View style={nc.header}>
        <Text style={nc.name}>{hotspot.name}</Text>
        <Pressable
          onPress={onDismiss}
          style={nc.dismiss}
          hitSlop={10}
          accessibilityLabel="Fechar"
        >
          <Feather name="x" size={15} color="rgba(24,18,12,0.45)" />
        </Pressable>
      </View>

      <Text style={nc.desc} numberOfLines={2}>
        {hotspot.description}
      </Text>

      <Text style={nc.tagline}>→ {hotspot.tagline}</Text>

      <View style={nc.buttons}>
        <Pressable
          style={({ pressed }) => [nc.btnSolid, pressed && nc.btnSolidPressed]}
          onPress={onVerHoteis}
        >
          <Text style={nc.btnSolidText}>Ver hotéis</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [nc.btnGhost, pressed && nc.btnGhostPressed]}
          onPress={onPorDentro}
        >
          <Text style={nc.btnGhostText}>Por dentro do bairro</Text>
        </Pressable>
      </View>

      {filteredCount !== undefined && (
        <Text style={nc.count}>
          {filteredCount === 0
            ? "Sem locais nesta categoria"
            : `${filteredCount} ${filteredCount === 1 ? "local" : "locais"} selecionado${filteredCount === 1 ? "" : "s"}`}
        </Text>
      )}
    </BlurView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    width: MAP_ZONE_W,
    height: MAP_ZONE_H,
    backgroundColor: "#060810",
    overflow: "hidden",
  },

  // The zoomable layer — transform is applied to this
  mapInner: {
    ...StyleSheet.absoluteFillObject,
  },

  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },

  // Invisible hotspot — just a touch area
  hotspotHit: {
    position: "absolute",
    width: HIT_SIZE,
    height: HIT_SIZE,
    borderRadius: HIT_SIZE / 2,
    backgroundColor: "transparent",
  },

  // Hint strip
  hintStrip: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    pointerEvents: "none",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.30)",
    letterSpacing: 0.3,
  },

  // Control pills (above zoom, fixed position)
  controlPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(6,3,1,0.58)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  controlPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.90)",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.terracotta,
  },
  badgeDotActive: {
    backgroundColor: "#C9A84C",
  },
});

const nc = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.60)",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: "#18120C",
    lineHeight: 30,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  dismiss: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(24,18,12,0.08)",
    borderRadius: 14,
    marginTop: 2,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: "rgba(24,18,12,0.68)",
    lineHeight: 20,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
    color: "rgba(24,18,12,0.45)",
    marginBottom: 16,
    letterSpacing: 0.1,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  btnSolid: {
    flex: 1,
    backgroundColor: "rgba(24,18,12,0.88)",
    borderRadius: 50,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSolidPressed: { backgroundColor: "rgba(24,18,12,0.70)" },
  btnSolidText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  btnGhost: {
    flex: 1,
    backgroundColor: "rgba(24,18,12,0.06)",
    borderRadius: 50,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(24,18,12,0.16)",
  },
  btnGhostPressed: { backgroundColor: "rgba(24,18,12,0.12)" },
  btnGhostText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
    color: "rgba(24,18,12,0.78)",
    letterSpacing: 0.1,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(24,18,12,0.35)",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.2,
  },
});
