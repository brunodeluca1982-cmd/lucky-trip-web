/**
 * perfil.tsx — Profile tab
 *
 * STATE 1 — Logged out : full account creation form (matches design reference)
 * STATE 2 — Sent       : check-your-email confirmation
 * STATE 3 — Logged in  : minimal real profile (email from Supabase, logout)
 *
 * No mock data. No hardcoded values. No fake profile content.
 *
 * iOS web fixes applied:
 *  - Background Image uses pointerEvents="none" (not ImageBackground)
 *  - Dark overlay is absoluteFill + pointerEvents="none" — never blocks content touches
 *  - userSelect: "none" on all text/containers prevents blue selection highlight
 *  - suppressHighlighting on all Text inside Touchables
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
import { AntDesign, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import type { User } from "@supabase/supabase-js";

const GOLD     = "#D4AF37";
const GOLD_BDR = "rgba(212,175,55,0.50)";
const LOGO     = require("@/assets/images/logo-symbol.png");
const BG       = require("@/assets/images/rio-aerial-clean.png");

/**
 * WNS — "web no select"
 * Applied to every non-input container on iOS web to prevent the blue
 * text-selection highlight.  Includes all three properties iOS Safari needs:
 *   -webkit-touch-callout : none  — suppresses long-press callout menu
 *   -webkit-user-select   : none  — WebKit-prefixed selection disable
 *   user-select           : none  — standard, also needed by React Native Web
 * Cast to `any` because TypeScript's RN types don't expose webkit props.
 */
const WNS: object = Platform.OS === "web"
  ? ({
      userSelect:            "none",
      WebkitUserSelect:      "none",
      WebkitTouchCallout:    "none",
    } as any)
  : {};

/**
 * webCleanup — called in every auth handler finally block.
 * Blurs the active element (removes focus ring) and clears any DOM selection.
 * This is a local mirror of the one in useAuth.ts so it runs even if the
 * auth function throws before reaching its own cleanup.
 */
function webCleanup() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  try {
    (document.activeElement as HTMLElement)?.blur();
    window.getSelection()?.removeAllRanges();
  } catch (_) {}
}

// ── Root screen ───────────────────────────────────────────────────────────────

