import { getNeighborhoodImage } from "./neighborhoodImages";
import { getImageForEntity } from "../utils/getImageForEntity";

export interface Destino {
  id: string;
  cidade: string;
  pais: string;
  descricao: string;
  image: any;
}

export const destinos: Destino[] = [
  {
    id: "rio",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    descricao: "A cidade maravilhosa — praias douradas, florestas urbanas e o carnaval mais famoso do mundo.",
    image: require("../assets/images/hero-rio.png"),
  },
  {
    id: "santorini",
    cidade: "Santorini",
    pais: "Grécia",
    descricao: "Ilhas brancas sobre o Mar Egeu — pôr-do-sol em Oia que não se esquece.",
    image: require("../assets/images/hero-santorini.png"),
  },
  {
    id: "kyoto",
    cidade: "Kyoto",
    pais: "Japão",
    descricao: "Templos milenares, cerejeiras em flor e a alma mais pura da cultura japonesa.",
    image: require("../assets/images/hero-kyoto.png"),
  },
  {
    id: "lisboa",
    cidade: "Lisboa",
    pais: "Portugal",
    descricao: "Fado, pastéis de nata e becos iluminados à beira do Tejo.",
    image: getImageForEntity("city", "Lisboa"),
  },
  {
    id: "buenosaires",
    cidade: "Buenos Aires",
    pais: "Argentina",
    descricao: "Tango, arquitetura europeia e os melhores cortes de carne do continente.",
    image: getImageForEntity("city", "Buenos Aires"),
  },
  {
    id: "floripa",
    cidade: "Florianópolis",
    pais: "Brasil",
    descricao: "A ilha da magia — 42 praias para todos os estilos e humores.",
    image: getImageForEntity("city", "Florianópolis"),
  },
  {
    id: "paraty",
    cidade: "Paraty",
    pais: "Brasil",
    descricao: "Centro histórico colonial à beira da Baía da Ilha Grande.",
    image: getImageForEntity("city", "Paraty"),
  },
  {
    id: "gramado",
    cidade: "Gramado",
    pais: "Brasil",
    descricao: "Charme europeu encravado entre as montanhas gaúchas.",
    image: getImageForEntity("city", "Gramado"),
  },
  {
    id: "miami",
    cidade: "Miami",
    pais: "Estados Unidos",
    descricao: "Arte, design, sol e a energia única de South Beach.",
    image: getImageForEntity("city", "Miami"),
  },
  {
    id: "paris",
    cidade: "Paris",
    pais: "França",
    descricao: "A capital do romance, da moda e da gastronomia mais refinada do mundo.",
    image: getImageForEntity("city", "Paris"),
  },
  {
    id: "bali",
    cidade: "Bali",
    pais: "Indonésia",
    descricao: "Templos entre arrozais, ondas perfeitas e a espiritualidade do povo balinês.",
    image: getImageForEntity("city", "Bali"),
  },
  {
    id: "ilhabela",
    cidade: "Ilhabela",
    pais: "Brasil",
    descricao: "Paraíso ecológico com cachoeiras, praias selvagens e ventos favoráveis.",
    image: getImageForEntity("city", "Ilhabela"),
  },
];

