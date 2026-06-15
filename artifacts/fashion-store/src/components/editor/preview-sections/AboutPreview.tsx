import { PreviewSectionProps } from "./types";

export function AboutPreview({ section, t, p, wrap }: PreviewSectionProps) {
  return wrap(
    <div className="px-6 py-8" style={{ background: "var(--bg-section, #fff)" }}>
      <div className="grid grid-cols-2 gap-6 items-center">
        {section.content.imageUrl ? (
          <img
            src={section.content.imageUrl as string}
            alt=""
            className="aspect-[4/3] w-full object-cover bg-stone-100"
            style={{ borderRadius: "var(--card-radius, 12px)" }}
          />
        ) : (
          <div
            className="aspect-[4/3] w-full bg-stone-100"
            style={{ background: `${p}18`, borderRadius: "var(--card-radius, 12px)" }}
          />
        )}
        <div>
          <p
            className="text-[10px] tracking-widest uppercase mb-2 font-medium"
            style={{ color: p, fontFamily: "var(--font-body)" }}
          >
            {t("sectionPreview.defaults.aboutTag")}
          </p>
          <h3
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
          >
            {section.content.heading as string}
          </h3>
          <p className="text-xs leading-relaxed line-clamp-4" style={{ color: "var(--text-body, #78716c)", fontFamily: "var(--font-body)" }}>
            {section.content.body as string}
          </p>
        </div>
      </div>
    </div>,
  );
}
