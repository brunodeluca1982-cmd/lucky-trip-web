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

import React, { useEffect, useRef, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
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

const C          = Colors.light;
const GOLD       = "#D4AF37";
const DARK_BROWN = "#FFFFFF";
const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// Types + static data
// ─────────────────────────────────────────────────────────────────────────────

type TravelVibe  = "solo" | "casal" | "amigos" | "família";
type BudgetStyle = "essencial" | "conforto" | "sofisticado";

const COMPANIONS: { id: TravelVibe; label: string; icon: string }[] = [
  { id: "solo",    label: "Solo",    icon: "user"  },
  { id: "casal",   label: "Casal",   icon: "heart" },
  { id: "amigos",  label: "Amigos",  icon: "users" },
  { id: "família", label: "Família", icon: "home"  },
];

const BUDGETS: { id: BudgetStyle; label: string; desc: string }[] = [
  { id: "essencial",   label: "Essencial",   desc: "Custo-benefício · experiências acessíveis" },
  { id: "conforto",    label: "Conforto",    desc: "Qualidade equilibrada · bom e bem feito" },
  { id: "sofisticado", label: "Sofisticado", desc: "Melhor do Rio · exclusivo e premium" },
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

type WeatherIcon = "sun" | "cloud" | "wind";
const WEATHER_SEQ: WeatherIcon[] = ["sun", "sun", "cloud", "cloud", "cloud", "sun", "wind", "sun"];
function getDayWeather(dayNum: number): WeatherIcon {
  return WEATHER_SEQ[(dayNum - 1) % WEATHER_SEQ.length];
}

const GLASS_BG     = "rgba(255,255,255,0.10)";
const GLASS_HEADER = "rgba(0,0,0,0.90)";
const GLASS_BORDER = "rgba(255,255,255,0.18)";
const CREAM        = "#FFFFFF";

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
// Inspiration cards data — image-based 3×2 grid
// ─────────────────────────────────────────────────────────────────────────────

const INSPIRATIONS_DATA: { id: Inspiration; label: string; image: ReturnType<typeof require> }[] = [
  { id: "natureza",   label: "Natureza",    image: require("@/assets/images/rio-aerial-clean.png") },
  { id: "gastronomy", label: "Gastronomia", image: require("@/assets/images/restaurante1.png") },
  { id: "culture",    label: "Cultura",     image: require("@/assets/images/cristo.png") },
  { id: "adventure",  label: "Aventura",    image: require("@/assets/images/pao-acucar.png") },
  { id: "beach",      label: "Relaxamento", image: require("@/assets/images/ipanema.png") },
  { id: "festa",      label: "Festa",       image: require("@/assets/images/lapa.png") },
];


// ─────────────────────────────────────────────────────────────────────────────
// Journey types
// ─────────────────────────────────────────────────────────────────────────────

interface JourneyGenerateProps {
  nights:       number;
  travelVibe:   TravelVibe;
  inspirations: Inspiration[];
  budget:       BudgetStyle;
  vibe:         Vibe;
}

// ─────────────────────────────────────────────────────────────────────────────
// InlineCalendar — compact date picker rendered inline in the scroll view
// ─────────────────────────────────────────────────────────────────────────────

function InlineCalendar({
  value,
  minDate,
  onSelect,
}: {
  value: Date | null;
  minDate?: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(value ?? today);
  const days = calDays(viewMonth);
  const min  = minDate ?? today;

  return (
    <View style={fp.cal}>
      <View style={fp.calHeader}>
        <Pressable onPress={() => setViewMonth(addMonths(viewMonth, -1))} hitSlop={12}>
          <Feather name="chevron-left" size={18} color={CREAM} />
        </Pressable>
        <Text style={fp.calMonth}>
          {MONTH_PT[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <Pressable onPress={() => setViewMonth(addMonths(viewMonth, 1))} hitSlop={12}>
          <Feather name="chevron-right" size={18} color={CREAM} />
        </Pressable>
      </View>
      <View style={fp.calWeek}>
        {DAY_PT.map((d, i) => (
          <Text key={i} style={fp.calWeekDay}>{d}</Text>
        ))}
      </View>
      <View style={fp.calGrid}>
        {days.map((d, i) => {
          if (!d) return <View key={i} style={fp.calCell} />;
          const selected = value ? isSameDay(d, value) : false;
          const past = isBeforeDay(d, min) && !isSameDay(d, min);
          return (
            <Pressable
              key={i}
              style={[fp.calCell, selected && fp.calCellActive, past && fp.calCellPast]}
              onPress={() => !past && onSelect(d)}
              disabled={past}
            >
              <Text style={[
                fp.calDayText,
                selected && fp.calDayTextActive,
                past && fp.calDayTextPast,
              ]}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowPage1 — Destination (optional) + Dates
// ─────────────────────────────────────────────────────────────────────────────

interface FlowPage1Props {
  showDestination: boolean;
  destination: string;
  onDestinationChange: (v: string) => void;
  arrivalDate: Date | null;
  departureDate: Date | null;
  onArrivalChange: (d: Date) => void;
  onDepartureChange: (d: Date) => void;
  onNext: () => void;
}

function FlowPage1({
  showDestination,
  destination,
  onDestinationChange,
  arrivalDate,
  departureDate,
  onArrivalChange,
  onDepartureChange,
  onNext,
}: FlowPage1Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 72 : insets.top + 20;
  const [openCal, setOpenCal] = useState<"arrival" | "departure" | null>(null);

  function fmtDate(d: Date | null): string | null {
    if (!d) return null;
    return `${d.getDate()} de ${MONTH_PT[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  }

  function handleArrival(d: Date) {
    onArrivalChange(d);
    setOpenCal("departure");
    if (departureDate && !isBeforeDay(d, departureDate)) {
      onDepartureChange(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    }
  }

  function handleDeparture(d: Date) {
    onDepartureChange(d);
    setOpenCal(null);
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[fp.page, { paddingTop: topPad, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={fp.bigTitle}>Criar roteiro</Text>
      <Text style={fp.bigSub}>Vamos organizar sua viagem em poucos passos.</Text>
      <View style={fp.divider} />

      {showDestination && (
        <View style={fp.section}>
          <Text style={fp.sectionLabel}>Vai pra onde?</Text>
          <View style={fp.searchRow}>
            <Feather name="search" size={16} color="rgba(255,255,255,0.50)" />
            <TextInput
              style={fp.searchInput}
              placeholder="Rio de Janeiro"
              placeholderTextColor="rgba(255,255,255,0.38)"
              value={destination}
              onChangeText={onDestinationChange}
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      <View style={fp.section}>
        <Text style={fp.sectionLabel}>Quando será a viagem?</Text>
        <Text style={fp.sectionSub}>Informe as datas de chegada e partida. (Opcional)</Text>

        <Pressable
          style={[fp.dateField, openCal === "arrival" && fp.dateFieldActive]}
          onPress={() => setOpenCal(openCal === "arrival" ? null : "arrival")}
        >
          <Feather name="calendar" size={15} color="rgba(255,255,255,0.50)" />
          <Text style={[fp.dateFieldText, !arrivalDate && fp.dateFieldPlaceholder]}>
            {fmtDate(arrivalDate) ?? "Data de chegada"}
          </Text>
          <Feather
            name={openCal === "arrival" ? "chevron-up" : "chevron-down"}
            size={13}
            color="rgba(255,255,255,0.35)"
          />
        </Pressable>
        {openCal === "arrival" && (
          <InlineCalendar value={arrivalDate} onSelect={handleArrival} />
        )}

        <Pressable
          style={[fp.dateField, openCal === "departure" && fp.dateFieldActive]}
          onPress={() => setOpenCal(openCal === "departure" ? null : "departure")}
        >
          <Feather name="calendar" size={15} color="rgba(255,255,255,0.50)" />
          <Text style={[fp.dateFieldText, !departureDate && fp.dateFieldPlaceholder]}>
            {fmtDate(departureDate) ?? "Data de partida"}
          </Text>
          <Feather
            name={openCal === "departure" ? "chevron-up" : "chevron-down"}
            size={13}
            color="rgba(255,255,255,0.35)"
          />
        </Pressable>
        {openCal === "departure" && (
          <InlineCalendar
            value={departureDate}
            minDate={arrivalDate}
            onSelect={handleDeparture}
          />
        )}
      </View>

      <Pressable
        style={({ pressed }) => [fp.cta, pressed && { opacity: 0.85 }]}
        onPress={onNext}
      >
        <Text style={fp.ctaText}>Continuar</Text>
        <Feather name="chevron-right" size={17} color={C.darkBrown} />
      </Pressable>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowPage2 — Inspirations + Vibe + Budget
// ─────────────────────────────────────────────────────────────────────────────

interface FlowPage2Props {
  inspirations: Inspiration[];
  onToggleInspiration: (id: Inspiration) => void;
  travelVibe: TravelVibe;
  onTravelVibeChange: (v: TravelVibe) => void;
  budget: BudgetStyle;
  onBudgetChange: (b: BudgetStyle) => void;
  onBack: () => void;
  onGenerate: () => void;
}

function FlowPage2({
  inspirations,
  onToggleInspiration,
  travelVibe,
  onTravelVibeChange,
  budget,
  onBudgetChange,
  onBack,
  onGenerate,
}: FlowPage2Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 72 : insets.top + 20;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[fp.page, { paddingTop: topPad, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={fp.backRow} onPress={onBack} hitSlop={12}>
        <Feather name="chevron-left" size={20} color={CREAM} />
        <Text style={fp.backText}>Voltar</Text>
      </Pressable>

      <Text style={fp.bigTitle}>O que te inspira?</Text>
      <Text style={fp.bigSub}>
        Selecione o que você ama para personalizarmos seu roteiro
      </Text>

      <View style={fp.insGrid}>
        {INSPIRATIONS_DATA.map((ins) => {
          const active = inspirations.includes(ins.id);
          return (
            <Pressable
              key={ins.id}
              style={[fp.insCard, active && fp.insCardActive]}
              onPress={() => onToggleInspiration(ins.id)}
            >
              <Image source={ins.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.80)"]}
                locations={[0.25, 1]}
                style={StyleSheet.absoluteFill}
              />
              {active && (
                <View style={fp.insCheck}>
                  <Feather name="check" size={11} color={GOLD} />
                </View>
              )}
              <Text style={fp.insLabel}>{ins.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={fp.glassSection}>
        <Text style={fp.glassSectionLabel}>Qual a vibe da viagem?</Text>
        <View style={fp.pillRow}>
          {COMPANIONS.map((c) => {
            const active = travelVibe === c.id;
            return (
              <Pressable
                key={c.id}
                style={[fp.pill, active && fp.pillActive]}
                onPress={() => onTravelVibeChange(c.id)}
              >
                <Feather
                  name={c.icon as any}
                  size={12}
                  color={active ? "rgba(0,0,0,0.70)" : "rgba(255,255,255,0.55)"}
                />
                <Text style={[fp.pillText, active && fp.pillTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={fp.glassSection}>
        <Text style={fp.glassSectionLabel}>Estilo da viagem (opcional)</Text>
        <View style={fp.pillRow}>
          {BUDGETS.map((b) => {
            const active = budget === b.id;
            return (
              <Pressable
                key={b.id}
                style={[fp.pill, active && fp.pillActive]}
                onPress={() => onBudgetChange(b.id)}
              >
                <Text style={[fp.pillText, active && fp.pillTextActive]}>{b.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [fp.cta, pressed && { opacity: 0.85 }]}
        onPress={onGenerate}
      >
        <Text style={fp.ctaText}>Criar meu roteiro</Text>
        <Feather name="chevron-right" size={17} color={C.darkBrown} />
      </Pressable>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TripFlow — coordinates the 2-page journey flow
// ─────────────────────────────────────────────────────────────────────────────

interface TripFlowProps {
  savedCount:   number;
  isContextual: boolean;
  onGenerate:   (p: JourneyGenerateProps) => void;
}

function TripFlow({ savedCount: _savedCount, isContextual, onGenerate }: TripFlowProps) {
  if (isContextual) return <ContextualFlow onGenerate={onGenerate} />;
  return <StandardFlow onGenerate={onGenerate} />;
}

function StandardFlow({ onGenerate }: { onGenerate: (p: JourneyGenerateProps) => void }) {
  const [page,          setPage]          = useState(0);
  const [destination,   setDestination]   = useState("Rio de Janeiro");
  const [arrivalDate,   setArrivalDate]   = useState<Date | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [travelVibe,    setTravelVibe]    = useState<TravelVibe>("amigos");
  const [inspirations,  setInspirations]  = useState<Inspiration[]>([]);
  const [budget,        setBudget]        = useState<BudgetStyle>("conforto");

  function handleNext() { setPage(1); }
  function handleBack() { setPage(0); }

  function handleGenerate() {
    const n =
      arrivalDate && departureDate
        ? Math.max(1, Math.round(
            (departureDate.getTime() - arrivalDate.getTime()) / 86400000,
          ))
        : 3;
    onGenerate({ nights: n, travelVibe, inspirations, budget, vibe: "moderado" });
  }

  function toggleInspiration(id: Inspiration) {
    setInspirations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return page === 0 ? (
    <FlowPage1
      showDestination
      destination={destination}
      onDestinationChange={setDestination}
      arrivalDate={arrivalDate}
      departureDate={departureDate}
      onArrivalChange={setArrivalDate}
      onDepartureChange={setDepartureDate}
      onNext={handleNext}
    />
  ) : (
    <FlowPage2
      inspirations={inspirations}
      onToggleInspiration={toggleInspiration}
      travelVibe={travelVibe}
      onTravelVibeChange={setTravelVibe}
      budget={budget}
      onBudgetChange={setBudget}
      onBack={handleBack}
      onGenerate={handleGenerate}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContextualFlow — step-based wizard for Viagem contextual entry
// Steps: 0 = Dates  1 = Company  2 = Interests  3 = Style/Budget
// ─────────────────────────────────────────────────────────────────────────────

function ContextualFlow({ onGenerate }: { onGenerate: (p: JourneyGenerateProps) => void }) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 72 : insets.top + 20;

  const [step,          setStep]          = useState(0);
  const [arrivalDate,   setArrivalDate]   = useState<Date | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [openCal,       setOpenCal]       = useState<"arrival" | "departure" | null>(null);
  const [travelVibe,    setTravelVibe]    = useState<TravelVibe | null>(null);
  const [inspirations,  setInspirations]  = useState<Inspiration[]>([]);
  const [budget,        setBudget]        = useState<BudgetStyle | null>(null);

  function fmtDate(d: Date | null): string | null {
    if (!d) return null;
    return `${d.getDate()} de ${MONTH_PT[d.getMonth()].toLowerCase()}`;
  }

  function handleArrival(d: Date) {
    setArrivalDate(d);
    setOpenCal("departure");
    if (departureDate && !isBeforeDay(d, departureDate)) {
      setDepartureDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    }
  }

  function handleDeparture(d: Date) {
    setDepartureDate(d);
    setOpenCal(null);
    if (arrivalDate) setTimeout(() => setStep(1), 380);
  }

  function handleCompanion(v: TravelVibe) {
    setTravelVibe(v);
    setTimeout(() => setStep(2), 200);
  }

  function toggleInspiration(id: Inspiration) {
    setInspirations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleBudget(b: BudgetStyle) {
    setBudget(b);
    const nights =
      arrivalDate && departureDate
        ? Math.max(1, Math.round((departureDate.getTime() - arrivalDate.getTime()) / 86400000))
        : 3;
    setTimeout(() => onGenerate({
      nights,
      travelVibe: travelVibe ?? "amigos",
      inspirations,
      budget: b,
      vibe: "moderado",
    }), 300);
  }

  const STEP_LABELS = ["Datas", "Companhia", "Interesses", "Estilo"];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[fp.page, { paddingTop: topPad, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Progress indicators ── */}
      <View style={cf.stepRow}>
        {STEP_LABELS.map((_, i) => (
          <View
            key={i}
            style={[cf.stepDot, i === step && cf.stepDotActive, i < step && cf.stepDotDone]}
          >
            {i < step ? (
              <Feather name="check" size={10} color={C.darkBrown} />
            ) : (
              <Text style={[cf.stepNum, i === step && cf.stepNumActive]}>{i + 1}</Text>
            )}
          </View>
        ))}
      </View>

      {/* ══ Step 0: Dates ══ */}
      {step === 0 && (
        <>
          <Text style={fp.bigTitle}>Quando você vai?</Text>
          <Text style={fp.bigSub}>
            Selecione suas datas para montar o roteiro perfeito
          </Text>

          <View style={cf.dateRow}>
            <Pressable
              style={[cf.dateBtn, openCal === "arrival" && cf.dateBtnActive]}
              onPress={() => setOpenCal("arrival")}
            >
              <Feather name="calendar" size={14} color={arrivalDate ? GOLD : `${GOLD}55`} />
              <Text style={[cf.dateBtnText, arrivalDate && cf.dateBtnTextSet]}>
                {fmtDate(arrivalDate) ?? "Chegada"}
              </Text>
            </Pressable>
            <Feather name="arrow-right" size={14} color={`${GOLD}40`} />
            <Pressable
              style={[cf.dateBtn, openCal === "departure" && cf.dateBtnActive]}
              onPress={() => setOpenCal("departure")}
            >
              <Feather name="calendar" size={14} color={departureDate ? GOLD : `${GOLD}55`} />
              <Text style={[cf.dateBtnText, departureDate && cf.dateBtnTextSet]}>
                {fmtDate(departureDate) ?? "Saída"}
              </Text>
            </Pressable>
          </View>

          {openCal && (
            <InlineCalendar
              value={openCal === "arrival" ? arrivalDate : departureDate}
              minDate={openCal === "departure" && arrivalDate ? arrivalDate : new Date()}
              onSelect={openCal === "arrival" ? handleArrival : handleDeparture}
            />
          )}

          {arrivalDate && departureDate && (
            <Pressable
              style={[fp.cta, { marginTop: 16 }]}
              onPress={() => setStep(1)}
            >
              <Text style={fp.ctaText}>Próximo</Text>
              <Feather name="chevron-right" size={17} color={C.darkBrown} />
            </Pressable>
          )}

          <Pressable style={cf.skipBtn} onPress={() => setStep(1)} hitSlop={12}>
            <Text style={cf.skipText}>Pular — usar datas flexíveis</Text>
          </Pressable>
        </>
      )}

      {/* ══ Step 1: Company ══ */}
      {step === 1 && (
        <>
          <Text style={fp.bigTitle}>Com quem você vai?</Text>
          <Text style={fp.bigSub}>
            Personalizamos o roteiro de acordo com a sua companhia
          </Text>

          <View style={cf.companionGrid}>
            {COMPANIONS.map((c) => (
              <Pressable
                key={c.id}
                style={[cf.companionCard, travelVibe === c.id && cf.companionCardActive]}
                onPress={() => handleCompanion(c.id)}
              >
                <Feather
                  name={c.icon as any}
                  size={26}
                  color={travelVibe === c.id ? GOLD : "rgba(255,255,255,0.55)"}
                />
                <Text style={[cf.companionLabel, travelVibe === c.id && cf.companionLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ══ Step 2: Interests ══ */}
      {step === 2 && (
        <>
          <Text style={fp.bigTitle}>O que te inspira?</Text>
          <Text style={fp.bigSub}>
            Selecione o que você ama para personalizarmos seu roteiro
          </Text>

          <View style={fp.insGrid}>
            {INSPIRATIONS_DATA.map((ins) => {
              const active = inspirations.includes(ins.id);
              return (
                <Pressable
                  key={ins.id}
                  style={[fp.insCard, active && fp.insCardActive]}
                  onPress={() => toggleInspiration(ins.id)}
                >
                  <Image source={ins.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.80)"]}
                    locations={[0.25, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  {active && (
                    <View style={fp.insCheck}>
                      <Feather name="check" size={11} color={GOLD} />
                    </View>
                  )}
                  <Text style={fp.insLabel}>{ins.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={fp.cta} onPress={() => setStep(3)}>
            <Text style={fp.ctaText}>Próximo</Text>
            <Feather name="chevron-right" size={17} color={C.darkBrown} />
          </Pressable>
        </>
      )}

      {/* ══ Step 3: Budget/Style ══ */}
      {step === 3 && (
        <>
          <Text style={fp.bigTitle}>Qual o estilo?</Text>
          <Text style={fp.bigSub}>
            Escolha o nível de conforto para a sua experiência no Rio
          </Text>

          <View style={cf.budgetGrid}>
            {BUDGETS.map((b) => (
              <Pressable
                key={b.id}
                style={[cf.budgetCard, budget === b.id && cf.budgetCardActive]}
                onPress={() => handleBudget(b.id)}
              >
                <Text style={[cf.budgetLabel, budget === b.id && cf.budgetLabelActive]}>
                  {b.label}
                </Text>
                <Text style={cf.budgetDesc}>{b.desc}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── Back nav (steps 1+) ── */}
      {step > 0 && (
        <Pressable
          style={[fp.backRow, { marginTop: 20 }]}
          onPress={() => setStep(step - 1)}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={20} color={CREAM} />
          <Text style={fp.backText}>Voltar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow page styles
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = (SW - 44 - 10) / 2;

const fp = StyleSheet.create({
  page: {
    paddingHorizontal: 22,
  },

  bigTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: CREAM,
    lineHeight: 44,
    marginBottom: 10,
    marginTop: 8,
  },

  bigSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.56)",
    lineHeight: 22,
    marginBottom: 32,
  },

  divider: {
    height: 1,
    backgroundColor: GLASS_BORDER,
    marginBottom: 28,
  },

  section: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: CREAM,
    marginBottom: 6,
  },

  sectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.42)",
    marginBottom: 12,
    lineHeight: 18,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: CREAM,
  },

  dateField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 10,
  },

  dateFieldActive: {
    borderColor: `${GOLD}70`,
  },

  dateFieldText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: CREAM,
  },

  dateFieldPlaceholder: {
    color: "rgba(255,255,255,0.38)",
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
    marginTop: 8,
  },

  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: C.darkBrown,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
  },

  backText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: CREAM,
  },

  insGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },

  insCard: {
    width: CARD_W,
    height: 128,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    justifyContent: "flex-end",
    padding: 12,
  },

  insCardActive: {
    borderColor: GOLD,
  },

  insLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: CREAM,
  },

  insCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.70)",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },

  glassSection: {
    backgroundColor: GLASS_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 20,
    marginBottom: 16,
  },

  glassSectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: CREAM,
    marginBottom: 16,
    letterSpacing: 0.2,
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  pillActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },

  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.1,
  },

  pillTextActive: {
    color: "#000000",
    fontFamily: "Inter_600SemiBold",
  },

  // ── Inline Calendar ──────────────────────────────────────────────────────────
  cal: {
    backgroundColor: "rgba(0,0,0,0.92)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 12,
    marginBottom: 10,
  },

  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  calMonth: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: CREAM,
  },

  calWeek: {
    flexDirection: "row",
    marginBottom: 4,
  },

  calWeekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
  },

  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  calCell: {
    width: "14.285714285714286%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },

  calCellActive: {
    backgroundColor: GOLD,
  },

  calCellPast: {
    opacity: 0.25,
  },

  calDayText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: CREAM,
  },

  calDayTextActive: {
    color: C.darkBrown,
    fontFamily: "Inter_600SemiBold",
  },

  calDayTextPast: {
    color: "rgba(255,255,255,0.30)",
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
  isExternal?: boolean;
}

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "";

async function fetchGooglePlaces(
  query: string,
  categoria: SavedCategory,
): Promise<Suggestion[]> {
  if (!GOOGLE_PLACES_KEY || query.length < 3) return [];
  try {
    const type = categoria === "restaurante" ? "&types=restaurant" : "";
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=-22.9068,-43.1729&radius=50000&language=pt-BR${type}&key=${GOOGLE_PLACES_KEY}`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK") return [];
    return (data.predictions as Record<string, unknown>[]).map((p) => ({
      id:          (p.place_id as string),
      titulo:      ((p as Record<string, Record<string, string>>).structured_formatting?.main_text)
                     ?? (p.description as string),
      localizacao: ((p as Record<string, Record<string, string>>).structured_formatting?.secondary_text)
                     ?? "Rio de Janeiro",
      image:       getNeighborhoodImage(""),
      categoria,
      subtitle:    "Adicionado por você",
      isExternal:  true,
    }));
  } catch {
    return [];
  }
}

interface ReplaceSheetProps {
  item:      SavedItem;
  diaNum:    number;
  onClose:   () => void;
  onReplace: (diaNum: number, itemId: string, newItem: SavedItem) => void;
}

function ReplaceSheet({ item, diaNum, onClose, onReplace }: ReplaceSheetProps) {
  const [suggestions,    setSuggestions]    = useState<Suggestion[]>([]);
  const [externalResults, setExternalResults] = useState<Suggestion[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [extLoading,     setExtLoading]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");

  useEffect(() => {
    fetchSuggestions();
  }, [item.id]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) { setExternalResults([]); return; }
    const timer = setTimeout(async () => {
      setExtLoading(true);
      const results = await fetchGooglePlaces(q, item.categoria);
      setExternalResults(results);
      setExtLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, item.categoria]);

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

  const q = searchQuery.trim();
  const localFiltered = q
    ? suggestions.filter((s) =>
        s.titulo.toLowerCase().includes(q.toLowerCase()) ||
        s.localizacao.toLowerCase().includes(q.toLowerCase())
      )
    : suggestions;
  const filtered = q.length >= 3
    ? [...localFiltered, ...externalResults.filter((e) => !localFiltered.some((l) => l.id === e.id))]
    : localFiltered;

  function confirmReplace(sug: Suggestion) {
    const newItem: SavedItem = {
      id:          sug.id,
      titulo:      sug.titulo,
      localizacao: sug.localizacao,
      image:       sug.image,
      categoria:   sug.categoria,
      ...(sug.isExternal ? { isExternal: true } : {}),
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
          placeholderTextColor="rgba(255,255,255,0.30)"
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

      <View style={rs.sectionLabelRow}>
        <Text style={rs.sectionLabel}>
          {q ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}` : "✦ Sugestões para substituir"}
        </Text>
        {extLoading && (
          <Text style={rs.sectionLabelSub}>buscando lugares…</Text>
        )}
      </View>

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
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.50)"]} style={StyleSheet.absoluteFill} />
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
    backgroundColor: "rgba(0,0,0,0.97)",
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
    backgroundColor: "rgba(212,175,55,0.10)",
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
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
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
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: `${GOLD}90`,
    letterSpacing: 0.8,
  },
  sectionLabelSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
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
    color: "rgba(255,255,255,0.45)",
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
    backgroundColor: "rgba(0,0,0,0.55)",
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
    color: "rgba(255,255,255,0.45)",
    flex: 1,
  },
  sugBadge: {
    backgroundColor: "rgba(212,175,55,0.10)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    alignSelf: "flex-start",
  },
  sugBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: `${GOLD}CC`,
  },
  useBtn: {
    backgroundColor: "rgba(212,175,55,0.16)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
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
    color: "rgba(255,255,255,0.50)",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.30)",
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
    color: "rgba(255,255,255,0.45)",
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
  scrollRef:      React.RefObject<ScrollView>;
}

function ResultPhase({
  result,
  hotelItem,
  totalPlaces,
  editMode,
  onToggleEdit,
  onReplaceItem,
  onShareResult,
  scrollRef,
}: ResultPhaseProps) {
  const { totalDays, totalItems } = result.summary;
  const [dayOffsets, setDayOffsets]     = React.useState<Record<number, number>>({});
  const [activeDayChip, setActiveDayChip] = React.useState<number | null>(null);

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Olá! Criei meu roteiro de ${totalDays} dias no Rio de Janeiro com o Lucky Trip. Pode me ajudar a refinar?`
    );
    Linking.openURL(`https://wa.me/?text=${msg}`);
  }

  function handleOpenMap() {
    const allItems = result.days.flatMap((d) => d.periodos.flatMap((p) => p.items));
    const query    = allItems.slice(0, 3).map((i) => i.titulo).join(" + ") + " Rio de Janeiro";
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  }

  function handleDayChipPress(diaNum: number) {
    setActiveDayChip(diaNum);
    const y = dayOffsets[diaNum] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
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
              colors={["transparent", "rgba(0,0,0,0.55)"]}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={re.dayPillsScroll}
            contentContainerStyle={re.dayPills}
          >
            <Text style={re.dayPillsLabel}>Ir para: </Text>
            {result.days.map((dia) => {
              const isActive = activeDayChip === dia.numero;
              return (
                <Pressable
                  key={dia.numero}
                  style={({ pressed }) => [
                    re.dayPill,
                    isActive && re.dayPillActive,
                    pressed && { opacity: 0.70 },
                  ]}
                  onPress={() => handleDayChipPress(dia.numero)}
                >
                  <Text style={[re.dayPillText, isActive && re.dayPillTextActive]}>
                    Dia {dia.numero}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
      <Pressable style={({ pressed }) => [re.mapCta, pressed && { opacity: 0.80 }]} onPress={handleOpenMap}>
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
          onLayout={(y) => setDayOffsets((prev) => ({ ...prev, [dia.numero]: y }))}
        />
      ))}
    </>
  );
}

function navigateToItem(item: SavedItem) {
  if (item.isExternal) return;
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

function getItemFallbackImage(categoria: SavedCategory): ReturnType<typeof require> {
  switch (categoria) {
    case "restaurante": return require("@/assets/images/restaurante1.png");
    case "hotel":       return require("@/assets/images/hotel1.png");
    default:            return require("@/assets/images/pao-acucar.png");
  }
}

function ResultDayCard({
  dia,
  editMode,
  onReplaceItem,
  onLayout,
}: {
  dia:           DiaRoteiro;
  editMode:      boolean;
  onReplaceItem: (diaNum: number, itemId: string, newItem: SavedItem) => void;
  onLayout?:     (y: number) => void;
}) {
  const weather = getDayWeather(dia.numero);
  const allItems = dia.periodos.flatMap((p) => p.items);
  const travelMinTotal = Math.max(25, allItems.length * 16);

  return (
    <View style={re.dayCard} onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}>
      {/* ── Day header ── */}
      <View style={re.dayHeader}>
        <View style={re.dayNumBadge}>
          <Text style={re.dayNumText}>DIA {dia.numero}</Text>
        </View>
        <Text style={re.dayBairro} numberOfLines={1}>{dia.bairro}</Text>
        <Feather name={weather} size={13} color="rgba(255,255,255,0.45)" />
        <View style={re.travelChip}>
          <Feather name="clock" size={10} color="rgba(255,255,255,0.45)" />
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
                        source={(item.image as ReturnType<typeof require> | undefined) ?? getItemFallbackImage(item.categoria)}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.45)"]}
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
                      {item.isExternal ? (
                        <View style={[re.catBadge, re.catBadgeExternal]}>
                          <Feather name="plus-circle" size={9} color={GOLD} />
                          <Text style={[re.catBadgeText, re.catBadgeTextExternal]}>
                            Adicionado por você
                          </Text>
                        </View>
                      ) : (
                        <View style={re.catBadge}>
                          <Text style={re.catBadgeText}>{CATEGORY_LABEL[item.categoria]}</Text>
                        </View>
                      )}
                    </View>

                    {editMode ? (
                      <View style={re.swapBtn}>
                        <Feather name="refresh-cw" size={13} color={GOLD} />
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.25)" />
                    )}
                  </Pressable>

                  {/* Travel connector between items */}
                  {idx < periodo.items.length - 1 && (
                    <View style={re.travelConnector}>
                      <View style={re.timeColSpacer} />
                      <View style={re.connectorPill}>
                        <Feather name="truck" size={9} color="rgba(255,255,255,0.40)" />
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
    backgroundColor: "rgba(0,0,0,0.55)",
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
    color: "rgba(255,255,255,0.50)",
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
    color: "rgba(255,255,255,0.40)",
    lineHeight: 16,
  },
  dayPillsScroll: {
    marginTop: 8,
  },
  dayPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  dayPillsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
  },
  dayPill: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayPillActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  dayPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
  },
  dayPillTextActive: {
    color: DARK_BROWN,
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
    borderColor: "rgba(212,175,55,0.22)",
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
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
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
    color: "rgba(255,255,255,0.40)",
    marginTop: 1,
  },

  // ── Day card ───────────────────────────────────────────────────────────────
  dayCard: {
    marginBottom: 24,
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: GLASS_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.10)",
  },
  dayNumBadge: {
    backgroundColor: "rgba(212,175,55,0.16)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
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
  weatherIcon: {
    flexShrink: 0,
  },
  travelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  travelChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.40)",
  },

  // ── Day body / periods ─────────────────────────────────────────────────────
  dayBody: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  periodSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  periodHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
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
    backgroundColor: "rgba(212,175,55,0.14)",
  },

  // ── Item row ───────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  timeCol: {
    width: 42,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  timeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.55)",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 5,
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
    color: "rgba(255,255,255,0.45)",
    flex: 1,
  },
  catBadge: {
    backgroundColor: "rgba(212,175,55,0.10)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    alignSelf: "flex-start",
  },
  catBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: `${GOLD}CC`,
    letterSpacing: 0.3,
  },
  catBadgeExternal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${GOLD}1A`,
    borderColor: `${GOLD}55`,
  },
  catBadgeTextExternal: {
    color: GOLD,
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginLeft: 4,
  },
  connectorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editBannerText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
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
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
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

  const params      = useLocalSearchParams<{ contextual?: string }>();
  const isContextual = params.contextual === "1";

  const { saved } = useGuia();

  const [result,        setResult]        = useState<ItineraryResult | null>(null);
  const [generating,    setGenerating]    = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [replacingItem, setReplacingItem] = useState<{ item: SavedItem; diaNum: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

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

  function buildShareLines(shareSlug?: string): string {
    if (!result) return "";
    const lines: string[] = [`✦ Roteiro Rio de Janeiro — The Lucky Trip\n`];
    if (shareSlug) lines.push(`Ver roteiro completo: https://theluckytrip.app/r/${shareSlug}\n`);
    for (const dia of result.days) {
      lines.push(`Dia ${dia.numero} — ${dia.bairro}`);
      for (const periodo of dia.periodos) {
        const label = PERIODO_LABEL[periodo.periodo];
        const itens = periodo.items.map((it) => `  • ${it.titulo} (${it.localizacao || dia.bairro})`).join("\n");
        if (itens) lines.push(`${label}\n${itens}`);
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  async function handleShare() {
    if (!result) return;
    let shareSlug: string | undefined;

    try {
      // 1. Generate a unique slug
      shareSlug = Array.from({ length: 8 }, () => Math.random().toString(36)[2]).join("");

      // 2. Persist to user_itineraries
      const { data: itinerary, error: itinErr } = await supabase
        .from("user_itineraries")
        .insert({
          destination_id:        "rio-de-janeiro",
          destination_name:      result.destination ?? "Rio de Janeiro",
          status:                "generated",
          is_public:             true,
          share_slug:            shareSlug,
          days_count:            result.summary.totalDays,
          items_count:           result.summary.totalItems,
          inspiration_tags:      (result.preferences?.inspirations ?? []) as string[],
          travel_company:        null,
          budget_style:          result.preferences?.vibe ?? null,
          generated_at:          new Date().toISOString(),
        })
        .select("id")
        .single();

      if (itinErr || !itinerary) throw itinErr ?? new Error("no itinerary returned");

      // 3. Persist items to roteiro_itens
      const roteiroItens = result.days.flatMap((dia) =>
        dia.periodos.flatMap((periodo, _pi) =>
          periodo.items.map((item, idx) => ({
            roteiro_id:    itinerary.id,
            name:          item.titulo,
            day_index:     dia.numero - 1,
            order_in_day:  idx,
            time_slot:     periodo.periodo,
            source:        item.isExternal ? "external" : "saved",
            neighborhood:  item.localizacao ?? dia.bairro,
            city:          "Rio de Janeiro",
          }))
        )
      );

      await supabase.from("roteiro_itens").insert(roteiroItens);
    } catch {
      // If Supabase fails, still share without URL
      shareSlug = undefined;
    }

    try {
      await Share.share({
        message: buildShareLines(shareSlug),
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

  // Hero image for cinematic result background — prefer hotel image, fall back to editorial hero
  const heroImg = hotelItem?.image ?? require("@/assets/images/hero-rio.png");

  return (
    <View style={sc.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Cinematic dark background — all phases ── */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        <Image source={heroImg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.78)", "rgba(0,0,0,0.90)", "rgba(5,2,0,0.97)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

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
        <TripFlow
          savedCount={saved.length}
          isContextual={isContextual}
          onGenerate={handleGenerate}
        />
      )}

      {phase === "loading" && <LoadingPhase />}

      {phase === "result" && (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={[sc.content, { paddingBottom: bottomPad + 96 }]}
        >
          <ResultPhase
            result={result!}
            hotelItem={hotelItem}
            totalPlaces={totalPlaces}
            editMode={editMode}
            onToggleEdit={() => setEditMode((v) => !v)}
            onReplaceItem={openReplaceSheet}
            onShareResult={handleShare}
            scrollRef={scrollRef}
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
    backgroundColor: "#080401",
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
    color: "rgba(255,255,255,0.55)",
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

// ─────────────────────────────────────────────────────────────────────────────
// ContextualFlow styles
// ─────────────────────────────────────────────────────────────────────────────

const cf = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
    alignItems: "center",
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  stepDotDone: {
    backgroundColor: `${GOLD}40`,
    borderColor: `${GOLD}60`,
  },
  stepNum: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
  },
  stepNumActive: {
    color: C.darkBrown,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateBtnActive: {
    borderColor: GOLD,
  },
  dateBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.40)",
  },
  dateBtnTextSet: {
    color: CREAM,
  },
  skipBtn: {
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
  },
  companionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 12,
  },
  companionCard: {
    width: (SW - 44 - 16) / 2,
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 14,
  },
  companionCardActive: {
    borderColor: GOLD,
    backgroundColor: `${GOLD}14`,
  },
  companionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  companionLabelActive: {
    color: CREAM,
    fontFamily: "Inter_600SemiBold",
  },
  budgetGrid: {
    gap: 14,
    marginTop: 12,
  },
  budgetCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 24,
  },
  budgetCardActive: {
    borderColor: GOLD,
    backgroundColor: `${GOLD}18`,
  },
  budgetLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },
  budgetLabelActive: {
    color: CREAM,
  },
  budgetDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
  },
});

