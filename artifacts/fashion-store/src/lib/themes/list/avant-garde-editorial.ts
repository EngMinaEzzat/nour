import type { VisualTheme } from "../types";

export const avantGardeEditorialTheme: VisualTheme = {
    id: "avant-garde-editorial",
    nameKey: "Avant Garde",
    descKey: "High fashion editorial",
    emoji: "⬛",
    gradient: "from-black to-blue-800",
    preview: { bg: "#ffffff", accent: "#000000", text: "#000000" },
    theme: {
      primaryColor: "#000000",
      secondaryColor: "#0014ff",
      fontPairing: "sans-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "none" as const,
      pageWidth: "wide" as const,
      cardShadow: "none" as const,
    },
    imagePrefix: "avant-garde",
};
