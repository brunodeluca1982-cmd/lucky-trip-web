/**
 * MapZoneOverlay — editorial map with neighborhood hotspots.
 *
 * Replaces large invisible zone rectangles with small, precise circular
 * hotspot touch targets placed at the center of each neighborhood.
 *
 * Interaction model:
 *   • Tap a hotspot → glow pulse animates, popup appears below map,
 *     parent filters place list and scrolls to cards section.
 *   • Tap X in popup (or same hotspot) → deselect.
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
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MAP_ASPECT = 512 / 288;
export const MAP_ZONE_W = SCREEN_WIDTH;
export const MAP_ZONE_H = Math.round(MAP_ZONE_W / MAP_ASPECT);

// Touch target diameter (px) — 44px meets mobile accessibility minimum
const HIT_SIZE = 44;
// Visible dot size when inactive
const DOT_INACTIVE = 5;
// Visible dot size when active
const DOT_ACTIVE = 8;
// Glow ring outer diameter when active
const GLOW_SIZE = 28;

// ── Data types ─────────────────────────────────────────────────────────────────

export interface Hotspot {
  id: string;
  name: string;
  description: string;
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

// ── Rio de Janeiro hotspot config ──────────────────────────────────────────────
// Positions are % of illustrated map image (512 × 288 px).
// Each hotspot covers one or a small cluster of adjacent neighborhoods.

export const RIO_HOTSPOTS: Hotspot[] = [
  {
    id: "leblon",
    name: "Leblon",
    description: "O bairro mais exclusivo do Rio — restaurantes premiados, livrarias e a melhor vista para o Dois Irmãos.",
    xPct: 39,
    yPct: 72,
    bairros: ["Leblon"],
  },
  {
    id: "ipanema",
    name: "Ipanema",
    description: "Boemia, moda e a praia que inspirou a bossa nova. Vibrante de manhã à noite.",
    xPct: 48,
    yPct: 72,
    bairros: ["Ipanema", "Arpoador"],
  },
  {
    id: "copacabana",
    name: "Copacabana",
    description: "Energia 24 horas, frente de mar icônica e uma mistura única de história e modernidade.",
    xPct: 62,
    yPct: 71,
    bairros: ["Copacabana"],
  },
  {
    id: "gavea",
    name: "Gávea",
    description: "Recanto intelectual do Rio — jardins, cachoeiras escondidas e gastronomia intimista.",
    xPct: 45,
    yPct: 50,
    bairros: ["Gávea", "Jardim Botânico", "Lagoa"],
  },
  {
    id: "botafogo",
    name: "Botafogo",
    description: "Jovem e criativo, com bares alternativos, cinemas e vista privilegiada para o Pão de Açúcar.",
    xPct: 60,
    yPct: 47,
    bairros: ["Botafogo", "Urca", "Santa Teresa", "Lapa", "Flamengo", "Centro"],
  },
  {
    id: "barra",
    name: "Barra da Tijuca",
    description: "Praias extensas, natureza preservada e modernidade à beira-mar — o Rio além do cartão postal.",
    xPct: 13,
    yPct: 73,
    bairros: ["Barra da Tijuca", "São Conrado"],
  },
];

// Floating text labels — orientation only, no interaction
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

// ── Sub-component: single animated hotspot ─────────────────────────────────────

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
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0.4,
        duration: 400,
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
    outputRange: [0, 0.55],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  // Position: center the HIT_SIZE touch area at the hotspot coordinates
  const cx = (hotspot.xPct / 100) * MAP_ZONE_W;
  const cy = (hotspot.yPct / 100) * MAP_ZONE_H;
  const left = cx - HIT_SIZE / 2;
  const top  = cy - HIT_SIZE / 2;

  return (
    <Pressable
      onPress={handlePress}
      style={[hs.wrap, { left, top }]}
      hitSlop={0}
      accessibilityLabel={hotspot.name}
      accessibilityRole="button"
    >
      {/* Glow ring — animates on press */}
      <Animated.View
        style={[
          hs.glow,
          {
            opacity: isActive ? 0.35 : glowOpacity,
            transform: [{ scale: isActive ? 1 : glowScale }],
          },
        ]}
      />

      {/* Visible dot */}
      <View style={[hs.dot, isActive && hs.dotActive]} />
    </Pressable>
  );
}

const hs = StyleSheet.create({
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
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: {
    width: DOT_ACTIVE,
    height: DOT_ACTIVE,
    borderRadius: DOT_ACTIVE / 2,
    backgroundColor: C.terracotta,
    boxShadow: `0px 0px 6px ${C.terracotta}`,
  },
});

// ── Main component ─────────────────────────────────────────────────────────────

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
      {/* ── Map frame ── */}
      <View style={s.mapFrame}>
        <Image source={mapImage} style={s.mapImage} />

        {/* Uniform dark wash — lifts label/dot contrast */}
        <View style={s.baseOverlay} />

        {/* ── Neighborhood text labels (orientation only, no touch) ── */}
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
              onHotspotPress?.(
                hotspot.id === selectedHotspot ? null : hotspot.id
              )
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
      </View>

      {/* ── Neighborhood popup — appears when a hotspot is active ── */}
      {activeHotspot ? (
        <View style={s.popup}>
          <View style={s.popupLeft}>
            <Text style={s.popupEyebrow}>BAIRRO SELECIONADO</Text>
            <Text style={s.popupTitle} numberOfLines={1}>
              {activeHotspot.name}
            </Text>
            <Text style={s.popupDesc} numberOfLines={2}>
              {activeHotspot.description}
            </Text>
            {filteredCount === 0 && (
              <Text style={s.popupEmpty}>Sem locais nesta categoria</Text>
            )}
          </View>

          <Pressable
            onPress={() => onHotspotPress?.(null)}
            style={s.popupDismiss}
            hitSlop={10}
            accessibilityLabel="Fechar bairro"
          >
            <Feather name="x" size={13} color="rgba(255,255,255,0.50)" />
          </Pressable>
        </View>
      ) : (
        /* Hint strip */
        <View style={s.hintStrip}>
          <Feather name="map-pin" size={11} color="rgba(255,255,255,0.25)" />
          <Text style={s.hintText}>Toque num bairro para filtrar</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    width: "100%",
    backgroundColor: "#0D0906",
  },

  mapFrame: {
    width: MAP_ZONE_W,
    height: MAP_ZONE_H,
    overflow: "hidden",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  baseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,3,1,0.20)",
  },

  // ── Labels ──
  labelWrap: {
    position: "absolute",
    alignItems: "center",
  },
  labelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 8,
    color: "rgba(255,255,255,0.48)",
    letterSpacing: 1.0,
    textAlign: "center",
    textShadow: "0px 1px 4px rgba(0,0,0,0.90)",
  },

  // ── Control pills ──
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

  // ── Popup ──
  popup: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(20,12,6,0.97)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.28)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  popupLeft: {
    flex: 1,
    gap: 3,
  },
  popupEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: C.terracotta,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  popupTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
    lineHeight: 23,
  },
  popupDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
    marginTop: 1,
  },
  popupEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.30)",
    marginTop: 4,
    fontStyle: "italic",
  },
  popupDismiss: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginTop: 2,
  },

  // ── Hint strip ──
  hintStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 0.2,
  },
});
