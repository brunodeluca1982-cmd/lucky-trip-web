/**
 * "O que fazer agora" — real-time intelligent guide by time of day.
 *
 * Opens from the "Agora no Rio" card on the cidade/[id] screen.
 *
 * Structure:
 *  – Cinematic hero header (background image + title + period subtitle)
 *  – PeriodoSwitcher (Manhã / Tarde / Noite)
 *  – Hero card (top pick, full-width)
 *  – Horizontal scroll of additional picks
 *  – "Destaque principal" curated 2-column grid
 */

import React from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { destinos, periodoMeta, type Periodo } from "@/data/mockData";
import { PeriodoSwitcher } from "@/components/PeriodoSwitcher";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";

const C = Colors.light;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = SCREEN_WIDTH * 0.62;
const GRID_CARD_W = (SCREEN_WIDTH - 48 - 12) / 2;

// ── Richer time-based content (tag + descricao added) ─────────────────────────

interface AgoraItem {
  id: string;
  titulo: string;
  localizacao: string;
  tag: string;
  descricao: string;
  image: ImageSourcePropType;
}

const AGORA_CONTENT: Record<string, Record<Periodo, AgoraItem[]>> = {
  rio: {
    manha: [
      {
        id: "m1",
        titulo: "Praia de Ipanema",
        localizacao: "Ipanema",
        tag: "Praia",
        descricao: "O amanhecer mais bonito do Brasil — mar calmo, areia limpa e a cidade acordando devagar.",
        image: require("../../assets/images/ipanema.png"),
      },
      {
        id: "m2",
        titulo: "Caminhada ao Cristo",
        localizacao: "Cosme Velho",
        tag: "Natureza",
        descricao: "Vista de 360° antes do calor. O trilho sobe pela mata atlântica com sombra e frescor.",
        image: require("../../assets/images/cristo.png"),
      },
      {
        id: "m3",
        titulo: "Café na Colombo",
        localizacao: "Centro Histórico",
        tag: "Cultura",
        descricao: "Brunch dentro do art nouveau mais bonito do Rio. Café coado, croissant e décadas de história.",
        image: require("../../assets/images/restaurante1.png"),
      },
    ],
    tarde: [
      {
        id: "t1",
        titulo: "Pão de Açúcar",
        localizacao: "Urca",
        tag: "Mirante",
        descricao: "Vista panorâmica ao entardecer — a hora certa de subir de bondinho.",
        image: require("../../assets/images/pao-acucar.png"),
      },
      {
        id: "t2",
        titulo: "Escadaria Selarón",
        localizacao: "Lapa",
        tag: "Arte",
        descricao: "O mosaico mais icônico do Brasil, com azulejos de mais de 60 países.",
        image: require("../../assets/images/lapa.png"),
      },
      {
        id: "t3",
        titulo: "Santa Teresa",
        localizacao: "Santa Teresa",
        tag: "Bairro",
        descricao: "Galerias, bistrôs e charme colonial no bairro mais bohémio do Rio.",
        image: require("../../assets/images/hotel2.png"),
      },
    ],
    noite: [
      {
        id: "n1",
        titulo: "Beco das Sardinhas",
        localizacao: "Centro",
        tag: "Gastronomia",
        descricao: "Petiscos, chopp e a animação carioca mais autêntica do centro histórico.",
        image: require("../../assets/images/secret1.png"),
      },
      {
        id: "n2",
        titulo: "Oro Restaurant",
        localizacao: "Leblon",
        tag: "Fine Dining",
        descricao: "Uma estrela Michelin com menu autoral e vista para o Leblon ao entardecer.",
        image: require("../../assets/images/restaurante2.png"),
      },
      {
        id: "n3",
        titulo: "Arcos da Lapa",
        localizacao: "Lapa",
        tag: "Vida Noturna",
        descricao: "Samba ao vivo, choperia aberta e a energia que fez a Lapa famosa no mundo.",
        image: require("../../assets/images/secret2.png"),
      },
    ],
  },
};

// Fallback for other cities (generic)
const FALLBACK_CONTENT: Record<Periodo, AgoraItem[]> = {
  manha: [
    { id: "g-m1", titulo: "Café da manhã local", localizacao: "Centro", tag: "Cultura", descricao: "Comece o dia com sabores da cidade.", image: require("../../assets/images/restaurante1.png") },
  ],
  tarde: [
    { id: "g-t1", titulo: "Passeio pelo centro", localizacao: "Centro", tag: "Cultura", descricao: "A melhor hora para explorar a cidade.", image: require("../../assets/images/secret2.png") },
  ],
  noite: [
    { id: "g-n1", titulo: "Jantar com vista", localizacao: "Centro", tag: "Gastronomia", descricao: "Encerre o dia com sabor.", image: require("../../assets/images/restaurante2.png") },
  ],
};

