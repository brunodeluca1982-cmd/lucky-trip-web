/**
 * friend/guide/[slug].tsx — Roteiro curado do friend
 *
 * Mostra o guia curado de um amigo organizado por curation_dimension.
 * Todos os dados vêm do Supabase — zero hardcoded.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#D4AF37";

// ── Section config por curation_dimension ────────────────────────────────────

const DIMENSION_CONFIG: Record<string, { label: string; icon: string; description: string }> = {
  hotel: {
    label: "Onde Ficar",
    icon: "home",
    description: "A escolha da hospedagem muda tudo.",
  },
  gastronomy: {
    label: "Onde Comer",
    icon: "coffee",
    description: "Lugares que fazem parte da vida de verdade.",
  },
  nightlife: {
    label: "Para a Noite",
    icon: "moon",
    description: "Onde o Rio revela sua outra face.",
  },
};

function getDimensionConfig(dim: string) {
  return DIMENSION_CONFIG[dim] ?? {
    label: dim.charAt(0).toUpperCase() + dim.slice(1),
    icon: "map-pin",
    description: "",
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
  profile_photo_url: string | null;
  places_count: number;
  highlights_count: number;
}

interface GuidePlace {
  id: string;
  nome: string;
  categoria: string | null;
  bairro: string | null;
  meu_olhar: string | null;
  photo_url: string | null;
  is_highlight: boolean;
  is_locked: boolean;
  ordem: number;
  curation_dimension: string | null;
}

type SectionData = {
  dimension: string;
  places: GuidePlace[];
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendGuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();

  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [introExpanded, setIntroExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: guideData } = await supabase
          .from("v_friend_guides_cards")
          .select(
            "id, slug, title, subtitle, tagline, intro_text, city, suggested_days, access_type, friend_display_name, friend_full_name, profile_photo_url, places_count, highlights_count"
          )
          .eq("slug", slug)
          .single();

        if (!guideData || cancelled) return;

        const { data: placesData } = await supabase
          .from("friend_guide_places")
          .select("id, nome, categoria, bairro, meu_olhar, photo_url, is_highlight, is_locked, ordem, curation_dimension")
          .eq("guide_id", guideData.id)
          .order("ordem");

        if (cancelled) return;

        // Group places by curation_dimension preserving insertion order
        const dimOrder: string[] = [];
        const dimMap: Record<string, GuidePlace[]> = {};
        for (const p of placesData ?? []) {
          const dim = p.curation_dimension ?? "outros";
          if (!dimMap[dim]) {
            dimOrder.push(dim);
            dimMap[dim] = [];
          }
          dimMap[dim].push(p);
        }

        const sectionList: SectionData[] = dimOrder.map((dim) => ({
          dimension: dim,
          places: dimMap[dim],
        }));

        setGuide(guideData);
        setSections(sectionList);
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
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={s.loadingRoot}>
        <Text style={s.errorText}>Roteiro não encontrado.</Text>
      </View>
    );
  }

  const introTruncated = (guide.intro_text ?? "").length > 220 && !introExpanded;
  const introDisplay = introTruncated
    ? (guide.intro_text ?? "").slice(0, 220).trim() + "…"
    : guide.intro_text ?? "";

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 56 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <LinearGradient
            colors={["#0D0D0D", "#050505"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>

          {/* Meta */}
          <View style={s.headerMeta}>
            <Text style={s.headerByline}>Curadoria de {guide.friend_display_name}</Text>
          </View>

          {/* Title block */}
          <View style={s.titleBlock}>
            <View style={s.goldAccentLine} />
            {guide.tagline ? (
              <Text style={s.tagline}>"{guide.tagline}"</Text>
            ) : null}
            <Text style={s.title}>{guide.title}</Text>
            {guide.subtitle ? (
              <Text style={s.subtitle}>{guide.subtitle}</Text>
            ) : null}
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Feather name="map-pin" size={13} color={GOLD} />
              <Text style={s.statText}>{guide.places_count} lugares</Text>
            </View>
            {guide.suggested_days != null && (
              <View style={s.statItem}>
                <Feather name="calendar" size={13} color={GOLD} />
                <Text style={s.statText}>{guide.suggested_days} dias sugeridos</Text>
              </View>
            )}
            <View style={s.statItem}>
              <Ionicons name="diamond-outline" size={13} color={GOLD} />
              <Text style={s.statText}>Premium</Text>
            </View>
          </View>
        </View>

        {/* ── Intro text ── */}
        {guide.intro_text ? (
          <View style={s.introBlock}>
            <Text style={s.introQuoteMark}>"</Text>
            <Text style={s.introText}>{introDisplay}</Text>
            {(guide.intro_text ?? "").length > 220 && (
              <Pressable onPress={() => setIntroExpanded((x) => !x)} style={s.introToggle}>
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
        {sections.map((sec) => (
          <DimensionSection key={sec.dimension} section={sec} />
        ))}

      </ScrollView>
    </View>
  );
}

// ── Dimension section ─────────────────────────────────────────────────────────

function DimensionSection({ section }: { section: SectionData }) {
  const config = getDimensionConfig(section.dimension);

  return (
    <View style={s.section}>
      {/* Section header */}
      <View style={s.sectionHeader}>
        <View style={s.sectionIconWrap}>
          <Feather name={config.icon as any} size={16} color={GOLD} />
        </View>
        <View style={s.sectionHeaderText}>
          <Text style={s.sectionLabel}>{config.label}</Text>
          {config.description ? (
            <Text style={s.sectionDescription}>{config.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Place cards */}
      <View style={s.placeList}>
        {section.places.map((place, idx) => (
          <PlaceCard key={place.id} place={place} index={idx} />
        ))}
      </View>
    </View>
  );
}

// ── Place card ────────────────────────────────────────────────────────────────

function PlaceCard({ place, index }: { place: GuidePlace; index: number }) {
  const photoSource = place.photo_url
    ? { uri: place.photo_url }
    : require("../../../assets/images/hero-rio.png");

  return (
    <View style={s.placeCard}>
      {/* Top row: number + name + bairro */}
      <View style={s.placeTopRow}>
        <Text style={s.placeNumber}>{String(index + 1).padStart(2, "0")}</Text>
        <View style={s.placeNameBlock}>
          <View style={s.placeNameRow}>
            <Text style={s.placeName}>{place.nome}</Text>
            {place.is_highlight && (
              <View style={s.highlightBadge}>
                <Ionicons name="star" size={8} color={GOLD} />
              </View>
            )}
          </View>
          {place.bairro ? (
            <Text style={s.placeBairro}>{place.bairro}</Text>
          ) : null}
        </View>
        {place.categoria ? (
          <View style={s.categoriaChip}>
            <Text style={s.categoriaText}>{place.categoria}</Text>
          </View>
        ) : null}
      </View>

      {/* Meu olhar — personal note */}
      {place.meu_olhar ? (
        <View style={s.meuOlharBlock}>
          <View style={s.meuOlharLine} />
          <Text style={s.meuOlharText}>"{place.meu_olhar}"</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  scroll: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
  },

  // ── Header ──
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 20,
  },
  headerMeta: {
    marginBottom: 16,
  },
  headerByline: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  titleBlock: {
    marginBottom: 20,
  },
  goldAccentLine: {
    width: 32,
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 14,
  },
  tagline: {
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    fontSize: 15,
    color: "rgba(255,255,255,0.60)",
    lineHeight: 22,
    marginBottom: 10,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: "#fff",
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },

  // ── Intro ──
  introBlock: {
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 8,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  introQuoteMark: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 48,
    color: GOLD,
    lineHeight: 38,
    marginBottom: 4,
    opacity: 0.6,
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

  // ── Sections ──
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${GOLD}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${GOLD}30`,
    marginTop: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionLabel: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: "#fff",
    lineHeight: 26,
    marginBottom: 4,
  },
  sectionDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
  },

  // ── Place list ──
  placeList: {
    gap: 12,
  },

  // ── Place card ──
  placeCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
  },
  placeTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  placeNumber: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: `${GOLD}40`,
    lineHeight: 28,
    width: 32,
    letterSpacing: -0.5,
  },
  placeNameBlock: {
    flex: 1,
  },
  placeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  placeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
    lineHeight: 20,
  },
  highlightBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: `${GOLD}20`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${GOLD}40`,
  },
  placeBairro: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  categoriaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  categoriaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.50)",
    textTransform: "capitalize",
  },

  // ── Meu olhar ──
  meuOlharBlock: {
    marginTop: 12,
    paddingLeft: 44,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  meuOlharLine: {
    width: 2,
    backgroundColor: `${GOLD}50`,
    borderRadius: 1,
    alignSelf: "stretch",
    minHeight: 16,
  },
  meuOlharText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.60)",
    lineHeight: 20,
    fontStyle: "italic",
  },
});
