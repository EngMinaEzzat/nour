import type { ThemeConfig } from "../store-config";

export interface VisualTheme {
  id: string;
  nameKey: string;
  descKey: string;
  emoji: string;
  gradient: string;
  preview: { bg: string; accent: string; text: string };
  theme: Partial<ThemeConfig>;
  imagePrefix?: string;
}
