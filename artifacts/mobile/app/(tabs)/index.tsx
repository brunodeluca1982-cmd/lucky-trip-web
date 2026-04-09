import React, { useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { notifyHeroReady } from "@/lib/splashGate";
import { RotatingBackground } from "@/components/RotatingBackground";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";

import { AppHeader } from "@/components/AppHeader";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PlaceCard } from "@/components/PlaceCard";
import { RestauranteCard } from "@/components/RestauranteCard";
import { SectionHeader } from "@/components/SectionHeader";
import Colors from "@/constants/colors";
import { heroDestinos } from "@/data/mockData";
import { useGuia } from "@/context/GuiaContext";
import { useLuckyList } from "@/hooks/useLuckyList";
import { useOQueFazer } from "@/hooks/useOQueFazer";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useFriends, type FriendCard } from "@/hooks/useFriends";

// ── Context-aware "O que fazer agora" title ───────────────────────────────────
// Prepositions for known destinations (Portuguese grammar)
const DESTINO_PREP: Record<string, string> = {
  "Rio de Janeiro":   "no Rio de Janeiro",
  "São Paulo":        "em São Paulo",
  "Belo Horizonte":   "em Belo Horizonte",
  "Florianópolis":    "em Florianópolis",
  "Santorini":        "em Santorini",
  "Kyoto":            "em Kyoto",
  "Paris":            "em Paris",
  "Lisboa":           "em Lisboa",
};

// Priority: user location (future) → active trip → fallback
function getAgoraTitle(tripDestino?: string): string {
  // 1. User location: not available in this build (expo-location not installed)
  // 2. Active trip
  if (tripDestino) {
    const prep = DESTINO_PREP[tripDestino] ?? `em ${tripDestino}`;
    return `O que fazer agora ${prep}`;
  }
  // 3. Fallback
  return "O que fazer agora";
}

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = (SCREEN_WIDTH - 48 - 12) / 2;

const HOME_BG_POOL = [
  require("../../assets/images/rio-aerial-clean.png"),
  require("../../assets/images/ipanema.png"),
  require("../../assets/images/hotel1.png"),
  require("../../assets/images/secret1.png"),
  require("../../assets/images/map-rio-portrait.png"),
];

// ── Thin hairline between sections ───────────────────────────────────────────
function Divider() {
  return <View style={s.divider} />;
}

// ── Lucky List dark editorial block — powered by Supabase ────────────────────
function LuckyHighlight() {
  const { lugares, loading } = useLuckyList();
  const picks = lugares.slice(0, 3);
  return (
    <View style={s.luckyBlock}>
      <View style={s.luckyHeader}>
        <Text style={s.luckyAccentText}>✦ LUCKY LIST</Text>
        <View style={s.luckyAccentLine} />
      </View>
      <Text style={s.luckyHeadline}>Seu Rio mais Lucky</Text>
      <Text style={s.luckySubtitle}>
        Os segredos que poucos conhecem. Curadoria feita à mão, atualizada quando vale a pena.
      </Text>
      {loading ? (
        <ActivityIndicator color="rgba(201,168,76,0.7)" style={{ marginVertical: 16 }} />
      ) : (
        <View style={s.luckyPicks}>
          {picks.map((place) => (
            <Pressable
              key={place.id}
              style={s.luckyPickRow}
              onPress={() => router.push({
                pathname: "/lugar/[cityId]/[placeId]",
                params: { cityId: "rio", placeId: place.id, source_table: "lucky_list_rio" },
              })}
            >
              <Text style={s.luckyPickStar}>✦</Text>
              <View style={s.luckyPickText}>
                <Text style={s.luckyPickTitle}>{place.titulo}</Text>
                <Text style={s.luckyPickLoc}>{place.localizacao}</Text>
              </View>
              <Feather name="arrow-right" size={13} color="rgba(201,168,76,0.50)" />
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        style={s.luckyBtn}
        onPress={() => router.push({ pathname: "/luckyList/[id]", params: { id: "rio" } })}
      >
        <Text style={s.luckyBtnText}>✦  Ver Lucky List completa</Text>
      </Pressable>
    </View>
  );
}

// ── Friend card (2-col grid) — dados reais do Supabase ───────────────────────
const FRIEND_FALLBACK = require("../../assets/images/carol-dieckmann.jpg");

function InfluencerCard({ influencer }: { influencer: FriendCard }) {
  const imgSource = influencer.profile_photo_url
    ? { uri: influencer.profile_photo_url }
    : influencer.cover_photo_url
    ? { uri: influencer.cover_photo_url }
    : FRIEND_FALLBACK;

  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: 0.90, transform: [{ scale: 0.97 }] }]}
      onPress={() => router.push({ pathname: "/friend/[slug]", params: { slug: influencer.slug } })}
    >
      <ImageBackground
        source={imgSource}
        style={s.influencerCard}
        resizeMode="cover"
        imageStyle={s.influencerImageStyle}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.00)", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.72)"]}
          locations={[0.30, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.influencerBadge}>
          <Feather name="map" size={10} color={C.white} />
          <Text style={s.influencerBadgeText}>
            Roteiros: {String(influencer.guide_count).padStart(2, "0")}
          </Text>
        </View>
        <Text style={s.influencerName}>{influencer.display_name}</Text>
      </ImageBackground>
    </Pressable>
  );
}

