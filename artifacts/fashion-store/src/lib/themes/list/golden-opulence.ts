import type { VisualTheme } from "../types";

export const goldenOpulenceTheme: VisualTheme = {
    id: "golden-opulence",
    nameKey: "Golden Opulence",
    descKey: "Pure luxury",
    emoji: "✨",
    gradient: "from-yellow-400 to-yellow-600",
    preview: { bg: "#111111", accent: "#ffd700", text: "#ffffff" },
    theme: {
      primaryColor: "#ffd700",
      secondaryColor: "#ffffff",
      fontPairing: "serif-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "subtle" as const,
      pageWidth: "wide" as const,
      cardShadow: "none" as const,
    },
    imagePrefix: "imperial",
};
