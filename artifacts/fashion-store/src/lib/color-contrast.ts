export type ContrastLevel = "pass" | "warning" | "fail";

function expandHex(hex: string) {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return clean.split("").map((ch) => ch + ch).join("");
  }
  return clean.padEnd(6, "0").slice(0, 6);
}

function channelToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const expanded = expandHex(hex);
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

export function contrastRatio(foreground: string, background = "#ffffff") {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastStatus(foreground: string, background = "#ffffff"): {
  level: ContrastLevel;
  ratio: number;
} {
  const ratio = contrastRatio(foreground, background);
  if (ratio >= 4.5) return { level: "pass", ratio };
  if (ratio >= 3) return { level: "warning", ratio };
  return { level: "fail", ratio };
}
