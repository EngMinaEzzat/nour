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
    <div className="bg-[#faf7f4] px-6 py-8">
      <div className="text-center mb-6">
        <p
          className="text-[10px] tracking-widest uppercase mb-1"
          style={{ color: p }}
        >
          {section.type === "new-arrivals"
            ? t("sectionPreview.defaults.newArrivalTag")
            : t("sectionPreview.defaults.popularTag")}
        </p>
        <h3
          className="text-lg font-semibold text-stone-900"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {section.content.heading}
        </h3>
        <p className="text-xs text-stone-400 mt-1">
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
            className="bg-white overflow-hidden"
            style={{ borderRadius: r }}
          >
            <div
              className="aspect-[3/4] bg-stone-100"
              style={{ background: `${p}${10 + i * 5}` }}
            />
            <div className="p-2">
              <div className="h-2 bg-stone-100 rounded mb-1 w-3/4" />
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
