import { PreviewSectionProps } from "./types";
import { normalizeStoredImageUrl } from "@/lib/image-url";

export function HeroPreview({
  section,
  theme,
  brand,
  t,
  i18n,
  p,
  wrap,
}: PreviewSectionProps) {
  const height =
    section.settings.height === "short"
      ? 160
      : section.settings.height === "medium"
        ? 240
        : section.settings.height === "full"
          ? 340
          : 280;
  const align = section.settings.textAlign ?? "right";
  const overlay = (section.settings.overlayOpacity ?? 40) / 100;
  const defaultHero =
    brand.category === "cosmetics" || brand.category === "both"
      ? "/hero-cosmetics-optimized.jpg"
      : "/hero-fashion-optimized.jpg";
  const heroImageUrl =
    normalizeStoredImageUrl(section.content.imageUrl) ||
    normalizeStoredImageUrl(brand.coverUrl) ||
    defaultHero;

  return wrap(
    <div
      className="relative overflow-hidden flex items-center"
      style={{
        height,
        backgroundImage: `url("${heroImageUrl}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${overlay})` }}
      />
      <div className={`relative z-10 px-8 py-6 w-full text-${align}`}>
        <p className="text-white text-[10px] font-medium mb-1 opacity-80 tracking-widest uppercase" style={{ fontFamily: "var(--font-body)" }}>
          {brand.name}
        </p>
        <h2
          className="text-white text-xl font-bold mb-2 leading-tight"
          style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)" }}
        >
          {section.content.heading ?? t("sectionPreview.defaults.heroHeading")}
        </h2>
        <p className="text-white/80 text-xs mb-4" style={{ fontFamily: "var(--font-body)" }}>
          {section.content.subheading ??
            t("sectionPreview.defaults.heroSubheading")}
        </p>
        <div
          className={`flex gap-2 ${align === "center" ? "justify-center" : align === "left" ? (i18n.dir() === "rtl" ? "justify-end" : "justify-start") : i18n.dir() === "rtl" ? "justify-start" : "justify-end"}`}
        >
          <span
            className="text-white text-xs px-4 py-1.5 font-medium"
            style={{
              background: p,
              borderRadius: "var(--btn-radius, 9999px)",
              fontFamily: "var(--font-body)",
            }}
          >
            {section.content.ctaText ?? t("sectionPreview.defaults.heroCta")}
          </span>
          <span
            className="text-white text-xs px-4 py-1.5 font-medium border border-white/60"
            style={{
              borderRadius: "var(--btn-radius, 9999px)",
              fontFamily: "var(--font-body)",
            }}
          >
            {t("sectionPreview.defaults.heroNewArrival")}
          </span>
        </div>
      </div>
    </div>,
  );
}
