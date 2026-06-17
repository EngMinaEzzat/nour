import type { VisualTheme } from "../types";

export const etherealMinimalTheme: VisualTheme = {
    id: "ethereal-minimal",
    nameKey: "Ethereal Minimal",
    descKey: "Pure and angelic",
    emoji: "🕊️",
    gradient: "from-gray-100 to-white",
    preview: { bg: "#ffffff", accent: "#dcdcdc", text: "#222222" },
    theme: {
      primaryColor: "#dcdcdc",
      secondaryColor: "#f0f8ff",
      fontPairing: "serif-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "none" as const,
      pageWidth: "contained" as const,
      cardShadow: "none" as const,
    },
    imagePrefix: "ethereal",
};
