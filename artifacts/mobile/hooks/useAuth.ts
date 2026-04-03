/**
 * useAuth.ts
 *
 * Minimal Supabase Auth hook.
 * Exposes the current session/user and basic auth actions.
 *
 * Supports magic-link (OTP) and Google OAuth sign-in.
 */

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
  user:              User | null;
  session:           Session | null;
  loading:           boolean;
  signInWithOtp:     (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle:  () => Promise<{ error: string | null }>;
  signOut:           () => Promise<void>;
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

  async function signInWithOtp(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signInWithGoogle(): Promise<{ error: string | null }> {
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
      const parsed      = Linking.parse(result.url);
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

  async function signOut(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (_) {}
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
