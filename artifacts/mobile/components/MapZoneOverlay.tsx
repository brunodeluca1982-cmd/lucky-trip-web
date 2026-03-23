/**
 * MapZoneOverlay
 *
 * Illustrated map with neighborhood hotspot pins.
 *
 * Tap a hotspot → glow pulse, parent receives `onHotspotPress`.
 * Tap same hotspot → deselect (toggle).
 *
 * The floating neighborhood card is rendered at the SCREEN level
 * (NeighborhoodCard, also exported from this file) so it can overlap
 * both the map and the scrollable content below — no layout constraint.
 *
 * No visible outlines or bounding boxes on the map.
 */

import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
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
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MAP_ASPECT = 512 / 288;
export const MAP_ZONE_W = SCREEN_WIDTH;
export const MAP_ZONE_H = Math.round(MAP_ZONE_W / MAP_ASPECT);

const HIT_SIZE     = 44;   // meets accessibility minimum
const DOT_INACTIVE = 5;
const DOT_ACTIVE   = 8;
const GLOW_SIZE    = 26;

// ── Data types ──────────────────────────────────────────────────────────────────

export interface Hotspot {
  id: string;
  name: string;
  description: string;
  tagline: string;
  xPct: number;
  yPct: number;
  bairros: string[];
}

interface FloatingLabel {
  text: string;
  xPct: number;
  yPct: number;
  width: number;
}

// ── Rio de Janeiro — hotspot data ───────────────────────────────────────────────

export const RIO_HOTSPOTS: Hotspot[] = [
  {
    id: "leblon",
    name: "Leblon",
    description:
      "O bairro mais exclusivo do Rio — restaurantes premiados, livrarias e a melhor vista para o Dois Irmãos.",
    tagline: "Ideal para uma estadia sofisticada",
    xPct: 39, yPct: 72,
    bairros: ["Leblon"],
  },
  {
    id: "ipanema",
    name: "Ipanema",
    description:
      "Boemia, moda e a praia que inspirou a bossa nova. Vibrante de manhã à noite.",
    tagline: "Clássico e imprescindível",
    xPct: 48, yPct: 72,
    bairros: ["Ipanema", "Arpoador"],
  },
  {
    id: "copacabana",
    name: "Copacabana",
    description:
      "Energia 24 horas, frente de mar icônica e uma mistura única de história e modernidade.",
    tagline: "A experiência carioca completa",
    xPct: 62, yPct: 71,
    bairros: ["Copacabana"],
  },
  {
    id: "gavea",
    name: "Gávea",
    description:
      "Recanto intelectual do Rio — jardins, cachoeiras escondidas e gastronomia intimista.",
    tagline: "Para quem prefere o Rio escondido",
    xPct: 45, yPct: 50,
    bairros: ["Gávea", "Jardim Botânico", "Lagoa"],
  },
  {
    id: "botafogo",
    name: "Botafogo",
    description:
      "Jovem e criativo, com bares alternativos, cinemas e vista privilegiada para o Pão de Açúcar.",
    tagline: "Jovem e vibrante, fora do óbvio",
    xPct: 60, yPct: 47,
    bairros: ["Botafogo", "Urca", "Santa Teresa", "Lapa", "Flamengo", "Centro"],
  },
  {
    id: "barra",
    name: "Barra da Tijuca",
    description:
      "Praias extensas, natureza preservada e modernidade à beira-mar — o Rio além do cartão postal.",
    tagline: "Espaço, natureza e tranquilidade",
    xPct: 13, yPct: 73,
    bairros: ["Barra da Tijuca", "São Conrado"],
  },
];

// Orientation labels — no interaction
const RIO_LABELS: FloatingLabel[] = [
  { text: "BARRA DA TIJUCA",  xPct: 11, yPct: 67, width: 110 },
  { text: "SÃO CONRADO",      xPct: 27, yPct: 74, width: 90  },
  { text: "LEBLON",           xPct: 38, yPct: 61, width: 68  },
  { text: "IPANEMA",          xPct: 48, yPct: 61, width: 68  },
  { text: "COPACABANA",       xPct: 62, yPct: 60, width: 90  },
  { text: "LAGOA",            xPct: 51, yPct: 52, width: 58  },
  { text: "CRISTO REDENTOR",  xPct: 34, yPct: 20, width: 110 },
  { text: "CENTRO",           xPct: 76, yPct: 25, width: 70  },
];

// ── HotspotPin ────────────────────────────────────────────────────────────────

