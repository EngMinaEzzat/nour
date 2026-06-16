import { PreviewSectionProps } from "./types";

export function WhatsappPreview({ section, t, wrap }: PreviewSectionProps) {
  return wrap(
    <div className="px-6 py-8 text-center" style={{ background: "var(--bg-main, #faf7f4)" }}>
      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3 text-white text-xl">
        💬
      </div>
      <h3
        className="text-lg font-semibold mb-1"
        style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
      >
        {section.content.heading as string}
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-body, #a1a1aa)", fontFamily: "var(--font-body)" }}>
        {section.content.subheading as string}
      </p>
      <span className="text-white text-xs px-5 py-2 font-medium inline-block" style={{ background: "var(--primary-color, #22c55e)", borderRadius: "var(--btn-radius, 9999px)", fontFamily: "var(--font-body)" }}>
        {(section.content.ctaText as string) ??
          t("sectionPreview.defaults.whatsappCta")}
      </span>
    </div>,
  );
}
