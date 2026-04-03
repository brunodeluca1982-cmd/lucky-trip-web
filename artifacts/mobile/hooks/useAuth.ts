/**
 * useAuth.ts
 *
 * Minimal Supabase Auth hook.
 * Exposes the current session/user and basic auth actions.
 *
 * Uses magic-link (OTP) sign-in — no password UI required.
 */

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthState {
  user:            User | null;
  session:         Session | null;
  loading:         boolean;
  signInWithOtp:   (email: string) => Promise<{ error: string | null }>;
  signOut:         () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
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

  async function signOut(): Promise<void> {
    console.log("[logout] signOut called, current session:", session?.user?.id ?? "null");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      console.log("[logout] signOut completed, error:", error?.message ?? "none");
    } catch (e) {
      console.log("[logout] signOut threw:", e);
    }
  }

  return {
    user:    session?.user ?? null,
    session,
    loading,
    signInWithOtp,
    signOut,
  };
}
