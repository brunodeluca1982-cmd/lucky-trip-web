import React, { createContext, useCallback, useContext, useState } from "react";
import type { ImageSourcePropType } from "react-native";

export type SavedCategory = "oQueFazer" | "restaurante" | "hotel" | "lucky";

export interface SavedItem {
  id: string;
  categoria: SavedCategory;
  titulo: string;
  localizacao: string;
  image: ImageSourcePropType;
}

interface GuiaContextType {
  saved: SavedItem[];
  save: (item: SavedItem) => void;
  unsave: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const GuiaContext = createContext<GuiaContextType | null>(null);

export function GuiaProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedItem[]>([]);

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
    [saved]
  );

  return (
    <GuiaContext.Provider value={{ saved, save, unsave, isSaved }}>
      {children}
    </GuiaContext.Provider>
  );
}

export function useGuia() {
  const ctx = useContext(GuiaContext);
  if (!ctx) throw new Error("useGuia must be used inside GuiaProvider");
  return ctx;
}
