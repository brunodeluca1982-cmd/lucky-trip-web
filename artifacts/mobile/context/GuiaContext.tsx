/**
 * GuiaContext.tsx
 *
 * Global state for saved places, premium status, and paywall gating.
 *
 * DATA MODEL
 * ──────────
 *   SavedItem   — a place the user bookmarked (id, categoria, titulo, localizacao, image)
 *   Viagem      — the trip entity  (id, nome, destino, created_at)
 *   ViagemItem  — links a saved place to the viagem (viagem_id, item_id, tipo, bairro)
 *
 * PREMIUM
 * ───────
 *   isPremium is read from Supabase access_levels using the authenticated user.id.
 *   AsyncStorage (PREMIUM_KEY) is used only as a fast-path cache — Supabase is authoritative.
 *   Access gates: save 2nd+ place, generate/edit itinerary, Lucky List locked items.
 *   Global paywall is triggered via showPaywall(type) — rendered by PaywallModal in layout.
 *
 * PERSISTENCE
 * ───────────
 *   Saved items are persisted to AsyncStorage (key: @luckytrip/saved_v1).
 *   Images are stored as module IDs (numbers from require()) — stable within the
 *   same build. Viagem entity and ViagemItem rows are derived in-memory from the
 *   saved list; no separate storage needed until a Supabase backend is wired.
 *
 * ROTEIRO
 * ───────
 *   `buildRoteiro(saved)` (see utils/buildRoteiro.ts) converts the flat saved
 *   list into DiaRoteiro[] — grouped by bairro, ordered by manhã/almoço/tarde/noite.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ImageSourcePropType } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ── Storage keys ───────────────────────────────────────────────────────────────

const STORAGE_KEY  = "@luckytrip/saved_v1";
const PREMIUM_KEY  = "@luckytrip/lucky_premium_v2";

// ── Paywall types ─────────────────────────────────────────────────────────────

export type PaywallType = "discovery" | "lucky" | "depth";

// ── SavedItem ─────────────────────────────────────────────────────────────────

export type SavedCategory = "oQueFazer" | "restaurante" | "hotel" | "lucky";

/**
 * Valid Supabase table names for internal entities.
 * Used as the authoritative routing key — must match the actual DB table.
 */
export type SourceTable =
  | "restaurantes"
  | "stay_hotels"
  | "o_que_fazer_rio"
  | "lucky_list_rio";

/** Maps UI category to the Supabase source table. */
export function sourceTableFromCategoria(categoria: SavedCategory): SourceTable {
  switch (categoria) {
    case "restaurante": return "restaurantes";
    case "hotel":       return "stay_hotels";
    case "oQueFazer":   return "o_que_fazer_rio";
    case "lucky":       return "lucky_list_rio";
  }
}

/** Maps Supabase source table back to UI category. */
export function categoriaFromSourceTable(table: SourceTable): SavedCategory {
  switch (table) {
    case "restaurantes":    return "restaurante";
    case "stay_hotels":     return "hotel";
    case "o_que_fazer_rio": return "oQueFazer";
    case "lucky_list_rio":  return "lucky";
  }
}

export interface SavedItem {
  id: string;
  categoria: SavedCategory;
  /**
   * Explicit Supabase table this item belongs to.
   * Always set for items created from DB rows — used as the primary routing key.
   * Optional for backward compatibility with items persisted before this field existed.
   */
  source_table?: SourceTable;
  titulo: string;
  /** bairro — e.g. "Ipanema", "Leblon", "Santa Teresa" */
  localizacao: string;
  image: ImageSourcePropType;
  /** True when the item was added manually via external search (Google Places) */
  isExternal?: boolean;
  /** Google Places ID — only set for external items */
  placeId?: string;
  /** Geographic coordinates — only set for external items */
  lat?: number;
  lng?: number;
  /** Full formatted address from Google Places */
  address?: string;
}

// ── Viagem entity ─────────────────────────────────────────────────────────────

export interface Viagem {
  id: string;
  nome: string;
  destino: string;
  created_at: string;
}

// Auto-created default viagem (one per device, persists across sessions)
export const DEFAULT_VIAGEM: Viagem = {
  id: "default",
  nome: "Minha Viagem",
  destino: "Rio de Janeiro",
  created_at: new Date().toISOString(),
};

// ── ViagemItem relation ────────────────────────────────────────────────────────

export interface ViagemItem {
  viagem_id: string;
  item_id: string;
  /** "restaurante" | "hotel" | "atividade" */
  tipo: string;
  bairro: string;
}

// ── Helper: derive tipo from categoria ────────────────────────────────────────

export function tipoFromCategoria(
  categoria: SavedCategory,
): "restaurante" | "hotel" | "atividade" {
  if (categoria === "restaurante") return "restaurante";
  if (categoria === "hotel")       return "hotel";
  return "atividade"; // oQueFazer + lucky → atividade
}

