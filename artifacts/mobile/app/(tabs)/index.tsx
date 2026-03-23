import React from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { AppHeader } from "@/components/AppHeader";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { HotelCard } from "@/components/HotelCard";
import { PeriodoSwitcher } from "@/components/PeriodoSwitcher";
import { PlaceCard } from "@/components/PlaceCard";
import { RestauranteCard } from "@/components/RestauranteCard";
import { SectionHeader } from "@/components/SectionHeader";
import Colors from "@/constants/colors";
import {
  curadoPara,
  destaques,
  heroDestinos,
  hoteis,
  influencers,
  Influencer,
  oQueFazerPorMomento,
  periodoMeta,
  restaurantes,
  Roteiro,
  roteiros,
} from "@/data/mockData";
import { LUGARES_LUCKY } from "@/data/lugares";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = (SCREEN_WIDTH - 48 - 12) / 2; // 2-col grid card width

// ── Inline sub-components ─────────────────────────────────────────────────────

function Divider() {
  return <View style={s.divider} />;
}

// Lucky List dark highlight block
function LuckyHighlight() {
  const picks = (LUGARES_LUCKY["rio"] ?? []).slice(0, 3);
  return (
    <View style={s.luckyBlock}>
      <View style={s.luckyBlockInner}>
        {/* header */}
        <View style={s.luckyHeader}>
          <Text style={s.luckyAccentText}>✦ LUCKY LIST</Text>
          <View style={s.luckyAccentLine} />
        </View>

        <Text style={s.luckyHeadline}>Seu Rio mais Lucky</Text>
        <Text style={s.luckySubtitle}>
          Os segredos que poucos conhecem. Curadoria feita à mão, atualizada quando vale a pena.
        </Text>

        {/* picks preview */}
        <View style={s.luckyPicks}>
          {picks.map((place, i) => (
            <Pressable
              key={place.id}
              style={s.luckyPickRow}
              onPress={() => router.push(`/lugar/rio/${place.id}`)}
            >
              <View style={s.luckyPickNum}>
                <Text style={s.luckyPickNumText}>✦</Text>
              </View>
              <View style={s.luckyPickText}>
                <Text style={s.luckyPickTitle}>{place.titulo}</Text>
                <Text style={s.luckyPickLoc}>{place.localizacao}</Text>
              </View>
              <Feather name="arrow-right" size={13} color="rgba(201,168,76,0.55)" />
            </Pressable>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          style={s.luckyBtn}
          onPress={() => router.push({ pathname: "/luckyList/[id]", params: { id: "rio" } })}
        >
          <Text style={s.luckyBtnText}>✦  Ver Lucky List completa</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Roteiro card — 2-col grid
function RoteiroCard({ roteiro }: { roteiro: Roteiro }) {
  return (
    <View style={s.roteiroCard}>
      <Image source={roteiro.image} style={s.roteiroImage} />
      <LinearGradient
        colors={["transparent", "rgba(10,5,2,0.80)"]}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.roteiroContent}>
        <View style={s.roteiroDias}>
          <Feather name="clock" size={10} color="rgba(255,255,255,0.72)" />
          <Text style={s.roteiroDiasText}>{roteiro.dias}</Text>
        </View>
        <Text style={s.roteiroTitle}>{roteiro.titulo}</Text>
        <View style={s.roteiroTagsRow}>
          {roteiro.tags.map((tag) => (
            <View key={tag} style={s.roteiroTag}>
              <Text style={s.roteiroTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Influencer card — 2-col grid
function InfluencerCard({ influencer }: { influencer: Influencer }) {
  return (
    <Pressable style={s.influencerCard}>
      <Image source={influencer.image} style={s.influencerImage} />
      <LinearGradient
        colors={["transparent", "rgba(10,5,2,0.72)"]}
        locations={[0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.influencerBadge}>
        <Feather name="map" size={10} color={C.white} />
        <Text style={s.influencerBadgeText}>Roteiros: {String(influencer.numRoteiros).padStart(2, "0")}</Text>
      </View>
      <Text style={s.influencerName}>{influencer.nome}</Text>
    </Pressable>
  );
}

// Roteiro CTA block
function RoteiroCTA() {
  return (
    <View style={s.ctaBlock}>
      <View style={s.ctaInner}>
        <Text style={s.ctaEyebrow}>ORGANIZE SUA PRÓXIMA VIAGEM</Text>
        <Text style={s.ctaHeadline}>Monte seu roteiro personalizado</Text>
        <Text style={s.ctaSub}>
          Use nosso planejador intuitivo para criar experiências únicas no seu destino.
        </Text>
        <Pressable style={s.ctaBtn}>
          <Feather name="plus" size={15} color={C.white} />
          <Text style={s.ctaBtnText}>Criar roteiro</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { periodo, setPeriodo, fadeAnim } = useTimeOfDay();
  const currentItems = oQueFazerPorMomento[periodo];
  const currentMeta = periodoMeta[periodo];

  return (
    <View style={s.root}>
      <AppHeader transparent />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      >

        {/* ── 1. HERO CAROUSEL ── */}
        <HeroCarousel items={heroDestinos} />

        {/* ── 2. DESTAQUES ── */}
        <View style={s.section}>
          <SectionHeader
            title="Destaques"
            uppercase
            subtitle="Uma seleção editorial dos melhores do Rio."
          />
          <HorizontalScroll>
            {destaques.map((d) => (
              <PlaceCard
                key={d.id}
                id={d.id}
                saveCategoria="oQueFazer"
                titulo={d.titulo}
                localizacao={d.localizacao}
                image={d.image}
                size="large"
              />
            ))}
          </HorizontalScroll>
        </View>

        <Divider />

        {/* ── 3. O QUE FAZER AGORA ── */}
        <View style={s.section}>
          <SectionHeader
            title="O que fazer agora"
            uppercase
            subtitle={currentMeta.subtitle}
          />
          <PeriodoSwitcher active={periodo} onChange={setPeriodo} />
          <Animated.View style={{ opacity: fadeAnim }}>
            <HorizontalScroll>
              {currentItems.map((item) => (
                <PlaceCard
                  key={item.id}
                  id={item.id}
                  saveCategoria="oQueFazer"
                  titulo={item.titulo}
                  localizacao={item.localizacao}
                  image={item.image}
                  size="medium"
                />
              ))}
            </HorizontalScroll>
          </Animated.View>
        </View>

        <Divider />

        {/* ── 4. CURADOS PARA VOCÊ ── */}
        <View style={s.section}>
          <SectionHeader
            title="Curados para você"
            uppercase
            subtitle="Hotéis, restaurantes e experiências no Rio."
          />
          <HorizontalScroll>
            {curadoPara.map((item) => (
              <PlaceCard
                key={item.id}
                id={item.id}
                saveCategoria="oQueFazer"
                titulo={item.titulo}
                localizacao={item.localizacao}
                image={item.image}
                size="medium"
              />
            ))}
          </HorizontalScroll>
        </View>

        <Divider />

        {/* ── 5. ONDE COMER ── */}
        <View style={s.section}>
          <SectionHeader
            title="Onde comer"
            uppercase
            subtitle="Os melhores restaurantes do Rio."
          />
          <HorizontalScroll>
            {restaurantes.map((r) => (
              <RestauranteCard
                key={r.id}
                id={r.id}
                nome={r.nome}
                bairro={r.bairro}
                categoria={r.categoria}
                image={r.image}
              />
            ))}
          </HorizontalScroll>
        </View>

        <Divider />

        {/* ── 6. ONDE FICAR ── */}
        <View style={s.section}>
          <SectionHeader
            title="Onde ficar"
            uppercase
            subtitle="Hotéis com personalidade carioca."
          />
          <HorizontalScroll>
            {hoteis.map((h) => (
              <HotelCard
                key={h.id}
                id={h.id}
                nome={h.nome}
                localizacao={h.localizacao}
                tipo={h.tipo}
                image={h.image}
              />
            ))}
          </HorizontalScroll>
        </View>

        {/* ── 7. LUCKY LIST HIGHLIGHT ── */}
        <LuckyHighlight />

        <Divider />

        {/* ── 8. ROTEIROS ── */}
        <View style={s.section}>
          <SectionHeader
            title="Roteiros"
            uppercase
            subtitle="Crie o seu ou use os nossos."
          />
          <View style={s.grid2}>
            {roteiros.map((r) => (
              <RoteiroCard key={r.id} roteiro={r} />
            ))}
          </View>
        </View>

        <Divider />

        {/* ── 9. VIAJE COMO ELES ── */}
        <View style={s.section}>
          <SectionHeader
            title="Viaje como eles"
            uppercase
            subtitle="Siga os passos de quem você admira. Acesse roteiros detalhados, segredos e dicas pessoais das nossas estrelas convidadas."
          />
          <View style={s.grid2}>
            {influencers.map((inf) => (
              <InfluencerCard key={inf.id} influencer={inf} />
            ))}
          </View>
        </View>

        <Divider />

        {/* ── 10. CTA: CRIAR ROTEIRO ── */}
        <RoteiroCTA />

        {/* ── EDITORIAL FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Curadoria editorial para viajantes que entendem de beleza.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.cream,
  },

  section: {
    paddingTop: 28,
    paddingBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 24,
    marginTop: 20,
  },

  // ── 2-column grid ──
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 12,
  },

  // ── Lucky List highlight block ──
  luckyBlock: {
    marginTop: 28,
    backgroundColor: "#0A0502",
  },
  luckyBlockInner: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  luckyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
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
    backgroundColor: "rgba(201,168,76,0.22)",
  },
  luckyHeadline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: C.white,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  luckySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 22,
    marginBottom: 24,
  },
  luckyPicks: {
    gap: 0,
    marginBottom: 24,
  },
  luckyPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.10)",
  },
  luckyPickNum: {
    width: 24,
    alignItems: "center",
  },
  luckyPickNumText: {
    fontSize: 11,
    color: C.gold,
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
    fontSize: 12,
    color: "rgba(201,168,76,0.60)",
    marginTop: 2,
  },
  luckyBtn: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "rgba(201,168,76,0.08)",
  },
  luckyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.gold,
    letterSpacing: 0.3,
  },

  // ── Roteiro card ──
  roteiroCard: {
    width: CARD_W,
    height: CARD_W * 1.3,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1C1410",
  },
  roteiroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  roteiroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  roteiroDias: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  roteiroDiasText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.68)",
    letterSpacing: 0.3,
  },
  roteiroTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 15,
    color: C.white,
    lineHeight: 20,
    marginBottom: 8,
  },
  roteiroTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  roteiroTag: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  roteiroTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.5,
  },

  // ── Influencer card ──
  influencerCard: {
    width: CARD_W,
    height: CARD_W * 1.2,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1C1410",
    position: "relative",
    justifyContent: "flex-end",
  },
  influencerImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  influencerBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  influencerBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: C.white,
    letterSpacing: 0.3,
  },
  influencerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.white,
    lineHeight: 18,
    padding: 12,
    paddingTop: 6,
  },

  // ── CTA block ──
  ctaBlock: {
    marginTop: 28,
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: C.darkBrown,
  },
  ctaInner: {
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
    color: "rgba(255,255,255,0.60)",
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
    marginTop: 40,
    marginHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  footerL: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: C.terracotta,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});
