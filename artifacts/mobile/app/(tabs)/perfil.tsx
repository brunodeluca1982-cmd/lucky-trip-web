/**
 * perfil.tsx — Profile tab
 *
 * STATE 1 — Logged out : account entry (email + Supabase OTP magic link)
 * STATE 2 — Logged in  : minimal real profile (email from Supabase, logout)
 *
 * No mock data. No hardcoded values. No fake profile content.
 */

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";

const GOLD     = "#D4AF37";
const GOLD_BDR = "rgba(212,175,55,0.35)";
const LOGO     = require("@/assets/images/logo-symbol.png");
const BG       = require("@/assets/images/rio-aerial-clean.png");

export default function PerfilScreen() {
  const { user, signOut, signInWithOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 60 : insets.top + 20;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithOtp(email.trim().toLowerCase());
    setLoading(false);
    if (err) { setError(err); } else { setSent(true); }
  }

  return (
    <View style={s.root}>
      <Image source={BG} style={StyleSheet.absoluteFill} resizeMode="cover" pointerEvents="none" />
      <View style={s.overlay}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[s.scroll, { paddingTop: topPad, paddingBottom: botPad }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {user
              ? <LoggedIn  user={user} signOut={signOut} />
              : sent
              ? <SentState email={email} />
              : <LoggedOut
                  email={email}
                  setEmail={setEmail}
                  loading={loading}
                  error={error}
                  onSubmit={handleSubmit}
                />
            }
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

// ── Logged-out: account entry ─────────────────────────────────────────────────

function LoggedOut({
  email, setEmail, loading, error, onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <View style={s.center}>
      <Image source={LOGO} style={s.logo} resizeMode="contain" />
      <Text style={s.brand}>THE LUCKY TRIP</Text>

      <View style={s.badge}>
        <Text style={s.badgeText}>CRIE SUA CONTA</Text>
      </View>

      <Text style={s.headline}>Comece a planejar{"\n"}sua viagem</Text>
      <Text style={s.sub}>Salve lugares, crie roteiros e acesse o Lucky.</Text>

      <View style={s.inputWrap}>
        <Feather name="mail" size={16} color="rgba(255,255,255,0.40)" style={s.inputIcon} />
        <TextInput
          style={s.input}
          placeholder="E-mail"
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
        />
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity style={s.cta} onPress={onSubmit} activeOpacity={0.85} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={s.ctaText}>Continuar com e-mail</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Post-submit: check email ──────────────────────────────────────────────────

function SentState({ email }: { email: string }) {
  return (
    <View style={s.center}>
      <Image source={LOGO} style={s.logo} resizeMode="contain" />

      <View style={s.sentIcon}>
        <Feather name="mail" size={28} color={GOLD} />
      </View>

      <Text style={s.headline}>Verifique seu e-mail</Text>
      <Text style={s.sub}>
        Enviamos um link de acesso para{"\n"}
        <Text style={{ color: GOLD, fontFamily: "Inter_500Medium" }}>{email}</Text>
      </Text>
      <Text style={s.sentNote}>Clique no link para entrar automaticamente.</Text>
    </View>
  );
}

// ── Logged-in: minimal real profile ──────────────────────────────────────────

function LoggedIn({ user, signOut }: { user: User; signOut: () => void }) {
  const displayName = user.email?.split("@")[0] ?? "—";

  return (
    <View style={s.center}>
      <View style={s.avatar}>
        <Feather name="user" size={32} color="#FFFFFF" />
      </View>

      <Text style={s.name}>{displayName}</Text>
      <Text style={s.emailText}>{user.email}</Text>

      <TouchableOpacity style={s.logoutBtn} onPress={signOut} activeOpacity={0.7}>
        <Feather name="log-out" size={15} color="rgba(255,255,255,0.60)" />
        <Text style={s.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  scroll: {
    flexGrow:        1,
    justifyContent:  "center",
    paddingHorizontal: 28,
  },
  center: {
    alignItems: "center",
  },

  logo: {
    width:        80,
    height:       80,
    marginBottom: 8,
  },
  brand: {
    fontFamily:    "Inter_600SemiBold",
    fontSize:      13,
    color:         "#FFFFFF",
    letterSpacing: 3,
    marginBottom:  20,
  },

  badge: {
    borderWidth:       1,
    borderColor:       GOLD_BDR,
    borderRadius:      20,
    paddingHorizontal: 14,
    paddingVertical:   5,
    marginBottom:      22,
  },
  badgeText: {
    fontFamily:    "Inter_500Medium",
    fontSize:      11,
    color:         GOLD,
    letterSpacing: 1.5,
  },

  headline: {
    fontFamily:    "PlayfairDisplay_700Bold",
    fontSize:      28,
    color:         "#FFFFFF",
    textAlign:     "center",
    lineHeight:    36,
    marginBottom:  10,
  },
  sub: {
    fontFamily:   "Inter_400Regular",
    fontSize:     14,
    color:        "rgba(255,255,255,0.60)",
    textAlign:    "center",
    lineHeight:   21,
    marginBottom: 28,
  },

  inputWrap: {
    flexDirection:     "row",
    alignItems:        "center",
    width:             "100%",
    backgroundColor:   "rgba(255,255,255,0.10)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.16)",
    borderRadius:      14,
    paddingHorizontal: 16,
    marginBottom:      12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex:       1,
    paddingVertical: 16,
    color:      "#FFFFFF",
    fontFamily: "Inter_400Regular",
    fontSize:   15,
  },
  errorText: {
    fontFamily:   "Inter_400Regular",
    fontSize:     13,
    color:        "#FF6B6B",
    textAlign:    "center",
    marginBottom: 10,
  },

  cta: {
    width:           "100%",
    backgroundColor: GOLD,
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      "center",
    minHeight:       54,
    justifyContent:  "center",
  },
  ctaText: {
    fontFamily:    "Inter_600SemiBold",
    fontSize:      16,
    color:         "#000000",
    letterSpacing: 0.1,
  },

  sentIcon: {
    width:           70,
    height:          70,
    borderRadius:    35,
    backgroundColor: "rgba(212,175,55,0.14)",
    borderWidth:     1,
    borderColor:     GOLD_BDR,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    20,
    marginTop:       16,
  },
  sentNote: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "rgba(255,255,255,0.40)",
    textAlign:  "center",
    marginTop:  12,
  },

  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth:     2,
    borderColor:     GOLD_BDR,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    16,
    marginTop:       20,
  },
  name: {
    fontFamily:   "PlayfairDisplay_700Bold",
    fontSize:     24,
    color:        "#FFFFFF",
    marginBottom: 4,
  },
  emailText: {
    fontFamily:   "Inter_400Regular",
    fontSize:     14,
    color:        "rgba(255,255,255,0.55)",
    marginBottom: 36,
  },

  logoutBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    paddingVertical:   14,
    paddingHorizontal: 28,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.16)",
    backgroundColor:   "rgba(255,255,255,0.06)",
  },
  logoutText: {
    fontFamily: "Inter_500Medium",
    fontSize:   14,
    color:      "rgba(255,255,255,0.60)",
  },
});
