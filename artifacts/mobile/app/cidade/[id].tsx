import React, { useRef } from "react";
import {
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
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PlaceCard } from "@/components/PlaceCard";
import { SectionHeader } from "@/components/SectionHeader";
import {
  destinos,
  destaques,
  restaurantes,
  hoteis,
  segredos,
} from "@/data/mockData";
import { DestaquesCard } from "@/components/DestaquesCard";
import { RestauranteCard } from "@/components/RestauranteCard";
import { HotelCard } from "@/components/HotelCard";

const C = Colors.light;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// City-specific short reference for the primary button
const ESSENTIALS: Record<string, string> = {
  rio: "do Rio",
  santorini: "de Santorini",
  kyoto: "de Kyoto",
  paris: "de Paris",
  "nova-york": "de Nova York",
  toquio: "de Tóquio",
  lisboa: "de Lisboa",
  miami: "de Miami",
  bali: "de Bali",
  amsterdam: "de Amsterdam",
  marrakech: "de Marrakech",
  ilhabela: "de Ilhabela",
};

// City-specific "experience of the moment"
const EXPERIENCES: Record<string, string> = {
  rio: "Pôr do sol em Ipanema",
  santorini: "Nascer do sol no Aegeu",
  kyoto: "Cerimônia do chá em Gion",
  paris: "Café da manhã em Montmartre",
  "nova-york": "Golden hour no High Line",
  toquio: "Sakura no Shinjuku Gyoen",
  lisboa: "Fado ao cair da noite",
  miami: "Passeio pela Art Deco District",
  bali: "Ritual ao pôr do sol em Uluwatu",
  amsterdam: "Canal ao entardecer",
  marrakech: "Pôr do sol no deserto de Agafay",
  ilhabela: "Trilha para a cachoeira do Gato",
};

function GlassButton({
  onPress,
  children,
  style,
  bright,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: object;
  bright?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.glassBtn,
        bright && styles.glassBtnBright,
        style,
        pressed && { opacity: 0.82 },
      ]}
    >
      {children}
    </Pressable>
  );
}