// ── Context type ──────────────────────────────────────────────────────────────

interface GuiaContextType {
  saved: SavedItem[];
  /**
   * Save a place. For non-premium users, the 2nd+ save triggers the depth
   * paywall instead of adding the item. Returns true if the item was saved.
   */
  save: (item: SavedItem) => boolean;
  unsave: (id: string) => void;
  isSaved: (id: string) => boolean;
  /** The active trip entity */
  viagem: Viagem;
  /** Derived: one ViagemItem per saved place */
  viagemItens: ViagemItem[];
  /** Premium status (authoritative from Supabase access_levels via authenticated user.id) */
  isPremium: boolean;
  /** Authenticated Supabase user (null if not logged in) */
  user: User | null;
  /** Mark user as premium locally (called after successful purchase verification) */
  markPremium: () => Promise<void>;
  /** Global paywall modal state */
  paywallVisible: boolean;
  paywallType: PaywallType;
  showPaywall: (type: PaywallType) => void;
  hidePaywall: () => void;
}

const GuiaContext = createContext<GuiaContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GuiaProvider({ children }: { children: React.ReactNode }) {
  const [saved,          setSaved]          = useState<SavedItem[]>([]);
  const [hydrated,       setHydrated]       = useState(false);
  const [isPremium,      setIsPremium]      = useState(false);
  const [user,           setUser]           = useState<User | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallType,    setPaywallType]    = useState<PaywallType>("depth");

  // ── Load saved places from AsyncStorage on mount ───────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as SavedItem[];
            setSaved(parsed);
          } catch {
            // Corrupt data — start fresh
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  // ── Track Supabase Auth session ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load premium status — uses authenticated user.id (authoritative) ────────
  useEffect(() => {
    (async () => {
      // Fast-path: AsyncStorage cache
      const premiumStr = await AsyncStorage.getItem(PREMIUM_KEY);
      if (premiumStr === "true") {
        setIsPremium(true);
      }

      // Authoritative check: Supabase access_levels using auth user.id
      if (!user) {
        // Not logged in — clear any stale premium cache
        setIsPremium(false);
        await AsyncStorage.removeItem(PREMIUM_KEY);
        return;
      }

      try {
        const { data } = await supabase
          .from("access_levels")
          .select("plan_type, access_until")
          .eq("user_id", user.id)
          .maybeSingle();

        const validPlan = data?.plan_type === "premium" || data?.plan_type === "vip";
        const notExpired = data?.access_until
          ? new Date(data.access_until) > new Date()
          : false;

        if (validPlan && notExpired) {
          setIsPremium(true);
          await AsyncStorage.setItem(PREMIUM_KEY, "true");
        } else {
          setIsPremium(false);
          await AsyncStorage.removeItem(PREMIUM_KEY);
        }
      } catch {
        // Network error — keep fast-path value from AsyncStorage
      }
    })();
  }, [user]);

  // ── Persist to AsyncStorage whenever saved changes ─────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved, hydrated]);

  // ── Save / unsave ──────────────────────────────────────────────────────────

  const save = useCallback((item: SavedItem): boolean => {
    if (saved.some((s) => s.id === item.id)) return true;
    // Non-premium: only 1 free save; 2nd+ triggers depth paywall
    if (!isPremium && saved.length >= 1) {
      setPaywallType("depth");
      setPaywallVisible(true);
      return false;
    }
    setSaved((prev) => {
      if (prev.some((s) => s.id === item.id)) return prev;
      return [...prev, item];
    });
    return true;
  }, [saved, isPremium]);

  const unsave = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some((s) => s.id === id),
    [saved],
  );

  // ── Mark premium (local cache — webhook is the authoritative source) ────────

  const markPremium = useCallback(async () => {
    setIsPremium(true);
    await AsyncStorage.setItem(PREMIUM_KEY, "true");
  }, []);

  // ── Paywall controls ───────────────────────────────────────────────────────

  const showPaywall = useCallback((type: PaywallType) => {
    setPaywallType(type);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  // ── Derive ViagemItem list ─────────────────────────────────────────────────
  const viagemItens: ViagemItem[] = saved.map((item) => ({
    viagem_id: DEFAULT_VIAGEM.id,
    item_id:   item.id,
    tipo:      tipoFromCategoria(item.categoria),
    bairro:    item.localizacao,
  }));

  return (
    <GuiaContext.Provider
      value={{
        saved,
        save,
        unsave,
        isSaved,
        viagem: DEFAULT_VIAGEM,
        viagemItens,
        isPremium,
        user,
        markPremium,
        paywallVisible,
        paywallType,
        showPaywall,
        hidePaywall,
      }}
    >
      {children}
    </GuiaContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGuia() {
  const ctx = useContext(GuiaContext);
  if (!ctx) throw new Error("useGuia must be used inside GuiaProvider");
  return ctx;
}
