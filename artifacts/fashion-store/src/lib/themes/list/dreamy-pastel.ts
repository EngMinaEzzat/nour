import type { VisualTheme } from "../types";

export const dreamyPastelTheme: VisualTheme = {
    id: "dreamy-pastel",
    nameKey: "Dreamy Pastel",
    descKey: "Soft and dreamy",
    emoji: "☁️",
    gradient: "from-pink-200 to-purple-200",
    preview: { bg: "#fff5f8", accent: "#ffb6c1", text: "#555555" },
    theme: {
      primaryColor: "#ffb6c1",
      secondaryColor: "#e6e6fa",
      fontPairing: "sans-sans" as const,
      buttonStyle: "pill" as const,
      radius: 20,
      animationLevel: "subtle" as const,
      pageWidth: "contained" as const,
      cardShadow: "soft" as const,
    },
    imagePrefix: "dreamy",
};
