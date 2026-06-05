import { PreviewSectionProps } from "./types";

export function AboutPreview({ section, t, p, wrap }: PreviewSectionProps) {
  return wrap(
    <div className="bg-white px-6 py-8">
      <div className="grid grid-cols-2 gap-6 items-center">
        {section.content.imageUrl ? (
          <img
            src={section.content.imageUrl as string}
            alt=""
            className="aspect-[4/3] w-full rounded-xl object-cover bg-stone-100"
          />
        ) : (
          <div
            className="aspect-[4/3] w-full rounded-xl bg-stone-100"
            style={{ background: `${p}18` }}
          />
        )}
        <div>
          <p
            className="text-[10px] tracking-widest uppercase mb-2"
            style={{ color: p }}
          >
            {t("sectionPreview.defaults.aboutTag")}
          </p>
          <h3
            className="text-lg font-semibold text-stone-900 mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {section.content.heading as string}
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed line-clamp-4">
            {section.content.body as string}
          </p>
        </div>
      </div>
    </div>,
  );
}
