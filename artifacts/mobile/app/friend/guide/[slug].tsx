/**
 * friend/guide/[slug].tsx — Roteiro curado do friend
 *
 * Visual: hero-rio.png fixo ao fundo + glassmorphism iOS-style.
 * Idêntico à linguagem visual de viagem.tsx / roteiro/[id].tsx.
 * Todos os dados vêm do Supabase — zero hardcoded.
 */

import React, { useEffect, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";

const GOLD  = "#C9A84C";
const CREAM = "#F5EDD6";
const RIO_BG = require("../../../assets/images/hero-rio.png");

// ── Section config por curation_dimension ────────────────────────────────────

const DIMENSION_CONFIG: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  hotel:      { label: "Onde Ficar",  icon: "home"    },
  gastronomy: { label: "Onde Comer",  icon: "coffee"  },
  nightlife:  { label: "Para a Noite", icon: "moon"   },
};

function getDimensionConfig(dim: string) {
  return DIMENSION_CONFIG[dim] ?? {
    label: dim.charAt(0).toUpperCase() + dim.slice(1),
    icon: "map-pin" as keyof typeof Feather.glyphMap,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuideDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  tagline: string | null;
  intro_text: string | null;
  city: string | null;
  suggested_days: number | null;
  access_type: string;
  friend_display_name: string;
  friend_full_name: string;
  places_count: number;
  highlights_count: number;
}

interface GuidePlace {
  id: string;
  nome: string;
  categoria: string | null;
  bairro: string | null;
  meu_olhar: string | null;
  is_highlight: boolean;
  is_locked: boolean;
  ordem: number;
  curation_dimension: string | null;
}

type SectionData = { dimension: string; places: GuidePlace[] };

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendGuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets   = useSafeAreaInsets();

  const [guide,    setGuide]    = useState<GuideDetail | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [introExpanded, setIntroExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: guideData } = await supabase
          .from("v_friend_guides_cards")
          .select(
            "id, slug, title, subtitle, tagline, intro_text, city, suggested_days, access_type, friend_display_name, friend_full_name, places_count, highlights_count"
          )
          .eq("slug", slug)
          .single();

        if (!guideData || cancelled) return;

        const { data: placesData } = await supabase
          .from("friend_guide_places")
          .select("id, nome, categoria, bairro, meu_olhar, is_highlight, is_locked, ordem, curation_dimension")
          .eq("guide_id", guideData.id)
          .order("ordem");

        if (cancelled) return;

        const dimOrder: string[] = [];
        const dimMap: Record<string, GuidePlace[]> = {};
        for (const p of placesData ?? []) {
          const dim = p.curation_dimension ?? "outros";
          if (!dimMap[dim]) { dimOrder.push(dim); dimMap[dim] = []; }
          dimMap[dim].push(p);
        }

        setGuide(guideData);
        setSections(dimOrder.map((dim) => ({ dimension: dim, places: dimMap[dim] })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <View style={s.loadingRoot}>
        <Image source={RIO_BG} style={StyleSheet.absoluteFillObject} resizeMode="cover" blurRadius={Platform.OS === "ios" ? 28 : 16} />
        <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.80)"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={s.loadingRoot}>
        <Image source={RIO_BG} style={StyleSheet.absoluteFillObject} resizeMode="cover" blurRadius={Platform.OS === "ios" ? 28 : 16} />
        <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.80)"]} style={StyleSheet.absoluteFill} />
        <Text style={s.errorText}>Roteiro não encontrado.</Text>
      </View>
    );
  }

  const topPad    = insets.top + 8;
  const bottomPad = insets.bottom + 56;

  const introTruncated = (guide.intro_text ?? "").length > 220 && !introExpanded;
  const introDisplay   = introTruncated
    ? (guide.intro_text ?? "").slice(0, 220).trim() + "…"
    : (guide.intro_text ?? "");

  return (
    <View style={s.root}>

      {/* ── Fixed Rio background ── */}
      <Image
        source={RIO_BG}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Cinematic dark vignette — same pattern as viagem.tsx */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.08)",
          "rgba(0,0,0,0.28)",
          "rgba(0,0,0,0.58)",
          "rgba(0,0,0,0.78)",
        ]}
        locations={[0, 0.25, 0.58, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Scrollable content over fixed bg ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: topPad, paddingBottom: bottomPad }]}
      >

        {/* ── Back button ── */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.65 }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>

        {/* ── Header block ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>CURADORIA DE {guide.friend_display_name.toUpperCase()}</Text>
          {guide.tagline ? (
            <Text style={s.tagline}>"{guide.tagline}"</Text>
          ) : null}
          <Text style={s.title}>{guide.title}</Text>
          {guide.subtitle ? (
            <Text style={s.subtitle}>{guide.subtitle}</Text>
          ) : null}

          {/* Meta pills */}
          <View style={s.pillRow}>
            <View style={s.pill}>
              <Feather name="map-pin" size={11} color={GOLD} />
              <Text style={s.pillText}>{guide.places_count} lugares</Text>
            </View>
            {guide.suggested_days != null && (
              <View style={s.pill}>
                <Feather name="calendar" size={11} color={GOLD} />
                <Text style={s.pillText}>{guide.suggested_days} dias</Text>
              </View>
            )}
            {guide.city ? (
              <View style={s.pill}>
                <Feather name="compass" size={11} color={GOLD} />
                <Text style={s.pillText}>{guide.city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Thin rule ── */}
        <View style={s.rule} />

        {/* ── Intro text (glass card) ── */}
        {guide.intro_text ? (
          <View style={s.introCard}>
            <Text style={s.introQuote}>"</Text>
            <Text style={s.introText}>{introDisplay}</Text>
            {(guide.intro_text ?? "").length > 220 && (
              <Pressable
                onPress={() => setIntroExpanded((x) => !x)}
                style={s.introToggle}
              >
                <Text style={s.introToggleText}>
                  {introExpanded ? "Ler menos" : "Ler mais"}
                </Text>
                <Feather
                  name={introExpanded ? "chevron-up" : "chevron-down"}
                  size={13}
                  color={GOLD}
                />
              </Pressable>
            )}
            <Text style={s.introAuthor}>— {guide.friend_display_name}</Text>
          </View>
        ) : null}

        {/* ── Sections ── */}
        <View style={s.sectionsWrap}>
          {sections.map((sec) => (
            <DimensionSection key={sec.dimension} section={sec} />
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

// ── Dimension section ─────────────────────────────────────────────────────────

function DimensionSection({ section }: { section: SectionData }) {
  const config = getDimensionConfig(section.dimension);

  return (
    <View style={sec.wrap}>
      {/* Section label */}
      <View style={sec.headerRow}>
        <View style={sec.iconWrap}>
          <Feather name={config.icon} size={14} color={GOLD} />
        </View>
        <Text style={sec.label}>{config.label}</Text>
        <View style={sec.countBadge}>
          <Text style={sec.countText}>{section.places.length}</Text>
        </View>
      </View>

      {/* Glass card wrapping all places */}
      <View style={sec.card}>
        {section.places.map((place, idx) => (
          <PlaceRow
            key={place.id}
            place={place}
            index={idx}
            isLast={idx === section.places.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ── Place row ─────────────────────────────────────────────────────────────────

function PlaceRow({
  place,
  index,
  isLast,
}: {
  place: GuidePlace;
  index: number;
  isLast: boolean;
}) {
  return (
    <View style={[row.wrap, !isLast && row.separator]}>
      {/* Number */}
      <Text style={row.num}>{String(index + 1).padStart(2, "0")}</Text>

      {/* Info */}
      <View style={row.info}>
        <View style={row.nameRow}>
          <Text style={row.name}>{place.nome}</Text>
          {place.is_highlight && (
            <View style={row.starBadge}>
              <Ionicons name="star" size={8} color={GOLD} />
            </View>
          )}
        </View>

        {place.bairro ? (
          <Text style={row.bairro}>{place.bairro}</Text>
        ) : null}

        {place.meu_olhar ? (
          <View style={row.noteRow}>
            <View style={row.noteLine} />
            <Text style={row.noteText}>"{place.meu_olhar}"</Text>
          </View>
        ) : null}
      </View>

      {/* Category chip */}
      {place.categoria ? (
        <View style={row.chip}>
          <Text style={row.chipText}>{place.categoria}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#100D09",
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: "#100D09",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
  },
  content: {
    paddingHorizontal: 22,
  },

  // ── Back button ──
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "flex-start",
  },

  // ── Header ──
  header: {
    gap: 10,
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 2.8,
  },
  tagline: {
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    fontSize: 15,
    color: "rgba(255,255,255,0.60)",
    lineHeight: 22,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: CREAM,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${GOLD}12`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${GOLD}28`,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: GOLD,
  },

  // ── Rule ──
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },

  // ── Intro card ──
  introCard: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 20,
    marginBottom: 20,
  },
  introQuote: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 44,
    color: GOLD,
    lineHeight: 36,
    marginBottom: 4,
    opacity: 0.55,
  },
  introText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 22,
    fontStyle: "italic",
  },
  introToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  introToggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: GOLD,
  },
  introAuthor: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: GOLD,
    marginTop: 14,
    letterSpacing: 0.3,
  },

  // ── Sections wrapper ──
  sectionsWrap: {
    gap: 24,
  },
});

// ── Section styles ─────────────────────────────────────────────────────────────

const sec = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: `${GOLD}16`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${GOLD}28`,
  },
  label: {
    flex: 1,
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: CREAM,
    lineHeight: 24,
  },
  countBadge: {
    backgroundColor: `${GOLD}10`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${GOLD}24`,
  },
  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
  },
  // glass card holding all place rows
  card: {
    backgroundColor: "rgba(0,0,0,0.26)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
});

// ── Place row styles ──────────────────────────────────────────────────────────

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: `${GOLD}12`,
  },
  num: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: `${GOLD}44`,
    lineHeight: 26,
    width: 30,
    letterSpacing: -0.5,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: CREAM,
    lineHeight: 20,
  },
  starBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: `${GOLD}20`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${GOLD}40`,
  },
  bairro: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.42)",
    letterSpacing: 0.2,
  },
  noteRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 6,
  },
  noteLine: {
    width: 2,
    backgroundColor: `${GOLD}48`,
    borderRadius: 1,
    alignSelf: "stretch",
    minHeight: 14,
  },
  noteText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
    fontStyle: "italic",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  chipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.48)",
    textTransform: "capitalize",
  },
});
