/**
 * MapZoneOverlay — macro orientation layer for destination list screens.
 *
 * Uses the illustrated map image as a base (unchanged).
 * Adds two interactive layers on top:
 *   1. Floating text labels for 8 neighborhoods (pointer-events: none)
 *   2. Invisible tappable rectangles for 5 macro zones
 *
 * Tapping a zone:
 *   → highlights it with a subtle terracotta wash
 *   → emits onZonePress(zoneId) so the parent can filter its place list
 *
 * No pins. No Google Maps. No heavy controls.
 * This is an editorial orientation tool, not a navigation app.
 *
 * Used by: Onde ficar / Onde comer / O que fazer screens.
 */

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
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MAP_ASPECT = 512 / 288;
export const MAP_ZONE_W = SCREEN_WIDTH;
export const MAP_ZONE_H = Math.round(MAP_ZONE_W / MAP_ASPECT);

// ── Data types ─────────────────────────────────────────────────────────────────

export interface MacroZone {
  id: string;
  name: string;
  xMinPct: number;
  xMaxPct: number;
  yMinPct: number;
  yMaxPct: number;
  bairros: string[];
}

interface FloatingLabel {
  text: string;
  xPct: number;
  yPct: number;
  width: number;
}

// ── Rio de Janeiro — zone definitions ──────────────────────────────────────────
// Coordinates are % of the map image (512 × 288 px illustrated base).
// xMin=0 is the left edge, yMin=0 is the top edge.

export const RIO_ZONES: MacroZone[] = [
  {
    id: "barra",
    name: "Barra da Tijuca",
    xMinPct: 2,  xMaxPct: 30, yMinPct: 58, yMaxPct: 98,
    bairros: ["Barra da Tijuca", "São Conrado"],
  },
  {
    id: "zona-sul",
    name: "Zona Sul",
    xMinPct: 30, xMaxPct: 96, yMinPct: 58, yMaxPct: 98,
    bairros: ["Leblon", "Ipanema", "Arpoador", "Copacabana", "Leme", "Urca"],
  },
  {
    id: "lagoa",
    name: "Lagoa & Jardim Botânico",
    xMinPct: 38, xMaxPct: 58, yMinPct: 40, yMaxPct: 67,
    bairros: ["Lagoa", "Jardim Botânico", "Gávea", "Laranjeiras"],
  },
  {
    id: "centro",
    name: "Centro & Lapa",
    xMinPct: 56, xMaxPct: 98, yMinPct: 14, yMaxPct: 60,
    bairros: [
      "Centro", "Lapa", "Santa Teresa",
      "Botafogo", "Flamengo", "Catete", "Glória",
    ],
  },
  {
    id: "interior",
    name: "Corcovado & Floresta",
    xMinPct: 8,  xMaxPct: 54, yMinPct: 8,  yMaxPct: 58,
    bairros: [
      "Corcovado", "Floresta da Tijuca",
      "Pedra da Gávea", "Morro Dois Irmãos",
    ],
  },
];

