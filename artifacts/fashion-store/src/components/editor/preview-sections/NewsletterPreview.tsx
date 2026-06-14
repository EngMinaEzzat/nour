import { PreviewSectionProps } from "./types";

export function NewsletterPreview({
  section,
  theme,
  t,
  p,
  wrap,
}: PreviewSectionProps) {
  return wrap(
    <div className="py-10 px-6 text-center" style={{ background: "var(--bg-main, #faf7f4)" }}>
      <h3
        className="text-lg font-semibold mb-1"
        style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
      >
        {section.content.heading as string}
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-body, #78716c)", fontFamily: "var(--font-body)" }}>
        {section.content.subheading as string}
      </p>
      <div className="flex max-w-xs mx-auto gap-2">
        <div className="flex-1 h-8" style={{ border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "var(--btn-radius, 8px)", background: "var(--bg-card, #fff)" }} />
        <span
          className="h-8 px-4 text-xs text-white flex items-center font-medium"
          style={{
            background: p,
            borderRadius: "var(--btn-radius, 9999px)",
            fontFamily: "var(--font-body)"
          }}
        >
          {t("sectionPreview.defaults.newsletterCta")}
        </span>
      </div>
    </div>,
  );
}
