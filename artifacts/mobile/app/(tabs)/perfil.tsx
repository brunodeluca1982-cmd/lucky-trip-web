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
  Pressable,
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
<<<<<<< HEAD
import { useBackground } from "@/context/BackgroundContext";
=======
import { useRioHeroMedia } from "@/hooks/useHeroMedia";
>>>>>>> claude/plan-app-architecture-73RnI
import type { User } from "@supabase/supabase-js";
import AuthScreen from "@/app/auth";
import { supabase } from "@/lib/supabase";

// ── Constants ──────────────────────────────────────────────────────────────────

const GOLD      = "#D4AF37";
const GOLD_DIM  = "rgba(212,175,55,0.15)";
const GOLD_BDR  = "rgba(212,175,55,0.45)";
const DARK      = "#0D0D0D";
const SURFACE   = "rgba(255,255,255,0.07)";
const BORDER    = "rgba(255,255,255,0.12)";

// ── Root Screen ────────────────────────────────────────────────────────────────

export default function PerfilScreen() {
<<<<<<< HEAD
  const { user, loading: authLoading, signOut, signInWithPassword, signUp, sendPasswordReset, signInWithGoogle, signInWithOtp } = useAuth();
=======
  const { user, loading: authLoading, signOut } = useAuth();
>>>>>>> claude/plan-app-architecture-73RnI
  const { isPremium } = useGuia();

<<<<<<< HEAD
  // Auth form state
  const [screen,        setScreen]        = useState<AuthScreen>("login");
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [agreed,        setAgreed]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading,    setOtpLoading]    = useState(false);
  const [needsConfirm,  setNeedsConfirm]  = useState(false);
  const [otpSent,       setOtpSent]       = useState(false);
  const [resetSent,     setResetSent]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  function clearForm() {
    setError(null);
    setPassword("");
    setShowPass(false);
    setNeedsConfirm(false);
    setResetSent(false);
    setOtpSent(false);
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

  async function handleOtp() {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || loading || otpLoading) return;
    setOtpLoading(true);
    setError(null);
    try {
      const { error: err } = await signInWithOtp(trimEmail);
      if (err) setError(translateAuthError(err, true));
      else setOtpSent(true);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setOtpLoading(false);
      webCleanup();
    }
  }

  // ── Auth is still resolving — show spinner (prevents flash of login for logged-in users)
=======
>>>>>>> claude/plan-app-architecture-73RnI
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

