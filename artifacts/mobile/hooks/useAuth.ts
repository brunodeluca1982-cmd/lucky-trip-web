/**
 * useAuth.ts
 *
 * Minimal Supabase Auth hook.
 * Supports magic-link (OTP) and Google OAuth sign-in.
 *
 * Web vs native OAuth strategy:
 *   Web    — signInWithOAuth without skipBrowserRedirect; browser handles
 *            the full-page redirect to Google and back to window.location.origin.
 *            No WebBrowser, no Linking scheme — both break on iOS Safari web.
 *   Native — WebBrowser.openAuthSessionAsync with Linking deep-link redirectTo.
 *
 * After every auth call (success or failure) webCleanup() is called on web to:
 *   - blur the active element (removes keyboard focus / blue ring)
 *   - clear any residual text selection
 */

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

// ── Helper: remove focus + selection on web after auth ────────────────────────

function webCleanup() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  try {
    (document.activeElement as HTMLElement)?.blur();
    window.getSelection()?.removeAllRanges();
  } catch (_) {}
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface AuthState {
  user:              User | null;
  session:           Session | null;
  loading:           boolean;
  signInWithOtp:     (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle:  () => Promise<{ error: string | null }>;
  signOut:           () => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Email OTP ──────────────────────────────────────────────────────────────

  async function signInWithOtp(email: string): Promise<{ error: string | null }> {
    const emailRedirectTo =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    webCleanup();
    if (error) return { error: error.message };
    return { error: null };
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    // ── Web: full-page redirect — browser handles OAuth natively ──────────
    if (Platform.OS === "web") {
      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options:  { redirectTo },
        // No skipBrowserRedirect — let the browser do the full redirect cycle
      });

      webCleanup();
      if (error) return { error: error.message };
      return { error: null };
    }

    // ── Native: in-app browser via expo-web-browser ────────────────────────
    const redirectTo = Linking.createURL("/");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo, skipBrowserRedirect: true },
    });

    if (error || !data.url) {
      return { error: error?.message ?? "OAuth error" };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === "success") {
      const parsed       = Linking.parse(result.url);
      const accessToken  = parsed.queryParams?.access_token  as string | undefined;
      const refreshToken = parsed.queryParams?.refresh_token as string | undefined;

      if (accessToken && refreshToken) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) return { error: sessionErr.message };
      }
    }

    return { error: null };
  }

  // ── Sign out ───────────────────────────────────────────────────────────────

  async function signOut(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (_) {}
    webCleanup();
  }

  return {
    user:   session?.user ?? null,
    session,
    loading,
    signInWithOtp,
    signInWithGoogle,
    signOut,
  };
}
