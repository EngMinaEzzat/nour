import type { VisualTheme } from "../types";

export const cloudGlowTheme: VisualTheme = {
    id: "cloud-glow",
    nameKey: "Cloud Glow",
    descKey: "Dewy skin aesthetics",
    emoji: "💧",
    gradient: "from-blue-100 to-pink-100",
    preview: { bg: "#f0f8ff", accent: "#87ceeb", text: "#333333" },
    theme: {
      primaryColor: "#87ceeb",
      secondaryColor: "#ffe4e1",
      fontPairing: "sans-sans" as const,
      buttonStyle: "rounded" as const,
      radius: 12,
      animationLevel: "subtle" as const,
      pageWidth: "wide" as const,
      cardShadow: "none" as const,
    },
    imagePrefix: "cloud",
};