export const heroDestinos = [
  {
    id: "1",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    badge: "Confira as novidades",
    image: require("../assets/images/hero-rio.png"),
    cityId: "rio",
    lugar: "no Rio de Janeiro",
  },
  {
    id: "2",
    cidade: "Santorini",
    pais: "Grécia",
    badge: "Destaque da semana",
    image: require("../assets/images/hero-santorini.png"),
    cityId: "santorini",
    lugar: "em Santorini",
  },
  {
    id: "3",
    cidade: "Kyoto",
    pais: "Japão",
    badge: "Experiência única",
    image: require("../assets/images/hero-kyoto.png"),
    cityId: "kyoto",
    lugar: "em Kyoto",
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

export const oQueFazerPorMomento: Record<
  Periodo,
  { id: string; titulo: string; localizacao: string; image: any }[]
> = {
  manha: [
    {
      id: "m1",
      titulo: "Praia de Ipanema",
      localizacao: "Ipanema",
      image: getNeighborhoodImage("Ipanema"),
    },
    {
      id: "m2",
      titulo: "Caminhada ao Cristo",
      localizacao: "Cosme Velho",
      image: getNeighborhoodImage("Corcovado"),
    },
    {
      id: "m3",
      titulo: "Café na Colombo",
      localizacao: "Centro Histórico",
      image: getNeighborhoodImage("Centro"),
    },
  ],
  tarde: [
    {
      id: "t1",
      titulo: "Pão de Açúcar",
      localizacao: "Urca",
      image: getNeighborhoodImage("Urca"),
    },
    {
      id: "t2",
      titulo: "Escadaria Selarón",
      localizacao: "Lapa",
      image: getNeighborhoodImage("Lapa"),
    },
    {
      id: "t3",
      titulo: "Santa Teresa",
      localizacao: "Santa Teresa",
      image: getNeighborhoodImage("Santa Teresa"),
    },
  ],
  noite: [
    {
      id: "n1",
      titulo: "Beco das Sardinhas",
      localizacao: "Centro",
      image: getNeighborhoodImage("Centro"),
    },
    {
      id: "n2",
      titulo: "Oro Restaurant",
      localizacao: "Leblon",
      image: getNeighborhoodImage("Leblon"),
    },
    {
      id: "n3",
      titulo: "Arcos da Lapa",
      localizacao: "Lapa",
      image: getNeighborhoodImage("Lapa"),
    },
  ],
};

export const restaurantes = [
  {
    id: "1",
    nome: "Confeitaria Colombo",
    bairro: "Centro",
    categoria: "Café / Histórico",
    image: getImageForEntity("restaurant", "Confeitaria Colombo", "Centro"),
  },
  {
    id: "2",
    nome: "Oro Restaurant",
    bairro: "Leblon",
    categoria: "Contemporâneo",
    image: getImageForEntity("restaurant", "Oro Restaurant", "Leblon"),
  },
];

export const hoteis = [
  {
    id: "1",
    nome: "Copacabana Palace",
    localizacao: "Copacabana",
    tipo: "Luxo",
    image: getImageForEntity("hotel", "Copacabana Palace", "Copacabana"),
  },
  {
    id: "2",
    nome: "Santa Teresa Hotel",
    localizacao: "Santa Teresa",
    tipo: "Boutique",
    image: getImageForEntity("hotel", "Santa Teresa Hotel", "Santa Teresa"),
  },
];

export const segredos = [
  {
    id: "1",
    titulo: "Beco das Sardinhas",
    localizacao: "Centro",
    descricao: "Ruelas históricas onde cariocas se reúnem ao pôr do sol para petiscos e cerveja.",
    image: getNeighborhoodImage("Centro"),
  },
  {
    id: "2",
    titulo: "Mirante Dona Marta",
    localizacao: "Botafogo",
    descricao: "Vista panorâmica do Rio sem as multidões do Corcovado — o segredo dos cariocas.",
    image: getNeighborhoodImage("Botafogo"),
  },
  {
    id: "3",
    titulo: "Escadaria Selarón",
    localizacao: "Lapa",
    descricao: "Mosaico de azulejos de mais de 60 países, criado por Jorge Selarón ao longo de décadas.",
    image: getNeighborhoodImage("Lapa"),
  },
];

// ── Curados para você ──────────────────────────────────────────────────────────
export const curadoPara = [
  {
    id: "cp1",
    titulo: "Melhor tarde do Arpoador",
    localizacao: "Arpoador",
    image: getNeighborhoodImage("Arpoador"),
  },
  {
    id: "cp2",
    titulo: "COBRI · Bar do Mercado",
    localizacao: "Centro",
    image: getNeighborhoodImage("Centro"),
  },
  {
    id: "cp3",
    titulo: "Banzeiro",
    localizacao: "Botafogo",
    image: getNeighborhoodImage("Botafogo"),
  },
  {
    id: "cp4",
    titulo: "Parque Lage",
    localizacao: "Jardim Botânico",
    image: getNeighborhoodImage("Jardim Botânico"),
  },
];

// ── Roteiros ──────────────────────────────────────────────────────────────────
export interface Roteiro {
  id: string;
  titulo: string;
  dias: string;
  tags: string[];
  numLugares: number;
  image: any;
}

export const roteiros: Roteiro[] = [
  {
    id: "r1",
    titulo: "Rio com classe",
    dias: "3 dias",
    tags: ["Arte", "Gastronomia"],
    numLugares: 12,
    image: require("../assets/images/hero-rio.png"),
  },
  {
    id: "r2",
    titulo: "Rio em família",
    dias: "5 dias",
    tags: ["Praia", "Natureza"],
    numLugares: 18,
    image: require("../assets/images/pao-acucar.png"),
  },
];

// ── Influencers (Viaje como eles) ─────────────────────────────────────────────
export interface Influencer {
  id: string;
  nome: string;
  numRoteiros: number;
  image: any;
}

export const influencers: Influencer[] = [
  {
    id: "if1",
    nome: "Bruno De Luca",
    numRoteiros: 8,
    image: require("../assets/images/hotel2.png"),
  },
  {
    id: "if2",
    nome: "Claudia Cárdoz",
    numRoteiros: 6,
    image: require("../assets/images/secret1.png"),
  },
  {
    id: "if3",
    nome: "Di Ferrero",
    numRoteiros: 4,
    image: require("../assets/images/lapa.png"),
  },
  {
    id: "if4",
    nome: "Carolina Dieckmann",
    numRoteiros: 5,
    image: require("../assets/images/hotel1.png"),
  },
];
