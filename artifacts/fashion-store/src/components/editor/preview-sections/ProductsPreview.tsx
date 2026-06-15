import { PreviewSectionProps } from "./types";

export function ProductsPreview({
  section,
  t,
  p,
  r,
  wrap,
}: PreviewSectionProps) {
  const count = Math.min(section.settings.productCount ?? 4, 4);
  return wrap(
    <div className="px-6 py-8" style={{ background: "var(--bg-main, #faf7f4)" }}>
      <div className="text-center mb-6">
        <p
          className="text-[10px] tracking-widest uppercase mb-1 font-medium"
          style={{ color: p, fontFamily: "var(--font-body)" }}
        >
          {section.type === "new-arrivals"
            ? t("sectionPreview.defaults.newArrivalTag")
            : t("sectionPreview.defaults.popularTag")}
        </p>
        <h3
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
        >
          {section.content.heading}
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--text-body, #78716c)", fontFamily: "var(--font-body)" }}>
          {section.content.subheading}
        </p>
      </div>
      <div
        className="grid grid-cols-4 gap-3"
        style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden border"
            style={{ borderRadius: "var(--card-radius, 12px)", background: "var(--bg-card, #fff)", borderColor: "var(--border-color, #e5e7eb)" }}
          >
            <div
              className="aspect-[3/4]"
              style={{ background: `${p}15` }}
            />
            <div className="p-2">
              <div className="h-2 rounded mb-1 w-3/4" style={{ background: "var(--border-color, #e5e7eb)" }} />
              <div
                className="h-2 rounded w-1/2"
                style={{ background: `${p}40` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>,
  );
}
