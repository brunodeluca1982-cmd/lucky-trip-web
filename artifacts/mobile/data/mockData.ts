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
    id: "rio-de-janeiro",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    descricao: "A cidade maravilhosa — praias douradas, florestas urbanas e o carnaval mais famoso do mundo.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero01.jpg" },
    lancado: true,
  },
  {
    id: "miami",
    cidade: "Miami",
    pais: "Estados Unidos",
    descricao: "Arte, design, sol e a energia única de South Beach.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/miami/hero/foto/imagehero14.jpg" },
    lancado: false,
  },
  {
    id: "nova-york",
    cidade: "Nova York",
    pais: "Estados Unidos",
    descricao: "A cidade que nunca dorme — jazz, arte e a energia de Manhattan.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/nova-iorque/hero/foto/New_York_City_Street_original_367138.jpg" },
    lancado: false,
  },
  {
    id: "sao-paulo",
    cidade: "São Paulo",
    pais: "Brasil",
    descricao: "A maior metrópole da América do Sul — gastronomia, arte e vida noturna sem fim.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/sao-paulo/hero/foto/imagehero26.jpg" },
    lancado: false,
  },
  {
    id: "ibiza",
    cidade: "Ibiza",
    pais: "Espanha",
    descricao: "Calas escondidas, pôr-do-sol em Es Vedrà e a melhor música eletrônica do mundo.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/ibiza/hero/foto/Cala_Bassa_Beach__Ibizas_Turquoise_Sea_In_The_Balearic_Islands_Of_Spain_original_2950762.jpg" },
    lancado: false,
  },
  {
    id: "paris",
    cidade: "Paris",
    pais: "França",
    descricao: "A capital do romance, da moda e da gastronomia mais refinada do mundo.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/paris/hero/foto/Dense_Traffic_On_The_Champs-Elysees_original_1077419.jpg" },
    lancado: false,
  },
  {
    id: "santorini",
    cidade: "Santorini",
    pais: "Grécia",
    descricao: "Ilhas brancas sobre o Mar Egeu — pôr-do-sol em Oia que não se esquece.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/santorini/hero/foto/Oai_Santorini_View_original_773226.jpg" },
    lancado: false,
  },
  {
    id: "reykjavik",
    cidade: "Reykjavik",
    pais: "Islândia",
    descricao: "Aurora boreal, gêiseres e paisagens lunares no extremo norte.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/reykjavik/hero/foto/IMG_7215.jpeg" },
    lancado: false,
  },
  {
    id: "atenas",
    cidade: "Atenas",
    pais: "Grécia",
    descricao: "Berço da civilização ocidental — Acrópole, história viva e culinária mediterrânea.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/atenas/hero/foto/_MG_0169-2.jpeg" },
    lancado: false,
  },
  {
    id: "jericoacoara",
    cidade: "Jericoacoara",
    pais: "Brasil",
    descricao: "Dunas douradas, lagoas cristalinas e o pôr-do-sol mais famoso do Nordeste.",
    image: { uri: "https://bkwlximkadmlnbgjcrdp.supabase.co/storage/v1/object/public/media/jericoacoara/hero/fotos/Jericoacoara_Beach_At_Ceara_Brazil_original_1895481.jpg" },
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
    id: "bali",
    cidade: "Bali",
    pais: "Indonésia",
    descricao: "Templos entre arrozais, ondas perfeitas e a espiritualidade do povo balinês.",
    image: getImageForEntity("city", "Bali"),
    lancado: false,
  },
];

<<<<<<< HEAD
// ── Time-of-day utility ────────────────────────────────────────────────────────
=======
export const heroDestinos = [
  {
    id: "1",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    badge: "DESTINO",
    image: require("../assets/images/hero-rio.png"),
    cityId: "rio-de-janeiro",
  },
];

export type DestaqueType = "oQueFazer" | "restaurante" | "hotel" | "lucky";

export const destaques = [
  {
    id: "1",
    titulo: "Praia de Ipanema",
    localizacao: "Ipanema",
    descricao: "O encontro perfeito entre o mar e a alma carioca.",
    tipo: "oQueFazer" as DestaqueType,
    image: getNeighborhoodImage("Ipanema"),
  },
  {
    id: "2",
    titulo: "Confeitaria Colombo",
    localizacao: "Centro Histórico",
    descricao: "Um século de elegância servido em cada xícara.",
    tipo: "restaurante" as DestaqueType,
    image: getNeighborhoodImage("Centro"),
  },
  {
    id: "3",
    titulo: "Copacabana Palace",
    localizacao: "Copacabana",
    descricao: "O endereço mais icônico do Rio, com vista para o mar.",
    tipo: "hotel" as DestaqueType,
    image: getNeighborhoodImage("Copacabana"),
  },
  {
    id: "4",
    titulo: "Escadaria Selarón",
    localizacao: "Lapa",
    descricao: "Arte viva em cada azulejo, curada por décadas de paixão.",
    tipo: "lucky" as DestaqueType,
    image: getNeighborhoodImage("Lapa"),
  },
];

export const oQueFazer = [
  {
    id: "1",
    titulo: "Praia de Ipanema",
    localizacao: "Ipanema",
    image: getNeighborhoodImage("Ipanema"),
  },
  {
    id: "2",
    titulo: "Escadaria Selarón",
    localizacao: "Lapa",
    image: getNeighborhoodImage("Lapa"),
  },
  {
    id: "3",
    titulo: "Arcos da Lapa",
    localizacao: "Lapa",
    image: getNeighborhoodImage("Lapa"),
  },
];

>>>>>>> claude/plan-app-architecture-73RnI
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
