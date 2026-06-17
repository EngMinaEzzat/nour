import type { VisualTheme } from "../types";

export const minimalBoutiqueTheme: VisualTheme = {
    id: "minimal-boutique",
    nameKey: "editorSidebar.themePanel.presets.simpleBoutique.name",
    descKey: "editorSidebar.themePanel.presets.simpleBoutique.desc",
    emoji: "🤍",
    gradient: "from-stone-200 to-stone-400",
    preview: { bg: "#fafafa", accent: "#000000", text: "#111111" },
    theme: {
      primaryColor: "#000000",
      secondaryColor: "#777777",
      fontPairing: "sans-sans" as const,
      buttonStyle: "rounded" as const,
      radius: 6,
      animationLevel: "none" as const,
      pageWidth: "contained" as const,
      cardShadow: "none" as const,
    },
  };
