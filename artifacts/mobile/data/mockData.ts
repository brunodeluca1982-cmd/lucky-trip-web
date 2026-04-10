import { getNeighborhoodImage } from "./neighborhoodImages";
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

export const heroDestinos = [
  {
    id: "1",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    badge: "Destino em destaque",
    image: require("../assets/images/hero-rio.png"),
    cityId: "rio",
  },
  {
    id: "e1",
    cidade: "Restaurantes imperdíveis",
    pais: "Rio de Janeiro",
    badge: "Onde comer",
    image: require("../assets/images/restaurante1.png"),
    cityId: "rio",
    route: "/(tabs)/comerBem/rio",
  },
  {
    id: "e2",
    cidade: "O que fazer hoje",
    pais: "Experiências no Rio",
    badge: "Experiências",
    image: require("../assets/images/pao-acucar.png"),
    cityId: "rio",
    route: "/(tabs)/oQueFazer/rio",
  },
  {
    id: "2",
    cidade: "Santorini",
    pais: "Grécia",
    badge: "Destaque da semana",
    image: require("../assets/images/hero-santorini.png"),
    cityId: "santorini",
  },
  {
    id: "3",
    cidade: "Kyoto",
    pais: "Japão",
    badge: "Experiência única",
    image: require("../assets/images/hero-kyoto.png"),
    cityId: "kyoto",
  },
  {
    id: "f1",
    cidade: "Carolina Dieckmann",
    pais: "Amigo da Lucky Trip",
    badge: "Roteiros curados",
    image: require("../assets/images/carol-dieckmann.jpg"),
    cityId: "rio",
    route: "/friend/carolina-dieckmann",
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

export type RoteiroCategory =
  | "passeio"
  | "gastronomia"
  | "cultura"
  | "contemplação"
  | "natureza"
  | "compras"
  | "noite";

export interface RoteiroSlot {
  name:         string;
  category:     RoteiroCategory;
  neighborhood: string;
}

export interface RoteiroDia {
  dia:     number;
  bairro:  string;
  manha?:  RoteiroSlot;
  almoco?: RoteiroSlot;
  tarde?:  RoteiroSlot;
  jantar?: RoteiroSlot;
  noite?:  RoteiroSlot;
}

export interface Roteiro {
  id:         string;
  titulo:     string;
  dias:       string;
  tags:       string[];
  numLugares: number;
  image:      any;
  itinerary:  RoteiroDia[];
}

// ── Deduplication guard ────────────────────────────────────────────────────────
// Runs at module init time. Logs a warning if any place appears more than once
// in the same itinerary (case-insensitive match). numLugares is auto-calculated
// from actual slot count so it always matches the real content.
function buildRoteiro(
  base: Omit<Roteiro, "numLugares" | "itinerary">,
  itinerary: RoteiroDia[],
): Roteiro {
  const seen = new Set<string>();
  for (const dia of itinerary) {
    const slots = [dia.manha, dia.almoco, dia.tarde, dia.jantar, dia.noite];
    for (const slot of slots) {
      if (!slot) continue;
      const key = slot.name.toLowerCase().trim();
      if (seen.has(key) && __DEV__) {
        console.warn(`[Roteiro "${base.titulo}"] Duplicate place detected: "${slot.name}"`);
      }
      seen.add(key);
    }
  }
  const numLugares = itinerary.reduce(
    (acc, d) =>
      acc + [d.manha, d.almoco, d.tarde, d.jantar, d.noite].filter(Boolean).length,
    0,
  );
  return { ...base, numLugares, itinerary };
}

export const roteiros: Roteiro[] = [

  // ── R1: Rio com classe — 3 dias ─────────────────────────────────────────────
  // Theme: premium / arts / gastronomy
  // Flow: Ipanema zone → Santa Teresa → Urca/Botafogo
  // Categories per day: passeio + gastronomia×2 + natureza / cultura×2 + gastronomia + noite /
  //                     passeio + gastronomia + contemplação + gastronomia
  buildRoteiro(
    {
      id:    "r1",
      titulo: "Rio com classe",
      dias:   "3 dias",
      tags:   ["Arte", "Gastronomia"],
      image:  require("../assets/images/hero-rio.png"),
    },
    [
      {
        dia:    1,
        bairro: "Ipanema & Jardim Botânico",
        manha:  { name: "Praia de Ipanema",                  category: "passeio",      neighborhood: "Ipanema" },
        almoco: { name: "Gero",                              category: "gastronomia",  neighborhood: "Ipanema" },
        tarde:  { name: "Jardim Botânico do Rio de Janeiro", category: "natureza",     neighborhood: "Jardim Botânico" },
        jantar: { name: "Oro",                               category: "gastronomia",  neighborhood: "Ipanema" },
      },
      {
        dia:    2,
        bairro: "Santa Teresa & Lapa",
        manha:  { name: "Escadaria Selarón",   category: "cultura",     neighborhood: "Santa Teresa" },
        almoco: { name: "Aprazível",            category: "gastronomia", neighborhood: "Santa Teresa" },
        tarde:  { name: "Museu Chácara do Céu", category: "cultura",    neighborhood: "Santa Teresa" },
        noite:  { name: "Arcos da Lapa",        category: "noite",      neighborhood: "Lapa" },
      },
      {
        dia:    3,
        bairro: "Urca & Botafogo",
        manha:  { name: "Pão de Açúcar",    category: "passeio",      neighborhood: "Urca" },
        almoco: { name: "Bar Urca",         category: "gastronomia",  neighborhood: "Urca" },
        tarde:  { name: "Praia de Botafogo", category: "contemplação", neighborhood: "Botafogo" },
        jantar: { name: "Lasai",            category: "gastronomia",  neighborhood: "Botafogo" },
      },
    ],
  ),

  // ── R2: Rio em família — 5 dias ─────────────────────────────────────────────
  // Theme: beaches / nature / family
  // Flow: Copacabana → Urca → Lagoa/Leblon → Santa Teresa → Barra
  // No place repeats anywhere in the 5-day sequence.
  buildRoteiro(
    {
      id:    "r2",
      titulo: "Rio em família",
      dias:   "5 dias",
      tags:   ["Praia", "Natureza"],
      image:  require("../assets/images/pao-acucar.png"),
    },
    [
      {
        dia:    1,
        bairro: "Copacabana",
        manha:  { name: "Praia de Copacabana", category: "passeio",     neighborhood: "Copacabana" },
        almoco: { name: "Siri Mole & Cia",      category: "gastronomia", neighborhood: "Copacabana" },
        tarde:  { name: "Forte de Copacabana",  category: "cultura",     neighborhood: "Copacabana" },
        jantar: { name: "Churrascaria Palace",  category: "gastronomia", neighborhood: "Copacabana" },
      },
      {
        dia:    2,
        bairro: "Urca & Botafogo",
        manha:  { name: "Bondinho do Pão de Açúcar", category: "passeio",      neighborhood: "Urca" },
        almoco: { name: "Bar Urca",                   category: "gastronomia",  neighborhood: "Urca" },
        tarde:  { name: "Praia de Botafogo",          category: "contemplação", neighborhood: "Botafogo" },
        jantar: { name: "Lasai",                      category: "gastronomia",  neighborhood: "Botafogo" },
      },
      {
        dia:    3,
        bairro: "Lagoa & Leblon",
        manha:  { name: "Lagoa Rodrigo de Freitas", category: "contemplação", neighborhood: "Lagoa" },
        almoco: { name: "Bar Lagoa",                category: "gastronomia",  neighborhood: "Lagoa" },
        tarde:  { name: "Mirante do Leblon",        category: "contemplação", neighborhood: "Leblon" },
        jantar: { name: "Zuka",                     category: "gastronomia",  neighborhood: "Leblon" },
      },
      {
        dia:    4,
        bairro: "Santa Teresa",
        manha:  { name: "Bonde de Santa Teresa",  category: "cultura",     neighborhood: "Santa Teresa" },
        almoco: { name: "Aprazível",               category: "gastronomia", neighborhood: "Santa Teresa" },
        tarde:  { name: "Museu Chácara do Céu",   category: "cultura",     neighborhood: "Santa Teresa" },
        jantar: { name: "Bar dos Descasados",      category: "noite",       neighborhood: "Santa Teresa" },
      },
      {
        dia:    5,
        bairro: "Barra da Tijuca",
        manha:  { name: "Praia da Barra da Tijuca", category: "passeio",     neighborhood: "Barra da Tijuca" },
        almoco: { name: "CT Boucherie",              category: "gastronomia", neighborhood: "Barra da Tijuca" },
        tarde:  { name: "Parque Marapendi",          category: "natureza",    neighborhood: "Barra da Tijuca" },
      },
    ],
  ),

  // ── R3: Rio de fim de semana — 2 dias ───────────────────────────────────────
  // Theme: experiences / nightlife / quick immersion
  // Flow: Arpoador/Ipanema → Centro/Lapa
  buildRoteiro(
    {
      id:    "r3",
      titulo: "Rio de fim de semana",
      dias:   "2 dias",
      tags:   ["Experiências", "Noite"],
      image:  require("../assets/images/lapa.png"),
    },
    [
      {
        dia:    1,
        bairro: "Arpoador & Ipanema",
        manha:  { name: "Pedra do Arpoador",        category: "passeio",      neighborhood: "Arpoador" },
        almoco: { name: "Vegetariano Social Clube",  category: "gastronomia",  neighborhood: "Ipanema" },
        tarde:  { name: "Praia do Leblon",           category: "contemplação", neighborhood: "Leblon" },
        noite:  { name: "Bar dos Descasados",        category: "noite",        neighborhood: "Santa Teresa" },
      },
      {
        dia:    2,
        bairro: "Centro & Lapa",
        manha:  { name: "Museu do Amanhã",     category: "cultura",     neighborhood: "Centro" },
        almoco: { name: "Confeitaria Colombo", category: "gastronomia", neighborhood: "Centro" },
        tarde:  { name: "Escadaria Selarón",   category: "cultura",     neighborhood: "Lapa" },
        noite:  { name: "Arcos da Lapa",       category: "noite",       neighborhood: "Lapa" },
      },
    ],
  ),

  // ── R4: Rio cultural — 3 dias ────────────────────────────────────────────────
  // Theme: history / art / architecture
  // Flow: Centro → Santa Teresa/Lapa → Botafogo/Urca
  buildRoteiro(
    {
      id:    "r4",
      titulo: "Rio cultural",
      dias:   "3 dias",
      tags:   ["Cultura", "História"],
      image:  require("../assets/images/cristo.png"),
    },
    [
      {
        dia:    1,
        bairro: "Centro histórico",
        manha:  { name: "Real Gabinete Português de Leitura", category: "cultura",     neighborhood: "Centro" },
        almoco: { name: "Confeitaria Colombo",                 category: "gastronomia", neighborhood: "Centro" },
        tarde:  { name: "Museu Nacional de Belas Artes",       category: "cultura",     neighborhood: "Centro" },
        jantar: { name: "Cais do Oriente",                     category: "gastronomia", neighborhood: "Centro" },
      },
      {
        dia:    2,
        bairro: "Santa Teresa & Lapa",
        manha:  { name: "Museu Chácara do Céu",  category: "cultura",     neighborhood: "Santa Teresa" },
        almoco: { name: "Aprazível",              category: "gastronomia", neighborhood: "Santa Teresa" },
        tarde:  { name: "Escadaria Selarón",      category: "cultura",     neighborhood: "Lapa" },
        noite:  { name: "Arcos da Lapa",          category: "noite",       neighborhood: "Lapa" },
      },
      {
        dia:    3,
        bairro: "Botafogo & Urca",
        manha:  { name: "Museu Casa de Rui Barbosa", category: "cultura",     neighborhood: "Botafogo" },
        almoco: { name: "Lasai",                      category: "gastronomia", neighborhood: "Botafogo" },
        tarde:  { name: "Museu do Índio",             category: "cultura",     neighborhood: "Botafogo" },
        jantar: { name: "Bar Urca",                   category: "gastronomia", neighborhood: "Urca" },
      },
    ],
  ),
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
