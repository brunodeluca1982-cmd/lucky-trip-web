/**
 * Shared content for the "O que fazer agora" feature.
 *
 * Imported by:
 *  – app/cidade/[id].tsx   → derive the "Agora no …" button label + pinnedId
 *  – app/agoraNoRio/[id].tsx → render content, pin the hero item
 *
 * placeId: if set, the detail page `/lugar/{city}/{placeId}` exists and the
 *   card will navigate there. If undefined the card is still shown but
 *   tapping does nothing (future: link when place is added).
 */

import { ImageSourcePropType } from "react-native";
import { Periodo } from "@/data/mockData";
import { getNeighborhoodImage } from "@/data/neighborhoodImages";

export interface AgoraItem {
  id: string;
  titulo: string;
  localizacao: string;
  tag: string;
  descricao: string;
  image: ImageSourcePropType | null;
  placeId?: string;
}

export interface DestaquePick {
  titulo: string;
  localizacao: string;
  tag: string;
  image: ImageSourcePropType | null;
}

export const AGORA_CONTENT: Record<string, Record<Periodo, AgoraItem[]>> = {
  rio: {
    manha: [
      {
        id: "m1",
        titulo: "Praia de Ipanema",
        localizacao: "Ipanema",
        tag: "Praia",
        descricao:
          "O amanhecer mais bonito do Brasil — mar calmo, areia limpa e a cidade acordando devagar.",
        image: getNeighborhoodImage("Ipanema"),
        placeId: "1",
      },
      {
        id: "m2",
        titulo: "Caminhada ao Cristo",
        localizacao: "Cosme Velho",
        tag: "Natureza",
        descricao:
          "Vista de 360° antes do calor. O trilho sobe pela mata atlântica com sombra e frescor.",
        image: getNeighborhoodImage("Corcovado"),
        placeId: "2",
      },
      {
        id: "m3",
        titulo: "Café na Colombo",
        localizacao: "Centro Histórico",
        tag: "Cultura",
        descricao:
          "Brunch dentro do art nouveau mais bonito do Rio. Café coado, croissant e décadas de história.",
        image: getNeighborhoodImage("Centro"),
      },
    ],
    tarde: [
      {
        id: "t1",
        titulo: "Pão de Açúcar",
        localizacao: "Urca",
        tag: "Mirante",
        descricao:
          "Vista panorâmica ao entardecer — a hora certa de subir de bondinho.",
        image: getNeighborhoodImage("Urca"),
        placeId: "3",
      },
      {
        id: "t2",
        titulo: "Escadaria Selarón",
        localizacao: "Lapa",
        tag: "Arte",
        descricao:
          "O mosaico mais icônico do Brasil, com azulejos de mais de 60 países.",
        image: getNeighborhoodImage("Lapa"),
        placeId: "5",
      },
      {
        id: "t3",
        titulo: "Santa Teresa",
        localizacao: "Santa Teresa",
        tag: "Bairro",
        descricao:
          "Galerias, bistrôs e charme colonial no bairro mais bohémio do Rio.",
        image: getNeighborhoodImage("Santa Teresa"),
        placeId: "7",
      },
    ],
    noite: [
      {
        id: "n1",
        titulo: "Beco das Sardinhas",
        localizacao: "Centro",
        tag: "Gastronomia",
        descricao:
          "Petiscos, chopp e a animação carioca mais autêntica do centro histórico.",
        image: getNeighborhoodImage("Centro"),
        placeId: "4",
      },
      {
        id: "n2",
        titulo: "Oro Restaurant",
        localizacao: "Leblon",
        tag: "Fine Dining",
        descricao:
          "Uma estrela Michelin com menu autoral e vista para o Leblon ao entardecer.",
        image: getNeighborhoodImage("Leblon"),
      },
      {
        id: "n3",
        titulo: "Arcos da Lapa",
        localizacao: "Lapa",
        tag: "Vida Noturna",
        descricao:
          "Samba ao vivo, choperia aberta e a energia que fez a Lapa famosa no mundo.",
        image: getNeighborhoodImage("Lapa"),
      },
    ],
  },
};

export const FALLBACK_CONTENT: Record<Periodo, AgoraItem[]> = {
  manha: [
    {
      id: "g-m1",
      titulo: "Café da manhã local",
      localizacao: "Centro",
      tag: "Cultura",
      descricao: "Comece o dia com sabores da cidade.",
      image: getNeighborhoodImage("Centro"),
    },
  ],
  tarde: [
    {
      id: "g-t1",
      titulo: "Passeio pelo centro",
      localizacao: "Centro",
      tag: "Cultura",
      descricao: "A melhor hora para explorar a cidade.",
      image: getNeighborhoodImage("Centro"),
    },
  ],
  noite: [
    {
      id: "g-n1",
      titulo: "Jantar com vista",
      localizacao: "Centro",
      tag: "Gastronomia",
      descricao: "Encerre o dia com sabor.",
      image: getNeighborhoodImage("Centro"),
    },
  ],
};

export const DESTAQUE_PRINCIPAL: Record<Periodo, DestaquePick[]> = {
  manha: [
    {
      titulo: "Hotel Santa Teresa",
      localizacao: "Santa Teresa",
      tag: "Hospedagem",
      image: getNeighborhoodImage("Santa Teresa"),
    },
    {
      titulo: "Parque Lage",
      localizacao: "Jardim Botânico",
      tag: "Natureza",
      image: getNeighborhoodImage("Jardim Botânico"),
    },
  ],
  tarde: [
    {
      titulo: "Confeitaria Colombo",
      localizacao: "Centro",
      tag: "Gastronomia",
      image: getNeighborhoodImage("Centro"),
    },
    {
      titulo: "Copacabana Palace",
      localizacao: "Copacabana",
      tag: "Luxo",
      image: getNeighborhoodImage("Copacabana"),
    },
  ],
  noite: [
    {
      titulo: "Mirante do Leblon",
      localizacao: "Leblon",
      tag: "Vista",
      image: getNeighborhoodImage("Leblon"),
    },
    {
      titulo: "Pôr do sol Arpoador",
      localizacao: "Arpoador",
      tag: "Ritual",
      image: getNeighborhoodImage("Arpoador"),
    },
  ],
};
