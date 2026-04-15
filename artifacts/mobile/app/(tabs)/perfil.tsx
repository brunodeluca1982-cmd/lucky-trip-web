/**
 * perfil.tsx — Profile tab
 *
 * STATE A — Visitante (não logado)  : tela de login + hero rotativo Rio
 * STATE B — Usuário Free            : perfil com CTA Lucky Pro
 * STATE C — Usuário Lucky Pro       : perfil premium com status Pro
 *
 * Regra de sessão: sessão persiste via Supabase onAuthStateChange.
 * Usuário volta a ver login APENAS se clicar em "Sair" ou sessão expirar.
 *
 * NÃO mexer em Stripe / checkout / webhook / catálogo de planos.
 */

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useGuia } from "@/context/GuiaContext";
import { useRioHeroMedia } from "@/hooks/useHeroMedia";
import type { User } from "@supabase/supabase-js";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD      = "#D4AF37";
const GOLD_DIM  = "rgba(212,175,55,0.15)";
const GOLD_BDR  = "rgba(212,175,55,0.45)";
const DARK      = "#0D0D0D";
const SURFACE   = "rgba(255,255,255,0.07)";
const BORDER    = "rgba(255,255,255,0.12)";

const LOGO      = require("@/assets/images/logo-symbol.png");

// Hero images for rotating background (login screen only)
const HERO_IMAGES = [
  require("@/assets/images/ipanema.png"),
  require("@/assets/images/cristo.png"),
  require("@/assets/images/pao-acucar.png"),
  require("@/assets/images/lapa.png"),
];

const HERO_INTERVAL_MS = 10_000;

// ── Web: no-select helper ─────────────────────────────────────────────────────

const WNS: object =
  Platform.OS === "web"
    ? ({
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      } as any)
    : {};

function webCleanup() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  try {
    (document.activeElement as HTMLElement)?.blur();
    window.getSelection()?.removeAllRanges();
  } catch (_) {}
}

function translateAuthError(raw: string, isLogin: boolean): string {
  const msg = raw.toLowerCase();
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credentials")
  )
    return isLogin
      ? "E-mail ou senha incorretos. Verifique e tente novamente."
      : "Erro ao criar conta. Tente novamente.";
  if (msg.includes("email not confirmed"))
    return "Confirme o seu e-mail antes de entrar. Verifique a caixa de entrada.";
  if (
    msg.includes("user already registered") ||
    msg.includes("already registered")
  )
    return "Este e-mail já tem cadastro. Clique em \"Entrar\" para acessar.";
  if (msg.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("unable to validate email address"))
    return "E-mail inválido. Verifique e tente novamente.";
  if (msg.includes("signup is disabled"))
    return "Cadastros temporariamente desabilitados. Tente mais tarde.";
  if (
    msg.includes("email rate limit") ||
    msg.includes("too many requests")
  )
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return raw;
}

// ── Rotating hero background ──────────────────────────────────────────────────

function HeroBackground() {
  const rioHero = useRioHeroMedia("image");
  const resolvedPool = rioHero && rioHero.length > 0
    ? rioHero.map((item) => ({ uri: item.public_url }))
    : HERO_IMAGES;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx,    setNextIdx]    = useState(1);
  const nextOpacity = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      // Fade in the next image, then promote it to current
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
    }, HERO_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resolvedPool.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Base (current) image */}
      <Image
        source={resolvedPool[currentIdx]}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        pointerEvents="none"
      />
      {/* Next image fades in on top */}
      <Animated.Image
        source={resolvedPool[nextIdx]}
        style={[StyleSheet.absoluteFill, { opacity: nextOpacity }]}
        resizeMode="cover"
        pointerEvents="none"
      />
      {/* Gradient overlay for text legibility */}
      <View style={s.heroOverlay} pointerEvents="none" />
    </>
  );
}

// ── Root screen ───────────────────────────────────────────────────────────────

type AuthScreen = "login" | "signup" | "forgot";

