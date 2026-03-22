import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;

const menuItems = [
  { icon: "heart" as const, label: "Favoritos", count: "12" },
  { icon: "bookmark" as const, label: "Listas salvas", count: "4" },
  { icon: "navigation" as const, label: "Minhas viagens", count: "3" },
  { icon: "star" as const, label: "Avaliações", count: "7" },
];

const settingsItems = [
  { icon: "bell" as const, label: "Notificações" },
  { icon: "globe" as const, label: "Idioma" },
  { icon: "shield" as const, label: "Privacidade" },
  { icon: "help-circle" as const, label: "Ajuda" },
];

export default function PerfilScreen() {
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
        {/* Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color={C.white} />
          </View>
          <Text style={styles.name}>Viajante Lucky</Text>
          <Text style={styles.email}>membro@theluckytrip.com</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Feather name="star" size={11} color={C.gold} />
              <Text style={styles.badgeText}>Lucky Member</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: "12", label: "Destinos" },
            { value: "34", label: "Lugares" },
            { value: "7", label: "Roteiros" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Minhas coleções</Text>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.menuIconContainer}>
                <Feather name={item.icon} size={18} color={C.terracotta} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                <Text style={styles.menuCount}>{item.count}</Text>
                <Feather name="chevron-right" size={16} color={C.warmGray} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Configurações</Text>
          {settingsItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.menuIconContainer}>
                <Feather name={item.icon} size={18} color={C.warmGray} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={C.warmGray} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn}>
          <Feather name="log-out" size={16} color={C.terracotta} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
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
  profileSection: {
    alignItems: "center",
    marginBottom: 24,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.terracotta,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: C.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: C.darkBrown,
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: C.gold,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: C.darkBrown,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.warmGray,
  },
  menuSection: {
    marginBottom: 24,
    gap: 2,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.warmGray,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.warmBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: C.darkBrown,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  menuCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.warmGray,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(196,112,74,0.25)",
    marginTop: 8,
  },
  logoutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: C.terracotta,
  },
});
