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
const HERO_H = SCREEN_HEIGHT * 0.46;

export default function CidadeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const destino = destinos.find((d) => d.id === id) ?? destinos[0];
  const isRio = destino.id === "rio";

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* ── Hero ── */}
        <View style={[s.hero, { height: HERO_H }]}>
          <Image source={destino.image} style={s.heroImage} />
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.72)"]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={[
              s.backBtn,
              { top: Platform.OS === "web" ? 20 : insets.top + 12 },
            ]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={C.white} />
          </Pressable>

          {/* Hero text */}
          <View style={s.heroText}>
            <Text style={s.heroPais}>{destino.pais}</Text>
            <Text style={s.heroCidade}>{destino.cidade}</Text>
            <Text style={s.heroDesc} numberOfLines={2}>
              {destino.descricao}
            </Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>12</Text>
            <Text style={s.statLabel}>Experiências</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>8</Text>
            <Text style={s.statLabel}>Restaurantes</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>5</Text>
            <Text style={s.statLabel}>Hotéis</Text>
          </View>
        </View>

        {/* ── Destaques ── */}
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

        {/* ── O que fazer ── */}
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

        {/* ── Onde comer ── */}
        <View style={s.section}>
          <SectionHeader
            title="Onde comer"
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

        {/* ── Onde ficar ── */}
        <View style={s.section}>
          <SectionHeader
            title="Onde ficar"
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

        {/* ── Segredos ── */}
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

        {/* ── Footer ── */}
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

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
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
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 28,
    gap: 6,
  },
  heroPais: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  heroCidade: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 38,
    color: C.white,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
    maxWidth: 300,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 0,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statNum: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.darkBrown,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.warmGray,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.border,
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
