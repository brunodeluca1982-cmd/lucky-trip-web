import React from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { DestaquesCard } from "@/components/DestaquesCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { HotelCard } from "@/components/HotelCard";
import { PeriodoSwitcher } from "@/components/PeriodoSwitcher";
import { PlaceCard } from "@/components/PlaceCard";
import { RestauranteCard } from "@/components/RestauranteCard";
import { SectionHeader } from "@/components/SectionHeader";
import Colors from "@/constants/colors";
import {
  destaques,
  heroDestinos,
  hoteis,
  oQueFazerPorMomento,
  periodoMeta,
  restaurantes,
  segredos,
} from "@/data/mockData";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";

const C = Colors.light;

function Divider() {
  return <View style={styles.divider} />;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { periodo, setPeriodo, fadeAnim } = useTimeOfDay();
  const currentItems = oQueFazerPorMomento[periodo];
  const currentMeta = periodoMeta[periodo];

  return (
    <View style={styles.root}>
      <AppHeader transparent />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 80 },
        ]}
      >
        {/* HERO */}
        <HeroCarousel items={heroDestinos} />

        {/* DESTAQUES */}
        <View style={styles.section}>
          <SectionHeader
            title="Destaques do destino"
            subtitle="Uma seleção editorial dos melhores momentos."
          />
          {destaques.map((d) => (
            <DestaquesCard
              key={d.id}
              titulo={d.titulo}
              localizacao={d.localizacao}
              descricao={d.descricao}
              tipo={d.tipo}
              image={d.image}
            />
          ))}
        </View>

        <Divider />

        {/* O QUE FAZER — context-aware */}
        <View style={styles.section}>
          <SectionHeader
            title="O que fazer agora"
            subtitle={currentMeta.subtitle}
          />
          <PeriodoSwitcher active={periodo} onChange={setPeriodo} />
          <Animated.View style={{ opacity: fadeAnim }}>
            <HorizontalScroll>
              {currentItems.map((item) => (
                <PlaceCard
                  key={item.id}
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

        {/* ONDE COMER */}
        <View style={styles.section}>
          <SectionHeader
            title="Onde comer no Rio"
            subtitle="Restaurantes com alma carioca."
          />
          <HorizontalScroll>
            {restaurantes.map((r) => (
              <RestauranteCard
                key={r.id}
                nome={r.nome}
                bairro={r.bairro}
                categoria={r.categoria}
                image={r.image}
              />
            ))}
          </HorizontalScroll>
        </View>

        <Divider />

        {/* ONDE FICAR */}
        <View style={styles.section}>
          <SectionHeader
            title="Onde ficar no Rio"
            subtitle="Hotéis com personalidade carioca."
          />
          <HorizontalScroll>
            {hoteis.map((h) => (
              <HotelCard
                key={h.id}
                nome={h.nome}
                localizacao={h.localizacao}
                tipo={h.tipo}
                image={h.image}
              />
            ))}
          </HorizontalScroll>
        </View>

        <Divider />

        {/* SEGREDOS */}
        <View style={styles.section}>
          <SectionHeader
            title="Segredos que poucos conhecem"
            subtitle="Descobertas escolhidas a dedo por especialistas."
          />
          {segredos.map((s) => (
            <PlaceCard
              key={s.id}
              titulo={s.titulo}
              localizacao={s.localizacao}
              descricao={s.descricao}
              image={s.image}
              variant="secret"
            />
          ))}
        </View>

        {/* EDITORIAL FOOTER */}
        <View style={styles.editorialFooter}>
          <Text style={styles.editorialL}>L.</Text>
          <Text style={styles.editorialText}>
            Curadoria editorial para viajantes que entendem de beleza.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
  editorialFooter: {
    marginTop: 40,
    marginHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
    gap: 8,
  },
  editorialL: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: C.terracotta,
  },
  editorialText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
});
