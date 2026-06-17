import type { VisualTheme } from "../types";

export const imperialChicTheme: VisualTheme = {
    id: "imperial-chic",
    nameKey: "editorSidebar.themePanel.themes.imperialChic.name",
    descKey: "editorSidebar.themePanel.themes.imperialChic.desc",
    emoji: "🏛️",
    gradient: "from-red-900 to-yellow-600",
    preview: { bg: "#fdfbf7", accent: "#800020", text: "#111111" },
    theme: {
      primaryColor: "#800020",
      secondaryColor: "#cfb53b",
      fontPairing: "serif-serif",
      buttonStyle: "rounded",
      radius: 12,
      animationLevel: "subtle",
      pageWidth: "contained",
      cardShadow: "soft",
    },
    imagePrefix: "imperial",
  };
