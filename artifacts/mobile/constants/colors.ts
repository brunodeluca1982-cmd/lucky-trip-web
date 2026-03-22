const brand = {
  cream: "#F5F0E8",
  warmBeige: "#EDE8DC",
  sand: "#D4C9B0",
  terracotta: "#C4704A",
  darkBrown: "#2C1810",
  charcoal: "#3D3530",
  warmGray: "#8A7F74",
  lightGray: "#E8E2D8",
  gold: "#C9A84C",
  forestGreen: "#2D5A3D",
  white: "#FFFFFF",
  overlayDark: "rgba(0,0,0,0.45)",
  overlayLight: "rgba(255,255,255,0.12)",
};

export default {
  light: {
    text: brand.darkBrown,
    textSecondary: brand.charcoal,
    textMuted: brand.warmGray,
    background: brand.cream,
    backgroundSecondary: brand.warmBeige,
    border: brand.lightGray,
    tint: brand.terracotta,
    gold: brand.gold,
    green: brand.forestGreen,
    tabIconDefault: brand.warmGray,
    tabIconSelected: brand.terracotta,
    card: brand.white,
    overlay: brand.overlayDark,
    ...brand,
  },
};
