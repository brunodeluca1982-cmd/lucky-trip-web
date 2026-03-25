const brand = {
  cream:        "#FFFFFF",
  warmBeige:    "rgba(255,255,255,0.85)",
  sand:         "rgba(255,255,255,0.55)",
  terracotta:   "#D4AF37",
  darkBrown:    "#000000",
  charcoal:     "rgba(255,255,255,0.70)",
  warmGray:     "rgba(255,255,255,0.45)",
  lightGray:    "rgba(255,255,255,0.15)",
  gold:         "#D4AF37",
  forestGreen:  "#2D5A3D",
  white:        "#FFFFFF",
  overlayDark:  "rgba(0,0,0,0.45)",
  overlayLight: "rgba(255,255,255,0.08)",
};

export default {
  light: {
    text:                "#FFFFFF",
    textSecondary:       "rgba(255,255,255,0.80)",
    textMuted:           "rgba(255,255,255,0.45)",
    background:          "transparent",
    backgroundSecondary: "rgba(255,255,255,0.06)",
    border:              "rgba(255,255,255,0.15)",
    tint:                "#D4AF37",
    gold:                "#D4AF37",
    green:               "#2D5A3D",
    tabIconDefault:      "rgba(255,255,255,0.45)",
    tabIconSelected:     "#D4AF37",
    card:                "rgba(255,255,255,0.08)",
    overlay:             "rgba(0,0,0,0.45)",
    ...brand,
  },
};
