import { PreviewSectionProps } from "./types";

export function ProductCatalogPreview({
  section,
  t,
  p,
  r,
  wrap,
}: PreviewSectionProps) {
  return wrap(
    <div className="bg-white px-6 py-8">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <p
            className="text-[10px] tracking-widest uppercase mb-1"
            style={{ color: p }}
          >
            {section.content.subheading ??
              t("sectionPreview.defaults.catalogTag")}
          </p>
          <h3
            className="text-lg font-semibold text-stone-900"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {section.content.heading ??
              t("sectionPreview.defaults.catalogHeading")}
          </h3>
        </div>
        <div className="flex-1 h-px bg-stone-100" />
        <span className="text-[10px] text-stone-400">
          {t("sectionPreview.defaults.catalogProducts")}
        </span>
      </div>
      <div className="flex gap-2 mb-4">
        {(
          t("sectionPreview.defaults.catalogFilters", {
            returnObjects: true,
          }) as string[]
        ).map((label, i) => (
          <span
            key={label}
            className="text-[10px] px-3 py-1 rounded-full border"
            style={{
              borderColor: i === 0 ? p : "#e7e5e4",
              color: i === 0 ? p : "#78716c",
            }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-stone-50 overflow-hidden"
            style={{ borderRadius: r }}
          >
            <div
              className="aspect-[3/4] bg-stone-100"
              style={{ background: `${p}${12 + i * 6}` }}
            />
            <div className="p-2">
              <div className="h-2 bg-stone-200 rounded mb-1 w-3/4" />
              <div
                className="h-2 rounded w-1/2"
                style={{ background: `${p}35` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>,
  );
}
