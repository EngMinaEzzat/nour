import type { VisualTheme } from "../types";

export const premiumOccasionTheme: VisualTheme = {
    id: "premium-occasion",
    nameKey: "editorSidebar.themePanel.presets.luxuryEvents.name",
    descKey: "editorSidebar.themePanel.presets.luxuryEvents.desc",
    emoji: "👑",
    gradient: "from-rose-800 to-stone-900",
    preview: { bg: "#fdfbf7", accent: "#8B1A35", text: "#1a0a0e" },
    theme: {
      primaryColor: "#8B1A35",
      secondaryColor: "#c8963a",
      fontPairing: "serif-serif" as const,
      buttonStyle: "rounded" as const,
      radius: 8,
      animationLevel: "subtle" as const,
      pageWidth: "contained" as const,
      cardShadow: "soft" as const,
    },
    imagePrefix: "imperial",
};
