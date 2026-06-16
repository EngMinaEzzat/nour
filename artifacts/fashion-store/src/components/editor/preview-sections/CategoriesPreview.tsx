import { PreviewSectionProps } from "./types";

export function CategoriesPreview({
  section,
  categories,
  t,
  i18n,
  p,
  sec,
  r,
  wrap,
}: PreviewSectionProps) {
  const previewCategories = (categories ?? []).slice(0, 4);
  return wrap(
    <div className="px-6 py-8" style={{ background: "var(--bg-section, #fff)" }}>
      <h3
        className="text-center text-lg font-semibold mb-6"
        style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
      >
        {section.content.heading ??
          t("sectionPreview.defaults.categoriesHeading")}
      </h3>
      {previewCategories.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {previewCategories.map((cat, i) => (
            <div
              key={cat.id}
              className="relative overflow-hidden bg-stone-100"
              style={{ borderRadius: "var(--card-radius, 12px)" }}
            >
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.nameAr || cat.name}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="aspect-square"
                  style={{
                    background: `linear-gradient(135deg, ${p}${30 + i * 15}, ${sec}${20 + i * 10})`,
                  }}
                />
              )}
              <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/55 to-transparent">
                <span className="text-white text-[10px] font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                  {i18n.language === "ar" ? cat.nameAr || cat.name : cat.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {(
            t("sectionPreview.defaults.categoriesDummy", {
              returnObjects: true,
            }) as Array<{ name: string; image: string }>
          ).map((cat, i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-stone-100"
              style={{ borderRadius: "var(--card-radius, 12px)" }}
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/55 to-transparent">
                <span className="text-white text-[10px] font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                  {cat.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>,
  );
}
