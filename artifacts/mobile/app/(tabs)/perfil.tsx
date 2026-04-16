/**
 * perfil.tsx — Profile tab
 *
 * STATE A — Visitante (não logado)  : delega para AuthScreen (app/auth/index.tsx)
 * STATE B — Usuário Free            : FreeProfileScreen
 * STATE C — Usuário Lucky Pro       : ProProfileScreen
 *
 * Regra de sessão: sessão persiste via Supabase onAuthStateChange.
 * Usuário volta a ver login APENAS se clicar em "Sair" ou sessão expirar.
 *
 * NÃO mexer em Stripe / checkout / webhook / catálogo de planos.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useGuia } from "@/context/GuiaContext";
import { useRioHeroMedia } from "@/hooks/useHeroMedia";
import type { User } from "@supabase/supabase-js";
import AuthScreen from "@/app/auth";

// ── Constants ──────────────────────────────────────────────────────────────────

const GOLD      = "#D4AF37";
const GOLD_DIM  = "rgba(212,175,55,0.15)";
const GOLD_BDR  = "rgba(212,175,55,0.45)";
const DARK      = "#0D0D0D";
const SURFACE   = "rgba(255,255,255,0.07)";
const BORDER    = "rgba(255,255,255,0.12)";

// ── Root Screen ────────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isPremium } = useGuia();

  if (authLoading) {
    return (
      <View style={[s.profileRoot, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  if (user) {
    return isPremium
      ? <ProProfileScreen user={user} signOut={signOut} />
      : <FreeProfileScreen user={user} signOut={signOut} />;
  }

  return <AuthScreen />;
}

// ── Profile Hero Background ────────────────────────────────────────────────────

const PROFILE_HERO_IMAGES = [
  require("@/assets/images/ipanema.png"),
  require("@/assets/images/hero-rio.png"),
  require("@/assets/images/pao-acucar.png"),
  require("@/assets/images/lapa.png"),
];
const PROFILE_HERO_INTERVAL = 10_000;

function ProfileHeroBg() {
  const rioHero = useRioHeroMedia("image");
  const resolvedPool =
    rioHero && rioHero.length > 0
      ? rioHero.map((item) => ({ uri: item.public_url }))
      : PROFILE_HERO_IMAGES;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx,    setNextIdx]    = useState(1);
  const nextOpacity = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      Animated.timing(nextOpacity, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setCurrentIdx((c) => {
          setNextIdx((c + 2) % resolvedPool.length);
          return (c + 1) % resolvedPool.length;
        });
        nextOpacity.setValue(0);
      });
    }, PROFILE_HERO_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resolvedPool.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Image
        source={resolvedPool[currentIdx]}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        pointerEvents="none"
      />
      <Animated.Image
        source={resolvedPool[nextIdx]}
        style={[StyleSheet.absoluteFill, { opacity: nextOpacity }]}
        resizeMode="cover"
        pointerEvents="none"
      />
      <View style={s.profileHeroOverlay} pointerEvents="none" />
      <LinearGradient
        colors={["transparent", "rgba(13,13,13,0.70)", "#0D0D0D"]}
        locations={[0.35, 0.72, 1]}
        style={s.profileHeroGradient}
        pointerEvents="none"
      />
    </>
  );
}

// ── Profile Shared Components ──────────────────────────────────────────────────

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  danger?: boolean;
};

function MenuItem({ icon, label, sublabel, onPress, rightContent, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.65} accessibilityRole="button">
      <View style={s.menuIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuLabel, danger && { color: "#FF6B6B" }]} suppressHighlighting>{label}</Text>
        {sublabel ? <Text style={s.menuSublabel} suppressHighlighting>{sublabel}</Text> : null}
      </View>
      {rightContent ?? <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />}
    </TouchableOpacity>
  );
}

function ProfileHeader({ user, badge }: { user: User; badge: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 20 : insets.top + 12;
  const displayName: string =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Viajante";

  return (
    <View style={[s.profileHeader, { paddingTop: topPad }]}>
      <ProfileHeroBg />
      <View style={s.avatar}>
        <Feather name="user" size={28} color={GOLD} />
      </View>
      <Text style={s.profileName} suppressHighlighting>{displayName}</Text>
      {user.email ? <Text style={s.profileEmail} suppressHighlighting>{user.email}</Text> : null}
      <View style={{ marginTop: 10 }}>{badge}</View>
    </View>
  );
}

// ── Free Profile ───────────────────────────────────────────────────────────────

function FreeProfileScreen({ user, signOut }: { user: User; signOut: () => void }) {
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 80;

  return (
    <View style={s.profileRoot}>
      <ScrollView contentContainerStyle={{ paddingBottom: botPad }} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          user={user}
          badge={
            <View style={s.freeBadge}>
              <Text style={s.freeBadgeText} suppressHighlighting>Plano Free</Text>
            </View>
          }
        />

        <TouchableOpacity style={s.proCta} onPress={() => router.push("/(tabs)/subscription")} activeOpacity={0.85} accessibilityRole="button">
          <MaterialCommunityIcons name="crown-outline" size={20} color="#000" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.proCtaTitle} suppressHighlighting>Seja Lucky Pro</Text>
            <Text style={s.proCtaSub} suppressHighlighting>Desbloqueie 127 segredos do Rio</Text>
          </View>
          <Feather name="arrow-right" size={16} color="#000" />
        </TouchableOpacity>

        <Text style={s.sectionLabel} suppressHighlighting>MINHA VIAGEM</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon={<Feather name="book-open" size={18} color={GOLD} />}
            label="Diário de Viagem"
            sublabel="Registre memórias e momentos"
            onPress={() => router.navigate("/diario")}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="divide-circle" size={18} color={GOLD} />}
            label="Divisão de Contas"
            sublabel="Organize os gastos do grupo"
            onPress={() => router.navigate("/contas")}
          />
        </View>

        <Text style={s.sectionLabel} suppressHighlighting>CONTA</Text>
        <View style={s.menuCard}>
          <MenuItem icon={<Feather name="user" size={18} color="rgba(255,255,255,0.60)" />} label="Informações da conta" onPress={() => {}} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="settings" size={18} color="rgba(255,255,255,0.60)" />} label="Preferências" onPress={() => {}} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="help-circle" size={18} color="rgba(255,255,255,0.60)" />} label="Ajuda e suporte" onPress={() => Linking.openURL("mailto:contato@theluckytrip.com")} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="file-text" size={18} color="rgba(255,255,255,0.60)" />} label="Termos e Privacidade" onPress={() => {}} />
        </View>

        <View style={[s.menuCard, { marginTop: 8 }]}>
          <MenuItem icon={<Feather name="log-out" size={18} color="#FF6B6B" />} label="Sair" onPress={signOut} danger rightContent={<View />} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Pro Profile ────────────────────────────────────────────────────────────────

function ProProfileScreen({ user, signOut }: { user: User; signOut: () => void }) {
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 80;

  return (
    <View style={s.profileRoot}>
      <ScrollView contentContainerStyle={{ paddingBottom: botPad }} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          user={user}
          badge={
            <View style={s.proBadge}>
              <MaterialCommunityIcons name="crown" size={12} color="#000" style={{ marginRight: 5 }} />
              <Text style={s.proBadgeText} suppressHighlighting>Lucky Pro</Text>
            </View>
          }
        />

        <View style={s.subscriptionCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="crown" size={16} color={GOLD} />
            <Text style={s.subscriptionTitle} suppressHighlighting> Lucky Pro ativo</Text>
          </View>
          <Text style={s.subscriptionSub} suppressHighlighting>
            Você tem acesso completo a todos os segredos do Rio de Janeiro.
          </Text>
          <TouchableOpacity style={s.manageBtn} onPress={() => router.push("/(tabs)/subscription")} activeOpacity={0.75} accessibilityRole="button">
            <Text style={s.manageBtnText} suppressHighlighting>Gerenciar assinatura</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel} suppressHighlighting>MINHA VIAGEM</Text>
        <View style={s.menuCard}>
          <MenuItem icon={<Feather name="book-open" size={18} color={GOLD} />} label="Diário de Viagem" sublabel="Registre memórias e momentos" onPress={() => router.navigate("/diario")} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="divide-circle" size={18} color={GOLD} />} label="Divisão de Contas" sublabel="Organize os gastos do grupo" onPress={() => router.navigate("/contas")} />
        </View>

        <Text style={s.sectionLabel} suppressHighlighting>CONTA</Text>
        <View style={s.menuCard}>
          <MenuItem icon={<Feather name="user" size={18} color="rgba(255,255,255,0.60)" />} label="Informações da conta" onPress={() => {}} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="settings" size={18} color="rgba(255,255,255,0.60)" />} label="Preferências" onPress={() => {}} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="help-circle" size={18} color="rgba(255,255,255,0.60)" />} label="Ajuda e suporte" onPress={() => Linking.openURL("mailto:contato@theluckytrip.com")} />
          <View style={s.menuDivider} />
          <MenuItem icon={<Feather name="file-text" size={18} color="rgba(255,255,255,0.60)" />} label="Termos e Privacidade" onPress={() => {}} />
        </View>

        <View style={[s.menuCard, { marginTop: 8 }]}>
          <MenuItem icon={<Feather name="log-out" size={18} color="#FF6B6B" />} label="Sair" onPress={signOut} danger rightContent={<View />} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  profileRoot: {
    flex: 1,
    backgroundColor: DARK,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 36,
    overflow: "hidden",
    minHeight: 240,
  },
  profileHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  profileHeroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1.5,
    borderColor: GOLD_BDR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.70)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    textShadowColor: "rgba(0,0,0,0.60)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  freeBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  freeBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
  },

  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  proBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#000000",
    letterSpacing: 0.5,
  },

  proCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 14,
    padding: 16,
  },
  proCtaTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#000",
  },
  proCtaSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
    marginTop: 1,
  },

  subscriptionCard: {
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BDR,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
  },
  subscriptionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: GOLD,
  },
  subscriptionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
    marginBottom: 14,
  },
  manageBtn: {
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD_BDR,
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  manageBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: GOLD,
  },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.30)",
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  menuCard: {
    marginHorizontal: 20,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 28,
    alignItems: "center",
  },
  menuLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
  },
  menuSublabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginLeft: 56,
  },
});
