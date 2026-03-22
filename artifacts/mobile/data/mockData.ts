export const heroDestinos = [
  {
    id: "1",
    cidade: "Rio de Janeiro",
    pais: "Brasil",
    badge: "Confira as novidades",
    image: require("../assets/images/hero-rio.png"),
  },
  {
    id: "2",
    cidade: "Santorini",
    pais: "Grécia",
    badge: "Destaque da semana",
    image: require("../assets/images/hero-santorini.png"),
  },
  {
    id: "3",
    cidade: "Kyoto",
    pais: "Japão",
    badge: "Experiência única",
    image: require("../assets/images/hero-kyoto.png"),
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
    image: require("../assets/images/ipanema.png"),
  },
  {
    id: "2",
    titulo: "Confeitaria Colombo",
    localizacao: "Centro Histórico",
    descricao: "Um século de elegância servido em cada xícara.",
    tipo: "restaurante" as DestaqueType,
    image: require("../assets/images/restaurante1.png"),
  },
  {
    id: "3",
    titulo: "Copacabana Palace",
    localizacao: "Copacabana",
    descricao: "O endereço mais icônico do Rio, com vista para o mar.",
    tipo: "hotel" as DestaqueType,
    image: require("../assets/images/hotel1.png"),
  },
  {
    id: "4",
    titulo: "Escadaria Selarón",
    localizacao: "Lapa",
    descricao: "Arte viva em cada azulejo, curada por décadas de paixão.",
    tipo: "lucky" as DestaqueType,
    image: require("../assets/images/secret2.png"),
  },
];

export const oQueFazer = [
  {
    id: "1",
    titulo: "Praia de Ipanema",
    localizacao: "Ipanema",
    image: require("../assets/images/ipanema.png"),
  },
  {
    id: "2",
    titulo: "Escadaria Selarón",
    localizacao: "Lapa",
    image: require("../assets/images/secret2.png"),
  },
  {
    id: "3",
    titulo: "Arcos da Lapa",
    localizacao: "Lapa",
    image: require("../assets/images/lapa.png"),
  },
];

export const restaurantes = [
  {
    id: "1",
    nome: "Confeitaria Colombo",
    bairro: "Centro",
    categoria: "Café / Histórico",
    image: require("../assets/images/restaurante1.png"),
  },
  {
    id: "2",
    nome: "Oro Restaurant",
    bairro: "Leblon",
    categoria: "Contemporâneo",
    image: require("../assets/images/restaurante2.png"),
  },
];

export const hoteis = [
  {
    id: "1",
    nome: "Copacabana Palace",
    localizacao: "Copacabana",
    tipo: "Luxo",
    image: require("../assets/images/hotel1.png"),
  },
  {
    id: "2",
    nome: "Santa Teresa Hotel",
    localizacao: "Santa Teresa",
    tipo: "Boutique",
    image: require("../assets/images/hotel2.png"),
  },
];

export const segredos = [
  {
    id: "1",
    titulo: "Beco das Sardinhas",
    localizacao: "Centro",
    descricao: "Ruelas históricas onde cariocas se reúnem ao pôr do sol para petiscos e cerveja.",
    image: require("../assets/images/secret1.png"),
  },
  {
    id: "2",
    titulo: "Mirante Dona Marta",
    localizacao: "Botafogo",
    descricao: "Vista panorâmica do Rio sem as multidões do Corcovado — o segredo dos cariocas.",
    image: require("../assets/images/lapa.png"),
  },
  {
    id: "3",
    titulo: "Escadaria Selarón",
    localizacao: "Lapa",
    descricao: "Mosaico de azulejos de mais de 60 países, criado por Jorge Selarón ao longo de décadas.",
    image: require("../assets/images/secret2.png"),
  },
];
