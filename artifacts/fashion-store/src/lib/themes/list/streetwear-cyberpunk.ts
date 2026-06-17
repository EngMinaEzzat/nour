import type { VisualTheme } from "../types";

export const streetwearCyberpunkTheme: VisualTheme = {
    id: "streetwear-cyberpunk",
    nameKey: "Streetwear Cyberpunk",
    descKey: "Bold neon and dark vibes",
    emoji: "⚡",
    gradient: "from-green-400 to-black",
    preview: { bg: "#0f0f0f", accent: "#39ff14", text: "#ffffff" },
    theme: {
      primaryColor: "#39ff14",
      secondaryColor: "#0f0f0f",
      fontPairing: "sans-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "lively" as const,
      pageWidth: "wide" as const,
      cardShadow: "strong" as const,
    },
    imagePrefix: "streetwear",
};
