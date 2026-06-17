import type { VisualTheme } from "../types";

export const bohoChicTheme: VisualTheme = {
    id: "boho-chic",
    nameKey: "Boho Chic",
    descKey: "Warm earthy tones",
    emoji: "🌿",
    gradient: "from-orange-300 to-amber-600",
    preview: { bg: "#faf3e0", accent: "#e2725b", text: "#4a3b32" },
    theme: {
      primaryColor: "#e2725b",
      secondaryColor: "#d4a373",
      fontPairing: "serif-sans" as const,
      buttonStyle: "rounded" as const,
      radius: 12,
      animationLevel: "subtle" as const,
      pageWidth: "contained" as const,
      cardShadow: "soft" as const,
    },
    imagePrefix: "boho",
};