function HotspotPin({
  hotspot,
  isActive,
  onPress,
}: {
  hotspot: Hotspot;
  isActive: boolean;
  onPress: () => void;
}) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  function triggerPulse() {
    glowAnim.setValue(0);
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0.35,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handlePress() {
    if (!isActive) triggerPulse();
    onPress();
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.60],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const left = (hotspot.xPct / 100) * MAP_ZONE_W - HIT_SIZE / 2;
  const top  = (hotspot.yPct / 100) * MAP_ZONE_H - HIT_SIZE / 2;

  return (
    <Pressable
      onPress={handlePress}
      style={[hp.wrap, { left, top }]}
      accessibilityLabel={hotspot.name}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          hp.glow,
          {
            opacity: isActive ? 0.40 : glowOpacity,
            transform: [{ scale: isActive ? 1 : glowScale }],
          },
        ]}
      />
      <View style={[hp.dot, isActive && hp.dotActive]} />
    </Pressable>
  );
}

const hp = StyleSheet.create({
  wrap: {
    position: "absolute",
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: C.terracotta,
  },
  dot: {
    width: DOT_INACTIVE,
    height: DOT_INACTIVE,
    borderRadius: DOT_INACTIVE / 2,
    backgroundColor: "rgba(255,255,255,0.60)",
  },
  dotActive: {
    width: DOT_ACTIVE,
    height: DOT_ACTIVE,
    borderRadius: DOT_ACTIVE / 2,
    backgroundColor: C.terracotta,
    boxShadow: `0px 0px 8px ${C.terracotta}`,
  },
});

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
      {/* Header row: name + dismiss */}
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

      {/* Description */}
      <Text style={nc.desc} numberOfLines={2}>
        {hotspot.description}
      </Text>

      {/* Tagline */}
      <Text style={nc.tagline}>→ {hotspot.tagline}</Text>

      {/* Buttons */}
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

      {/* Place count hint */}
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

// ── MapZoneOverlay (main export) ────────────────────────────────────────────────

interface MapZoneOverlayProps {
  mapImage: ImageSourcePropType;
  onBack?: () => void;
  topInset?: number;
  locaisLabel?: string;
  selectedHotspot?: string | null;
  onHotspotPress?: (id: string | null) => void;
  filteredCount?: number;
}

export function MapZoneOverlay({
  mapImage,
  onBack,
  topInset = 14,
  locaisLabel,
  selectedHotspot,
  onHotspotPress,
  filteredCount,
}: MapZoneOverlayProps) {
  const controlTop = topInset + 10;
  const activeHotspot = RIO_HOTSPOTS.find((h) => h.id === selectedHotspot) ?? null;

  const badgeLabel =
    activeHotspot && filteredCount !== undefined
      ? `${filteredCount} local${filteredCount !== 1 ? "is" : ""}`
      : locaisLabel;

  return (
    <View style={s.root}>
      {/* ── Map image + overlays ── */}
      <Image source={mapImage} style={s.mapImage} />
      <View style={s.baseOverlay} />

      {/* ── Orientation labels (no touch) ── */}
      {RIO_LABELS.map((lbl) => {
        const left = (lbl.xPct / 100) * MAP_ZONE_W - lbl.width / 2;
        const top  = (lbl.yPct / 100) * MAP_ZONE_H - 8;
        return (
          <View
            key={lbl.text}
            style={[s.labelWrap, { left, top, width: lbl.width, pointerEvents: "none" }]}
          >
            <Text style={s.labelText}>{lbl.text}</Text>
          </View>
        );
      })}

      {/* ── Hotspot pins ── */}
      {RIO_HOTSPOTS.map((hotspot) => (
        <HotspotPin
          key={hotspot.id}
          hotspot={hotspot}
          isActive={hotspot.id === selectedHotspot}
          onPress={() =>
            onHotspotPress?.(hotspot.id === selectedHotspot ? null : hotspot.id)
          }
        />
      ))}

      {/* ── Voltar pill ── */}
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

      {/* ── Count badge ── */}
      <View style={[s.controlPill, { top: controlTop, right: 16 }]}>
        <View style={[s.badgeDot, activeHotspot && s.badgeDotActive]} />
        <Text style={s.controlPillText}>{badgeLabel}</Text>
      </View>

      {/* ── Hint strip (inside map, bottom) ── */}
      {!activeHotspot && (
        <View style={s.hintStrip}>
          <Feather name="map-pin" size={10} color="rgba(255,255,255,0.28)" />
          <Text style={s.hintText}>Toque num bairro para explorar</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    width: MAP_ZONE_W,
    height: MAP_ZONE_H,
    backgroundColor: "#0D0906",
    overflow: "hidden",
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  baseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,3,1,0.22)",
  },

  // Labels
  labelWrap: {
    position: "absolute",
    alignItems: "center",
  },
  labelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 8,
    color: "rgba(255,255,255,0.50)",
    letterSpacing: 1.0,
    textAlign: "center",
    textShadow: "0px 1px 4px rgba(0,0,0,0.90)",
  },

  // Hint strip
  hintStrip: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 0.3,
  },

  // Control pills
  controlPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(8,4,2,0.62)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
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
