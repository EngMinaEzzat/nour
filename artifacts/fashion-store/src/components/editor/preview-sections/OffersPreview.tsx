import { PreviewSectionProps } from "./types";

export function OffersPreview({ section, t, p, wrap }: PreviewSectionProps) {
  const showPromo1 = section.settings?.showPromo1 ?? true;
  const showPromo2 = section.settings?.showPromo2 ?? true;
  if (!showPromo1 && !showPromo2)
    return wrap(
      <div className="py-8 text-center text-xs text-stone-400">
        No offers visible
      </div>,
    );
  return wrap(
    <div
      className={`grid grid-cols-1 ${showPromo1 && showPromo2 ? "grid-cols-2 gap-2" : ""} p-4 bg-white`}
    >
      {showPromo1 && (
        <div
          className="px-4 py-6 text-center text-white relative overflow-hidden rounded-xl"
          style={{ background: `linear-gradient(135deg, ${p}f0, #c97b8b)` }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 0%, transparent 50%)",
            }}
          />
          <p
            className="text-sm font-bold mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {(section.content.promo1Heading as string) ??
              t("sectionPreview.defaults.offersHeading")}
          </p>
          <span className="bg-white/20 text-[10px] px-2 py-1 font-semibold inline-block rounded">
            {(section.content.promo1Cta as string) ??
              t("sectionPreview.defaults.offersCta")}
          </span>
        </div>
      )}
      {showPromo2 && (
        <div
          className="px-4 py-6 text-center text-white relative overflow-hidden rounded-xl"
          style={{
            background: "linear-gradient(135deg, #1a1614 0%, #2d2420 100%)",
          }}
        >
          <div
            className="absolute -bottom-6 -end-6 w-20 h-20 rounded-full opacity-10"
            style={{ background: "#c8963a" }}
          />
          <p
            className="text-sm font-bold mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {(section.content.promo2Heading as string) ??
              t("defaultSections.offers.promo2Heading")}
          </p>
          <span
            className="text-[10px] px-2 py-1 font-semibold inline-block rounded"
            style={{ color: "#c8963a", border: "1px solid #c8963a" }}
          >
            {(section.content.promo2Cta as string) ??
              t("defaultSections.offers.promo2Cta")}
          </span>
        </div>
      )}
    </div>,
  );
}