// ── Criar roteiro CTA ─────────────────────────────────────────────────────────
function RoteiroCTA() {
  return (
    <View style={s.ctaBlock}>
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
        style={StyleSheet.absoluteFill}
      />
      <Text style={s.ctaEyebrow}>ORGANIZE SUA PRÓXIMA VIAGEM</Text>
      <Text style={s.ctaHeadline}>Monte seu roteiro personalizado</Text>
      <Text style={s.ctaSub}>
        Use nosso planejador intuitivo para criar experiências únicas no seu destino.
      </Text>
      <Pressable style={s.ctaBtn} onPress={() => router.push("/roteiro")}>
        <Feather name="plus" size={15} color={C.white} />
        <Text style={s.ctaBtnText}>Criar roteiro</Text>
      </Pressable>
    </View>
  );
}


// ── Main screen ───────────────────────────────────────────────────────────────

type MomentoTab = "manha" | "tarde" | "noite";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
const MOMENTO_TABS: { key: MomentoTab; label: string; icon: IoniconName }[] = [
  { key: "manha", label: "Manhã", icon: "partly-sunny-outline" },
  { key: "tarde", label: "Tarde", icon: "sunny-outline"         },
  { key: "noite", label: "Noite", icon: "moon-outline"          },
];

// Determine the current time period automatically.
// Rules: 05:00–11:59 → manhã | 12:00–17:59 → tarde | 18:00–04:59 → noite
function getCurrentMomento(): MomentoTab {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "manha";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noite";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { viagem } = useGuia();
  const agoraTitle = getAgoraTitle(viagem.destino || undefined);
  const { lugares: atividades, loading: loadingAtividades } = useOQueFazer();
  const { restaurantes: restos, loading: loadingRestos } = useRestaurants();
  const { friends, loading: loadingFriends } = useFriends();
  const momentoTab = getCurrentMomento();

  const filteredAtividades = React.useMemo(() => {
    if (!atividades.length) return [];
    const filtered = atividades.filter((a) => {
      const m = a.momento_ideal;
      return typeof m === "string" && m.toLowerCase() === momentoTab;
    });
    return filtered.length > 0 ? filtered : atividades.slice(0, 10);
  }, [atividades, momentoTab]);

  // ── Hero background animation ─────────────────────────────────────────────
  // overlayAnim starts at 0 so the dark editorial overlay is invisible until
  // the hero image is actually displayed — content always lands on a warm bg.
  const overlayAnim = useRef(new Animated.Value(0)).current;

  function handleHeroDisplay() {
    notifyHeroReady();                         // release the splash gate
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={s.root}>
      {/* ── Rotating background — editorial Rio pool ── */}
      <View style={[s.bgImage, { backgroundColor: "#1A0E04" }]} pointerEvents="none">
        <RotatingBackground
          pool={HOME_BG_POOL}
          onFirstImageDisplay={handleHeroDisplay}
        />
      </View>
      {/* Editorial overlay fades in WITH the image — never darkens a black canvas */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.44)", "rgba(0,0,0,0.56)", "rgba(0,0,0,0.70)"]}
          locations={[0, 0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <AppHeader transparent />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      >

        {/* ── 1. HERO CAROUSEL ── */}
        <HeroCarousel items={heroDestinos} />

        {/* ── 2. O QUE FAZER NO RIO ── Supabase: o_que_fazer_rio */}
        <View style={s.section}>
          <SectionHeader
            title={agoraTitle}
            uppercase
            subtitle="Experiências selecionadas para o Rio de Janeiro."
            dark
          />

          {/* ── Manhã / Tarde / Noite tabs ── */}
          <View style={s.momentoTabs}>
            {MOMENTO_TABS.map((tab) => {
              const active = momentoTab === tab.key;
              return (
                <View
                  key={tab.key}
                  style={[s.momentoTab, active && s.momentoTabActive]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? "#1a1a1a" : "rgba(255,255,255,0.60)"}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[s.momentoTabText, active && s.momentoTabTextActive]}>
                    {tab.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {loadingAtividades ? (
            <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 20, marginBottom: 8 }} />
          ) : (
            <HorizontalScroll>
              {filteredAtividades.slice(0, 10).map((item) => (
                <PlaceCard
                  key={item.id}
                  id={item.id}
                  saveCategoria="oQueFazer"
                  titulo={item.titulo}
                  localizacao={item.localizacao}
                  image={item.image}
                  size="medium"
                  onPress={() => router.push({
                    pathname: "/lugar/[cityId]/[placeId]",
                    params: { cityId: "rio", placeId: item.id, source_table: "o_que_fazer_rio" },
                  })}
                />
              ))}
            </HorizontalScroll>
          )}
        </View>

        <Divider />

        {/* ── 3. ONDE COMER ── Supabase: restaurantes */}
        <View style={s.section}>
          <SectionHeader
            title="Onde comer"
            uppercase
            subtitle="Os melhores restaurantes do Rio."
            dark
          />
          {loadingRestos ? (
            <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginTop: 20, marginBottom: 8 }} />
          ) : (
            <HorizontalScroll>
              {restos.slice(0, 10).map((r) => (
                <RestauranteCard
                  key={String(r.id)}
                  id={String(r.id)}
                  nome={r.nome}
                  bairro={r.bairro ?? "Rio de Janeiro"}
                  categoria={r.categoria ?? "Restaurante"}
                  image={r.resolvedPhotoUri ? { uri: r.resolvedPhotoUri } : null}
                  onPress={() => router.push({
                    pathname: "/lugar/[cityId]/[placeId]",
                    params: { cityId: "rio", placeId: String(r.id), source_table: "restaurantes" },
                  })}
                />
              ))}
            </HorizontalScroll>
          )}
        </View>

        <Divider />

        {/* ── 4. LUCKY LIST HIGHLIGHT ── Supabase: lucky_list_rio */}
        <LuckyHighlight />

        <Divider />

        {/* ── 8. VIAJE COMO ELES — Supabase: friends ── */}
        <View style={s.section}>
          <SectionHeader
            title="Viaje como eles"
            uppercase
            subtitle="Siga os passos de quem você admira. Acesse roteiros detalhados, segredos e dicas pessoais das nossas estrelas convidadas."
            dark
          />
          {loadingFriends ? (
            <ActivityIndicator color="rgba(201,168,76,0.7)" style={{ marginVertical: 16 }} />
          ) : (
            <View style={s.grid2}>
              {friends.map((f) => (
                <InfluencerCard key={f.id} influencer={f} />
              ))}
            </View>
          )}
        </View>

        <Divider />

        {/* ── 10. CTA: CRIAR ROTEIRO ── */}
        <RoteiroCTA />

        {/* ── EDITORIAL FOOTER ── */}
        <View style={s.footer}>
          <Image
            source={require("../../assets/images/logo-symbol.png")}
            style={s.footerLogo}
            resizeMode="contain"
          />
          <Text style={s.footerTagline}>inteligência humana em viagens</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A0E04",
  },

  // ── Background ──
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.50,
  },

  scroll: {
    flex: 1,
  },

  section: {
    paddingTop: 24,
    paddingBottom: 8,
  },

  // Subtle hairline — barely visible on dark bg
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 24,
    marginTop: 18,
  },

  // ── Momento tabs (manhã / tarde / noite) ──
  momentoTabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 12,
    marginBottom: 4,
  },
  momentoTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  momentoTabActive: {
    backgroundColor: "#C9A84C",
    borderColor: "#C9A84C",
  },
  momentoTabText: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.4,
  },
  momentoTabTextActive: {
    color: "#1a1a1a",
  },

  // ── 2-column grid ──
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 12,
  },

  // ── Lucky List highlight ──
  luckyBlock: {
    marginTop: 24,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.24)",
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 24,
    boxShadow: "0px 6px 28px rgba(201,168,76,0.08)",
  },
  luckyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  luckyAccentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.gold,
    letterSpacing: 2.5,
  },
  luckyAccentLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(201,168,76,0.20)",
  },
  luckyHeadline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 30,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  luckySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
    marginBottom: 20,
  },
  luckyPicks: {
    marginBottom: 20,
  },
  luckyPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.08)",
  },
  luckyPickStar: {
    fontSize: 10,
    color: C.gold,
    width: 18,
    textAlign: "center",
  },
  luckyPickText: {
    flex: 1,
  },
  luckyPickTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: C.white,
    lineHeight: 20,
  },
  luckyPickLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(201,168,76,0.55)",
    marginTop: 1,
  },
  luckyBtn: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.40)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(201,168,76,0.09)",
  },
  luckyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.gold,
    letterSpacing: 0.3,
  },

  // ── Influencer card ──
  influencerCard: {
    width: CARD_W,
    height: CARD_W * 1.22,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A1208",
    position: "relative",
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  influencerImageStyle: {
    borderRadius: 18,
  },
  influencerBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.50)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  influencerBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.white,
    letterSpacing: 0.2,
  },
  influencerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.white,
    lineHeight: 18,
    padding: 12,
    paddingTop: 6,
  },

  // ── CTA block — glass card ──
  ctaBlock: {
    marginTop: 24,
    marginHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 28,
  },
  ctaEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.terracotta,
    letterSpacing: 2,
    marginBottom: 10,
  },
  ctaHeadline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 30,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  ctaSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.52)",
    lineHeight: 22,
    marginBottom: 22,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.terracotta,
    borderRadius: 12,
    paddingVertical: 15,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.white,
    letterSpacing: 0.3,
  },

  // ── Footer ──
  footer: {
    marginTop: 48,
    marginHorizontal: 24,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  footerLogo: {
    width: 110,
    height: 32,
    opacity: 0.65,
  },
  footerTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 2.0,
    textTransform: "uppercase",
    textAlign: "center",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});
