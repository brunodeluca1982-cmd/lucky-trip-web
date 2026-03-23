/**
 * Shared place data + neighborhood zone system.
 *
 * Imported by both the list screen (oQueFazer) and the place detail screen.
 * Zone coordinates are visual percentages over the illustrated map image —
 * not geographic. No lat/lng, no map provider.
 */

import { ImageSourcePropType } from "react-native";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LugarPlace {
  id: string;
  titulo: string;
  localizacao: string; // bairro — used to look up zone
  categoria: string;
  descricao: string;
  image: ImageSourcePropType;
  preco?: string;
  xPct: number;
  yPct: number;
}

// ── Neighborhood zone table ───────────────────────────────────────────────────
// Each zone is a visual bounding box (% of image width/height) on the
// illustrated map. Pins land at the zone center with offsets for multiples.

interface Zone {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
}
type ZoneMap = Record<string, Zone>;

const RIO_ZONES: ZoneMap = {
  // Beaches
  "Barra da Tijuca":    { xMin:  4, xMax: 23, yMin: 66, yMax: 80 },
  "São Conrado":        { xMin: 22, xMax: 33, yMin: 71, yMax: 83 },
  "Leblon":             { xMin: 35, xMax: 45, yMin: 67, yMax: 77 },
  "Ipanema":            { xMin: 43, xMax: 53, yMin: 67, yMax: 77 },
  "Arpoador":           { xMin: 52, xMax: 58, yMin: 71, yMax: 79 },
  "Copacabana":         { xMin: 57, xMax: 67, yMin: 67, yMax: 77 },
  "Leme":               { xMin: 65, xMax: 72, yMin: 64, yMax: 74 },
  // Mountains & parks
  "Corcovado":          { xMin: 31, xMax: 42, yMin: 19, yMax: 34 },
  "Floresta da Tijuca": { xMin: 13, xMax: 27, yMin: 21, yMax: 38 },
  "Pedra da Gávea":     { xMin: 29, xMax: 38, yMin: 57, yMax: 70 },
  "Morro Dois Irmãos":  { xMin: 32, xMax: 40, yMin: 53, yMax: 64 },
  // Zona Sul
  "Urca":               { xMin: 74, xMax: 88, yMin: 47, yMax: 62 },
  "Botafogo":           { xMin: 54, xMax: 66, yMin: 41, yMax: 54 },
  "Flamengo":           { xMin: 63, xMax: 72, yMin: 41, yMax: 52 },
  "Catete":             { xMin: 64, xMax: 72, yMin: 36, yMax: 46 },
  "Glória":             { xMin: 65, xMax: 73, yMin: 31, yMax: 42 },
  "Jardim Botânico":    { xMin: 42, xMax: 51, yMin: 51, yMax: 63 },
  "Lagoa":              { xMin: 47, xMax: 56, yMin: 53, yMax: 65 },
  "Gávea":              { xMin: 41, xMax: 50, yMin: 42, yMax: 54 },
  "Laranjeiras":        { xMin: 58, xMax: 67, yMin: 35, yMax: 46 },
  // Santa Teresa & Lapa
  "Santa Teresa":       { xMin: 50, xMax: 61, yMin: 24, yMax: 36 },
  "Lapa":               { xMin: 58, xMax: 68, yMin: 34, yMax: 46 },
  // Centro
  "Centro":             { xMin: 71, xMax: 83, yMin: 17, yMax: 30 },
  "Saúde":              { xMin: 74, xMax: 83, yMin: 13, yMax: 23 },
  "Gamboa":             { xMin: 73, xMax: 81, yMin: 15, yMax: 24 },
  // Zona Norte
  "Maracanã":           { xMin: 46, xMax: 57, yMin: 12, yMax: 24 },
  "Tijuca":             { xMin: 39, xMax: 50, yMin: 15, yMax: 27 },
  "São Cristóvão":      { xMin: 58, xMax: 70, yMin: 17, yMax: 28 },
  // Zona Oeste
  "Recreio":            { xMin:  1, xMax: 10, yMin: 60, yMax: 72 },
  "Parque Olímpico":    { xMin:  6, xMax: 16, yMin: 50, yMax: 63 },
};

const ZONE_OFFSETS = [
  { dx:  0.00, dy:  0.00 },
  { dx:  0.28, dy: -0.20 },
  { dx: -0.28, dy:  0.20 },
  { dx:  0.28, dy:  0.22 },
  { dx: -0.28, dy: -0.22 },
  { dx:  0.00, dy:  0.28 },
];

export function resolvePin(
  cityId: string,
  bairro: string,
  indexInZone: number,
): { xPct: number; yPct: number } {
  const zones: ZoneMap = RIO_ZONES;
  const z = zones[bairro] ?? { xMin: 45, xMax: 55, yMin: 45, yMax: 55 };
  const cx = (z.xMin + z.xMax) / 2;
  const cy = (z.yMin + z.yMax) / 2;
  const zw = z.xMax - z.xMin;
  const zh = z.yMax - z.yMin;
  const off = ZONE_OFFSETS[indexInZone % ZONE_OFFSETS.length];
  return {
    xPct: Math.round(cx + off.dx * zw),
    yPct: Math.round(cy + off.dy * zh),
  };
}

// ── Place data by city and category ──────────────────────────────────────────
// "o_que_fazer" → O que fazer screen
// "comer"       → Comer bem screen (future)
// "ficar"       → Ficar bem screen (future)

export const LUGARES_O_QUE_FAZER: Record<string, LugarPlace[]> = {
  rio: [
    {
      id: "1",
      titulo: "Praia de Ipanema",
      localizacao: "Ipanema",
      categoria: "EXPERIÊNCIA",
      descricao:
        "O encontro perfeito entre o mar e a alma carioca. Cheia de vida do nascer ao pôr do sol.",
      image: require("../assets/images/ipanema.png"),
      ...resolvePin("rio", "Ipanema", 0),
    },
    {
      id: "2",
      titulo: "Cristo Redentor",
      localizacao: "Corcovado",
      categoria: "MONUMENTO",
      descricao:
        "A sétima maravilha do mundo moderna abraça o Rio de braços abertos. A vista do topo para a Guanabara é inesquecível.",
      image: require("../assets/images/cristo.png"),
      ...resolvePin("rio", "Corcovado", 0),
    },
    {
      id: "3",
      titulo: "Pão de Açúcar",
      localizacao: "Urca",
      categoria: "EXPERIÊNCIA",
      descricao:
        "Dois picos, dois bondilhos e uma das vistas mais dramáticas do planeta. O Rio em panorama completo.",
      image: require("../assets/images/pao-acucar.png"),
      ...resolvePin("rio", "Urca", 0),
    },
    {
      id: "4",
      titulo: "Beco das Sardinhas",
      localizacao: "Centro",
      categoria: "SEGREDO LOCAL",
      descricao:
        "Ruelas históricas onde cariocas se reúnem ao pôr do sol para petiscos e cerveja gelada.",
      image: require("../assets/images/secret1.png"),
      ...resolvePin("rio", "Centro", 0),
    },
    {
      id: "5",
      titulo: "Escadaria Selarón",
      localizacao: "Lapa",
      categoria: "ARTE & CULTURA",
      descricao:
        "Mosaico de azulejos de mais de 60 países, criado por Jorge Selarón ao longo de décadas.",
      image: require("../assets/images/secret2.png"),
      ...resolvePin("rio", "Lapa", 0),
    },
  ],
};

export function getLugar(
  cityId: string,
  placeId: string,
): LugarPlace | undefined {
  return LUGARES_O_QUE_FAZER[cityId]?.find((p) => p.id === placeId);
}
