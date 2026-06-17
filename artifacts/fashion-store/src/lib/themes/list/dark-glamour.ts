import type { VisualTheme } from "../types";

export const darkGlamourTheme: VisualTheme = {
    id: "dark-glamour",
    nameKey: "Dark Glamour",
    descKey: "Luxurious dark mode",
    emoji: "🖤",
    gradient: "from-gray-900 to-black",
    preview: { bg: "#1a0000", accent: "#d4af37", text: "#ffffff" },
    theme: {
      primaryColor: "#d4af37",
      secondaryColor: "#1a0000",
      fontPairing: "serif-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "subtle" as const,
      pageWidth: "contained" as const,
      cardShadow: "strong" as const,
    },
    imagePrefix: "glamour",
};
