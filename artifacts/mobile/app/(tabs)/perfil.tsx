import React, { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Image,
  ImageBackground,
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
const GOLD = "#D4AF37";

// Official brand mark — same file used in AppHeader across the entire app.
const LOGO_MARK = require("@/assets/images/logo-symbol.png");

const menuItems = [
  { icon: "heart"      as const, label: "Favoritos",      count: "12" },
  { icon: "bookmark"   as const, label: "Listas salvas",  count: "4"  },
  { icon: "navigation" as const, label: "Minhas viagens", count: "3"  },
  { icon: "star"       as const, label: "Avaliações",     count: "7"  },
];

const settingsItems = [
  { icon: "bell"        as const, label: "Notificações" },
  { icon: "globe"       as const, label: "Idioma"       },
  { icon: "shield"      as const, label: "Privacidade"  },
  { icon: "help-circle" as const, label: "Ajuda"        },
];

export default function PerfilScreen() {
  const { signOut } = useAuth();
  const insets      = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ImageBackground
      source={require("@/assets/images/rio-aerial-clean.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
          ]}
        >
          {/* Brand mark — same logo file as AppHeader, displayed at low opacity */}
          <View style={styles.logoRow}>
            <Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />
          </View>

          {/* Profile */}
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Feather name="user" size={32} color={C.white} />
            </View>
            <Text style={styles.name}>Viajante Lucky</Text>
            <Text style={styles.email}>membro@theluckytrip.com</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Feather name="star" size={11} color={GOLD} />
                <Text style={styles.badgeText}>Lucky Member</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { value: "12", label: "Destinos" },
              { value: "34", label: "Lugares"  },
              { value: "7",  label: "Roteiros" },
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
                style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.menuIconContainer}>
                  <Feather name={item.icon} size={18} color={GOLD} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={styles.menuRight}>
                  <Text style={styles.menuCount}>{item.count}</Text>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.40)" />
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
                style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.menuIconContainer}>
                  <Feather name={item.icon} size={18} color="rgba(255,255,255,0.65)" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.40)" />
              </Pressable>
            ))}
          </View>

          {/* Logout */}
          <Pressable accessibilityRole="button" style={styles.logoutBtn} onPress={() => { console.log("[logout] button pressed"); signOut(); }}>
            <Feather name="log-out" size={16} color="rgba(255,255,255,0.60)" />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  content: {
    paddingHorizontal: 20,
  },

  // Brand mark row — mirrors the AppHeader logo placement
  logoRow: {
    alignItems:    "flex-start",
    marginBottom:  20,
  },
  logoMark: {
    height:  24,
    width:   84,
    opacity: 0.50,
  },

  profileSection: {
    alignItems:   "center",
    marginBottom: 28,
    gap:          6,
  },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: `${GOLD}28`,
    borderWidth:     2,
    borderColor:     `${GOLD}60`,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   24,
    color:      "#FFFFFF",
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.55)",
  },
  badgeRow: {
    flexDirection: "row",
    gap:           8,
    marginTop:     4,
  },
  badge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(212,175,55,0.14)",
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(212,175,55,0.30)",
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   12,
    color:      GOLD,
  },

  statsRow: {
    flexDirection:   "row",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius:    18,
    padding:         20,
    marginBottom:    28,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
  },
  statItem: {
    flex:       1,
    alignItems: "center",
    gap:        4,
  },
  statValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   26,
    color:      "#FFFFFF",
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize:   12,
    color:      "rgba(255,255,255,0.55)",
  },

  menuSection: {
    marginBottom: 24,
    gap:          2,
  },
  sectionLabel: {
    fontFamily:    "Inter_500Medium",
    fontSize:      11,
    color:         "rgba(255,255,255,0.40)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom:  10,
  },
  menuRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               14,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  menuIconContainer: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  menuLabel: {
    flex:       1,
    fontFamily: "Inter_500Medium",
    fontSize:   15,
    color:      "#FFFFFF",
  },
  menuRight: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  menuCount: {
    fontFamily: "Inter_500Medium",
    fontSize:   13,
    color:      "rgba(255,255,255,0.45)",
  },

  logoutBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    paddingVertical: 16,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
    marginTop:       8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  logoutText: {
    fontFamily: "Inter_500Medium",
    fontSize:   15,
    color:      "rgba(255,255,255,0.60)",
  },
});