// Translate common Supabase auth error messages to Portuguese.
function translateAuthError(raw: string, isLogin: boolean): string {
  const msg = raw.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return isLogin
      ? "E-mail ou senha incorretos. Verifique e tente novamente."
      : "Erro ao criar conta. Tente novamente.";
  if (msg.includes("email not confirmed"))
    return "Confirme o seu e-mail antes de entrar. Verifique a caixa de entrada.";
  if (msg.includes("user already registered") || msg.includes("already registered"))
    return "Este e-mail já tem cadastro. Clique em \"Entrar\" para acessar.";
  if (msg.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("unable to validate email address"))
    return "E-mail inválido. Verifique e tente novamente.";
  if (msg.includes("signup is disabled"))
    return "Cadastros temporariamente desabilitados. Tente mais tarde.";
  if (msg.includes("email rate limit") || msg.includes("too many requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return raw;
}

export default function PerfilScreen() {
  const { user, signOut, signInWithPassword, signUp, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top + 8;
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const [isLogin,       setIsLogin]       = useState(true);
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [agreed,        setAgreed]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needsConfirm,  setNeedsConfirm]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  async function handleSubmit() {
    const trimEmail = email.trim().toLowerCase();
    const trimPass  = password.trim();

    if (!trimEmail || loading) return;

    if (!trimPass) {
      setError(isLogin ? "Digite sua senha." : "Escolha uma senha.");
      return;
    }

    if (!isLogin && trimPass.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: err } = await signInWithPassword(trimEmail, trimPass);
        if (err) {
          const translated = translateAuthError(err, true);
          setError(translated);
        }
        // On success: onAuthStateChange fires → session → user set → LoggedIn renders
      } else {
        const { error: err, needsConfirmation } = await signUp(trimEmail, trimPass, name.trim() || undefined);
        if (err) {
          const translated = translateAuthError(err, false);
          setError(translated);
        } else if (needsConfirmation) {
          setNeedsConfirm(true);
        }
        // No needsConfirmation → onAuthStateChange fires → LoggedIn renders
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
      webCleanup();
    }
  }

  async function handleGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setGoogleLoading(false);
      webCleanup();
    }
  }

  return (
    <View style={[s.root, WNS]}>
      {/* Background photo — pointerEvents none so it never swallows touches */}
      <Image
        source={BG}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        pointerEvents="none"
      />
      {/* Dark overlay — absoluteFill + pointerEvents none so content below receives all taps */}
      <View style={s.overlay} pointerEvents="none" />

      <KeyboardAvoidingView
        style={[s.kav, WNS]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={WNS}
          contentContainerStyle={[s.scroll, { paddingTop: topPad, paddingBottom: botPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {user
            ? <LoggedIn user={user} signOut={signOut} />
            : needsConfirm
            ? <SentState email={email} />
            : <LoggedOut
                isLogin={isLogin}
                onToggleMode={() => { setIsLogin(v => !v); setError(null); }}
                name={name}           setName={setName}
                email={email}         setEmail={setEmail}
                password={password}   setPassword={setPassword}
                showPass={showPass}   setShowPass={setShowPass}
                agreed={agreed}       setAgreed={setAgreed}
                loading={loading}
                googleLoading={googleLoading}
                error={error}
                onSubmit={handleSubmit}
                onGooglePress={handleGoogle}
              />
          }
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Logged-out: full account creation form ────────────────────────────────────

function LoggedOut({
  isLogin, onToggleMode,
  name, setName,
  email, setEmail,
  password, setPassword,
  showPass, setShowPass,
  agreed, setAgreed,
  loading, googleLoading,
  error, onSubmit, onGooglePress,
}: {
  isLogin: boolean;     onToggleMode: () => void;
  name: string;         setName: (v: string) => void;
  email: string;        setEmail: (v: string) => void;
  password: string;     setPassword: (v: string) => void;
  showPass: boolean;    setShowPass: (v: boolean) => void;
  agreed: boolean;      setAgreed: (v: boolean) => void;
  loading: boolean;
  googleLoading: boolean;
  error: string | null;
  onSubmit: () => void;
  onGooglePress: () => void;
}) {
  return (
    <View style={s.page}>
      {/* ← Voltar */}
      <TouchableOpacity
        style={s.backBtn}
        onPress={() => router.replace("/")}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.80)" />
        <Text style={s.backText} suppressHighlighting>Voltar</Text>
      </TouchableOpacity>

      {/* Logo + brand */}
      <View style={s.logoWrap}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <Text style={s.brand} suppressHighlighting>THE LUCKY TRIP</Text>
      </View>

      {/* Badge — changes with mode */}
      <View style={s.badge}>
        <Text style={s.badgeText} suppressHighlighting>
          {isLogin ? "ENTRAR" : "CRIE SUA CONTA"}
        </Text>
      </View>

      {/* Headline — changes with mode */}
      <Text style={s.headline} suppressHighlighting>
        {isLogin
          ? "Bem-vindo de volta"
          : "Comece a planejar suas viagens dos sonhos"}
      </Text>

      {/* Name field — signup only */}
      {!isLogin && (
        <View style={s.fieldWrap}>
          <Feather name="user" size={16} color="rgba(255,255,255,0.40)" />
          <TextInput
            style={s.field}
            placeholder="Nome completo"
            placeholderTextColor="rgba(255,255,255,0.38)"
            autoCapitalize="words"
            autoCorrect={false}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>
      )}

      {/* Email — always shown */}
      <View style={s.fieldWrap}>
        <Feather name="mail" size={16} color="rgba(255,255,255,0.40)" />
        <TextInput
          style={s.field}
          placeholder="E-mail"
          placeholderTextColor="rgba(255,255,255,0.38)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={onSubmit}
          returnKeyType={isLogin ? "done" : "next"}
        />
      </View>

      {/* Password field — always shown */}
      <View style={s.fieldWrap}>
        <Feather name="lock" size={16} color="rgba(255,255,255,0.40)" />
        <TextInput
          style={[s.field, { flex: 1 }]}
          placeholder="Senha"
          placeholderTextColor="rgba(255,255,255,0.38)"
          secureTextEntry={!showPass}
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
          accessibilityRole="button"
        >
          <Feather
            name={showPass ? "eye-off" : "eye"}
            size={16}
            color="rgba(255,255,255,0.40)"
          />
        </TouchableOpacity>
      </View>

      {/* Terms checkbox — signup only */}
      {!isLogin && (
        <TouchableOpacity
          style={s.checkRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
        >
          <View style={[s.checkbox, agreed && s.checkboxChecked]}>
            {agreed && <Feather name="check" size={11} color="#000" />}
          </View>
          <Text style={s.checkText} suppressHighlighting>
            Concordo com os{" "}
            <Text style={s.checkLink}>Termos de Uso</Text>
            <Text style={s.checkLink}>  Política de Privacidade</Text>
          </Text>
        </TouchableOpacity>
      )}

      {error ? <Text style={s.errorText} suppressHighlighting>{error}</Text> : null}

      {/* Primary CTA — label changes with mode */}
      <TouchableOpacity
        style={s.cta}
        onPress={onSubmit}
        activeOpacity={0.85}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={s.ctaText} suppressHighlighting>
              {isLogin ? "Entrar" : "Criar conta"}
            </Text>
        }
      </TouchableOpacity>

      {/* Divider "ou continue com" */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText} suppressHighlighting>ou continue com</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Social buttons — side by side */}
      <View style={s.socialRow}>
        <TouchableOpacity
          style={s.socialBtn}
          onPress={onGooglePress}
          activeOpacity={0.7}
          disabled={googleLoading}
          accessibilityRole="button"
        >
          {googleLoading
            ? <ActivityIndicator size="small" color="rgba(255,255,255,0.70)" />
            : <AntDesign name="google" size={17} color="#FFFFFF" />
          }
          <Text style={s.socialBtnText} suppressHighlighting>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.socialBtn}
          onPress={() => router.replace("/")}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Feather name="compass" size={17} color="#FFFFFF" />
          <Text style={s.socialBtnText} suppressHighlighting>Continuar sem conta</Text>
        </TouchableOpacity>
      </View>

      {/* Footer — toggles between modes */}
      <View style={s.footerRow}>
        <Text style={s.footerText} suppressHighlighting>
          {isLogin ? "Não tem conta?  " : "Já tem uma conta?  "}
        </Text>
        <TouchableOpacity onPress={onToggleMode} activeOpacity={0.7} accessibilityRole="button">
          <Text style={s.footerLink} suppressHighlighting>
            {isLogin ? "Criar conta" : "Entrar"}
          </Text>
        </TouchableOpacity>
      </View>
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

      <Text style={s.headline} suppressHighlighting>Confirme seu e-mail</Text>
      <Text style={s.sub} suppressHighlighting>
        Enviamos um e-mail de confirmação para{"\n"}
        <Text style={{ color: GOLD, fontFamily: "Inter_500Medium" }}>{email}</Text>
      </Text>
      <Text style={s.sentNote} suppressHighlighting>
        Clique no link no e-mail para ativar sua conta e entrar automaticamente.
      </Text>
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

      <Text style={s.name} suppressHighlighting>{displayName}</Text>
      <Text style={s.emailText} suppressHighlighting>{user.email}</Text>

      <TouchableOpacity
        style={s.logoutBtn}
        onPress={signOut}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Feather name="log-out" size={15} color="rgba(255,255,255,0.60)" />
        <Text style={s.logoutText} suppressHighlighting>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: "#0a0a0a",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow:          1,
    paddingHorizontal: 24,
  },

  // ── Page (logged-out) ──
  page: {
    flex:       1,
    alignItems: "center",
    ...WNS,
  },
  center: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    ...WNS,
  },

  // ── Back button ──
  backBtn: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    alignSelf:     "flex-start",
    paddingVertical: 10,
    marginBottom:  4,
    ...WNS,
  },
  backText: {
    fontFamily: "Inter_400Regular",
    fontSize:   15,
    color:      "rgba(255,255,255,0.80)",
  },

  // ── Logo / brand ──
  logoWrap: {
    alignItems:   "center",
    marginBottom: 12,
    ...WNS,
  },
  logo: {
    width:        72,
    height:       72,
    marginBottom: 6,
  },
  brand: {
    fontFamily:    "Inter_600SemiBold",
    fontSize:      13,
    color:         "#FFFFFF",
    letterSpacing: 3,
  },

  // ── Badge ──
  badge: {
    borderWidth:       1,
    borderColor:       GOLD_BDR,
    borderRadius:      20,
    paddingHorizontal: 14,
    paddingVertical:   5,
    marginBottom:      18,
    ...WNS,
  },
  badgeText: {
    fontFamily:    "Inter_500Medium",
    fontSize:      11,
    color:         GOLD,
    letterSpacing: 1.5,
  },

  // ── Headline ──
  headline: {
    fontFamily:   "PlayfairDisplay_700Bold",
    fontSize:     26,
    color:        "#FFFFFF",
    textAlign:    "center",
    lineHeight:   34,
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  // ── Input fields ──
  fieldWrap: {
    flexDirection:     "row",
    alignItems:        "center",
    width:             "100%",
    backgroundColor:   "rgba(255,255,255,0.09)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   Platform.OS === "ios" ? 4 : 0,
    marginBottom:      10,
    gap:               10,
  },
  field: {
    flex:       1,
    paddingVertical: 15,
    color:      "#FFFFFF",
    fontFamily: "Inter_400Regular",
    fontSize:   15,
    ...(Platform.OS === "web" ? ({ outline: "none" } as object) : {}),
  },

  // ── Checkbox ──
  checkRow: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    width:          "100%",
    gap:            10,
    marginTop:      4,
    marginBottom:   18,
    ...WNS,
  },
  checkbox: {
    width:           20,
    height:          20,
    borderRadius:    5,
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems:      "center",
    justifyContent:  "center",
    marginTop:       1,
    flexShrink:      0,
  },
  checkboxChecked: {
    backgroundColor: GOLD,
    borderColor:     GOLD,
  },
  checkText: {
    flex:       1,
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "rgba(255,255,255,0.60)",
    lineHeight: 20,
  },
  checkLink: {
    color:     GOLD,
    fontFamily:"Inter_500Medium",
  },

  loginHint: {
    fontFamily:   "Inter_400Regular",
    fontSize:     13,
    color:        "rgba(255,255,255,0.45)",
    textAlign:    "center",
    lineHeight:   20,
    marginBottom: 16,
    width:        "100%",
  },
  errorText: {
    fontFamily:   "Inter_400Regular",
    fontSize:     13,
    color:        "#FF6B6B",
    textAlign:    "center",
    marginBottom: 10,
    width:        "100%",
  },

  // ── Criar conta CTA ──
  cta: {
    width:           "100%",
    backgroundColor: "#B8942A",
    borderRadius:    14,
    paddingVertical: 17,
    alignItems:      "center",
    minHeight:       54,
    justifyContent:  "center",
    ...WNS,
  },
  ctaText: {
    fontFamily:    "Inter_600SemiBold",
    fontSize:      16,
    color:         "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection:  "row",
    alignItems:     "center",
    width:          "100%",
    marginVertical: 18,
    gap:            10,
    ...WNS,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize:   12,
    color:      "rgba(255,255,255,0.38)",
  },

  // ── Social buttons (side by side) ──
  socialRow: {
    flexDirection: "row",
    width:         "100%",
    gap:           12,
    marginBottom:  24,
    ...WNS,
  },
  socialBtn: {
    flex:              1,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    paddingVertical:   15,
    borderRadius:      14,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.18)",
    backgroundColor:   "rgba(255,255,255,0.08)",
    ...WNS,
  },
  socialBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize:   14,
    color:      "#FFFFFF",
  },

  // ── Footer ──
  footerRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   8,
    ...WNS,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.55)",
  },
  footerLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   14,
    color:      GOLD,
  },

  // ── Sent state ──
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
  sub: {
    fontFamily:   "Inter_400Regular",
    fontSize:     14,
    color:        "rgba(255,255,255,0.60)",
    textAlign:    "center",
    lineHeight:   21,
    marginBottom: 8,
  },
  sentNote: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "rgba(255,255,255,0.38)",
    textAlign:  "center",
    marginTop:  8,
  },

  // ── Logged-in ──
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