export default function PerfilScreen() {
  const { user, loading: authLoading, signOut, signInWithPassword, signUp, sendPasswordReset, signInWithGoogle } = useAuth();
  const { isPremium } = useGuia();
  const insets = useSafeAreaInsets();

  // Auth form state
  const [screen,        setScreen]        = useState<AuthScreen>("login");
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [agreed,        setAgreed]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needsConfirm,  setNeedsConfirm]  = useState(false);
  const [resetSent,     setResetSent]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  function clearForm() {
    setError(null);
    setPassword("");
    setShowPass(false);
    setNeedsConfirm(false);
    setResetSent(false);
  }

  function goLogin()  { clearForm(); setScreen("login");  }
  function goSignup() { clearForm(); setScreen("signup"); }
  function goForgot() { clearForm(); setScreen("forgot"); }

  async function handleLogin() {
    const trimEmail = email.trim().toLowerCase();
    const trimPass  = password.trim();
    if (!trimEmail || !trimPass || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await signInWithPassword(trimEmail, trimPass);
      if (err) setError(translateAuthError(err, true));
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
      webCleanup();
    }
  }

  async function handleSignup() {
    const trimEmail = email.trim().toLowerCase();
    const trimPass  = password.trim();
    if (!trimEmail || !trimPass || loading) return;
    if (trimPass.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: err, needsConfirmation } = await signUp(trimEmail, trimPass, name.trim() || undefined);
      if (err) {
        setError(translateAuthError(err, false));
      } else if (needsConfirmation) {
        setNeedsConfirm(true);
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
      webCleanup();
    }
  }

  async function handleReset() {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await sendPasswordReset(trimEmail);
      if (err) setError("Não foi possível enviar o e-mail. Verifique o endereço.");
      else setResetSent(true);
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

  // ── Auth is still resolving — show spinner (prevents flash of login for logged-in users)
  if (authLoading) {
    return (
      <View style={[s.root, { backgroundColor: DARK, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  // ── Logged-in: route to correct profile
  if (user) {
    if (isPremium) {
      return <ProProfileScreen user={user} signOut={signOut} />;
    }
    return <FreeProfileScreen user={user} signOut={signOut} />;
  }

  // ── Guest: auth screens with hero background
  const topPad = Platform.OS === "web" ? 20 : insets.top + 8;
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  return (
    <View style={[s.root, WNS]}>
      <HeroBackground />

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
          {needsConfirm ? (
            <EmailSentState email={email} kind="confirm" onBack={goLogin} />
          ) : resetSent ? (
            <EmailSentState email={email} kind="reset" onBack={goLogin} />
          ) : screen === "forgot" ? (
            <ForgotScreen
              email={email} setEmail={setEmail}
              loading={loading} error={error}
              onBack={goLogin} onSubmit={handleReset}
            />
          ) : screen === "signup" ? (
            <SignupScreen
              name={name}         setName={setName}
              email={email}       setEmail={setEmail}
              password={password} setPassword={setPassword}
              showPass={showPass} setShowPass={setShowPass}
              agreed={agreed}     setAgreed={setAgreed}
              loading={loading}   googleLoading={googleLoading}
              error={error}
              onSubmit={handleSignup}
              onGooglePress={handleGoogle}
              onGoLogin={goLogin}
            />
          ) : (
            <LoginScreen
              email={email}       setEmail={setEmail}
              password={password} setPassword={setPassword}
              showPass={showPass} setShowPass={setShowPass}
              loading={loading}   googleLoading={googleLoading}
              error={error}
              onSubmit={handleLogin}
              onGooglePress={handleGoogle}
              onGoSignup={goSignup}
              onGoForgot={goForgot}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── LOGIN SCREEN — design ref: IMG_0636 ───────────────────────────────────────

function LoginScreen({
  email, setEmail,
  password, setPassword,
  showPass, setShowPass,
  loading, googleLoading,
  error, onSubmit, onGooglePress, onGoSignup, onGoForgot,
}: {
  email: string;       setEmail: (v: string) => void;
  password: string;    setPassword: (v: string) => void;
  showPass: boolean;   setShowPass: (v: boolean) => void;
  loading: boolean;    googleLoading: boolean;
  error: string | null;
  onSubmit: () => void;
  onGooglePress: () => void;
  onGoSignup: () => void;
  onGoForgot: () => void;
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

      <View style={s.badge}>
        <Text style={s.badgeText} suppressHighlighting>ENTRAR</Text>
      </View>

      <Text style={s.headline} suppressHighlighting>Bem-vindo de volta</Text>

      {/* E-mail */}
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
          returnKeyType="next"
        />
      </View>

      {/* Senha */}
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

      {error ? <Text style={s.errorText} suppressHighlighting>{error}</Text> : null}

      {/* Entrar */}
      <TouchableOpacity
        style={s.cta}
        onPress={onSubmit}
        activeOpacity={0.85}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={s.ctaText} suppressHighlighting>Entrar</Text>
        }
      </TouchableOpacity>

      {/* Divisor */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText} suppressHighlighting>ou continue com</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Social */}
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

      {/* Footer */}
      <View style={s.footerRow}>
        <Text style={s.footerText} suppressHighlighting>Não tem conta?{"  "}</Text>
        <TouchableOpacity onPress={onGoSignup} activeOpacity={0.7} accessibilityRole="button">
          <Text style={s.footerLink} suppressHighlighting>Criar conta</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={{ marginTop: 8 }} onPress={onGoForgot} activeOpacity={0.7} accessibilityRole="button">
        <Text style={[s.footerLink, { fontSize: 13 }]} suppressHighlighting>
          Esqueceu a senha?
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── SIGNUP SCREEN — design ref: div-5.png ─────────────────────────────────────

function SignupScreen({
  name, setName,
  email, setEmail,
  password, setPassword,
  showPass, setShowPass,
  agreed, setAgreed,
  loading, googleLoading,
  error, onSubmit, onGooglePress, onGoLogin,
}: {
  name: string;       setName: (v: string) => void;
  email: string;      setEmail: (v: string) => void;
  password: string;   setPassword: (v: string) => void;
  showPass: boolean;  setShowPass: (v: boolean) => void;
  agreed: boolean;    setAgreed: (v: boolean) => void;
  loading: boolean;   googleLoading: boolean;
  error: string | null;
  onSubmit: () => void;
  onGooglePress: () => void;
  onGoLogin: () => void;
}) {
  return (
    <View style={s.page}>
      {/* ← Voltar */}
      <TouchableOpacity
        style={s.backBtn}
        onPress={onGoLogin}
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

      <View style={s.badge}>
        <Text style={s.badgeText} suppressHighlighting>CRIE SUA CONTA</Text>
      </View>

      <Text style={s.headline} suppressHighlighting>
        Comece a planejar suas viagens dos sonhos
      </Text>

      {/* Nome */}
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

      {/* E-mail */}
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
          returnKeyType="next"
        />
      </View>

      {/* Senha */}
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

      {/* Termos */}
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
          {"  "}
          <Text style={s.checkLink}>Política de Privacidade</Text>
        </Text>
      </TouchableOpacity>

      {error ? <Text style={s.errorText} suppressHighlighting>{error}</Text> : null}

      {/* Criar conta */}
      <TouchableOpacity
        style={s.cta}
        onPress={onSubmit}
        activeOpacity={0.85}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={s.ctaText} suppressHighlighting>Criar conta</Text>
        }
      </TouchableOpacity>

      {/* Divisor */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText} suppressHighlighting>ou continue com</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Social */}
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
          style={[s.socialBtn, { opacity: 0.5 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled
        >
          <AntDesign name="apple1" size={17} color="#FFFFFF" />
          <Text style={s.socialBtnText} suppressHighlighting>Apple</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={s.footerRow}>
        <Text style={s.footerText} suppressHighlighting>Já tem uma conta?{"  "}</Text>
        <TouchableOpacity onPress={onGoLogin} activeOpacity={0.7} accessibilityRole="button">
          <Text style={s.footerLink} suppressHighlighting>Entrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── FORGOT PASSWORD SCREEN ────────────────────────────────────────────────────

function ForgotScreen({
  email, setEmail, loading, error, onBack, onSubmit,
}: {
  email: string; setEmail: (v: string) => void;
  loading: boolean; error: string | null;
  onBack: () => void; onSubmit: () => void;
}) {
  return (
    <View style={s.page}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7} accessibilityRole="button">
        <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.80)" />
        <Text style={s.backText} suppressHighlighting>Voltar</Text>
      </TouchableOpacity>

      <View style={s.logoWrap}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <Text style={s.brand} suppressHighlighting>THE LUCKY TRIP</Text>
      </View>

      <View style={s.badge}>
        <Text style={s.badgeText} suppressHighlighting>REDEFINIR SENHA</Text>
      </View>

      <Text style={s.headline} suppressHighlighting>Recuperar acesso</Text>
      <Text style={[s.sub, { marginBottom: 20 }]} suppressHighlighting>
        Digite seu e-mail e enviaremos um link para criar uma nova senha.
      </Text>

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
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>

      {error ? <Text style={s.errorText} suppressHighlighting>{error}</Text> : null}

      <TouchableOpacity style={s.cta} onPress={onSubmit} activeOpacity={0.85} disabled={loading} accessibilityRole="button">
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={s.ctaText} suppressHighlighting>Enviar link de redefinição</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── EMAIL SENT STATE ──────────────────────────────────────────────────────────

function EmailSentState({
  email, kind, onBack,
}: {
  email: string; kind: "confirm" | "reset"; onBack: () => void;
}) {
  const isReset = kind === "reset";
  return (
    <View style={s.center}>
      <Image source={LOGO} style={s.logo} resizeMode="contain" />
      <View style={s.sentIcon}>
        <Feather name="mail" size={28} color={GOLD} />
      </View>
      <Text style={s.headline} suppressHighlighting>
        {isReset ? "Verifique seu e-mail" : "Confirme seu e-mail"}
      </Text>
      <Text style={s.sub} suppressHighlighting>
        {isReset
          ? "Enviamos o link de redefinição para"
          : "Enviamos um e-mail de confirmação para"}{"\n"}
        <Text style={{ color: GOLD, fontFamily: "Inter_500Medium" }}>{email}</Text>
      </Text>
      <Text style={s.sentNote} suppressHighlighting>
        {isReset
          ? "Clique no link para criar uma nova senha e voltar a acessar sua conta."
          : "Clique no link no e-mail para ativar sua conta e entrar automaticamente."}
      </Text>
      <TouchableOpacity style={{ marginTop: 24 }} onPress={onBack} activeOpacity={0.7} accessibilityRole="button">
        <Text style={[s.footerLink, { fontSize: 14 }]} suppressHighlighting>← Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── PROFILE HERO BACKGROUND ───────────────────────────────────────────────────
// Uses local assets already bundled — no network requests, stable, MVP-safe.
// Images: Rio de Janeiro only. Same crossfade pattern as the auth hero.

const PROFILE_HERO_IMAGES = [
  require("@/assets/images/ipanema.png"),
  require("@/assets/images/hero-rio.png"),
  require("@/assets/images/pao-acucar.png"),
  require("@/assets/images/lapa.png"),
];

const PROFILE_HERO_INTERVAL = 10_000;

function ProfileHeroBg() {
  const rioHero = useRioHeroMedia("image");
  const resolvedPool = rioHero && rioHero.length > 0
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
      {/* Dark overlay — keeps avatar/text readable */}
      <View style={s.profileHeroOverlay} pointerEvents="none" />
      {/* Bottom gradient — fades into the dark card area below */}
      <LinearGradient
        colors={["transparent", "rgba(13,13,13,0.70)", "#0D0D0D"]}
        locations={[0.35, 0.72, 1]}
        style={s.profileHeroGradient}
        pointerEvents="none"
      />
    </>
  );
}

// ── PROFILE SHARED COMPONENTS ─────────────────────────────────────────────────

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
        <Text style={[s.menuLabel, danger && { color: "#FF6B6B" }]} suppressHighlighting>
          {label}
        </Text>
        {sublabel ? (
          <Text style={s.menuSublabel} suppressHighlighting>{sublabel}</Text>
        ) : null}
      </View>
      {rightContent ?? <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />}
    </TouchableOpacity>
  );
}

function ProfileHeader({
  user,
  badge,
}: {
  user: User;
  badge: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 20 : insets.top + 12;
  const displayName: string =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Viajante";

  return (
    <View style={[s.profileHeader, { paddingTop: topPad }]}>
      {/* Rotating hero background — local assets, no network requests */}
      <ProfileHeroBg />

      {/* Content — sits above the hero layers */}
      <View style={s.avatar}>
        <Feather name="user" size={28} color={GOLD} />
      </View>
      <Text style={s.profileName} suppressHighlighting>{displayName}</Text>
      {user.email ? (
        <Text style={s.profileEmail} suppressHighlighting>{user.email}</Text>
      ) : null}
      <View style={{ marginTop: 10 }}>{badge}</View>
    </View>
  );
}

// ── FREE PROFILE ──────────────────────────────────────────────────────────────

function FreeProfileScreen({
  user, signOut,
}: {
  user: User; signOut: () => void;
}) {
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 80;

  return (
    <View style={s.profileRoot}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ProfileHeader
          user={user}
          badge={
            <View style={s.freeBadge}>
              <Text style={s.freeBadgeText} suppressHighlighting>Plano Free</Text>
            </View>
          }
        />

        {/* Lucky Pro CTA */}
        <TouchableOpacity
          style={s.proCta}
          onPress={() => router.push("/(tabs)/subscription")}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="crown-outline" size={20} color="#000" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.proCtaTitle} suppressHighlighting>Seja Lucky Pro</Text>
            <Text style={s.proCtaSub} suppressHighlighting>
              Desbloqueie 127 segredos do Rio
            </Text>
          </View>
          <Feather name="arrow-right" size={16} color="#000" />
        </TouchableOpacity>

        {/* Seção: Minha Viagem */}
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

        {/* Seção: Conta */}
        <Text style={s.sectionLabel} suppressHighlighting>CONTA</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon={<Feather name="user" size={18} color="rgba(255,255,255,0.60)" />}
            label="Informações da conta"
            onPress={() => {}}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="settings" size={18} color="rgba(255,255,255,0.60)" />}
            label="Preferências"
            onPress={() => {}}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="help-circle" size={18} color="rgba(255,255,255,0.60)" />}
            label="Ajuda e suporte"
            onPress={() => Linking.openURL("mailto:contato@theluckytrip.com")}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="file-text" size={18} color="rgba(255,255,255,0.60)" />}
            label="Termos e Privacidade"
            onPress={() => {}}
          />
        </View>

        {/* Sair */}
        <View style={[s.menuCard, { marginTop: 8 }]}>
          <MenuItem
            icon={<Feather name="log-out" size={18} color="#FF6B6B" />}
            label="Sair"
            onPress={signOut}
            danger
            rightContent={<View />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ── PRO PROFILE ───────────────────────────────────────────────────────────────

function ProProfileScreen({
  user, signOut,
}: {
  user: User; signOut: () => void;
}) {
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 80;

  return (
    <View style={s.profileRoot}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ProfileHeader
          user={user}
          badge={
            <View style={s.proBadge}>
              <MaterialCommunityIcons name="crown" size={12} color="#000" style={{ marginRight: 5 }} />
              <Text style={s.proBadgeText} suppressHighlighting>Lucky Pro</Text>
            </View>
          }
        />

        {/* Assinatura card */}
        <View style={s.subscriptionCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="crown" size={16} color={GOLD} />
            <Text style={s.subscriptionTitle} suppressHighlighting> Lucky Pro ativo</Text>
          </View>
          <Text style={s.subscriptionSub} suppressHighlighting>
            Você tem acesso completo a todos os segredos do Rio de Janeiro.
          </Text>
          <TouchableOpacity
            style={s.manageBtn}
            onPress={() => router.push("/(tabs)/subscription")}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Text style={s.manageBtnText} suppressHighlighting>Gerenciar assinatura</Text>
          </TouchableOpacity>
        </View>

        {/* Seção: Minha Viagem */}
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

        {/* Seção: Conta */}
        <Text style={s.sectionLabel} suppressHighlighting>CONTA</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon={<Feather name="user" size={18} color="rgba(255,255,255,0.60)" />}
            label="Informações da conta"
            onPress={() => {}}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="settings" size={18} color="rgba(255,255,255,0.60)" />}
            label="Preferências"
            onPress={() => {}}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="help-circle" size={18} color="rgba(255,255,255,0.60)" />}
            label="Ajuda e suporte"
            onPress={() => Linking.openURL("mailto:contato@theluckytrip.com")}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon={<Feather name="file-text" size={18} color="rgba(255,255,255,0.60)" />}
            label="Termos e Privacidade"
            onPress={() => {}}
          />
        </View>

        {/* Sair */}
        <View style={[s.menuCard, { marginTop: 8 }]}>
          <MenuItem
            icon={<Feather name="log-out" size={18} color="#FF6B6B" />}
            label="Sair"
            onPress={signOut}
            danger
            rightContent={<View />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Auth screens ──
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  page: {
    flex: 1,
    alignItems: "center",
    ...WNS,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    ...WNS,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 10,
    marginBottom: 4,
    ...WNS,
  },
  backText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.80)",
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 12,
    ...WNS,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 4,
  },
  brand: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
    letterSpacing: 3,
  },

  badge: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
    ...WNS,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 2,
  },

  headline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 36,
    ...WNS,
  },

  fieldWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    marginBottom: 12,
    gap: 10,
  },
  field: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFFFFF",
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    marginBottom: 16,
    ...WNS,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.40)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  checkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    flexShrink: 1,
  },
  checkLink: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
  },

  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FF6B6B",
    marginBottom: 10,
    textAlign: "center",
    ...WNS,
  },

  cta: {
    width: "100%",
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#000000",
    ...WNS,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    ...WNS,
  },

  socialRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    paddingVertical: 13,
  },
  socialBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#FFFFFF",
    ...WNS,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    ...WNS,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
  footerLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: GOLD,
  },

  sentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    ...WNS,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.60)",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 20,
    ...WNS,
  },
  sentNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 16,
    ...WNS,
  },

  // ── Profile screens ──
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
