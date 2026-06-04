import { PreviewSectionProps } from "./types";

export function WhatsappPreview({ section, t, wrap }: PreviewSectionProps) {
  return wrap(
    <div className="bg-[#faf7f4] px-6 py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3 text-white text-xl">
        💬
      </div>
      <h3
        className="text-lg font-semibold text-stone-900 mb-1"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {section.content.heading as string}
      </h3>
      <p className="text-xs text-stone-400 mb-4">
        {section.content.subheading as string}
      </p>
      <span className="bg-green-500 text-white text-xs px-5 py-2 rounded-full font-medium inline-block">
        {(section.content.ctaText as string) ??
          t("sectionPreview.defaults.whatsappCta")}
      </span>
    </div>,
  );
}