// Floating labels — centered at (xPct, yPct), rendered above zone rects
const RIO_LABELS: FloatingLabel[] = [
  { text: "BARRA DA TIJUCA",  xPct: 11, yPct: 67, width: 110 },
  { text: "SÃO CONRADO",      xPct: 27, yPct: 73, width: 90  },
  { text: "LEBLON",           xPct: 38, yPct: 61, width: 70  },
  { text: "IPANEMA",          xPct: 48, yPct: 61, width: 70  },
  { text: "COPACABANA",       xPct: 62, yPct: 60, width: 90  },
  { text: "LAGOA",            xPct: 51, yPct: 52, width: 60  },
  { text: "CRISTO REDENTOR",  xPct: 34, yPct: 20, width: 110 },
  { text: "CENTRO",           xPct: 76, yPct: 25, width: 70  },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface MapZoneOverlayProps {
  mapImage: ImageSourcePropType;
  onBack?: () => void;
  topInset?: number;
  locaisLabel?: string;
  selectedZone?: string | null;
  onZonePress?: (zoneId: string | null) => void;
  filteredCount?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MapZoneOverlay({
  mapImage,
  onBack,
  topInset = 14,
  locaisLabel,
  selectedZone,
  onZonePress,
  filteredCount,
}: MapZoneOverlayProps) {
  const controlTop = topInset + 10;
  const activeZone = RIO_ZONES.find((z) => z.id === selectedZone) ?? null;

  const badgeLabel =
    activeZone && filteredCount !== undefined
      ? `${filteredCount} local${filteredCount !== 1 ? "is" : ""}`
      : locaisLabel;

  return (
    <View style={s.root}>
      {/* ── Map frame ── */}
      <View style={s.mapFrame}>
        <Image source={mapImage} style={s.mapImage} />

        {/* Uniform dark wash — lifts label contrast without obscuring illustration */}
        <View style={s.baseOverlay} />

        {/* ── Zone 1: render larger/background zones first (lower z) ── */}
        {RIO_ZONES.map((zone) => {
          const isActive = zone.id === selectedZone;
          const left  = (zone.xMinPct / 100) * MAP_ZONE_W;
          const top   = (zone.yMinPct / 100) * MAP_ZONE_H;
          const width = ((zone.xMaxPct - zone.xMinPct) / 100) * MAP_ZONE_W;
          const height = ((zone.yMaxPct - zone.yMinPct) / 100) * MAP_ZONE_H;

          return (
            <Pressable
              key={zone.id}
              style={({ pressed }) => [
                s.zoneRect,
                { left, top, width, height },
                isActive && s.zoneRectActive,
                pressed && !isActive && s.zoneRectPressed,
              ]}
              onPress={() => onZonePress?.(isActive ? null : zone.id)}
              accessibilityLabel={zone.name}
              accessibilityRole="button"
            />
          );
        })}

        {/* ── Neighborhood labels — pointerEvents none so zones stay tappable ── */}
        {RIO_LABELS.map((lbl) => {
          // Center the label container at (xPct, yPct)
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

        {/* ── Voltar pill — top left ── */}
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

        {/* ── Count badge — top right ── */}
        <View style={[s.controlPill, { top: controlTop, right: 16 }]}>
          <View style={[s.badgeDot, activeZone && s.badgeDotActive]} />
          <Text style={s.controlPillText}>{badgeLabel}</Text>
        </View>
      </View>

      {/* ── Zone popup — slides in below map when a zone is active ── */}
      {activeZone ? (
        <View style={s.popup}>
          <View style={s.popupLeft}>
            <Text style={s.popupEyebrow}>ZONA SELECIONADA</Text>
            <Text style={s.popupTitle} numberOfLines={1}>
              {activeZone.name}
            </Text>
            {filteredCount === 0 && (
              <Text style={s.popupHint}>Sem locais nesta categoria</Text>
            )}
          </View>

          <Pressable
            onPress={() => onZonePress?.(null)}
            style={s.popupDismiss}
            hitSlop={10}
            accessibilityLabel="Remover filtro de zona"
          >
            <Feather name="x" size={13} color="rgba(255,255,255,0.45)" />
          </Pressable>
        </View>
      ) : (
        /* Hint strip — only visible when no zone selected */
        <View style={s.hintStrip}>
          <Feather name="map" size={11} color="rgba(255,255,255,0.28)" />
          <Text style={s.hintText}>Toque numa zona para filtrar</Text>
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

  // ── Zone rectangles ──
  zoneRect: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  zoneRectActive: {
    backgroundColor: "rgba(196,112,74,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196,112,74,0.45)",
    borderRadius: 4,
  },
  zoneRectPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // ── Labels — editorial floating text ──
  labelWrap: {
    position: "absolute",
    alignItems: "center",
  },
  labelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 8,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.1,
    textAlign: "center",
    textShadow: "0px 1px 4px rgba(0,0,0,0.90)",
  },

  // ── Control pills (Voltar / count badge) ──
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

  // ── Zone popup ──
  popup: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(20,12,6,0.97)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.30)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  popupLeft: {
    flex: 1,
    gap: 2,
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
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  popupHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    marginTop: 2,
  },
  popupDismiss: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 15,
  },

  // ── Hint strip — shown when no zone is selected ──
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
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 0.2,
  },
});
