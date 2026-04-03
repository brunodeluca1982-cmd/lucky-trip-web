import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

// Blur active element and clear any DOM text selection.
// Called after every auth action on web to prevent frozen focus / blue highlight.
function webCleanup() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  try {
    (document.activeElement as HTMLElement)?.blur();
    window.getSelection()?.removeAllRanges();
  } catch (_) {}
}

export interface AuthState {
  user:             User | null;
  session:          Session | null;
  loading:          boolean;
  signInWithOtp:    (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut:          () => Promise<void>;
}

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
    try {
      const emailRedirectTo =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });

      webCleanup();
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      webCleanup();
      return { error: e?.message ?? "Erro inesperado." };
    }
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    // Web: full-page redirect. No WebBrowser, no Linking — both break on web.
    if (Platform.OS === "web") {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });
        webCleanup();
        if (error) return { error: error.message };
        return { error: null };
      } catch (e: any) {
        webCleanup();
        return { error: e?.message ?? "Erro inesperado." };
      }
    }

    // Native: in-app browser session via expo-web-browser.
    try {
      const redirectTo = Linking.createURL("/");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
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
    } catch (e: any) {
      return { error: e?.message ?? "Erro inesperado." };
    }
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
