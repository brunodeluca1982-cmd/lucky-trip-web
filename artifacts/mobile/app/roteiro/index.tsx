/**
 * roteiro/index.tsx — AI Itinerary Builder
 *
 * Two phases in a single screen:
 *   1. Setup   — preference selection (inspiration + vibe) with saved places summary
 *   2. Result  — deterministic day-by-day itinerary built from saved places
 *
 * Entry: viagem.tsx CTA → router.push("/roteiro")
 *
 * Data: reads saved items from GuiaContext; passes them through buildItinerary().
 * No Supabase calls needed — all data already in SavedItem from the save flow.
 *
 * Style: cream + dark-brown, matches Lucky / Destinos content screens.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGuia } from "@/context/GuiaContext";
import type { SavedCategory } from "@/context/GuiaContext";
import { supabase } from "@/lib/supabase";
import {
  buildItinerary,
  type Inspiration,
  type ItineraryPreferences,
  type ItineraryResult,
  type Vibe,
} from "@/utils/buildItinerary";
import { PERIODO_LABEL, PERIODO_ICON } from "@/utils/buildRoteiro";
import type { DiaRoteiro } from "@/utils/buildRoteiro";

const C    = Colors.light;
const GOLD = "#C9A84C";

// ─────────────────────────────────────────────────────────────────────────────
// Static config
// ─────────────────────────────────────────────────────────────────────────────

const INSPIRATIONS: { id: Inspiration; label: string; icon: string }[] = [
  { id: "gastronomy", label: "Gastronomia", icon: "🍽" },
  { id: "culture",    label: "Cultura",     icon: "🎭" },
  { id: "beach",      label: "Praia",       icon: "🏖" },
  { id: "adventure",  label: "Aventura",    icon: "🧭" },
  { id: "lucky",      label: "Lucky List",  icon: "✦" },
];

const VIBES: { id: Vibe; label: string; desc: string }[] = [
  { id: "tranquilo", label: "Tranquilo", desc: "Até 3 paradas por dia" },
  { id: "moderado",  label: "Moderado",  desc: "4 a 5 paradas por dia" },
  { id: "intenso",   label: "Intenso",   desc: "Aproveitar tudo" },
];

const CATEGORY_LABEL: Record<SavedCategory, string> = {
  oQueFazer:   "Experiência",
  restaurante: "Restaurante",
  hotel:       "Hotel",
  lucky:       "Lucky",
};

const CATEGORY_ICON: Record<SavedCategory, string> = {
  oQueFazer:   "map-pin",
  restaurante: "coffee",
  hotel:       "home",
  lucky:       "star",
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup phase — preference pickers
// ─────────────────────────────────────────────────────────────────────────────

interface SetupProps {
  savedCount: number;
  categoryCounts: Record<SavedCategory, number>;
  inspirations: Inspiration[];
  vibe: Vibe | null;
  onToggleInspiration: (id: Inspiration) => void;
  onSetVibe: (id: Vibe) => void;
  onGenerate: () => void;
}

function SetupPhase({
  savedCount,
  categoryCounts,
  inspirations,
  vibe,
  onToggleInspiration,
  onSetVibe,
  onGenerate,
}: SetupProps) {
  const hasNone = savedCount === 0;

  return (
    <>
      {/* Destination + summary */}
      <View style={su.destCard}>
        <LinearGradient
          colors={["rgba(10,5,2,0.96)", "rgba(44,24,16,0.92)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={su.destRow}>
          <Feather name="map-pin" size={13} color={GOLD} />
          <Text style={su.destLabel}>Destino</Text>
        </View>
        <Text style={su.destName}>Rio de Janeiro</Text>
        <View style={su.destDivider} />
        {hasNone ? (
          <Text style={su.noneText}>
            Salve lugares em qualquer tela para incluí-los no roteiro.
          </Text>
        ) : (
          <View style={su.catRow}>
            {(Object.keys(categoryCounts) as SavedCategory[])
              .filter((k) => categoryCounts[k] > 0)
              .map((cat) => (
                <View key={cat} style={su.catPill}>
                  <Feather
                    name={CATEGORY_ICON[cat] as any}
                    size={10}
                    color={GOLD}
                  />
                  <Text style={su.catPillText}>
                    {categoryCounts[cat]} {CATEGORY_LABEL[cat]}
                    {categoryCounts[cat] > 1 ? "s" : ""}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </View>

      {/* Light hint when very few places */}
      {savedCount > 0 && savedCount < 2 && (
        <View style={su.hintRow}>
          <Feather name="info" size={12} color={C.warmGray} />
          <Text style={su.hintText}>
            Adicione mais lugares para um roteiro mais rico.
          </Text>
        </View>
      )}

      {/* Inspiração */}
      <Text style={su.sectionLabel}>Inspiração</Text>
      <Text style={su.sectionSub}>Selecione uma ou mais categorias</Text>
      <View style={su.inspGrid}>
        {INSPIRATIONS.map((ins) => {
          const active = inspirations.includes(ins.id);
          return (
            <Pressable
              key={ins.id}
              style={({ pressed }) => [
                su.inspChip,
                active && su.inspChipActive,
                pressed && { opacity: 0.78 },
              ]}
              onPress={() => onToggleInspiration(ins.id)}
            >
              <Text style={su.inspIcon}>{ins.icon}</Text>
              <Text style={[su.inspLabel, active && su.inspLabelActive]}>
                {ins.label}
              </Text>
              {active && (
                <Feather name="check" size={11} color={GOLD} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Ritmo */}
      <Text style={[su.sectionLabel, { marginTop: 24 }]}>Ritmo de viagem</Text>
      <Text style={su.sectionSub}>Quantas paradas por dia?</Text>
      <View style={su.vibeCol}>
        {VIBES.map((v) => {
          const active = vibe === v.id;
          return (
            <Pressable
              key={v.id}
              style={({ pressed }) => [
                su.vibeRow,
                active && su.vibeRowActive,
                pressed && { opacity: 0.80 },
              ]}
              onPress={() => onSetVibe(v.id)}
            >
              <View style={[su.vibeRadio, active && su.vibeRadioActive]}>
                {active && <View style={su.vibeRadioDot} />}
              </View>
              <View style={su.vibeText}>
                <Text style={[su.vibeLabel, active && su.vibeLabelActive]}>
                  {v.label}
                </Text>
                <Text style={su.vibeDesc}>{v.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Generate CTA */}
      <Pressable
        style={({ pressed }) => [
          su.genBtn,
          hasNone && su.genBtnDisabled,
          pressed && !hasNone && { opacity: 0.84, transform: [{ scale: 0.985 }] },
        ]}
        onPress={hasNone ? undefined : onGenerate}
        disabled={hasNone}
      >
        <Feather name="zap" size={16} color={hasNone ? C.warmGray : GOLD} />
        <Text style={[su.genBtnText, hasNone && su.genBtnTextDisabled]}>
          Gerar roteiro
        </Text>
      </Pressable>
    </>
  );
}

const su = StyleSheet.create({
  destCard: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: `${GOLD}20`,
    gap: 6,
  },
  destRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  destLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  destName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: C.cream,
    lineHeight: 30,
  },
  destDivider: {
    height: 1,
    backgroundColor: `${GOLD}16`,
    marginVertical: 4,
  },
  noneText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(245,240,232,0.52)",
    lineHeight: 20,
  },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${GOLD}12`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${GOLD}24`,
  },
  catPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: GOLD,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 24,
    marginTop: -12,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.warmGray,
    flex: 1,
  },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.darkBrown,
    marginBottom: 2,
  },
  sectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.warmGray,
    marginBottom: 14,
  },

  inspGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inspChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.warmBeige,
    borderWidth: 1,
    borderColor: C.border,
  },
  inspChipActive: {
    backgroundColor: `${GOLD}12`,
    borderColor: `${GOLD}40`,
  },
  inspIcon: {
    fontSize: 14,
  },
  inspLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.warmGray,
  },
  inspLabelActive: {
    color: C.darkBrown,
    fontFamily: "Inter_600SemiBold",
  },

  vibeCol: {
    gap: 8,
  },
  vibeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: C.warmBeige,
    borderWidth: 1,
    borderColor: C.border,
  },
  vibeRowActive: {
    backgroundColor: `${GOLD}10`,
    borderColor: `${GOLD}35`,
  },
  vibeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  vibeRadioActive: {
    borderColor: GOLD,
  },
  vibeRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: GOLD,
  },
  vibeText: {
    flex: 1,
    gap: 1,
  },
  vibeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.charcoal,
  },
  vibeLabelActive: {
    color: C.darkBrown,
  },
  vibeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
  },

  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: C.darkBrown,
    borderWidth: 1,
    borderColor: `${GOLD}30`,
    boxShadow: `0px 6px 20px rgba(10,5,2,0.22)`,
  },
  genBtnDisabled: {
    backgroundColor: C.warmBeige,
    borderColor: C.border,
    boxShadow: "none",
  },
  genBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.cream,
    letterSpacing: 0.2,
  },
  genBtnTextDisabled: {
    color: C.warmGray,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Result phase — day-by-day itinerary
// ─────────────────────────────────────────────────────────────────────────────

function ResultPhase({
  result,
  onReset,
}: {
  result: ItineraryResult;
  onReset: () => void;
}) {
  return (
    <>
      {/* Summary */}
      <View style={re.summary}>
        <View style={re.summaryInner}>
          <View style={re.statBlock}>
            <Text style={re.statVal}>{result.summary.totalDays}</Text>
            <Text style={re.statLbl}>{result.summary.totalDays === 1 ? "dia" : "dias"}</Text>
          </View>
          <View style={re.statDivider} />
          <View style={re.statBlock}>
            <Text style={re.statVal}>{result.summary.totalItems}</Text>
            <Text style={re.statLbl}>lugares</Text>
          </View>
          <View style={re.statDivider} />
          <View style={re.statBlock}>
            <Text style={re.statVal}>{result.destination.split(" ").slice(-1)[0]}</Text>
            <Text style={re.statLbl}>destino</Text>
          </View>
        </View>
      </View>

      {/* Day cards */}
      {result.days.map((dia) => (
        <ResultDayCard key={dia.bairro} dia={dia} />
      ))}

      {/* Redo */}
      <Pressable
        style={({ pressed }) => [
          re.redoBtn,
          pressed && { opacity: 0.75 },
        ]}
        onPress={onReset}
      >
        <Feather name="refresh-cw" size={14} color={C.terracotta} />
        <Text style={re.redoBtnText}>Ajustar preferências</Text>
      </Pressable>
    </>
  );
}

function ResultDayCard({ dia }: { dia: DiaRoteiro }) {
  return (
    <View style={re.dayCard}>
      {/* Day label */}
      <View style={re.dayHeader}>
        <View style={re.dayNumBadge}>
          <Text style={re.dayNumText}>DIA {dia.numero}</Text>
        </View>
        <Text style={re.dayBairro}>{dia.bairro}</Text>
      </View>

      {/* Periods */}
      {dia.periodos.map((periodo) => {
        const icon = PERIODO_ICON[periodo.periodo] as any;
        const label = PERIODO_LABEL[periodo.periodo];
        return (
          <View key={periodo.periodo} style={re.periodBlock}>
            <View style={re.periodHeader}>
              <Feather name={icon} size={11} color={GOLD} />
              <Text style={re.periodLabel}>{label}</Text>
              <View style={re.periodLine} />
            </View>
            {periodo.items.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  re.itemRow,
                  pressed && { opacity: 0.78 },
                ]}
                onPress={() => router.push(`/lugar/rio/${item.id}`)}
              >
                {/* Thumbnail */}
                <Image
                  source={item.image}
                  style={re.thumb}
                  resizeMode="cover"
                />
                {/* Info */}
                <View style={re.itemInfo}>
                  <Text style={re.itemName} numberOfLines={1}>{item.titulo}</Text>
                  <View style={re.itemMeta}>
                    <View style={re.catBadge}>
                      <Text style={re.catBadgeText}>
                        {CATEGORY_LABEL[item.categoria]}
                      </Text>
                    </View>
                    {item.localizacao ? (
                      <Text style={re.itemLoc} numberOfLines={1}>
                        {item.localizacao}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Feather name="chevron-right" size={14} color={C.border} />
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const re = StyleSheet.create({
  summary: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${GOLD}22`,
    backgroundColor: C.darkBrown,
  },
  summaryInner: {
    flexDirection: "row",
    paddingVertical: 18,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statVal: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.cream,
    lineHeight: 28,
  },
  statLbl: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.50)",
  },
  statDivider: {
    width: 1,
    backgroundColor: `${GOLD}18`,
    alignSelf: "stretch",
    marginVertical: 4,
  },

  dayCard: {
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    boxShadow: `0px 2px 10px rgba(0,0,0,0.05)`,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  dayNumBadge: {
    backgroundColor: C.darkBrown,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayNumText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  dayBairro: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 18,
    color: C.darkBrown,
    flex: 1,
  },

  periodBlock: {
    marginBottom: 12,
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  periodLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  periodLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${GOLD}14`,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.sand,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.darkBrown,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catBadge: {
    backgroundColor: C.warmBeige,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  catBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.warmGray,
  },
  itemLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
    flex: 1,
  },

  redoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.22)",
  },
  redoBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.terracotta,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Custom header
// ─────────────────────────────────────────────────────────────────────────────

function ScreenHeader({
  phase,
  onBack,
}: {
  phase: "setup" | "result" | "loading";
  onBack: () => void;
}) {
  const title =
    phase === "result"  ? "Seu Roteiro"   :
    phase === "loading" ? "Criando…"      :
    "Criar Roteiro";

  return (
    <View style={hdr.wrap}>
      <Pressable style={hdr.back} onPress={onBack} hitSlop={8}>
        <Feather name="arrow-left" size={20} color={C.darkBrown} />
      </Pressable>
      <View style={hdr.center}>
        <Text style={hdr.title}>{title}</Text>
        <Text style={hdr.sub}>Rio de Janeiro</Text>
      </View>
      <View style={hdr.spacer} />
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.cream,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.warmBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: C.darkBrown,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
  },
  spacer: {
    width: 36,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function RoteiroScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { saved } = useGuia();

  // Preference state
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [vibe, setVibe]                 = useState<Vibe | null>("moderado");

  // Result state — null = setup phase, defined = result phase
  const [result, setResult]     = useState<ItineraryResult | null>(null);
  const [generating, setGenerating] = useState(false);

  // Category counts for the summary card
  const categoryCounts = saved.reduce<Record<SavedCategory, number>>(
    (acc, item) => {
      acc[item.categoria] = (acc[item.categoria] ?? 0) + 1;
      return acc;
    },
    { oQueFazer: 0, restaurante: 0, hotel: 0, lucky: 0 },
  );

  function handleToggleInspiration(id: Inspiration) {
    setInspirations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);

    try {
      // Serialize saved items — image objects are not JSON-safe, so we
      // send only the plain fields and re-hydrate the result on the way back.
      const serializableItems = saved.map((s) => ({
        id:          s.id,
        titulo:      s.titulo,
        categoria:   s.categoria,
        localizacao: s.localizacao,
      }));

      // Derive trip length from vibe and item count
      const VIBE_PER_DAY: Record<string, number> = {
        tranquilo: 3,
        moderado:  4,
        intenso:   6,
      };
      const actionableCount = saved.filter((s) => s.categoria !== "hotel").length;
      const perDay          = VIBE_PER_DAY[vibe ?? "moderado"] ?? 4;
      const requestedDays   = Math.max(1, Math.ceil(actionableCount / perDay));

      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          savedItems:   serializableItems,
          destination:  "Rio de Janeiro",
          preferences:  { inspirations, vibe },
          requestedDays,
        },
      });

      if (error || !data?.days) throw new Error(error?.message ?? "empty response");

      // Re-hydrate each returned item with the original SavedItem (incl. image)
      const savedMap = new Map(saved.map((s) => [s.id, s]));
      const hydratedDays: DiaRoteiro[] = (data.days as DiaRoteiro[]).map((day) => ({
        ...day,
        periodos: day.periodos.map((p) => ({
          ...p,
          items: p.items
            .map((item) => savedMap.get(item.id) ?? item)
            .filter(Boolean),
        })),
      }));

      setResult({
        destination: data.destination ?? "Rio de Janeiro",
        source:      "trip_saved_places",
        preferences: { inspirations, vibe },
        summary:     data.summary,
        days:        hydratedDays,
      });
    } catch (_) {
      // Graceful fallback — run locally if the edge function is unavailable
      const prefs: ItineraryPreferences = { inspirations, vibe };
      setResult(buildItinerary(saved, prefs));
    } finally {
      setGenerating(false);
    }
  }

  function handleBack() {
    if (result) {
      setResult(null); // go back to setup
    } else {
      router.back();
    }
  }

  const phase: "setup" | "result" | "loading" =
    generating ? "loading" : result ? "result" : "setup";

  return (
    <View style={sc.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={{ paddingTop: topPad }}>
        <ScreenHeader phase={phase} onBack={handleBack} />
      </View>

      {phase === "loading" ? (
        <View style={sc.loadingWrap}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={sc.loadingText}>Gerando roteiro com IA…</Text>
          <Text style={sc.loadingSubText}>Isso pode levar alguns segundos</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            sc.content,
            { paddingBottom: bottomPad + 40 },
          ]}
        >
          {phase === "setup" ? (
            <SetupPhase
              savedCount={saved.length}
              categoryCounts={categoryCounts}
              inspirations={inspirations}
              vibe={vibe}
              onToggleInspiration={handleToggleInspiration}
              onSetVibe={setVibe}
              onGenerate={handleGenerate}
            />
          ) : (
            <ResultPhase result={result!} onReset={() => setResult(null)} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: C.darkBrown,
    textAlign: "center",
  },
  loadingSubText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    textAlign: "center",
  },
});
