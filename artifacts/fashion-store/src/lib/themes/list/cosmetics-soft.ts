import type { VisualTheme } from "../types";

export const cosmeticsSoftTheme: VisualTheme = {
    id: "cosmetics-soft",
    nameKey: "editorSidebar.themePanel.presets.softCosmetics.name",
    descKey: "editorSidebar.themePanel.presets.softCosmetics.desc",
    emoji: "✨",
    gradient: "from-rose-200 to-pink-300",
    preview: { bg: "#fff0f3", accent: "#d4a373", text: "#4a3b32" },
    theme: {
      primaryColor: "#d4a373",
      secondaryColor: "#e6ccb2",
      fontPairing: "serif-sans" as const,
      buttonStyle: "pill" as const,
      radius: 16,
      animationLevel: "subtle" as const,
      pageWidth: "contained" as const,
      cardShadow: "soft" as const,
    },
    imagePrefix: "cosmetics",
};
