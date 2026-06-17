import type { VisualTheme } from "../types";

export const elegantFashionTheme: VisualTheme = {
    id: "elegant-fashion",
    nameKey: "editorSidebar.themePanel.presets.elegantFashion.name",
    descKey: "editorSidebar.themePanel.presets.elegantFashion.desc",
    emoji: "👗",
    gradient: "from-stone-800 to-black",
    preview: { bg: "#fdfbf7", accent: "#1a1a1a", text: "#1a1a1a" },
    theme: {
      primaryColor: "#1a1a1a",
      secondaryColor: "#888888",
      fontPairing: "serif-sans" as const,
      buttonStyle: "square" as const,
      radius: 0,
      animationLevel: "subtle" as const,
      pageWidth: "wide" as const,
      cardShadow: "none" as const,
    },
    imagePrefix: "fashion",
};
