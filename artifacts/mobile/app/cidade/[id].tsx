import React from "react";
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
        s.glassBtn,
        bright && s.glassBtnBright,
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

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const isRio = destino.id === "rio";

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const experience = EXPERIENCES[destino.id] ?? "Descoberta local";
  const essentialRef = ESSENTIALS[destino.id] ?? `de ${destino.cidade}`;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fullscreen background image — fixed behind everything ── */}
      <Image source={destino.image} style={s.bgImage} />

      {/* ── Cinematic gradient overlay — full screen, fixed ──
          Designed in three zones:
            Top 20%  → dark burn (back button readable)
            20–48%   → clears out (city name reads on image)
            48–100%  → deepens to near-black (buttons float on dark canvas) */}
      <LinearGradient
        colors={[
          "rgba(8,4,2,0.62)",
          "rgba(8,4,2,0.14)",
          "rgba(8,4,2,0.08)",
          "rgba(8,4,2,0.72)",
          "rgba(8,4,2,0.96)",
        ]}
        locations={[0, 0.20, 0.42, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Back button — fixed, does not scroll ── */}
      <Pressable
        onPress={() => router.back()}
        style={[s.backBtn, { top: topInset + 12 }]}
        hitSlop={8}
      >
        <Feather name="arrow-left" size={20} color={C.white} />
      </Pressable>

      {/* ── Scrollable content — transparent, floats over the fixed image ──
          Everything here is in normal vertical flow: title → spacing → buttons.
          No absolute positioning between siblings → no overlap possible. */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: topInset + 56, paddingBottom: bottomPad + 40 },
        ]}
      >
        {/* City identity — in flow, sits in the clear zone of the gradient */}
        <View style={s.identity}>
          <Text style={s.pais}>{destino.pais}</Text>
          <Text style={s.cidade}>{destino.cidade}</Text>
        </View>

        {/* Spacer — pushes buttons into the dark lower zone, prevents collision */}
        <View style={{ height: SCREEN_HEIGHT * 0.14 }} />

        {/* ── Action buttons — normal flow inside scroll ── */}
        <View style={s.menu}>
          {/* 1. PRIMARY */}
          <GlassButton
            bright
            style={s.btnPrimary}
            onPress={() => {}}
          >
            <View style={s.btnPrimaryInner}>
              <View style={s.btnPrimaryLeft}>
                <Text style={s.eyebrow}>Comece por aqui</Text>
                <Text style={s.btnPrimaryLabel}>
                  O essencial {essentialRef}
                </Text>
              </View>
              <View style={s.btnPrimaryArrow}>
                <Feather name="arrow-right" size={18} color={C.white} />
              </View>
            </View>
          </GlassButton>

          {/* 2. EXPERIENCE */}
          <GlassButton style={s.btnExperience}>
            <View style={s.btnExperienceInner}>
              <View style={s.expIconWrap}>
                <Text style={s.expIcon}>✦</Text>
              </View>
              <View style={s.expTexts}>
                <Text style={s.eyebrowGold}>Experiência do momento</Text>
                <Text style={s.btnExperienceLabel}>{experience}</Text>
              </View>
            </View>
          </GlassButton>

          {/* 3. O que fazer */}
          <GlassButton
            style={s.btnStandard}
            onPress={() =>
              router.push({ pathname: "/oQueFazer/[id]", params: { id: destino.id } })
            }
          >
            <View style={s.btnStandardInner}>
              <Feather name="compass" size={16} color="rgba(255,255,255,0.70)" />
              <Text style={s.btnStandardLabel}>O que fazer</Text>
            </View>
          </GlassButton>

          {/* 4. Comer bem */}
          <GlassButton
            style={s.btnStandard}
            onPress={() =>
              router.push({ pathname: "/comerBem/[id]", params: { id: destino.id } })
            }
          >
            <View style={s.btnStandardInner}>
              <Feather name="coffee" size={16} color="rgba(255,255,255,0.70)" />
              <Text style={s.btnStandardLabel}>Comer bem</Text>
            </View>
          </GlassButton>

          {/* 5. Ficar bem */}
          <GlassButton
            style={s.btnStandard}
            onPress={() =>
              router.push({ pathname: "/ficarBem/[id]", params: { id: destino.id } })
            }
          >
            <View style={s.btnStandardInner}>
              <Feather name="moon" size={16} color="rgba(255,255,255,0.70)" />
              <Text style={s.btnStandardLabel}>Ficar bem</Text>
            </View>
          </GlassButton>

          {/* 6. Sua Lucky List */}
          <GlassButton style={[s.btnStandard, s.btnLucky]}>
            <View style={s.btnStandardInner}>
              <Text style={s.luckyIcon}>✦</Text>
              <Text style={s.btnLuckyLabel}>Sua Lucky List</Text>
            </View>
          </GlassButton>

          {/* 7. Como chegar */}
          <GlassButton style={s.btnStandard}>
            <View style={s.btnStandardInner}>
              <Feather name="map-pin" size={16} color="rgba(255,255,255,0.70)" />
              <Text style={s.btnStandardLabel}>Como chegar</Text>
            </View>
          </GlassButton>
        </View>

        {/* ── Editorial content — cream section, scrolls naturally below ── */}
        <View style={s.editorial}>
          <View style={s.section}>
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

          <View style={s.divider} />

          <View style={s.section}>
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

          <View style={s.divider} />

          <View style={s.section}>
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

          <View style={s.divider} />

          <View style={s.section}>
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

          <View style={s.divider} />

          <View style={s.section}>
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

          <View style={s.footer}>
            <Text style={s.footerL}>L.</Text>
            <Text style={s.footerText}>
              Curadoria editorial para viajantes que entendem de beleza.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080402",
  },

  // Fullscreen background — sits behind everything
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  // Back button — fixed position, does not participate in scroll flow
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Transparent scroll layer — floats above the fixed image
  scroll: {
    flex: 1,
  },
  scrollContent: {
    // paddingTop set dynamically to topInset + 56
  },

  // City identity — in normal flow, sits in the clear zone
  identity: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
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
  },

  // Buttons — in normal flow, below the spacer
  menu: {
    paddingHorizontal: 20,
    gap: 10,
  },

  // Glass button base
  glassBtn: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
  },
  glassBtnBright: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderColor: "rgba(255,255,255,0.38)",
  },

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
  btnLucky: {
    borderColor: "rgba(196,112,74,0.40)",
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

  // Editorial content — cream block, scrolls in naturally
  editorial: {
    marginTop: 32,
    backgroundColor: C.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
