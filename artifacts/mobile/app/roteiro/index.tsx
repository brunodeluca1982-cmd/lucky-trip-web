/**
 * roteiro/index.tsx
 *
 * Guided 5-step itinerary builder.
 * Each step appears as a glass modal over an atmospheric background.
 * Steps auto-advance on single-select; multi-select shows a CTA.
 *
 * Steps:
 *   0 — Destino       (confirm Rio, tap to begin)
 *   1 — Datas         (arrival + departure calendar, auto-advance on range)
 *   2 — Companhia     (solo/casal/amigos/família, auto-advance)
 *   3 — Inspiração    (multi-select, CTA)
 *   4 — Estilo        (budget, auto-advance → triggers generation)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGuia } from "@/context/GuiaContext";
import type { SavedCategory, SavedItem } from "@/context/GuiaContext";
import { supabase } from "@/lib/supabase";
import { getNeighborhoodImage } from "@/data/neighborhoodImages";
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
const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// Types + static data
// ─────────────────────────────────────────────────────────────────────────────

type TravelVibe  = "solo" | "casal" | "amigos" | "família";
type BudgetStyle = "essencial" | "conforto" | "sofisticado";

const TOTAL_STEPS = 5;

const COMPANIONS: { id: TravelVibe; label: string; icon: string }[] = [
  { id: "solo",    label: "Solo",    icon: "🚶" },
  { id: "casal",   label: "Casal",   icon: "💑" },
  { id: "amigos",  label: "Amigos",  icon: "👥" },
  { id: "família", label: "Família", icon: "👨‍👩‍👧" },
];

const BUDGETS: { id: BudgetStyle; label: string; desc: string }[] = [
  { id: "essencial",   label: "Essencial",   desc: "Custo-benefício · experiências acessíveis" },
  { id: "conforto",    label: "Conforto",    desc: "Qualidade equilibrada · bom e bem feito" },
  { id: "sofisticado", label: "Sofisticado", desc: "Melhor do Rio · exclusivo e premium" },
];

const INSPIRATIONS: { id: Inspiration; label: string; icon: string }[] = [
  { id: "gastronomia", label: "Gastronomia", icon: "🍽️" },
  { id: "cultura",     label: "Cultura",     icon: "🎭" },
  { id: "praia",       label: "Praia",       icon: "🏖️" },
  { id: "aventura",    label: "Aventura",    icon: "⚡" },
  { id: "lucky",       label: "Lucky List",  icon: "✦" },
];

const CATEGORY_LABEL: Record<SavedCategory, string> = {
  oQueFazer:   "O Que Fazer",
  restaurante: "Restaurante",
  hotel:       "Hotel",
  lucky:       "Lucky",
};

// Result phase helpers — time labels, weather, travel connectors
const PERIODO_TIME: Record<string, number> = {
  manha:  9 * 60,
  almoco: 12 * 60 + 30,
  tarde:  14 * 60,
  noite:  19 * 60,
};

function getItemTime(periodo: string, idx: number): string {
  const base = PERIODO_TIME[periodo] ?? 9 * 60;
  const total = base + idx * 90;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WEATHER_SEQ = ["☀️", "☀️", "🌤️", "⛅", "🌤️", "☀️", "🌥️", "☀️"];
function getDayWeather(dayNum: number): string {
  return WEATHER_SEQ[(dayNum - 1) % WEATHER_SEQ.length];
}

const GLASS_BG     = "rgba(15,8,3,0.62)";
const GLASS_HEADER = "rgba(18,9,2,0.90)";
const GLASS_BORDER = "rgba(201,168,76,0.14)";
const CREAM        = "#F5F0E8";

// ─────────────────────────────────────────────────────────────────────────────
// Calendar utilities
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DAY_PT = ["D","S","T","Q","Q","S","S"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
function isBeforeDay(a: Date, b: Date) {
  const norm = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return norm(a) < norm(b);
}
function isBetweenDays(d: Date, start: Date, end: Date) {
  const norm = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return norm(d) > norm(start) && norm(d) < norm(end);
}
function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  return d;
}
function calDays(month: Date): (Date | null)[] {
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(y, m, d));
  return cells;
}

// ─────────────────────────────────────────────────────────────────────────────
// StepCard — animated entrance wrapper
// ─────────────────────────────────────────────────────────────────────────────

function StepCard({ children }: { children: React.ReactNode }) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity,    { toValue: 1, useNativeDriver: true, damping: 26, stiffness: 260 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 260 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[jn.card, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StepDots — progress indicator
// ─────────────────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <View style={jn.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            jn.dot,
            i < current  ? jn.dotDone   :
            i === current ? jn.dotActive : jn.dotFuture,
          ]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — Destino confirm
// ─────────────────────────────────────────────────────────────────────────────

function StepDestino({ onNext, savedCount }: { onNext: () => void; savedCount: number }) {
  return (
    <StepCard>
      <StepDots current={0} />
      <Text style={jn.stepLabel}>SEU DESTINO</Text>
      <View style={jn.destHero}>
        <LinearGradient
          colors={[`${GOLD}12`, `${C.darkBrown}F0`]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={jn.destFlag}>🇧🇷</Text>
        <Text style={jn.destCity}>Rio de Janeiro</Text>
        <Text style={jn.destSub}>Brasil · América do Sul</Text>
        {savedCount > 0 && (
          <View style={jn.destBadge}>
            <Text style={jn.destBadgeText}>{savedCount} {savedCount === 1 ? "lugar salvo" : "lugares salvos"}</Text>
          </View>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [jn.ctaBtn, pressed && { opacity: 0.82 }]}
        onPress={onNext}
      >
        <Text style={jn.ctaBtnText}>Começar</Text>
        <Feather name="arrow-right" size={15} color={C.cream} />
      </Pressable>
    </StepCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Date range picker
// ─────────────────────────────────────────────────────────────────────────────

function StepDatas({
  onNext,
}: {
  onNext: (nights: number) => void;
}) {
  const today       = new Date();
  const todayStart  = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const initMonth   = new Date(today.getFullYear(), today.getMonth(), 1);

  const [calMonth,   setCalMonth]   = useState<Date>(initMonth);
  const [arrival,    setArrival]    = useState<Date | null>(null);
  const [departure,  setDeparture]  = useState<Date | null>(null);
  const [picking,    setPicking]    = useState<"arrival" | "departure">("arrival");

  const cells = calDays(calMonth);
  const canBack = calMonth > initMonth;

  function fmt(d: Date) {
    return `${d.getDate()} ${MONTH_PT[d.getMonth()].slice(0, 3)}`;
  }

  function handleDay(day: Date) {
    if (isBeforeDay(day, todayStart)) return;
    if (picking === "arrival") {
      setArrival(day);
      setDeparture(null);
      setPicking("departure");
    } else {
      if (!arrival || isSameDay(day, arrival) || isBeforeDay(day, arrival)) return;
      setDeparture(day);
      const nights = Math.round((day.getTime() - arrival!.getTime()) / 86400000);
      setTimeout(() => onNext(nights), 420);
    }
  }

  return (
    <StepCard>
      <StepDots current={1} />
      <Text style={jn.stepLabel}>QUANDO VOCÊ VIAJA?</Text>

      {/* Arrival / departure tags */}
      <View style={jn.dateTags}>
        <View style={[jn.dateTag, picking === "arrival" && jn.dateTagActive]}>
          <Text style={jn.dateTagLabel}>Chegada</Text>
          <Text style={jn.dateTagVal}>{arrival ? fmt(arrival) : "—"}</Text>
        </View>
        <Feather name="arrow-right" size={13} color={`${C.darkBrown}44`} />
        <View style={[jn.dateTag, picking === "departure" && jn.dateTagActive]}>
          <Text style={jn.dateTagLabel}>Partida</Text>
          <Text style={jn.dateTagVal}>{departure ? fmt(departure) : "—"}</Text>
        </View>
      </View>

      {/* Month nav */}
      <View style={jn.calNav}>
        <Pressable hitSlop={10} onPress={() => canBack && setCalMonth(addMonths(calMonth, -1))}>
          <Feather name="chevron-left" size={18} color={canBack ? C.darkBrown : C.border} />
        </Pressable>
        <Text style={jn.calNavMonth}>{MONTH_PT[calMonth.getMonth()]} {calMonth.getFullYear()}</Text>
        <Pressable hitSlop={10} onPress={() => setCalMonth(addMonths(calMonth, 1))}>
          <Feather name="chevron-right" size={18} color={C.darkBrown} />
        </Pressable>
      </View>

      {/* Day-of-week header */}
      <View style={jn.calWeek}>
        {DAY_PT.map((d, i) => <Text key={i} style={jn.calWeekDay}>{d}</Text>)}
      </View>

      {/* Grid */}
      <View style={jn.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={jn.calCell} />;
          const past    = isBeforeDay(day, todayStart);
          const isArr   = !!arrival   && isSameDay(day, arrival);
          const isDep   = !!departure && isSameDay(day, departure);
          const inRange = !!arrival && !!departure && isBetweenDays(day, arrival, departure);
          return (
            <Pressable
              key={day.toISOString()}
              style={({ pressed }) => [
                jn.calCell,
                isArr    && jn.calArr,
                isDep    && jn.calDep,
                inRange  && jn.calRange,
                past     && jn.calPast,
                pressed && !past && { opacity: 0.68 },
              ]}
              onPress={() => handleDay(day)}
              disabled={past}
            >
              <Text style={[
                jn.calDayNum,
                (isArr || isDep) && jn.calDayNumSel,
                past && jn.calDayNumPast,
              ]}>
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={jn.calHint}>
        {picking === "arrival" ? "Toque na data de chegada" : "Agora toque na data de partida"}
      </Text>
    </StepCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Companion
// ─────────────────────────────────────────────────────────────────────────────

function StepCompanhia({
  value,
  onSelect,
}: {
  value: TravelVibe;
  onSelect: (v: TravelVibe) => void;
}) {
  return (
    <StepCard>
      <StepDots current={2} />
      <Text style={jn.stepLabel}>COM QUEM VIAJA?</Text>
      <Text style={jn.stepSub}>Avançamos automaticamente após a seleção</Text>
      <View style={jn.compGrid}>
        {COMPANIONS.map((c) => {
          const active = value === c.id;
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                jn.compChip,
                active && jn.compChipActive,
                pressed && { opacity: 0.76 },
              ]}
              onPress={() => onSelect(c.id)}
            >
              <Text style={jn.compIcon}>{c.icon}</Text>
              <Text style={[jn.compLabel, active && jn.compLabelActive]}>{c.label}</Text>
              {active && (
                <View style={jn.compCheck}>
                  <Feather name="check" size={10} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </StepCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Inspiration (multi-select)
// ─────────────────────────────────────────────────────────────────────────────

function StepInspiracao({
  value,
  onToggle,
  onNext,
}: {
  value: Inspiration[];
  onToggle: (id: Inspiration) => void;
  onNext: () => void;
}) {
  return (
    <StepCard>
      <StepDots current={3} />
      <Text style={jn.stepLabel}>O QUE QUER FAZER?</Text>
      <Text style={jn.stepSub}>Selecione quantas quiser</Text>
      <View style={jn.inspGrid}>
        {INSPIRATIONS.map((ins) => {
          const active = value.includes(ins.id);
          return (
            <Pressable
              key={ins.id}
              style={({ pressed }) => [
                jn.inspChip,
                active && jn.inspChipActive,
                pressed && { opacity: 0.76 },
              ]}
              onPress={() => onToggle(ins.id)}
            >
              <Text style={jn.inspIcon}>{ins.icon}</Text>
              <Text style={[jn.inspLabel, active && jn.inspLabelActive]}>{ins.label}</Text>
              {active && <Feather name="check" size={11} color={GOLD} />}
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={({ pressed }) => [jn.ctaBtn, pressed && { opacity: 0.82 }]}
        onPress={onNext}
      >
        <Text style={jn.ctaBtnText}>Continuar</Text>
        <Feather name="arrow-right" size={15} color={C.cream} />
      </Pressable>
    </StepCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Budget / travel style (auto-advance → generate)
// ─────────────────────────────────────────────────────────────────────────────

function StepEstilo({
  value,
  onSelect,
}: {
  value: BudgetStyle;
  onSelect: (b: BudgetStyle) => void;
}) {
  return (
    <StepCard>
      <StepDots current={4} />
      <Text style={jn.stepLabel}>ESTILO DE VIAGEM</Text>
      <Text style={jn.stepSub}>Geramos seu roteiro após a seleção</Text>
      <View style={jn.budgetCol}>
        {BUDGETS.map((b) => {
          const active = value === b.id;
          return (
            <Pressable
              key={b.id}
              style={({ pressed }) => [
                jn.budgetRow,
                active && jn.budgetRowActive,
                pressed && { opacity: 0.80 },
              ]}
              onPress={() => onSelect(b.id)}
            >
              <View style={[jn.budgetRadio, active && jn.budgetRadioActive]}>
                {active && <View style={jn.budgetDot} />}
              </View>
              <View style={jn.budgetText}>
                <Text style={[jn.budgetLabel, active && jn.budgetLabelActive]}>{b.label}</Text>
                <Text style={jn.budgetDesc}>{b.desc}</Text>
              </View>
              {active && (
                <Animated.View>
                  <Feather name="check-circle" size={18} color={GOLD} />
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>
    </StepCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JourneyOverlay — coordinates all 5 steps over the blurred background
// ─────────────────────────────────────────────────────────────────────────────

interface JourneyGenerateProps {
  nights:       number;
  travelVibe:   TravelVibe;
  inspirations: Inspiration[];
  budget:       BudgetStyle;
  vibe:         Vibe;
}

interface JourneyOverlayProps {
  savedCount: number;
  onGenerate: (p: JourneyGenerateProps) => void;
}

function JourneyOverlay({ savedCount, onGenerate }: JourneyOverlayProps) {
  const [step,         setStep]         = useState(0);
  const [stepKey,      setStepKey]      = useState(0);
  const [nights,       setNights]       = useState(3);
  const [travelVibe,   setTravelVibe]   = useState<TravelVibe>("amigos");
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [budget,       setBudget]       = useState<BudgetStyle>("conforto");

  function advance(toStep?: number) {
    const next = toStep ?? step + 1;
    setStep(next);
    setStepKey((k) => k + 1);
  }

  function handleCompanion(v: TravelVibe) {
    setTravelVibe(v);
    setTimeout(() => advance(), 360);
  }

  function handleBudget(b: BudgetStyle) {
    setBudget(b);
    setTimeout(() =>
      onGenerate({ nights, travelVibe, inspirations, budget: b, vibe: "moderado" }),
    380);
  }

  function handleToggle(id: Inspiration) {
    setInspirations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const blurIntensity = Platform.OS === "ios" ? 65 : Platform.OS === "android" ? 30 : 55;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
      {/* Blur layer */}
      <BlurView
        intensity={blurIntensity}
        tint="light"
        style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      />
      {/* Semi-transparent cream wash on top of blur */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(245,240,232,0.30)", pointerEvents: "none" }]}
      />

      {/* Back button — shown from step 1 */}
      {step > 0 && (
        <Pressable
          style={[jn.backBtn, { top: Platform.OS === "web" ? 74 : 54 }]}
          onPress={() => { setStep((s) => s - 1); setStepKey((k) => k + 1); }}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={20} color={C.darkBrown} />
          <Text style={jn.backBtnText}>Voltar</Text>
        </Pressable>
      )}

      {/* Centered card */}
      <View style={[jn.overlay, { pointerEvents: "box-none" }]} key={stepKey}>
        {step === 0 && (
          <StepDestino onNext={() => advance()} savedCount={savedCount} />
        )}
        {step === 1 && (
          <StepDatas onNext={(n) => { setNights(n); advance(); }} />
        )}
        {step === 2 && (
          <StepCompanhia value={travelVibe} onSelect={handleCompanion} />
        )}
        {step === 3 && (
          <StepInspiracao
            value={inspirations}
            onToggle={handleToggle}
            onNext={() => advance()}
          />
        )}
        {step === 4 && (
          <StepEstilo value={budget} onSelect={handleBudget} />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey styles
// ─────────────────────────────────────────────────────────────────────────────

const jn = StyleSheet.create({
  // Overlay wrapper
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Glass card
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(252,249,244,0.96)",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    boxShadow: "0px 16px 48px rgba(10,5,2,0.18), 0px 4px 12px rgba(10,5,2,0.08)",
  },

  // Progress dots
  dots: {
    flexDirection: "row",
    gap: 6,
    alignSelf: "center",
    marginBottom: 20,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotDone: {
    width: 16,
    backgroundColor: `${GOLD}60`,
  },
  dotActive: {
    width: 24,
    backgroundColor: GOLD,
  },
  dotFuture: {
    width: 8,
    backgroundColor: `${C.darkBrown}18`,
  },

  // Step label
  stepLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    color: GOLD,
    marginBottom: 6,
    textAlign: "center",
  },
  stepSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.warmGray,
    textAlign: "center",
    marginBottom: 20,
  },

  // Back button
  backBtn: {
    position: "absolute",
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(252,249,244,0.80)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${C.darkBrown}14`,
  },
  backBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.darkBrown,
  },

  // CTA button
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: C.darkBrown,
    borderWidth: 1,
    borderColor: `${GOLD}22`,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.cream,
    letterSpacing: 0.2,
  },

  // ── Step 0: Destination hero ───────────────────────────────────────────────
  destHero: {
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: `${GOLD}20`,
  },
  destFlag: {
    fontSize: 32,
    marginBottom: 6,
  },
  destCity: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: C.cream,
    textAlign: "center",
  },
  destSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(245,240,232,0.55)",
  },
  destBadge: {
    marginTop: 10,
    backgroundColor: `${GOLD}20`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${GOLD}30`,
  },
  destBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: GOLD,
  },

  // ── Step 1: Calendar ───────────────────────────────────────────────────────
  dateTags: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },
  dateTag: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: `${C.darkBrown}08`,
    borderWidth: 1,
    borderColor: `${C.darkBrown}12`,
    gap: 2,
  },
  dateTagActive: {
    backgroundColor: `${GOLD}12`,
    borderColor: `${GOLD}40`,
  },
  dateTagLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 0.6,
  },
  dateTagVal: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.darkBrown,
  },
  calNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  calNavMonth: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.darkBrown,
  },
  calWeek: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calWeekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.warmGray,
    letterSpacing: 0.4,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calArr: {
    backgroundColor: C.darkBrown,
    borderRadius: 999,
  },
  calDep: {
    backgroundColor: C.darkBrown,
    borderRadius: 999,
  },
  calRange: {
    backgroundColor: `${GOLD}16`,
  },
  calPast: {
    opacity: 0.28,
  },
  calDayNum: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.darkBrown,
  },
  calDayNumSel: {
    color: C.cream,
    fontFamily: "Inter_600SemiBold",
  },
  calDayNumPast: {
    color: C.warmGray,
  },
  calHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
    textAlign: "center",
    marginTop: 8,
  },

  // ── Step 2: Companion ──────────────────────────────────────────────────────
  compGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  compChip: {
    width: (SW - 40 - 48 - 10) / 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: `${C.darkBrown}06`,
    borderWidth: 1,
    borderColor: `${C.darkBrown}14`,
    position: "relative",
  },
  compChipActive: {
    backgroundColor: `${C.darkBrown}08`,
    borderColor: GOLD,
    borderWidth: 1.5,
  },
  compIcon: {
    fontSize: 22,
  },
  compLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: C.darkBrown,
  },
  compLabelActive: {
    fontFamily: "Inter_600SemiBold",
    color: C.darkBrown,
  },
  compCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Step 3: Inspiration ────────────────────────────────────────────────────
  inspGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  inspChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: `${C.darkBrown}06`,
    borderWidth: 1,
    borderColor: `${C.darkBrown}14`,
  },
  inspChipActive: {
    backgroundColor: `${GOLD}12`,
    borderColor: `${GOLD}55`,
  },
  inspIcon: {
    fontSize: 14,
  },
  inspLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.darkBrown,
  },
  inspLabelActive: {
    fontFamily: "Inter_600SemiBold",
    color: C.darkBrown,
  },

  // ── Step 4: Budget ─────────────────────────────────────────────────────────
  budgetCol: {
    gap: 10,
    marginTop: 4,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: `${C.darkBrown}06`,
    borderWidth: 1,
    borderColor: `${C.darkBrown}12`,
  },
  budgetRowActive: {
    backgroundColor: `${GOLD}08`,
    borderColor: `${GOLD}50`,
    borderWidth: 1.5,
  },
  budgetRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetRadioActive: {
    borderColor: GOLD,
  },
  budgetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  budgetText: {
    flex: 1,
    gap: 2,
  },
  budgetLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.darkBrown,
  },
  budgetLabelActive: {
    color: C.darkBrown,
  },
  budgetDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ReplaceSheet — in-context item replacement overlay
// ─────────────────────────────────────────────────────────────────────────────

interface Suggestion {
  id: string;
  titulo: string;
  localizacao: string;
  image: ReturnType<typeof getNeighborhoodImage>;
  categoria: SavedCategory;
  subtitle?: string;
}

interface ReplaceSheetProps {
  item:      SavedItem;
  diaNum:    number;
  onClose:   () => void;
  onReplace: (diaNum: number, itemId: string, newItem: SavedItem) => void;
}

function ReplaceSheet({ item, diaNum, onClose, onReplace }: ReplaceSheetProps) {
  const [suggestions,  setSuggestions]  = useState<Suggestion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState("");

  useEffect(() => {
    fetchSuggestions();
  }, [item.id]);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      let rows: Suggestion[] = [];

      if (item.categoria === "restaurante") {
        const { data } = await supabase
          .from("restaurantes")
          .select("id, nome, bairro, especialidade, categoria")
          .eq("ativo", true)
          .limit(14);
        rows = (data ?? []).map((r: Record<string, unknown>) => ({
          id:          String(r.id),
          titulo:      (r.nome as string) || "Restaurante",
          localizacao: (r.bairro as string) || "",
          image:       getNeighborhoodImage((r.bairro as string) || ""),
          categoria:   "restaurante" as SavedCategory,
          subtitle:    (r.especialidade as string) ?? (r.categoria as string) ?? undefined,
        }));
      } else if (item.categoria === "lucky") {
        const { data } = await supabase
          .from("lucky_list_rio")
          .select("id, nome, bairro, tipo")
          .limit(14);
        rows = (data ?? []).map((r: Record<string, unknown>) => ({
          id:          String(r.id),
          titulo:      (r.nome as string) || "Lucky pick",
          localizacao: (r.bairro as string) || "",
          image:       getNeighborhoodImage((r.bairro as string) || ""),
          categoria:   "lucky" as SavedCategory,
          subtitle:    (r.tipo as string) ?? undefined,
        }));
      } else {
        const { data } = await supabase
          .from("o_que_fazer_rio")
          .select("id, nome, bairro, categoria")
          .limit(14);
        rows = (data ?? []).map((r: Record<string, unknown>) => ({
          id:          String(r.id),
          titulo:      (r.nome as string) || "Experiência",
          localizacao: (r.bairro as string) || "",
          image:       getNeighborhoodImage((r.bairro as string) || ""),
          categoria:   "oQueFazer" as SavedCategory,
          subtitle:    (r.categoria as string) ?? undefined,
        }));
      }

      // Exclude the item being replaced; prefer same bairro
      const same  = rows.filter((r) => r.localizacao === item.localizacao && r.id !== item.id);
      const other = rows.filter((r) => r.localizacao !== item.localizacao && r.id !== item.id);
      setSuggestions([...same, ...other]);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = searchQuery.trim()
    ? suggestions.filter((s) =>
        s.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.localizacao.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestions;

  function confirmReplace(sug: Suggestion) {
    const newItem: SavedItem = {
      id:          sug.id,
      titulo:      sug.titulo,
      localizacao: sug.localizacao,
      image:       sug.image,
      categoria:   sug.categoria,
    };
    onReplace(diaNum, item.id, newItem);
    onClose();
  }

  return (
    <View style={rs.overlay}>
      {/* Header */}
      <View style={rs.header}>
        <Pressable style={({ pressed }) => [rs.headerBtn, pressed && { opacity: 0.65 }]} onPress={onClose}>
          <Feather name="arrow-left" size={18} color={CREAM} />
        </Pressable>
        <View style={rs.headerCenter}>
          <Text style={rs.headerTitle}>Substituir lugar</Text>
          <Text style={rs.headerSub} numberOfLines={1}>{item.titulo}</Text>
        </View>
        <View style={rs.headerBtn} />
      </View>

      {/* Search */}
      <View style={rs.searchRow}>
        <Feather name="search" size={14} color={`${GOLD}80`} style={rs.searchIcon} />
        <TextInput
          style={rs.searchInput}
          placeholder="Buscar outro lugar…"
          placeholderTextColor="rgba(245,240,232,0.30)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={14} color={`${GOLD}80`} />
          </Pressable>
        )}
      </View>

      <Text style={rs.sectionLabel}>
        {searchQuery ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}` : "✦ Sugestões para substituir"}
      </Text>

      {/* Suggestions list */}
      {loading ? (
        <View style={rs.loadingRow}>
          <Feather name="loader" size={20} color={GOLD} />
          <Text style={rs.loadingText}>Buscando opções…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={rs.listContent}
        >
          {filtered.map((sug) => (
            <Pressable
              key={sug.id}
              style={({ pressed }) => [rs.sugCard, pressed && { opacity: 0.82 }]}
              onPress={() => confirmReplace(sug)}
            >
              <View style={rs.sugThumb}>
                <Image source={sug.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <LinearGradient colors={["transparent", "rgba(8,4,1,0.50)"]} style={StyleSheet.absoluteFill} />
              </View>
              <View style={rs.sugInfo}>
                <Text style={rs.sugName} numberOfLines={1}>{sug.titulo}</Text>
                <View style={rs.sugLocRow}>
                  <Feather name="map-pin" size={9} color={`${GOLD}80`} />
                  <Text style={rs.sugLoc} numberOfLines={1}>{sug.localizacao}</Text>
                </View>
                {sug.subtitle ? (
                  <View style={rs.sugBadge}>
                    <Text style={rs.sugBadgeText}>{sug.subtitle}</Text>
                  </View>
                ) : null}
              </View>
              <View style={rs.useBtn}>
                <Text style={rs.useBtnText}>Usar</Text>
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 && !loading && (
            <View style={rs.emptyState}>
              <Feather name="search" size={24} color={`${GOLD}50`} />
              <Text style={rs.emptyText}>Nenhum lugar encontrado</Text>
              <Text style={rs.emptySub}>Tente outro termo de busca</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const rs = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,4,1,0.97)",
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
    gap: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201,168,76,0.10)",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: CREAM,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "rgba(245,240,232,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: CREAM,
    padding: 0,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: `${GOLD}90`,
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 40,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(245,240,232,0.45)",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 10,
  },
  sugCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 12,
  },
  sugThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(30,15,5,0.60)",
    flexShrink: 0,
  },
  sugInfo: {
    flex: 1,
    gap: 4,
  },
  sugName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: CREAM,
    lineHeight: 17,
  },
  sugLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sugLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
    flex: 1,
  },
  sugBadge: {
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    alignSelf: "flex-start",
  },
  sugBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: `${GOLD}CC`,
  },
  useBtn: {
    backgroundColor: "rgba(201,168,76,0.16)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  useBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: GOLD,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "rgba(245,240,232,0.50)",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(245,240,232,0.30)",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen header
// ─────────────────────────────────────────────────────────────────────────────

function ScreenHeader({
  phase,
  onBack,
  onShare,
}: {
  phase: "journey" | "loading" | "result";
  onBack: () => void;
  onShare?: () => void;
}) {
  if (phase === "journey") return null;

  const isResult = phase === "result";

  return (
    <View style={hd.wrap}>
      <Pressable
        style={({ pressed }) => [hd.btn, pressed && { opacity: 0.65 }]}
        onPress={onBack}
        hitSlop={10}
      >
        <Feather name="arrow-left" size={18} color={isResult ? CREAM : C.darkBrown} />
      </Pressable>

      <View style={hd.center}>
        <Text style={[hd.title, isResult && hd.titleLight]}>
          {isResult ? "Roteiro automático" : "Criando roteiro…"}
        </Text>
        <Text style={[hd.sub, isResult && hd.subLight]}>Rio de Janeiro</Text>
      </View>

      {isResult ? (
        <Pressable
          style={({ pressed }) => [hd.btn, pressed && { opacity: 0.65 }]}
          onPress={onShare}
          hitSlop={10}
        >
          <Feather name="share" size={18} color={CREAM} />
        </Pressable>
      ) : (
        <View style={hd.btn} />
      )}
    </View>
  );
}

const hd = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(20,10,5,0.42)",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: C.darkBrown,
  },
  titleLight: {
    color: CREAM,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
    marginTop: 1,
  },
  subLight: {
    color: "rgba(245,240,232,0.45)",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Loading phase — premium animated loader
// ─────────────────────────────────────────────────────────────────────────────

function LoadingPhase() {
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dots = [dot0, dot1, dot2];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 260),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 260),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={sc.loadingWrap}>
      <View style={sc.loadingIconRing}>
        <Feather name="zap" size={22} color={GOLD} />
      </View>
      <Text style={sc.loadingText}>Estamos organizando sua viagem</Text>
      <Text style={sc.loadingSubText}>Selecionando as melhores experiências para você</Text>
      <View style={sc.loadingDots}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[sc.loadingDot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result phase — day-by-day itinerary
// ─────────────────────────────────────────────────────────────────────────────

interface ResultPhaseProps {
  result:         ItineraryResult;
  hotelItem:      SavedItem | null;
  totalPlaces:    number;
  editMode:       boolean;
  onToggleEdit:   () => void;
  onReplaceItem:  (diaNum: number, itemId: string, newItem: SavedItem) => void;
  onShareResult:  () => void;
}

function ResultPhase({
  result,
  hotelItem,
  totalPlaces,
  editMode,
  onToggleEdit,
  onReplaceItem,
  onShareResult,
}: ResultPhaseProps) {
  const { totalDays, totalItems } = result.summary;

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Olá! Criei meu roteiro de ${totalDays} dias no Rio de Janeiro com o Lucky Trip. Pode me ajudar a refinar?`
    );
    Linking.openURL(`https://wa.me/?text=${msg}`);
  }

  return (
    <>
      {/* ── Edit mode banner ── */}
      {editMode && (
        <View style={re.editBanner}>
          <Feather name="edit-2" size={12} color={GOLD} />
          <Text style={re.editBannerText}>Toque em um item para substituí-lo</Text>
          <Pressable onPress={onToggleEdit} hitSlop={8}>
            <Text style={re.editBannerDone}>Concluir</Text>
          </Pressable>
        </View>
      )}

      {/* ── Hotel card ── */}
      {hotelItem && (
        <Pressable
          style={re.hotelCard}
          onPress={() => router.push({ pathname: "/ondeFicar/hotel/[hotelId]", params: { hotelId: hotelItem.id } })}
        >
          {/* Thumbnail */}
          <View style={re.hotelThumb}>
            <Image source={hotelItem.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(8,4,1,0.55)"]}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {/* Content */}
          <View style={re.hotelContent}>
            <Text style={re.hotelLabel}>✦ Hotel recomendado</Text>
            <Text style={re.hotelName} numberOfLines={1}>{hotelItem.titulo}</Text>
            {hotelItem.localizacao ? (
              <View style={re.hotelLocRow}>
                <Feather name="map-pin" size={9} color={`${GOLD}90`} />
                <Text style={re.hotelLoc} numberOfLines={1}>{hotelItem.localizacao}</Text>
              </View>
            ) : null}
          </View>
          <Feather name="chevron-right" size={16} color={`${GOLD}60`} />
        </Pressable>
      )}

      {/* ── Summary card ── */}
      <View style={re.summary}>
        <Text style={re.summaryTitle}>
          {totalItems} {totalItems === 1 ? "item" : "itens"} em {totalDays} {totalDays === 1 ? "dia" : "dias"}
        </Text>
        <Text style={re.summarySub}>Roteiro otimizado por proximidade geográfica</Text>
        {result.days.length > 0 && (
          <View style={re.dayPills}>
            <Text style={re.dayPillsLabel}>Ir para: </Text>
            {result.days.map((dia) => (
              <View key={dia.numero} style={re.dayPill}>
                <Text style={re.dayPillText}>Dia {dia.numero}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Action row ── */}
      <View style={re.actionRow}>
        <Pressable
          style={({ pressed }) => [re.actionBtn, re.actionBtnWA, pressed && { opacity: 0.82 }]}
          onPress={handleWhatsApp}
        >
          <Feather name="message-circle" size={15} color={CREAM} />
          <Text style={re.actionBtnText}>Refinar no WhatsApp</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [re.actionBtn, re.actionBtnEdit, pressed && { opacity: 0.82 }]}
          onPress={onToggleEdit}
        >
          <Feather name="edit-2" size={15} color={GOLD} />
          <Text style={[re.actionBtnText, { color: GOLD }]}>
            {editMode ? "Sair da edição" : "Editar roteiro"}
          </Text>
        </Pressable>
      </View>

      {/* ── Map CTA ── */}
      <Pressable style={({ pressed }) => [re.mapCta, pressed && { opacity: 0.80 }]} onPress={() => {}}>
        <View style={re.mapCtaLeft}>
          <View style={re.mapCtaIcon}>
            <Feather name="map-pin" size={14} color={GOLD} />
          </View>
          <View>
            <Text style={re.mapCtaLabel}>Ver no mapa</Text>
            <Text style={re.mapCtaSub}>{totalPlaces} {totalPlaces === 1 ? "lugar" : "lugares"}</Text>
          </View>
        </View>
        <Feather name="arrow-right" size={15} color={`${GOLD}70`} />
      </Pressable>

      {/* ── Day cards ── */}
      {result.days.map((dia) => (
        <ResultDayCard
          key={`${dia.numero}-${dia.bairro}`}
          dia={dia}
          editMode={editMode}
          onReplaceItem={onReplaceItem}
        />
      ))}
    </>
  );
}

function navigateToItem(item: SavedItem) {
  switch (item.categoria) {
    case "restaurante":
      router.push({ pathname: "/comerBem/[id]", params: { id: item.id } });
      break;
    case "hotel":
      router.push({ pathname: "/ondeFicar/hotel/[hotelId]", params: { hotelId: item.id } });
      break;
    case "oQueFazer":
    case "lucky":
    default:
      router.push({ pathname: "/lugar/[cityId]/[placeId]", params: { cityId: "rio", placeId: item.id } });
      break;
  }
}

function ResultDayCard({
  dia,
  editMode,
  onReplaceItem,
}: {
  dia:           DiaRoteiro;
  editMode:      boolean;
  onReplaceItem: (diaNum: number, itemId: string, newItem: SavedItem) => void;
}) {
  const weather = getDayWeather(dia.numero);
  const allItems = dia.periodos.flatMap((p) => p.items);
  const travelMinTotal = Math.max(25, allItems.length * 16);

  return (
    <View style={re.dayCard}>
      {/* ── Day header ── */}
      <View style={re.dayHeader}>
        <View style={re.dayNumBadge}>
          <Text style={re.dayNumText}>DIA {dia.numero}</Text>
        </View>
        <Text style={re.dayBairro} numberOfLines={1}>{dia.bairro}</Text>
        <Text style={re.weatherEmoji}>{weather}</Text>
        <View style={re.travelChip}>
          <Feather name="clock" size={10} color="rgba(245,240,232,0.45)" />
          <Text style={re.travelChipText}>{travelMinTotal} min total</Text>
        </View>
      </View>

      {/* ── Period blocks ── */}
      <View style={re.dayBody}>
        {dia.periodos.map((periodo) => (
          <View key={periodo.periodo} style={re.periodSection}>
            {/* Period label row */}
            <View style={re.periodHeaderRow}>
              <Feather
                name={PERIODO_ICON[periodo.periodo] as any}
                size={11}
                color={GOLD}
              />
              <Text style={re.periodLabel}>{PERIODO_LABEL[periodo.periodo]}</Text>
              <View style={re.periodDivider} />
            </View>

            {/* Items */}
            {periodo.items.map((item, idx) => {
              const timeStr = getItemTime(periodo.periodo, idx);
              const travelMin = 10 + ((dia.numero * 7 + idx * 5) % 22);
              const travelKm  = (1.8 + (dia.numero + idx) * 1.3).toFixed(1);

              return (
                <React.Fragment key={item.id}>
                  <Pressable
                    style={({ pressed }) => [re.itemRow, pressed && { opacity: 0.80 }]}
                    onPress={() => {
                      if (editMode) {
                        onReplaceItem(dia.numero, item.id, item);
                      } else {
                        navigateToItem(item);
                      }
                    }}
                  >
                    {/* Left: time */}
                    <View style={re.timeCol}>
                      <Text style={re.timeLabel}>{timeStr}</Text>
                    </View>

                    {/* Thumbnail */}
                    <View style={re.thumb}>
                      <Image
                        source={item.image}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(8,4,1,0.45)"]}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>

                    {/* Info */}
                    <View style={re.itemInfo}>
                      <Text style={re.itemName} numberOfLines={1}>{item.titulo}</Text>
                      <View style={re.itemLocRow}>
                        <Feather name="map-pin" size={9} color={`${GOLD}80`} />
                        <Text style={re.itemLoc} numberOfLines={1}>
                          {item.localizacao ?? dia.bairro}
                        </Text>
                      </View>
                      <View style={re.catBadge}>
                        <Text style={re.catBadgeText}>{CATEGORY_LABEL[item.categoria]}</Text>
                      </View>
                    </View>

                    {editMode ? (
                      <View style={re.swapBtn}>
                        <Feather name="refresh-cw" size={13} color={GOLD} />
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={14} color="rgba(245,240,232,0.25)" />
                    )}
                  </Pressable>

                  {/* Travel connector between items */}
                  {idx < periodo.items.length - 1 && (
                    <View style={re.travelConnector}>
                      <View style={re.timeColSpacer} />
                      <View style={re.connectorPill}>
                        <Feather name="truck" size={9} color="rgba(245,240,232,0.40)" />
                        <Text style={re.connectorText}>
                          Carro · {travelMin} min · {travelKm} km
                        </Text>
                      </View>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const re = StyleSheet.create({
  // ── Hotel card ─────────────────────────────────────────────────────────────
  hotelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: GLASS_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 14,
    marginBottom: 14,
  },
  hotelThumb: {
    width: 62,
    height: 62,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30,15,5,0.60)",
    flexShrink: 0,
  },
  hotelContent: {
    flex: 1,
    gap: 3,
  },
  hotelLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: `${GOLD}90`,
    letterSpacing: 1.0,
  },
  hotelName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 15,
    color: CREAM,
    lineHeight: 20,
  },
  hotelLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  hotelLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.50)",
    flex: 1,
  },

  // ── Summary card ───────────────────────────────────────────────────────────
  summary: {
    backgroundColor: GLASS_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 18,
    marginBottom: 14,
    gap: 6,
  },
  summaryTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: CREAM,
    lineHeight: 24,
  },
  summarySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.40)",
    lineHeight: 16,
  },
  dayPills: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  dayPillsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.40)",
  },
  dayPill: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
  },

  // ── Action row ─────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnWA: {
    backgroundColor: "rgba(18,40,18,0.70)",
    borderColor: "rgba(40,120,40,0.25)",
  },
  actionBtnEdit: {
    backgroundColor: GLASS_BG,
    borderColor: "rgba(201,168,76,0.22)",
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: CREAM,
  },

  // ── Map CTA ────────────────────────────────────────────────────────────────
  mapCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  mapCtaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mapCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCtaLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: CREAM,
  },
  mapCtaSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.40)",
    marginTop: 1,
  },

  // ── Day card ───────────────────────────────────────────────────────────────
  dayCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: GLASS_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.10)",
  },
  dayNumBadge: {
    backgroundColor: "rgba(201,168,76,0.16)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.28)",
    flexShrink: 0,
  },
  dayNumText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.5,
  },
  dayBairro: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 15,
    color: CREAM,
    flex: 1,
  },
  weatherEmoji: {
    fontSize: 16,
    flexShrink: 0,
  },
  travelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,240,232,0.06)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    flexShrink: 0,
  },
  travelChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(245,240,232,0.40)",
  },

  // ── Day body / periods ─────────────────────────────────────────────────────
  dayBody: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  periodSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  periodHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  periodLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 0.8,
  },
  periodDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(201,168,76,0.14)",
  },

  // ── Item row ───────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  timeCol: {
    width: 42,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  timeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(245,240,232,0.55)",
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30,15,5,0.60)",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: CREAM,
    lineHeight: 17,
  },
  itemLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
    flex: 1,
  },
  catBadge: {
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    alignSelf: "flex-start",
  },
  catBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: `${GOLD}CC`,
    letterSpacing: 0.3,
  },

  // ── Travel connector ───────────────────────────────────────────────────────
  travelConnector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 2,
  },
  timeColSpacer: {
    width: 42,
    flexShrink: 0,
  },
  connectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,240,232,0.05)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    marginLeft: 4,
  },
  connectorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(245,240,232,0.35)",
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.22)",
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editBannerText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(245,240,232,0.70)",
  },
  editBannerDone: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: GOLD,
  },
  swapBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    alignItems: "center",
    justifyContent: "center",
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

  const [result,        setResult]        = useState<ItineraryResult | null>(null);
  const [generating,    setGenerating]    = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [replacingItem, setReplacingItem] = useState<{ item: SavedItem; diaNum: number } | null>(null);

  function replaceItem(diaNum: number, itemId: string, newItem: SavedItem) {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((dia) => {
          if (dia.numero !== diaNum) return dia;
          return {
            ...dia,
            periodos: dia.periodos.map((periodo) => ({
              ...periodo,
              items: periodo.items.map((it) => (it.id === itemId ? newItem : it)),
            })),
          };
        }),
      };
    });
  }

  function openReplaceSheet(diaNum: number, _itemId: string, item: SavedItem) {
    setReplacingItem({ item, diaNum });
  }

  async function handleShare() {
    if (!result) return;
    const lines: string[] = [`✦ Roteiro Rio de Janeiro — The Lucky Trip\n`];
    for (const dia of result.days) {
      lines.push(`📍 Dia ${dia.numero} — ${dia.bairro}`);
      for (const periodo of dia.periodos) {
        const label = PERIODO_LABEL[periodo.periodo];
        const items = periodo.items.map((it) => `  • ${it.titulo} (${it.localizacao || dia.bairro})`).join("\n");
        if (items) lines.push(`${label}\n${items}`);
      }
      lines.push("");
    }
    try {
      await Share.share({
        message: lines.join("\n").trim(),
        title:   "Roteiro Rio de Janeiro",
      });
    } catch {
      // dismissed
    }
  }

  const hotelItem   = saved.find((s) => s.categoria === "hotel") ?? null;
  const totalPlaces = saved.filter((s) => s.categoria !== "hotel").length;

  async function handleGenerate({
    nights, travelVibe, inspirations, budget, vibe,
  }: JourneyGenerateProps) {
    if (generating) return;
    setGenerating(true);

    try {
      const serializableItems = saved.map((s) => ({
        id:          s.id,
        titulo:      s.titulo,
        categoria:   s.categoria,
        localizacao: s.localizacao,
      }));

      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          savedItems:   serializableItems,
          destination:  "Rio de Janeiro",
          preferences:  { inspirations, vibe, travelVibe, budget },
          requestedDays: nights,
        },
      });

      if (error || !data?.days) throw new Error(error?.message ?? "empty response");

      const savedMap = new Map(saved.map((s) => [s.id, s]));
      const hydratedDays: DiaRoteiro[] = (data.days as DiaRoteiro[]).map((day) => ({
        ...day,
        periodos: day.periodos.map((p) => ({
          ...p,
          items: p.items.map((item) => savedMap.get(item.id) ?? item).filter(Boolean),
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
      const prefs: ItineraryPreferences = { inspirations, vibe };
      setResult(buildItinerary(saved, prefs));
    } finally {
      setGenerating(false);
    }
  }

  const phase: "journey" | "loading" | "result" =
    generating ? "loading" : result ? "result" : "journey";

  // Hero image for cinematic result background — prefer hotel image
  const heroImg = hotelItem?.image ?? require("@/assets/images/ipanema.png");

  return (
    <View style={sc.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Light atmospheric background (journey phase only) ── */}
      {phase === "journey" && (
        <View style={[sc.heroBg, { pointerEvents: "none" }]}>
          <LinearGradient
            colors={[C.cream, "#EDE5D6", "#E4D9C5"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={sc.heroWatermark}>{"RIO\nDE\nJAN."}</Text>
          <View style={sc.heroAccent} />
        </View>
      )}

      {/* ── Cinematic dark background (loading + result phases) ── */}
      {phase !== "journey" && (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <Image source={heroImg} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(12,6,2,0.78)", "rgba(8,4,1,0.90)", "rgba(5,2,0,0.97)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* ── Header (hidden in journey phase) ── */}
      {phase !== "journey" && (
        <View style={{ paddingTop: topPad }}>
          <ScreenHeader
            phase={phase}
            onBack={() => { setResult(null); setGenerating(false); setEditMode(false); }}
            onShare={handleShare}
          />
        </View>
      )}

      {/* ── Phase content ── */}
      {phase === "journey" && (
        <JourneyOverlay savedCount={saved.length} onGenerate={handleGenerate} />
      )}

      {phase === "loading" && <LoadingPhase />}

      {phase === "result" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={[sc.content, { paddingBottom: bottomPad + 40 }]}
        >
          <ResultPhase
            result={result!}
            hotelItem={hotelItem}
            totalPlaces={totalPlaces}
            editMode={editMode}
            onToggleEdit={() => setEditMode((v) => !v)}
            onReplaceItem={openReplaceSheet}
            onShareResult={handleShare}
          />
        </ScrollView>
      )}

      {/* ── Replace sheet overlay ── */}
      {replacingItem && (
        <ReplaceSheet
          item={replacingItem.item}
          diaNum={replacingItem.diaNum}
          onClose={() => setReplacingItem(null)}
          onReplace={(diaNum, itemId, newItem) => {
            replaceItem(diaNum, itemId, newItem);
            setReplacingItem(null);
          }}
        />
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  heroWatermark: {
    position: "absolute",
    right: -8,
    bottom: 60,
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 64,
    lineHeight: 68,
    color: `${C.darkBrown}07`,
    textAlign: "right",
    letterSpacing: -2,
  },
  heroAccent: {
    position: "absolute",
    top: "30%",
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${GOLD}06`,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  loadingIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${GOLD}12`,
    borderWidth: 1,
    borderColor: `${GOLD}30`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  loadingText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: CREAM,
    textAlign: "center",
    lineHeight: 28,
  },
  loadingSubText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(245,240,232,0.55)",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GOLD,
  },
});

