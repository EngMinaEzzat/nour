import type { VisualTheme } from "../types";

export const dynamicActiveTheme: VisualTheme = {
    id: "dynamic-active",
    nameKey: "Dynamic Active",
    descKey: "High energy sports",
    emoji: "🏃",
    gradient: "from-red-500 to-orange-500",
    preview: { bg: "#ffffff", accent: "#ff4500", text: "#111111" },
    theme: {
      primaryColor: "#ff4500",
      secondaryColor: "#2b2b2b",
      fontPairing: "sans-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "lively" as const,
      pageWidth: "wide" as const,
      cardShadow: "none" as const,
    },
    imagePrefix: "active",
};
