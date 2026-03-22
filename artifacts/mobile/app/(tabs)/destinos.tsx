import React from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PlaceCard } from "@/components/PlaceCard";
import { SectionHeader } from "@/components/SectionHeader";
import Colors from "@/constants/colors";
import { heroDestinos, destaques, oQueFazer } from "@/data/mockData";

const C = Colors.light;

export default function DestinosScreen() {
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
          <Text style={styles.eyebrow}>Explorar</Text>
          <Text style={styles.title}>Destinos</Text>
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color={C.warmGray} />
            <Text style={styles.searchText}>Buscar destinos...</Text>
          </View>
        </View>

        <SectionHeader title="Em destaque" subtitle="Cidades que estão no nosso radar." />
        <HorizontalScroll>
          {destaques.map((d) => (
            <PlaceCard
              key={d.id}
              titulo={d.titulo}
              localizacao={d.localizacao}
              categoria={d.categoria}
              image={d.image}
              size="medium"
            />
          ))}
        </HorizontalScroll>

        <View style={{ height: 24 }} />
        <SectionHeader title="Para descobrir" subtitle="Aventure-se por novos lugares." />
        <HorizontalScroll>
          {oQueFazer.map((item) => (
            <PlaceCard
              key={item.id}
              titulo={item.titulo}
              localizacao={item.localizacao}
              image={item.image}
              size="medium"
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
    marginBottom: 28,
    gap: 6,
  },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.terracotta,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: C.darkBrown,
    lineHeight: 40,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: C.warmGray,
  },
});
