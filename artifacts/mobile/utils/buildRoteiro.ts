/**
 * buildRoteiro.ts
 *
 * Pure deterministic function that converts a flat list of SavedItems
 * into a structured day-by-day itinerary (roteiro base).
 *
 * Rules (no AI):
 *   1. Group items by bairro → each bairro becomes one DiaRoteiro.
 *   2. Within each bairro:
 *        restaurante → almoço (1st) then noite (2nd+)
 *        oQueFazer / lucky → manhã (1st half) then tarde (2nd half)
 *        hotel → excluded from periodo display (it's the lodging, not an activity)
 *   3. Empty periodos are not included.
 *   4. Bairros that yield no periodos (hotels only) are skipped.
 *   5. Day numbers are sequential in insertion order of first saved bairro item.
 */

import type { SavedItem, SavedCategory } from "@/context/GuiaContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PeriodoDia = "manha" | "almoco" | "tarde" | "noite";

export const PERIODO_LABEL: Record<PeriodoDia, string> = {
  manha:  "Manhã",
  almoco: "Almoço",
  tarde:  "Tarde",
  noite:  "Noite",
};

export const PERIODO_ICON: Record<PeriodoDia, string> = {
  manha:  "sun",
  almoco: "coffee",
  tarde:  "cloud",
  noite:  "moon",
};

export interface DiaPeriodo {
  periodo: PeriodoDia;
  items: SavedItem[];
}

export interface DiaRoteiro {
  numero: number;
  bairro: string;
  periodos: DiaPeriodo[];
}

// ── Internal helper ────────────────────────────────────────────────────────────

type TipoInterno = "atividade" | "restaurante" | "hotel";

function tipoFromCategoria(categoria: SavedCategory): TipoInterno {
  if (categoria === "restaurante") return "restaurante";
  if (categoria === "hotel")       return "hotel";
  return "atividade"; // oQueFazer + lucky → atividade
}

// ── Main export ────────────────────────────────────────────────────────────────

export function buildRoteiro(items: SavedItem[]): DiaRoteiro[] {
  // 1. Group by localizacao (= bairro), preserving insertion order
  const byBairro = new Map<string, SavedItem[]>();
  for (const item of items) {
    const bairro = item.localizacao.trim() || "Sem bairro";
    if (!byBairro.has(bairro)) byBairro.set(bairro, []);
    byBairro.get(bairro)!.push(item);
  }

  const dias: DiaRoteiro[] = [];
  let diaNum = 1;

  for (const [bairro, bairroItems] of byBairro) {
    // 2. Split by tipo
    const atividades   = bairroItems.filter(i => tipoFromCategoria(i.categoria) === "atividade");
    const restaurantes = bairroItems.filter(i => tipoFromCategoria(i.categoria) === "restaurante");
    // hotels are deliberately excluded from the timetable

    // 3. Distribute atividades between manhã and tarde
    const meioAtiv = Math.ceil(atividades.length / 2);
    const manha    = atividades.slice(0, meioAtiv);
    const tarde    = atividades.slice(meioAtiv);

    // 4. Distribute restaurantes between almoço and noite
    const almoco = restaurantes.slice(0, 1);
    const noite  = restaurantes.slice(1);

    // 5. Build ordered periodo list, skipping empty ones
    const periodos: DiaPeriodo[] = [];
    if (manha.length  > 0) periodos.push({ periodo: "manha",  items: manha  });
    if (almoco.length > 0) periodos.push({ periodo: "almoco", items: almoco });
    if (tarde.length  > 0) periodos.push({ periodo: "tarde",  items: tarde  });
    if (noite.length  > 0) periodos.push({ periodo: "noite",  items: noite  });

    // 6. Skip bairros that yield no actionable periodos (hotel-only bairros)
    if (periodos.length === 0) continue;

    dias.push({ numero: diaNum++, bairro, periodos });
  }

  return dias;
}
