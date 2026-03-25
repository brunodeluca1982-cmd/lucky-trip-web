/**
 * GuiaContext.tsx
 *
 * Global state for saved places and the active viagem (roteiro base).
 *
 * DATA MODEL
 * ──────────
 *   SavedItem   — a place the user bookmarked (id, categoria, titulo, localizacao, image)
 *   Viagem      — the trip entity  (id, nome, destino, created_at)
 *   ViagemItem  — links a saved place to the viagem (viagem_id, item_id, tipo, bairro)
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

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "@luckytrip/saved_v1";

// ── SavedItem ─────────────────────────────────────────────────────────────────

export type SavedCategory = "oQueFazer" | "restaurante" | "hotel" | "lucky";

export interface SavedItem {
  id: string;
  categoria: SavedCategory;
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
  save: (item: SavedItem) => void;
  unsave: (id: string) => void;
  isSaved: (id: string) => boolean;
  /** The active trip entity */
  viagem: Viagem;
  /** Derived: one ViagemItem per saved place */
  viagemItens: ViagemItem[];
}

const GuiaContext = createContext<GuiaContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GuiaProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved]       = useState<SavedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // ── Load from AsyncStorage on mount ───────────────────────────────────────
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

  // ── Persist to AsyncStorage whenever saved changes ─────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved, hydrated]);

  // ── Save / unsave ──────────────────────────────────────────────────────────

  const save = useCallback((item: SavedItem) => {
    setSaved((prev) => {
      if (prev.some((s) => s.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const unsave = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some((s) => s.id === id),
    [saved],
  );

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
