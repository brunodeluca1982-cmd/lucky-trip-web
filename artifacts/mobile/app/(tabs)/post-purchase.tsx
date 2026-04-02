/**
 * post-purchase.tsx — Post-subscription success screen.
 *
 * Shown after a successful Lucky Pro subscription.
 * Marks the user as premium, then offers to explore the Lucky List or go home.
 */

import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGuia } from "@/context/GuiaContext";

const GOLD      = "#D4AF37";
const GOLD_DIM  = "rgba(212,175,55,0.14)";
const GOLD_BDR  = "rgba(212,175,55,0.30)";
const LOGO_MARK = require("@/assets/images/logo-symbol.png");

const UNLOCKS = [
  "127 endereços exclusivos desbloqueados",
  "Lucky AI sem limite de perguntas",
  "Roteiros personalizados disponíveis",
];

export default function PostPurchaseScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 24;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { markPremium } = useGuia();

  useEffect(() => {
    markPremium();
  }, [markPremium]);

  return (
    <View style={[s.root, { paddingTop: topPad, paddingBottom: botPad + 32 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Logo + star */}
      <View style={s.logoArea}>
        <View style={s.logoWrap}>
          <Image source={LOGO_MARK} style={s.logo} resizeMode="contain" />
        </View>
        <View style={s.starBadge}>
          <Feather name="star" size={12} color={GOLD} />
          <Text style={s.starText}>Lucky Pro</Text>
        </View>
      </View>

      {/* Text */}
      <Text style={s.title}>Você agora é Lucky Pro</Text>
      <Text style={s.tagline}>Agora você vê o Rio como quem mora aqui.</Text>
      <Text style={s.body}>
        Os lugares que não aparecem no mapa comum agora estão abertos para você.
      </Text>

      {/* What unlocked */}
      <View style={s.unlockCard}>
        {UNLOCKS.map((u) => (
          <View key={u} style={s.unlockRow}>
            <Feather name="check-circle" size={15} color={GOLD} />
            <Text style={s.unlockText}>{u}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <Pressable
        style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
        onPress={() =>
          router.push({ pathname: "/luckyList/[id]", params: { id: "rio" } })
        }
      >
        <Text style={s.ctaText}>Explorar a Lucky List</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.secondaryCta, pressed && { opacity: 0.7 }]}
        onPress={() => router.replace("/(tabs)/")}
      >
        <Text style={s.secondaryCtaText}>Ir para o início</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex:              1,
    backgroundColor:   "#000000",
    paddingHorizontal: 28,
    alignItems:        "center",
    justifyContent:    "center",
  },
  logoArea: {
    alignItems:   "center",
    gap:          12,
    marginBottom: 32,
  },
  logoWrap: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: GOLD_DIM,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     GOLD_BDR,
  },
  logo: {
    width:  38,
    height: 38,
  },
  starBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   GOLD_DIM,
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       GOLD_BDR,
  },
  starText: {
    fontFamily:    "Inter_500Medium",
    fontSize:      12,
    color:         GOLD,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily:    "PlayfairDisplay_700Bold",
    fontSize:      26,
    color:         "#FFFFFF",
    textAlign:     "center",
    lineHeight:    36,
    letterSpacing: -0.3,
    marginBottom:  10,
  },
  tagline: {
    fontFamily:   "Inter_500Medium",
    fontSize:     16,
    color:        GOLD,
    textAlign:    "center",
    marginBottom: 12,
  },
  body: {
    fontFamily:   "Inter_400Regular",
    fontSize:     15,
    color:        "rgba(255,255,255,0.55)",
    textAlign:    "center",
    lineHeight:   24,
    marginBottom: 28,
  },
  unlockCard: {
    backgroundColor: "#0F0A06",
    borderRadius:    14,
    padding:         18,
    gap:             12,
    borderWidth:     1,
    borderColor:     "rgba(212,175,55,0.15)",
    marginBottom:    32,
    width:           "100%",
  },
  unlockRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  unlockText: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.72)",
    flex:       1,
  },
  cta: {
    backgroundColor: GOLD,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      "center",
    width:           "100%",
    marginBottom:    12,
  },
  ctaText: {
    fontFamily:    "Inter_600SemiBold",
    fontSize:      17,
    color:         "#000000",
    letterSpacing: 0.1,
  },
  secondaryCta: {
    paddingVertical: 10,
    alignItems:      "center",
  },
  secondaryCtaText: {
    fontFamily: "Inter_400Regular",
    fontSize:   15,
    color:      "rgba(255,255,255,0.40)",
    textDecorationLine: "underline",
  },
});
