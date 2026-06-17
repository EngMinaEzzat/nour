import type { VisualTheme } from "../types";

export const boldStreetwearTheme: VisualTheme = {
    id: "bold-streetwear",
    nameKey: "editorSidebar.themePanel.presets.streetWear.name",
    descKey: "editorSidebar.themePanel.presets.streetWear.desc",
    emoji: "🔥",
    gradient: "from-orange-500 to-red-600",
    preview: { bg: "#f8f9fa", accent: "#ff4500", text: "#111111" },
    theme: {
      primaryColor: "#ff4500",
      secondaryColor: "#111111",
      fontPairing: "sans-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "lively" as const,
      pageWidth: "wide" as const,
      cardShadow: "strong" as const,
    },
    imagePrefix: "streetwear",
};
