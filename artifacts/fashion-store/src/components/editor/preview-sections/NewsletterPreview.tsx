import { PreviewSectionProps } from "./types";

export function NewsletterPreview({
  section,
  theme,
  t,
  p,
  wrap,
}: PreviewSectionProps) {
  return wrap(
    <div className="py-10 px-6 text-center" style={{ background: `${p}0a` }}>
      <h3
        className="text-lg font-semibold text-stone-900 mb-1"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {section.content.heading as string}
      </h3>
      <p className="text-xs text-stone-400 mb-4">
        {section.content.subheading as string}
      </p>
      <div className="flex max-w-xs mx-auto gap-2">
        <div className="flex-1 h-8 bg-white border border-stone-200 rounded-lg" />
        <span
          className="h-8 px-4 text-xs text-white flex items-center font-medium"
          style={{
            background: p,
            borderRadius:
              theme.buttonStyle === "pill"
                ? 999
                : theme.buttonStyle === "rounded"
                  ? 6
                  : 0,
          }}
        >
          {t("sectionPreview.defaults.newsletterCta")}
        </span>
      </div>
    </div>,
  );
}