export default function CidadeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const contentOffsetRef = useRef(0);

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const isRio = destino.id === "rio";

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const experience = EXPERIENCES[destino.id] ?? "Descoberta local";
  const essentialRef = ESSENTIALS[destino.id] ?? `de ${destino.cidade}`;

  // Scroll past the hero to reveal editorial content
  function scrollToContent() {
    scrollRef.current?.scrollTo({ y: SCREEN_HEIGHT - 10, animated: true });
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        scrollEventThrottle={16}
      >
        {/* ════════════════════════════════════════
            HERO — full-screen guided menu
        ════════════════════════════════════════ */}
        <View style={[styles.hero, { height: SCREEN_HEIGHT }]}>
          {/* Background image */}
          <Image source={destino.image} style={styles.heroImage} />

          {/* Cinematic gradient: light burn top → clear middle → deep dark bottom */}
          <LinearGradient
            colors={[
              "rgba(10,5,2,0.52)",
              "rgba(10,5,2,0.12)",
              "rgba(10,5,2,0.08)",
              "rgba(10,5,2,0.78)",
              "rgba(10,5,2,0.96)",
            ]}
            locations={[0, 0.18, 0.42, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: topInset + 12 }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={C.white} />
          </Pressable>

          {/* City identity — centered upper area */}
          <View style={[styles.identity, { paddingTop: topInset + 64 }]}>
            <Text style={styles.pais}>{destino.pais}</Text>
            <Text style={styles.cidade}>{destino.cidade}</Text>
          </View>

          {/* ── Guided menu — bottom section ── */}
          <View style={styles.menu}>
            {/* 1. PRIMARY — "Comece por aqui" */}
            <GlassButton onPress={scrollToContent} bright style={styles.btnPrimary}>
              <View style={styles.btnPrimaryInner}>
                <View style={styles.btnPrimaryLeft}>
                  <Text style={styles.eyebrow}>Comece por aqui</Text>
                  <Text style={styles.btnPrimaryLabel}>
                    O essencial {essentialRef}
                  </Text>
                </View>
                <View style={styles.btnPrimaryArrow}>
                  <Feather name="arrow-right" size={18} color={C.white} />
                </View>
              </View>
            </GlassButton>

            {/* 2. EXPERIENCE — "Experiência do momento" */}
            <GlassButton style={styles.btnExperience}>
              <View style={styles.btnExperienceInner}>
                <View style={styles.expIconWrap}>
                  <Text style={styles.expIcon}>✦</Text>
                </View>
                <View style={styles.expTexts}>
                  <Text style={styles.eyebrowGold}>Experiência do momento</Text>
                  <Text style={styles.btnExperienceLabel}>{experience}</Text>
                </View>
              </View>
            </GlassButton>

            {/* 3-5. Standard options */}
            <View style={styles.standardGroup}>
              <GlassButton style={styles.btnStandard}>
                <View style={styles.btnStandardInner}>
                  <Feather name="compass" size={16} color="rgba(255,255,255,0.70)" />
                  <Text style={styles.btnStandardLabel}>O que fazer</Text>
                </View>
              </GlassButton>

              <GlassButton style={styles.btnStandard}>
                <View style={styles.btnStandardInner}>
                  <Feather name="coffee" size={16} color="rgba(255,255,255,0.70)" />
                  <Text style={styles.btnStandardLabel}>Comer bem</Text>
                </View>
              </GlassButton>

              <GlassButton style={styles.btnStandard}>
                <View style={styles.btnStandardInner}>
                  <Feather name="moon" size={16} color="rgba(255,255,255,0.70)" />
                  <Text style={styles.btnStandardLabel}>Ficar bem</Text>
                </View>
              </GlassButton>
            </View>

            {/* 6. Lucky List — personal */}
            <GlassButton style={styles.btnLucky}>
              <View style={styles.btnStandardInner}>
                <Text style={styles.luckyIcon}>✦</Text>
                <Text style={styles.btnLuckyLabel}>Sua Lucky List</Text>
              </View>
            </GlassButton>

            {/* 7. Utility — "Como chegar" — minimal, last */}
            <Pressable style={styles.btnUtility} hitSlop={8}>
              <Text style={styles.btnUtilityLabel}>Como chegar</Text>
              <Feather name="map-pin" size={13} color="rgba(255,255,255,0.42)" />
            </Pressable>
          </View>

          {/* Scroll cue — subtle down arrow */}
          <Pressable onPress={scrollToContent} style={styles.scrollCue}>
            <Feather name="chevron-down" size={18} color="rgba(255,255,255,0.35)" />
          </Pressable>
        </View>

        {/* ════════════════════════════════════════
            EDITORIAL CONTENT — scrolls below hero
        ════════════════════════════════════════ */}
        <View style={styles.contentRoot}>
          {/* ── Destaques ── */}
          <View style={styles.section}>
            <SectionHeader
              title={isRio ? "Destaques do destino" : "Em destaque"}
              subtitle={
                isRio
                  ? "Uma seleção editorial dos melhores momentos."
                  : `O melhor de ${destino.cidade} em curadoria.`
              }
            />
            {destaques.map((d) => (
              <DestaquesCard
                key={d.id}
                id={`cidade-${destino.id}-${d.id}`}
                titulo={d.titulo}
                localizacao={d.localizacao}
                descricao={d.descricao}
                tipo={d.tipo}
                image={d.image}
              />
            ))}
          </View>

          <View style={styles.divider} />

          {/* ── O que fazer ── */}
          <View style={styles.section}>
            <SectionHeader
              title="O que fazer"
              subtitle={`Experiências imperdíveis em ${destino.cidade}.`}
            />
            <HorizontalScroll>
              {[...destaques, ...segredos].slice(0, 4).map((item) => (
                <PlaceCard
                  key={item.id}
                  id={`cidade-of-${destino.id}-${item.id}`}
                  saveCategoria="oQueFazer"
                  titulo={item.titulo}
                  localizacao={item.localizacao}
                  image={item.image}
                  size="medium"
                />
              ))}
            </HorizontalScroll>
          </View>

          <View style={styles.divider} />

          {/* ── Comer bem ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Comer bem"
              subtitle={`Restaurantes com alma em ${destino.cidade}.`}
            />
            <HorizontalScroll>
              {restaurantes.map((r) => (
                <RestauranteCard
                  key={r.id}
                  id={`cidade-r-${destino.id}-${r.id}`}
                  nome={r.nome}
                  bairro={r.bairro}
                  categoria={r.categoria}
                  image={r.image}
                />
              ))}
            </HorizontalScroll>
          </View>

          <View style={styles.divider} />

          {/* ── Ficar bem ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Ficar bem"
              subtitle={`Hospedagem com personalidade em ${destino.cidade}.`}
            />
            <HorizontalScroll>
              {hoteis.map((h) => (
                <HotelCard
                  key={h.id}
                  id={`cidade-h-${destino.id}-${h.id}`}
                  nome={h.nome}
                  localizacao={h.localizacao}
                  tipo={h.tipo}
                  image={h.image}
                />
              ))}
            </HorizontalScroll>
          </View>

          <View style={styles.divider} />

          {/* ── Segredos locais ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Segredos locais"
              subtitle={`O que poucos sabem sobre ${destino.cidade}.`}
            />
            {segredos.map((seg) => (
              <PlaceCard
                key={seg.id}
                id={`cidade-seg-${destino.id}-${seg.id}`}
                saveCategoria="oQueFazer"
                titulo={seg.titulo}
                localizacao={seg.localizacao}
                descricao={seg.descricao}
                image={seg.image}
                variant="secret"
              />
            ))}
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerL}>L.</Text>
            <Text style={styles.footerText}>
              Curadoria editorial para viajantes que entendem de beleza.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0502",
  },

  // ── Hero / menu ──
  hero: {
    width: SCREEN_WIDTH,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // City identity block — upper portion
  identity: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 6,
  },
  pais: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  cidade: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 46,
    color: "#FFFFFF",
    lineHeight: 52,
    letterSpacing: -0.6,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Guided menu — bottom portion
  menu: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 10,
  },

  // Glass button base
  glassBtn: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    overflow: "hidden",
  },
  glassBtnBright: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderColor: "rgba(255,255,255,0.38)",
  },

  // 1. Primary
  btnPrimary: {
    borderRadius: 20,
  },
  btnPrimaryInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 12,
  },
  btnPrimaryLeft: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.52)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  btnPrimaryLabel: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  btnPrimaryArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // 2. Experience
  btnExperience: {
    borderColor: "rgba(201,168,76,0.38)",
  },
  btnExperienceInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  expIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201,168,76,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  expIcon: {
    fontSize: 14,
    color: "#C9A84C",
  },
  expTexts: {
    flex: 1,
    gap: 3,
  },
  eyebrowGold: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(201,168,76,0.80)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  btnExperienceLabel: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  // 3-5. Standard group
  standardGroup: {
    gap: 10,
  },
  btnStandard: {
    borderRadius: 16,
  },
  btnStandardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  btnStandardLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
    flex: 1,
  },

  // 6. Lucky List
  btnLucky: {
    borderColor: "rgba(196,112,74,0.40)",
    borderRadius: 16,
  },
  luckyIcon: {
    fontSize: 15,
    color: "#C4704A",
  },
  btnLuckyLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
    flex: 1,
  },

  // 7. Utility
  btnUtility: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  btnUtilityLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.40)",
    letterSpacing: 0.2,
  },

  // Scroll cue
  scrollCue: {
    position: "absolute",
    bottom: 140,
    alignSelf: "center",
    opacity: 0.6,
  },

  // ── Editorial content below ──
  contentRoot: {
    backgroundColor: C.cream,
  },
  section: {
    paddingTop: 28,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 24,
    marginTop: 16,
  },
  footer: {
    marginTop: 40,
    marginHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
    gap: 8,
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