<<<<<<< HEAD
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
          ) : otpSent ? (
            <EmailSentState email={email} kind="otp" onBack={goLogin} />
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
              otpLoading={otpLoading}
              error={error}
              onSubmit={handleLogin}
              onGooglePress={handleGoogle}
              onOtpPress={handleOtp}
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
  loading, googleLoading, otpLoading,
  error, onSubmit, onGooglePress, onOtpPress, onGoSignup, onGoForgot,
}: {
  email: string;       setEmail: (v: string) => void;
  password: string;    setPassword: (v: string) => void;
  showPass: boolean;   setShowPass: (v: boolean) => void;
  loading: boolean;    googleLoading: boolean; otpLoading: boolean;
  error: string | null;
  onSubmit: () => void;
  onGooglePress: () => void;
  onOtpPress: () => void;
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

      {/* Magic link — for users who signed in via OTP and have no password */}
      <TouchableOpacity
        style={{ marginTop: 20, alignItems: "center" }}
        onPress={onOtpPress}
        activeOpacity={0.7}
        disabled={otpLoading}
        accessibilityRole="button"
      >
        {otpLoading ? (
          <ActivityIndicator size="small" color={GOLD} />
        ) : (
          <Text style={[s.footerText, { fontSize: 13, color: "rgba(255,255,255,0.45)" }]} suppressHighlighting>
            Prefere entrar{" "}
            <Text style={{ color: GOLD, textDecorationLine: "underline" }}>sem senha, por link no e-mail</Text>
          </Text>
        )}
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
  email: string; kind: "confirm" | "reset" | "otp"; onBack: () => void;
}) {
  const isReset = kind === "reset";
  const isOtp   = kind === "otp";
  return (
    <View style={s.center}>
      <Image source={LOGO} style={s.logo} resizeMode="contain" />
      <View style={s.sentIcon}>
        <Feather name="mail" size={28} color={GOLD} />
      </View>
      <Text style={s.headline} suppressHighlighting>
        {isReset ? "Verifique seu e-mail" : isOtp ? "Link enviado" : "Confirme seu e-mail"}
      </Text>
      <Text style={s.sub} suppressHighlighting>
        {isReset
          ? "Enviamos o link de redefinição para"
          : isOtp
          ? "Enviamos o link de acesso para"
          : "Enviamos um e-mail de confirmação para"}{"\n"}
        <Text style={{ color: GOLD, fontFamily: "Inter_500Medium" }}>{email}</Text>
      </Text>
      <Text style={s.sentNote} suppressHighlighting>
        {isReset
          ? "Clique no link para criar uma nova senha e voltar a acessar sua conta."
          : isOtp
          ? "Clique no link no e-mail para entrar automaticamente, sem precisar de senha."
          : "Clique no link no e-mail para ativar sua conta e entrar automaticamente."}
      </Text>
      <TouchableOpacity style={{ marginTop: 24 }} onPress={onBack} activeOpacity={0.7} accessibilityRole="button">
        <Text style={[s.footerLink, { fontSize: 14 }]} suppressHighlighting>← Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── PROFILE HERO BACKGROUND ───────────────────────────────────────────────────
// Reads from the global BackgroundContext — same pool, same index, same timer
// as every other screen. Navigation to/from Perfil never resets the rotation.

function ProfileHeroBg() {
  const { pool, currentIdx, nextIdx, nextOpacity } = useBackground();

  if (!pool.length) return null;

  return (
    <>
      <Animated.Image
        source={pool[currentIdx]}
=======
  return <AuthScreen />;
}

// ── Profile Hero Background ────────────────────────────────────────────────────

const PROFILE_HERO_IMAGES = [
  { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero01.jpg" },
  { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero02.jpg" },
  { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero03.jpg" },
  { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero04.jpg" },
  { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero05.jpg" },
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
>>>>>>> claude/plan-app-architecture-73RnI
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        blurRadius={22}
      />
<<<<<<< HEAD
      <Animated.Image
        source={pool[nextIdx]}
        style={[StyleSheet.absoluteFill, { opacity: nextOpacity }]}
        resizeMode="cover"
        pointerEvents="none"
      />
      {/* Dark overlay — keeps avatar/text readable */}
=======
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: nextOpacity }]}>
        <Image
          source={resolvedPool[nextIdx]}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={22}
        />
      </Animated.View>
>>>>>>> claude/plan-app-architecture-73RnI
      <View style={s.profileHeroOverlay} pointerEvents="none" />
      <LinearGradient
        colors={["transparent", "rgba(13,13,13,0.48)", "rgba(13,13,13,0.90)"]}
        locations={[0.50, 0.82, 1]}
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

// ── Meus Roteiros ──────────────────────────────────────────────────────────────

interface SavedRoteiro {
  id: string;
  destination_name: string;
  days_count: number;
  items_count: number;
  created_at: string;
  share_slug: string | null;
}

function MeusRoteiros({ userId }: { userId: string }) {
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("user_itineraries")
      .select("id, destination_name, days_count, items_count, created_at, share_slug")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) setRoteiros(data as SavedRoteiro[]);
        setLoading(false);
      });
  }, [userId]);

  return (
    <>
      <Text style={s.sectionLabel} suppressHighlighting>MEUS ROTEIROS</Text>
      <View style={s.menuCard}>
        {loading ? (
          <ActivityIndicator color={GOLD} style={{ margin: 16 }} />
        ) : roteiros.length === 0 ? (
          <View style={s.roteiroEmpty}>
            <Feather name="map" size={20} color="rgba(255,255,255,0.25)" />
            <Text style={s.roteiroEmptyText}>Nenhum roteiro salvo ainda</Text>
            <Pressable onPress={() => router.push("/(tabs)/roteiro")} style={s.roteiroCreateBtn}>
              <Text style={s.roteiroCreateBtnText}>Criar meu primeiro roteiro</Text>
              <Feather name="arrow-right" size={13} color={GOLD} />
            </Pressable>
          </View>
        ) : (
          <>
            {roteiros.map((r, idx) => (
              <React.Fragment key={r.id}>
                {idx > 0 && <View style={s.menuDivider} />}
                <Pressable
                  style={({ pressed }) => [s.roteiroItem, pressed && { opacity: 0.75 }]}
                  onPress={() => router.push("/(tabs)/roteiro")}
                >
                  <View style={s.roteiroIcon}>
                    <Feather name="map" size={16} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.roteiroItemTitle} numberOfLines={1}>{r.destination_name}</Text>
                    <Text style={s.roteiroItemSub}>
                      {r.days_count} {r.days_count === 1 ? "dia" : "dias"} · {r.items_count} {r.items_count === 1 ? "item" : "itens"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.30)" />
                </Pressable>
              </React.Fragment>
            ))}
            <View style={s.menuDivider} />
            <Pressable
              style={({ pressed }) => [s.roteiroNewBtn, pressed && { opacity: 0.75 }]}
              onPress={() => router.push("/(tabs)/roteiro")}
            >
              <Feather name="plus" size={15} color={GOLD} />
              <Text style={s.roteiroNewBtnText}>Criar novo roteiro</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
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

        <MeusRoteiros userId={user.id} />

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

        <MeusRoteiros userId={user.id} />

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
    minHeight: 340,
  },
  profileHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
<<<<<<< HEAD
    backgroundColor: "transparent",
=======
    backgroundColor: "rgba(0,0,0,0.45)",
>>>>>>> claude/plan-app-architecture-73RnI
  },
  profileHeroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
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
  roteiroEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  roteiroEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
  },
  roteiroCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  roteiroCreateBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: GOLD,
  },
  roteiroItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  roteiroIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  roteiroItemTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
  },
  roteiroItemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    marginTop: 2,
  },
  roteiroNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  roteiroNewBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: GOLD,
  },
});
