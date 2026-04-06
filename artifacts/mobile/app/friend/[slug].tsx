/**
 * friend/[slug].tsx — Editorial capa do friend
 *
 * Tela de perfil do friend: hero, bio, lista de roteiros curados.
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
const FALLBACK_IMG = require("../../assets/images/carol-dieckmann.jpg");
const RIO_FALLBACK = require("../../assets/images/hero-rio.png");

// ── Types ─────────────────────────────────────────────────────────────────────

interface FriendProfile {
  id: string;
  slug: string;
  display_name: string;
  full_name: string;
  bio: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
}

interface GuideCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  tagline: string | null;
  cover_photo_url: string | null;
  places_count: number;
  highlights_count: number;
  suggested_days: number | null;
  access_type: string;
  vibe: string[] | null;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: friendData } = await supabase
          .from("friends")
          .select("id, slug, display_name, full_name, bio, profile_photo_url, cover_photo_url")
          .eq("slug", slug)
          .single();

        if (!friendData || cancelled) return;

        const { data: guidesData } = await supabase
          .from("v_friend_guides_cards")
          .select(
            "id, slug, title, subtitle, tagline, cover_photo_url, places_count, highlights_count, suggested_days, access_type, vibe"
          )
          .eq("friend_id", friendData.id)
          .eq("status", "published")
          .order("sort_order");

        if (!cancelled) {
          setFriend(friendData);
          setGuides(guidesData ?? []);
        }
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

  if (!friend) {
    return (
      <View style={s.loadingRoot}>
        <Text style={s.errorText}>Perfil não encontrado.</Text>
      </View>
    );
  }

  const coverSource = friend.cover_photo_url
    ? { uri: friend.cover_photo_url }
    : FALLBACK_IMG;

  const profileSource = friend.profile_photo_url
    ? { uri: friend.profile_photo_url }
    : null;

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero image ── */}
        <View style={s.heroContainer}>
          <Image source={coverSource} style={s.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.72)"]}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <Pressable
            style={[s.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>

          {/* Name overlay */}
          <View style={s.heroNameBlock}>
            <Text style={s.heroEyebrow}>AMIGO DA LUCKY TRIP</Text>
            <Text style={s.heroName}>{friend.full_name}</Text>
          </View>
        </View>

        {/* ── Bio block ── */}
        <View style={s.bioBlock}>
          {profileSource && (
            <Image source={profileSource} style={s.profilePhoto} resizeMode="cover" />
          )}
          <View style={s.bioGoldLine} />
          <Text style={s.displayName}>{friend.display_name}</Text>
          {friend.bio ? (
            <Text style={s.bioText}>{friend.bio}</Text>
          ) : null}
        </View>

        {/* ── Roteiros curados ── */}
        <View style={s.guidesSection}>
          <View style={s.sectionEyebrowRow}>
            <View style={s.goldDot} />
            <Text style={s.sectionEyebrow}>ROTEIROS CURADOS</Text>
          </View>
          <Text style={s.sectionTitle}>Siga os passos de {friend.display_name}</Text>

          {guides.length === 0 ? (
            <Text style={s.emptyText}>Nenhum roteiro publicado ainda.</Text>
          ) : (
            <View style={s.guidesList}>
              {guides.map((guide) => (
                <GuideCardItem key={guide.id} guide={guide} friendName={friend.display_name} />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ── Guide card component ───────────────────────────────────────────────────────

function GuideCardItem({ guide, friendName }: { guide: GuideCard; friendName: string }) {
  const coverSource = guide.cover_photo_url
    ? { uri: guide.cover_photo_url }
    : RIO_FALLBACK;

  const vibeLabels = (guide.vibe ?? []).slice(0, 3).map((v) =>
    v.replace(/_/g, " ")
  );

  return (
    <Pressable
      style={({ pressed }) => [s.guideCard, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
      onPress={() =>
        router.push({ pathname: "/friend/guide/[slug]", params: { slug: guide.slug } })
      }
    >
      {/* Cover image */}
      <View style={s.guideCoverWrap}>
        <Image source={coverSource} style={s.guideCoverImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.55)"]}
          locations={[0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        {guide.access_type === "premium" && (
          <View style={s.premiumBadge}>
            <Ionicons name="diamond-outline" size={10} color={GOLD} />
            <Text style={s.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.guideContent}>
        {guide.tagline ? (
          <Text style={s.guideTagline}>"{guide.tagline}"</Text>
        ) : null}
        <Text style={s.guideTitle}>{guide.title}</Text>
        {guide.subtitle ? (
          <Text style={s.guideSubtitle}>{guide.subtitle}</Text>
        ) : null}

        <View style={s.guideMeta}>
          <View style={s.guideMetaItem}>
            <Feather name="map-pin" size={11} color={GOLD} />
            <Text style={s.guideMetaText}>{guide.places_count} lugares</Text>
          </View>
          {guide.suggested_days != null && (
            <View style={s.guideMetaItem}>
              <Feather name="calendar" size={11} color={GOLD} />
              <Text style={s.guideMetaText}>{guide.suggested_days} dias</Text>
            </View>
          )}
        </View>

        {vibeLabels.length > 0 && (
          <View style={s.vibeRow}>
            {vibeLabels.map((v) => (
              <View key={v} style={s.vibeChip}>
                <Text style={s.vibeChipText}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.guideCta}>
          <Text style={s.guideCtaText}>Ver roteiro</Text>
          <Feather name="arrow-right" size={13} color={GOLD} />
        </View>
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const HERO_H = SCREEN_WIDTH * 1.05;

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

  // ── Hero ──
  heroContainer: {
    width: "100%",
    height: HERO_H,
    backgroundColor: "#111",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroNameBlock: {
    position: "absolute",
    bottom: 32,
    left: 24,
    right: 24,
  },
  heroEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  heroName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 38,
    color: "#fff",
    lineHeight: 44,
    letterSpacing: -0.5,
  },

  // ── Bio block ──
  bioBlock: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: GOLD,
  },
  bioGoldLine: {
    width: 36,
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 14,
  },
  displayName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  // ── Guides section ──
  guidesSection: {
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  sectionEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 2.8,
  },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: "#fff",
    lineHeight: 30,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.40)",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  guidesList: {
    gap: 16,
    paddingHorizontal: 20,
  },

  // ── Guide card ──
  guideCard: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  guideCoverWrap: {
    width: "100%",
    height: 190,
    backgroundColor: "#1A1208",
    position: "relative",
  },
  guideCoverImage: {
    width: "100%",
    height: "100%",
  },
  premiumBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.60)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${GOLD}44`,
  },
  premiumBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 0.4,
  },
  guideContent: {
    padding: 20,
  },
  guideTagline: {
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    fontSize: 14,
    color: GOLD,
    lineHeight: 20,
    marginBottom: 8,
  },
  guideTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: "#fff",
    lineHeight: 26,
    marginBottom: 8,
  },
  guideSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 19,
    marginBottom: 14,
  },
  guideMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  guideMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  guideMetaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  vibeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  vibeChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1,
    borderColor: `${GOLD}30`,
  },
  vibeChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: GOLD,
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },
  guideCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  guideCtaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: GOLD,
    letterSpacing: 0.3,
  },
});
