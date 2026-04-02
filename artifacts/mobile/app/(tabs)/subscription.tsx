/**
 * subscription.tsx — Lucky Pro subscription screen.
 *
 * Shows annual (highlighted), monthly, and weekly (small link) plans.
 * CTA → create-checkout → post-purchase.
 *
 * Navigated to from paywalls and any premium CTA in the app.
 * Accepts optional ?plan=weekly to pre-select the weekly plan.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/utils/deviceId";

const GOLD      = "#D4AF37";
const GOLD_DIM  = "rgba(212,175,55,0.14)";
const GOLD_BDR  = "rgba(212,175,55,0.30)";
const LOGO_MARK = require("@/assets/images/logo-symbol.png");

type Plan = "annual" | "monthly" | "weekly";

const PLANS = {
  annual: {
    label:      "Anual",
    price:      "R$19,90/mês",
    subPrice:   "R$97 cobrados por ano",
    highlights: ["Mais escolhido", "Economize 40%"],
    plan_id:    "annual",
  },
  monthly: {
    label:    "Mensal",
    price:    "R$29,90/mês",
    subPrice: "Cancele quando quiser",
    plan_id:  "monthly",
  },
} as const;

const BENEFITS = [
  "127 endereços da Lucky List desbloqueados",
  "Lucky AI ilimitado — perguntas sem limite",
  "Roteiros personalizados com IA",
  "Salve e organize quantos lugares quiser",
  "Acesso offline",
];

export default function SubscriptionScreen() {
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 67 : insets.top + 12;
  const botPad  = Platform.OS === "web" ? 34 : insets.bottom;
  const params  = useLocalSearchParams<{ plan?: string }>();

  const defaultPlan: Plan = params.plan === "weekly" ? "weekly" : "annual";
  const [selected,  setSelected] = useState<Plan>(defaultPlan);
  const [loading,   setLoading]  = useState(false);
  const [errorMsg,  setErrorMsg] = useState<string | null>(null);

  async function handleStart() {
    if (loading) return;
    console.log("BUTTON CLICKED");
    console.log("PLAN:", selected);
    setErrorMsg(null);
    setLoading(true);
    try {
      const id = await getDeviceId();
      console.log("CHECKOUT STARTED");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { deviceId: id, plan: selected },
      });
      console.log("Checkout response:", data, error);
      if (error || !data?.url) throw error ?? new Error("No checkout URL");

      // On web (Expo web / Replit preview) window.open is blocked by the iframe sandbox.
      // Use same-tab navigation so the redirect is never blocked.
      if (Platform.OS === "web") {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      // Inline error — Alert.alert is blocked inside the Replit iframe on web
      setErrorMsg("Não foi possível iniciar o pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: botPad + 32 }]}
      >
        {/* Back */}
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.55)" />
          <Text style={s.backText}>Voltar</Text>
        </Pressable>

        {/* Logo + heading */}
        <View style={s.header}>
          <View style={s.logoWrap}>
            <Image source={LOGO_MARK} style={s.logo} resizeMode="contain" />
          </View>
          <Text style={s.eyebrow}>LUCKY PRO</Text>
          <Text style={s.title}>Veja o Rio como{"\n"}quem mora aqui</Text>
          <Text style={s.subtitle}>
            Uma curadoria editorial feita à mão — agora com IA, roteiros e acesso total.
          </Text>
        </View>

        {/* Benefits */}
        <View style={s.benefitsCard}>
          {BENEFITS.map((b) => (
            <View key={b} style={s.benefitRow}>
              <Feather name="check" size={14} color={GOLD} />
              <Text style={s.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Plan selection */}
        <Text style={s.plansLabel}>Escolha seu plano</Text>

        {/* Annual plan (highlighted) */}
        <Pressable
          style={[s.planCard, selected === "annual" && s.planCardSelected]}
          onPress={() => setSelected("annual")}
        >
          <View style={s.planCardInner}>
            <View style={s.planLeft}>
              <View style={[s.radio, selected === "annual" && s.radioSelected]}>
                {selected === "annual" && <View style={s.radioDot} />}
              </View>
              <View>
                <Text style={s.planLabel}>{PLANS.annual.label}</Text>
                <Text style={s.planSub}>{PLANS.annual.subPrice}</Text>
              </View>
            </View>
            <Text style={s.planPrice}>{PLANS.annual.price}</Text>
          </View>
          {/* Highlight badges */}
          <View style={s.planBadges}>
            {PLANS.annual.highlights.map((h) => (
              <View key={h} style={s.planBadge}>
                <Text style={s.planBadgeText}>{h}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        {/* Monthly plan */}
        <Pressable
          style={[s.planCard, s.planCardMonthly, selected === "monthly" && s.planCardSelected]}
          onPress={() => setSelected("monthly")}
        >
          <View style={s.planCardInner}>
            <View style={s.planLeft}>
              <View style={[s.radio, selected === "monthly" && s.radioSelected]}>
                {selected === "monthly" && <View style={s.radioDot} />}
              </View>
              <View>
                <Text style={s.planLabel}>{PLANS.monthly.label}</Text>
                <Text style={s.planSub}>{PLANS.monthly.subPrice}</Text>
              </View>
            </View>
            <Text style={s.planPrice}>{PLANS.monthly.price}</Text>
          </View>
        </Pressable>

        {/* Main CTA */}
        <Pressable
          style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }, loading && s.ctaLoading]}
          onPress={handleStart}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={s.ctaText}>Começar agora</Text>
          }
        </Pressable>

        {errorMsg && (
          <Text style={s.errorText}>{errorMsg}</Text>
        )}

        <Text style={s.micro}>7 dias grátis · Cancele quando quiser</Text>

        {/* Weekly small link */}
        <Pressable
          style={({ pressed }) => [s.weeklyLink, pressed && { opacity: 0.6 }]}
          onPress={() => {
            setSelected("weekly");
            setTimeout(handleStart, 100);
          }}
        >
          <Text style={s.weeklyLinkText}>Acesso por 7 dias — R$9,90</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 24,
  },
  backBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    marginBottom:   24,
    alignSelf:      "flex-start",
  },
  backText: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.55)",
  },
  header: {
    alignItems:   "center",
    marginBottom: 28,
    gap:          10,
  },
  logoWrap: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: GOLD_DIM,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     GOLD_BDR,
    marginBottom:    6,
  },
  logo: {
    width:  32,
    height: 32,
  },
  eyebrow: {
    fontFamily:    "Inter_500Medium",
    fontSize:      10,
    color:         GOLD,
    letterSpacing: 3,
  },
  title: {
    fontFamily:    "PlayfairDisplay_700Bold",
    fontSize:      28,
    color:         "#FFFFFF",
    textAlign:     "center",
    lineHeight:    38,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize:   15,
    color:      "rgba(255,255,255,0.55)",
    textAlign:  "center",
    lineHeight: 24,
    maxWidth:   280,
  },
  benefitsCard: {
    backgroundColor: "#0F0A06",
    borderRadius:    16,
    padding:         20,
    gap:             12,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    marginBottom:    28,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
  },
  benefitText: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.72)",
    lineHeight: 22,
    flex:       1,
  },
  plansLabel: {
    fontFamily:    "Inter_500Medium",
    fontSize:      12,
    color:         "rgba(255,255,255,0.40)",
    letterSpacing: 1.2,
    marginBottom:  12,
  },
  planCard: {
    backgroundColor: "#0F0A06",
    borderRadius:    14,
    padding:         16,
    borderWidth:     2,
    borderColor:     "rgba(255,255,255,0.08)",
    marginBottom:    10,
  },
  planCardMonthly: {
    marginBottom: 24,
  },
  planCardSelected: {
    borderColor:     GOLD,
    backgroundColor: "rgba(212,175,55,0.06)",
  },
  planCardInner: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  planLeft: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  radio: {
    width:           20,
    height:          20,
    borderRadius:    10,
    borderWidth:     2,
    borderColor:     "rgba(255,255,255,0.25)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  radioSelected: {
    borderColor: GOLD,
  },
  radioDot: {
    width:           9,
    height:          9,
    borderRadius:    4.5,
    backgroundColor: GOLD,
  },
  planLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   15,
    color:      "#FFFFFF",
  },
  planSub: {
    fontFamily: "Inter_400Regular",
    fontSize:   12,
    color:      "rgba(255,255,255,0.40)",
    marginTop:  2,
  },
  planPrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   15,
    color:      GOLD,
  },
  planBadges: {
    flexDirection: "row",
    gap:           8,
    marginTop:     10,
  },
  planBadge: {
    backgroundColor:   GOLD_DIM,
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       GOLD_BDR,
  },
  planBadgeText: {
    fontFamily:    "Inter_500Medium",
    fontSize:      11,
    color:         GOLD,
    letterSpacing: 0.3,
  },
  cta: {
    backgroundColor: GOLD,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      "center",
    marginBottom:    10,
  },
  ctaLoading: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily:    "Inter_600SemiBold",
    fontSize:      17,
    color:         "#000000",
    letterSpacing: 0.1,
  },
  errorText: {
    fontFamily:   "Inter_400Regular",
    fontSize:     13,
    color:        "#FF6B6B",
    textAlign:    "center",
    marginBottom: 10,
  },
  micro: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "rgba(255,255,255,0.35)",
    textAlign:  "center",
    marginBottom: 20,
  },
  weeklyLink: {
    alignItems:    "center",
    paddingBottom: 8,
  },
  weeklyLinkText: {
    fontFamily:         "Inter_400Regular",
    fontSize:           13,
    color:              "rgba(255,255,255,0.28)",
    textDecorationLine: "underline",
  },
});
