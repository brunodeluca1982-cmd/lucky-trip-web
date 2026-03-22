import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;

const tripItems = [
  { icon: "map-pin" as const, label: "Roteiro personalizado", desc: "Monte seu roteiro ideal em minutos." },
  { icon: "calendar" as const, label: "Datas e estadias", desc: "Organize sua agenda de viagem." },
  { icon: "briefcase" as const, label: "Lista de bagagem", desc: "Não esqueça nada essencial." },
  { icon: "dollar-sign" as const, label: "Controle de gastos", desc: "Saiba exatamente o que está gastando." },
];

export default function ViagemScreen() {
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
          <Text style={styles.eyebrow}>Planejar</Text>
          <Text style={styles.title}>Minha Viagem</Text>
        </View>

        <View style={styles.emptyCard}>
          <Feather name="navigation" size={36} color={C.terracotta} />
          <Text style={styles.emptyTitle}>Nenhuma viagem planejada</Text>
          <Text style={styles.emptyDesc}>
            Crie seu primeiro roteiro e deixe o Lucky Trip cuidar dos detalhes.
          </Text>
          <View style={styles.ctaBtn}>
            <Feather name="plus" size={16} color={C.white} />
            <Text style={styles.ctaBtnText}>Criar roteiro</Text>
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Tudo que você precisa</Text>
          {tripItems.map((item) => (
            <View key={item.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Feather name={item.icon} size={18} color={C.terracotta} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{item.label}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
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
  content: {
    paddingHorizontal: 24,
    gap: 0,
  },
  header: {
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
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 32,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 20,
    color: C.darkBrown,
    textAlign: "center",
  },
  emptyDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.terracotta,
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 8,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.white,
  },
  featuresSection: {
    gap: 4,
  },
  featuresTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: C.darkBrown,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(196,112,74,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.darkBrown,
  },
  featureDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warmGray,
    marginTop: 2,
  },
});
