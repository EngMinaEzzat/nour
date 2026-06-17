import type { VisualTheme } from "../types";

export const royalVelvetTheme: VisualTheme = {
    id: "royal-velvet",
    nameKey: "Royal Velvet",
    descKey: "Deep rich velvet",
    emoji: "👑",
    gradient: "from-green-900 to-yellow-600",
    preview: { bg: "#013220", accent: "#d4af37", text: "#ffffff" },
    theme: {
      primaryColor: "#d4af37",
      secondaryColor: "#013220",
      fontPairing: "serif-serif" as const,
      buttonStyle: "rounded" as const,
      radius: 8,
      animationLevel: "subtle" as const,
      pageWidth: "contained" as const,
      cardShadow: "soft" as const,
    },
    imagePrefix: "imperial",
};