// "Destaque principal" — curated cross-category picks per period
interface DestaquePick {
  titulo: string;
  localizacao: string;
  tag: string;
  image: ImageSourcePropType;
}

const DESTAQUE_PRINCIPAL: Record<Periodo, DestaquePick[]> = {
  manha: [
    { titulo: "Hotel Santa Teresa", localizacao: "Santa Teresa", tag: "Hospedagem", image: require("../../assets/images/hotel1.png") },
    { titulo: "Parque Lage", localizacao: "Jardim Botânico", tag: "Natureza", image: require("../../assets/images/secret2.png") },
  ],
  tarde: [
    { titulo: "Confeitaria Colombo", localizacao: "Centro", tag: "Gastronomia", image: require("../../assets/images/restaurante1.png") },
    { titulo: "Copacabana Palace", localizacao: "Copacabana", tag: "Luxo", image: require("../../assets/images/hotel1.png") },
  ],
  noite: [
    { titulo: "Mirante do Leblon", localizacao: "Leblon", tag: "Vista", image: require("../../assets/images/secret1.png") },
    { titulo: "Pôr do sol Arpoador", localizacao: "Arpoador", tag: "Ritual", image: require("../../assets/images/ipanema.png") },
  ],
};

// ── Hero card (first item, full-width) ────────────────────────────────────────
function HeroCard({ item, cityId }: { item: AgoraItem; cityId: string }) {
  return (
    <Pressable
      style={({ pressed }) => [s.heroCard, pressed && { opacity: 0.90 }]}
      onPress={() => router.push(`/lugar/${cityId}/${item.id}`)}
    >
      <Image source={item.image} style={s.heroCardImage} />
      <LinearGradient
        colors={["rgba(0,0,0,0.02)", "rgba(10,5,2,0.85)"]}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Tag pill */}
      <View style={s.heroTagPill}>
        <Text style={s.heroTagText}>{item.tag}</Text>
      </View>
      {/* Content */}
      <View style={s.heroCardContent}>
        <Text style={s.heroCardTitle}>{item.titulo}</Text>
        <Text style={s.heroCardSub}>{item.descricao}</Text>
        <View style={s.heroCardAction}>
          <Text style={s.heroCardActionText}>Explorar</Text>
          <Feather name="arrow-right" size={13} color="rgba(255,255,255,0.70)" />
        </View>
      </View>
    </Pressable>
  );
}

// ── Horizontal scroll card ────────────────────────────────────────────────────
function MomentoCard({ item, cityId }: { item: AgoraItem; cityId: string }) {
  return (
    <Pressable
      style={({ pressed }) => [s.momentoCard, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}
      onPress={() => router.push(`/lugar/${cityId}/${item.id}`)}
    >
      <Image source={item.image} style={s.momentoImage} />
      <LinearGradient
        colors={["rgba(0,0,0,0.02)", "rgba(10,5,2,0.84)"]}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.momentoTagPill}>
        <Text style={s.momentoTagText}>{item.tag}</Text>
      </View>
      <View style={s.momentoContent}>
        <Text style={s.momentoTitle} numberOfLines={2}>{item.titulo}</Text>
        <Text style={s.momentoLoc}>{item.localizacao}</Text>
      </View>
    </Pressable>
  );
}

