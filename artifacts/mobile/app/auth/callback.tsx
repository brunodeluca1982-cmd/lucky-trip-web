/**
 * app/auth/callback.tsx
 *
 * Handles Supabase email auth returns:
 * - Email confirmation → session auto-set → redirect to home
 * - Password reset (type=recovery) → show set-new-password form
 *
 * Supabase places tokens in the URL hash (#access_token=...&type=recovery).
 * detectSessionInUrl:true in supabase.ts processes them automatically;
 * we only need to react to the resulting auth state events.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { supabase } from "@/lib/supabase";

const GOLD = "#D4AF37";

type Mode = "loading" | "recovery" | "confirmed" | "error";

export default function AuthCallback() {
  const [mode, setMode]           = useState<Mode>("loading");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // On web, peek at the hash immediately so we can switch to the recovery
    // form before onAuthStateChange fires (avoids the "loading" flash).
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        setMode("recovery");
      }
    }

    // Listen to Supabase auth events from the URL token.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setMode("recovery");
        } else if (event === "SIGNED_IN" && session) {
          // Email confirmation or magic link — session is ready, go home.
          setMode("confirmed");
          setTimeout(() => router.replace("/"), 1800);
        }
      },
    );

    // Safety timeout: if no event fires after 4 s, check session directly.
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setMode("confirmed");
          setTimeout(() => router.replace("/"), 1800);
        } else {
          // Still "loading" after timeout → token is invalid/expired.
          setMode((prev) => (prev === "loading" ? "error" : prev));
        }
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSetPassword() {
    if (!password) {
      setErrorMsg("Digite a nova senha.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
    } else {
      setSuccessMsg("Senha redefinida! Redirecionando…");
      setTimeout(() => router.replace("/"), 2000);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {mode === "loading" && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={s.sub}>Verificando link…</Text>
          </View>
        )}

        {mode === "confirmed" && (
          <View style={s.center}>
            <Text style={s.title}>Email confirmado!</Text>
            <Text style={s.sub}>Redirecionando para o app…</Text>
          </View>
        )}

        {mode === "error" && (
          <View style={s.center}>
            <Text style={s.title}>Link inválido</Text>
            <Text style={s.sub}>O link expirou ou já foi utilizado.</Text>
            <Pressable style={s.btn} onPress={() => router.replace("/")}>
              <Text style={s.btnText}>Voltar ao início</Text>
            </Pressable>
          </View>
        )}

        {mode === "recovery" && (
          <View style={s.center}>
            <Text style={s.title}>Nova senha</Text>
            <Text style={s.sub}>Escolha uma senha com pelo menos 8 caracteres.</Text>

            <TextInput
              style={s.input}
              placeholder="Nova senha"
              placeholderTextColor="rgba(255,255,255,0.30)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
            />
            <TextInput
              style={s.input}
              placeholder="Confirmar nova senha"
              placeholderTextColor="rgba(255,255,255,0.30)"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
            />

            {!!errorMsg && <Text style={s.error}>{errorMsg}</Text>}
            {!!successMsg && <Text style={s.success}>{successMsg}</Text>}

            <Pressable
              style={({ pressed }) => [
                s.btn,
                pressed && { opacity: 0.85 },
                submitting && { opacity: 0.65 },
              ]}
              onPress={handleSetPassword}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={s.btnText}>Redefinir senha</Text>
              }
            </Pressable>

            <Pressable onPress={() => router.replace("/")}>
              <Text style={s.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: "#000000",
  },
  center: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               18,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   26,
    color:      "#FFFFFF",
    textAlign:  "center",
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.50)",
    textAlign:  "center",
    lineHeight: 22,
  },
  input: {
    width:             "100%",
    maxWidth:          360,
    backgroundColor:   "#111111",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.12)",
    borderRadius:      12,
    paddingHorizontal: 16,
    paddingVertical:   14,
    color:             "#FFFFFF",
    fontFamily:        "Inter_400Regular",
    fontSize:          15,
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "#FF6B6B",
    textAlign:  "center",
  },
  success: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "#5CB85C",
    textAlign:  "center",
  },
  btn: {
    backgroundColor:   GOLD,
    borderRadius:      12,
    paddingVertical:   15,
    paddingHorizontal: 40,
    alignItems:        "center",
    minWidth:          200,
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   15,
    color:      "#000000",
  },
  cancelText: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    color:      "rgba(255,255,255,0.35)",
    marginTop:  4,
  },
});
