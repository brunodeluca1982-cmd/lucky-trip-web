import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PlaceCard } from "@/components/PlaceCard";
import { SectionHeader } from "@/components/SectionHeader";
import Colors from "@/constants/colors";
import { segredos, oQueFazer } from "@/data/mockData";

const C = Colors.light;

export default function LuckyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Curadoria</Text>
          <Text style={styles.title}>Lucky Picks</Text>
          <Text style={styles.subtitle}>
            Seleções exclusivas feitas por especialistas para viajantes de alto padrão.
          </Text>
        </View>

        <View style={styles.goldCard}>
          <Text style={styles.goldCardEmoji}>L.</Text>
          <Text style={styles.goldCardTitle}>O Toque Lucky</Text>
          <Text style={styles.goldCardText}>
            Experiências exclusivas e segredos de viagem selecionados a dedo pela nossa equipe editorial.
          </Text>
        </View>

        <View style={{ height: 24 }} />

        <SectionHeader
          title="Segredos da semana"
          subtitle="Descobertas que poucos conhecem."
        />
        {segredos.map((s) => (
          <PlaceCard
            key={s.id}
            id={s.id}
            saveCategoria="oQueFazer"
            titulo={s.titulo}
            localizacao={s.localizacao}
            descricao={s.descricao}
            image={s.image}
            variant="secret"
            onPress={() => router.push(`/lugar/rio/${s.id}`)}
          />
        ))}

        <View style={{ height: 24 }} />

        <SectionHeader
          title="Momentos únicos"
          subtitle="Experiências para guardar na memória."
        />
        <HorizontalScroll>
          {oQueFazer.map((item) => (
            <PlaceCard
              key={item.id}
              id={item.id}
              saveCategoria="oQueFazer"
              titulo={item.titulo}
              localizacao={item.localizacao}
              image={item.image}
              size="medium"
              onPress={() => router.push(`/lugar/rio/${item.id}`)}
            />
          ))}
        </HorizontalScroll>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  content: {
    gap: 0,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 6,
  },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: C.darkBrown,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    lineHeight: 20,
    maxWidth: 280,
  },
  goldCard: {
    marginHorizontal: 24,
    backgroundColor: C.darkBrown,
    borderRadius: 20,
    padding: 24,
    gap: 8,
    shadowColor: C.darkBrown,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  goldCardEmoji: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: C.gold,
  },
  goldCardTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: C.white,
    lineHeight: 26,
  },
  goldCardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
  },
});
