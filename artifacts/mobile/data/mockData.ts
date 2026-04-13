/**
 * mockData.ts — Navigation metadata only.
 *
 * STRICT RULE: Supabase is the ONLY source of truth for content.
 * This file contains ONLY:
 *   - Destination metadata (city name, country, cover image) for navigation
 *   - Utility functions (detectPeriodo) and UI labels (periodoMeta)
 *
 * REMOVED (were fake content — violated Supabase-only rule):
 *   heroDestinos, destaques, oQueFazer, oQueFazerPorMomento,
 *   restaurantes, hoteis, segredos, curadoPara, roteiros, influencers
 *
 * All content items MUST come from Supabase tables.
 */

import { getImageForEntity } from "../utils/getImageForEntity";

export interface Destino {
  id: string;
  cidade: string;
  pais: string;
  descricao: string;
  image: any;
  lancado: boolean;
}

export const destinos: Destino[] = [
  {
    id: "rio",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    descricao: "A cidade maravilhosa — praias douradas, florestas urbanas e o carnaval mais famoso do mundo.",
    image: require("../assets/images/hero-rio.png"),
    lancado: true,
  },
  {
    id: "santorini",
    cidade: "Santorini",
    pais: "Grécia",
    descricao: "Ilhas brancas sobre o Mar Egeu — pôr-do-sol em Oia que não se esquece.",
    image: require("../assets/images/hero-santorini.png"),
    lancado: false,
  },
  {
    id: "kyoto",
    cidade: "Kyoto",
    pais: "Japão",
    descricao: "Templos milenares, cerejeiras em flor e a alma mais pura da cultura japonesa.",
    image: require("../assets/images/hero-kyoto.png"),
    lancado: false,
  },
  {
    id: "lisboa",
    cidade: "Lisboa",
    pais: "Portugal",
    descricao: "Fado, pastéis de nata e becos iluminados à beira do Tejo.",
    image: getImageForEntity("city", "Lisboa"),
    lancado: false,
  },
  {
    id: "buenosaires",
    cidade: "Buenos Aires",
    pais: "Argentina",
    descricao: "Tango, arquitetura europeia e os melhores cortes de carne do continente.",
    image: getImageForEntity("city", "Buenos Aires"),
    lancado: false,
  },
  {
    id: "floripa",
    cidade: "Florianópolis",
    pais: "Brasil",
    descricao: "A ilha da magia — 42 praias para todos os estilos e humores.",
    image: getImageForEntity("city", "Florianópolis"),
    lancado: false,
  },
  {
    id: "paraty",
    cidade: "Paraty",
    pais: "Brasil",
    descricao: "Centro histórico colonial à beira da Baía da Ilha Grande.",
    image: getImageForEntity("city", "Paraty"),
    lancado: false,
  },
  {
    id: "gramado",
    cidade: "Gramado",
    pais: "Brasil",
    descricao: "Charme europeu encravado entre as montanhas gaúchas.",
    image: getImageForEntity("city", "Gramado"),
    lancado: false,
  },
  {
    id: "miami",
    cidade: "Miami",
    pais: "Estados Unidos",
    descricao: "Arte, design, sol e a energia única de South Beach.",
    image: getImageForEntity("city", "Miami"),
    lancado: false,
  },
  {
    id: "paris",
    cidade: "Paris",
    pais: "França",
    descricao: "A capital do romance, da moda e da gastronomia mais refinada do mundo.",
    image: getImageForEntity("city", "Paris"),
    lancado: false,
  },
  {
    id: "bali",
    cidade: "Bali",
    pais: "Indonésia",
    descricao: "Templos entre arrozais, ondas perfeitas e a espiritualidade do povo balinês.",
    image: getImageForEntity("city", "Bali"),
    lancado: false,
  },
  {
    id: "ilhabela",
    cidade: "Ilhabela",
    pais: "Brasil",
    descricao: "Paraíso ecológico com cachoeiras, praias selvagens e ventos favoráveis.",
    image: getImageForEntity("city", "Ilhabela"),
    lancado: false,
  },
];

// ── Time-of-day utility ────────────────────────────────────────────────────────
export type Periodo = "manha" | "tarde" | "noite";

export function detectPeriodo(): Periodo {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

export const periodoMeta: Record<
  Periodo,
  { label: string; subtitle: string; icon: string }
> = {
  manha: {
    label: "Manhã",
    icon: "sunrise",
    subtitle: "Manhã no Rio — comece o dia com leveza.",
  },
  tarde: {
    label: "Tarde",
    icon: "sun",
    subtitle: "Tarde no Rio — o melhor para este momento.",
  },
  noite: {
    label: "Noite",
    icon: "moon",
    subtitle: "Noite no Rio — a cidade que nunca dorme.",
  },
};