// ── Destaque card (2-col grid) ────────────────────────────────────────────────
function DestaqueCard({ pick }: { pick: DestaquePick }) {
  return (
    <View style={s.destaqueCard}>
      <Image source={pick.image} style={s.destaqueImage} />
      <LinearGradient
        colors={["rgba(0,0,0,0.04)", "rgba(10,5,2,0.82)"]}
        locations={[0.2, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.destaqueTagPill}>
        <Text style={s.destaqueTagText}>{pick.tag}</Text>
      </View>
      <View style={s.destaqueContent}>
        <Text style={s.destaqueTitulo} numberOfLines={2}>{pick.titulo}</Text>
        <Text style={s.destaqueLoc}>{pick.localizacao}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AgoraNoRioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const { periodo, setPeriodo, fadeAnim } = useTimeOfDay();
  const meta = periodoMeta[periodo];

  const cityContent = AGORA_CONTENT[destino.id] ?? FALLBACK_CONTENT;
  const items = cityContent[periodo] ?? [];
  const heroItem = items[0];
  const restItems = items.slice(1);
  const destaques = DESTAQUE_PRINCIPAL[periodo];

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fullscreen background ── */}
      <Image source={destino.image} style={s.bgImage} />
      <LinearGradient
        colors={["rgba(10,5,2,0.55)", "rgba(10,5,2,0.40)", "#0A0502"]}
        locations={[0, 0.28, 0.52]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Back button — fixed ── */}
      <Pressable
        onPress={() => router.back()}
        style={[s.backBtn, { top: topInset + 12 }]}
        hitSlop={8}
      >
        <Feather name="arrow-left" size={18} color={C.white} />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: topInset + 60, paddingBottom: bottomPad + 60 },
        ]}
      >
        {/* ── Hero header (text over background image) ── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>O que fazer agora</Text>
          <Animated.Text style={[s.headerSubtitle, { opacity: fadeAnim }]}>
            {meta.subtitle}
          </Animated.Text>
        </View>

        {/* ── Period switcher ── */}
        <PeriodoSwitcher active={periodo} onChange={setPeriodo} dark />

        {/* ── Content animates on period change ── */}
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Hero card ── */}
          {heroItem && (
            <View style={s.heroSection}>
              <HeroCard item={heroItem} cityId={destino.id} />
            </View>
          )}

          {/* ── More cards horizontal scroll ── */}
          {restItems.length > 0 && (
            <View style={s.maisSection}>
              <View style={s.maisSectionHeader}>
                <Text style={s.maisSectionLabel}>Mais para este momento</Text>
                <Feather name="chevron-right" size={15} color="rgba(255,255,255,0.35)" />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.momentoScroll}
              >
                {restItems.map((item) => (
                  <MomentoCard key={item.id} item={item} cityId={destino.id} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Destaque principal ── */}
          {destaques && (
            <View style={s.destaqueSection}>
              <View style={s.maisSectionHeader}>
                <Text style={s.maisSectionLabel}>Destaque principal</Text>
              </View>
              <View style={s.destaqueGrid}>
                {destaques.map((pick, i) => (
                  <DestaqueCard key={i} pick={pick} />
                ))}
              </View>
            </View>
          )}

        </Animated.View>

        {/* ── Editorial footer ── */}
        <View style={s.footer}>
          <Text style={s.footerL}>L.</Text>
          <Text style={s.footerText}>
            Sugestões baseadas no momento — atualizadas conforme o dia avança.
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
    backgroundColor: "#0A0502",
  },

  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 320,
    resizeMode: "cover",
  },

  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.40)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {},

  // ── Header (over background image) ──
  header: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    gap: 6,
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: C.white,
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 22,
  },

  // ── Hero card ──
  heroSection: {
    paddingHorizontal: 24,
    marginTop: 22,
  },
  heroCard: {
    width: "100%",
    height: 240,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#1A1208",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  heroCardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroTagPill: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  heroTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.white,
    letterSpacing: 0.4,
  },
  heroCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 5,
  },
  heroCardTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.white,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  heroCardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 19,
  },
  heroCardAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  heroCardActionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.3,
  },

  // ── "Mais para este momento" horizontal scroll ──
  maisSection: {
    marginTop: 28,
  },
  maisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  maisSectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.50)",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  momentoScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  momentoCard: {
    width: CARD_W,
    height: CARD_W * 1.18,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A1208",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  momentoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  momentoTagPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.50)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  momentoTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.5,
  },
  momentoContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 3,
  },
  momentoTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 16,
    color: C.white,
    lineHeight: 21,
  },
  momentoLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },

  // ── Destaque principal ──
  destaqueSection: {
    marginTop: 32,
  },
  destaqueGrid: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
  },
  destaqueCard: {
    flex: 1,
    height: GRID_CARD_W * 1.2,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A1208",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  destaqueImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  destaqueTagPill: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  destaqueTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.5,
  },
  destaqueContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 34,
    gap: 2,
  },
  destaqueTitulo: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 14,
    color: C.white,
    lineHeight: 19,
  },
  destaqueLoc: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.52)",
  },

  // ── Footer ──
  footer: {
    marginTop: 40,
    marginHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  footerL: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: C.terracotta,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.32)",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 240,
  },
});
