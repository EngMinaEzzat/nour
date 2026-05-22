import { SectionConfig, StoreConfig } from "@/lib/store-config";
import { normalizeStoredImageUrl } from "@/lib/image-url";
import { useTranslation } from "react-i18next";

const FALLBACK_HERO = "/hero-optimized.jpg";

interface PreviewProps {
  section: SectionConfig;
  theme: StoreConfig["theme"];
  brand: StoreConfig["brand"];
  categories?: Array<{ id: number; name: string; nameAr?: string; imageUrl?: string | null; productCount?: number }>;
  selected: boolean;
  onClick: () => void;
}

export function SectionPreview({ section, theme, brand, categories = [], selected, onClick }: PreviewProps) {
  const { t, i18n } = useTranslation();
  const p = theme.primaryColor;
  const sec = theme.secondaryColor;
  const r = `${theme.radius}px`;

  const borderStyle = selected
    ? `2px solid ${p}`
    : "2px solid transparent";

  const wrapClass = `relative cursor-pointer transition-all group ${selected ? "ring-1" : ""}`;

  function wrap(children: React.ReactNode) {
    return (
      <div
        id={`section-${section.id}`}
        className={wrapClass}
        style={{ border: borderStyle, borderRadius: 4 }}
        onClick={onClick}
      >
        {/* Section label badge */}
        {selected && (
          <div
            className="absolute top-0 right-0 z-10 text-white text-[10px] px-2 py-0.5 rounded-bl-md rounded-tr-sm font-medium"
            style={{ background: p }}
          >
            {section.label}
          </div>
        )}
        {!selected && (
          <div className={`absolute top-2 ${i18n.dir() === "rtl" ? "right-2" : "left-2"} z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-stone-600 text-[10px] px-2 py-0.5 rounded-md shadow-sm border border-stone-200`}>
            {t("sectionPreview.edit")}
          </div>
        )}
        {children}
      </div>
    );
  }

  switch (section.type) {
    case "hero": {
      const height = section.settings.height === "short" ? 160 : section.settings.height === "medium" ? 240 : section.settings.height === "full" ? 340 : 280;
      const align = section.settings.textAlign ?? "right";
      const overlay = (section.settings.overlayOpacity ?? 40) / 100;
      const heroImageUrl = normalizeStoredImageUrl(section.content.imageUrl) || normalizeStoredImageUrl(brand.coverUrl) || FALLBACK_HERO;
      return wrap(
        <div
          className="relative overflow-hidden flex items-center"
          style={{
            height,
            backgroundImage: `url("${heroImageUrl}")`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
          <div className={`relative z-10 px-8 py-6 w-full text-${align}`}>
            <p className="text-white text-[10px] font-medium mb-1 opacity-80 tracking-widest uppercase">
              {brand.name}
            </p>
            <h2 className="text-white text-xl font-bold mb-2 leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {section.content.heading ?? t("sectionPreview.defaults.heroHeading")}
            </h2>
            <p className="text-white/80 text-xs mb-4">{section.content.subheading ?? t("sectionPreview.defaults.heroSubheading")}</p>
            <div className={`flex gap-2 ${align === "center" ? "justify-center" : align === "left" ? (i18n.dir() === "rtl" ? "justify-end" : "justify-start") : (i18n.dir() === "rtl" ? "justify-start" : "justify-end")}`}>
              <span
                className="text-white text-xs px-4 py-1.5 font-medium"
                style={{ background: p, borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
              >
                {section.content.ctaText ?? t("sectionPreview.defaults.heroCta")}
              </span>
              <span
                className="text-white text-xs px-4 py-1.5 font-medium border border-white/60"
                style={{ borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
              >
                {t("sectionPreview.defaults.heroNewArrival")}
              </span>
            </div>
          </div>
        </div>
      );
    }

    case "trust-strip": {
      const items = (section.content.items ?? []) as Array<{ icon: string; title: string; text: string }>;
      return wrap(
        <div className="bg-stone-900 py-3 px-4">
          <div className="flex items-center justify-around gap-4 flex-wrap">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-white/80">
                <span className="text-sm">{item.icon}</span>
                <div>
                  <p className="text-[10px] font-semibold text-white">{item.title}</p>
                  <p className="text-[9px] opacity-60">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "new-arrivals":
    case "best-sellers": {
      const count = Math.min(section.settings.productCount ?? 4, 4);
      return wrap(
        <div className="bg-[#faf7f4] px-6 py-8">
          <div className="text-center mb-6">
            <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: p }}>
              {section.type === "new-arrivals" ? t("sectionPreview.defaults.newArrivalTag") : t("sectionPreview.defaults.popularTag")}
            </p>
            <h3 className="text-lg font-semibold text-stone-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {section.content.heading}
            </h3>
            <p className="text-xs text-stone-400 mt-1">{section.content.subheading}</p>
          </div>
          <div className="grid grid-cols-4 gap-3" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="bg-white overflow-hidden" style={{ borderRadius: r }}>
                <div className="aspect-[3/4] bg-stone-100" style={{ background: `${p}${10 + i * 5}` }} />
                <div className="p-2">
                  <div className="h-2 bg-stone-100 rounded mb-1 w-3/4" />
                  <div className="h-2 rounded w-1/2" style={{ background: `${p}40` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "product-catalog": {
      return wrap(
        <div className="bg-white px-6 py-8">
          <div className="flex items-center gap-3 mb-5">
            <div>
              <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: p }}>
                {section.content.subheading ?? t("sectionPreview.defaults.catalogTag")}
              </p>
              <h3 className="text-lg font-semibold text-stone-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {section.content.heading ?? t("sectionPreview.defaults.catalogHeading")}
              </h3>
            </div>
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-[10px] text-stone-400">{t("sectionPreview.defaults.catalogProducts")}</span>
          </div>
          <div className="flex gap-2 mb-4">
            {(t("sectionPreview.defaults.catalogFilters", { returnObjects: true }) as string[]).map((label, i) => (
              <span key={label} className="text-[10px] px-3 py-1 rounded-full border" style={{ borderColor: i === 0 ? p : "#e7e5e4", color: i === 0 ? p : "#78716c" }}>
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-stone-50 overflow-hidden" style={{ borderRadius: r }}>
                <div className="aspect-[3/4] bg-stone-100" style={{ background: `${p}${12 + i * 6}` }} />
                <div className="p-2">
                  <div className="h-2 bg-stone-200 rounded mb-1 w-3/4" />
                  <div className="h-2 rounded w-1/2" style={{ background: `${p}35` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "categories": {
      const previewCategories = categories.slice(0, 4);
      return wrap(
        <div className="bg-white px-6 py-8">
          <h3 className="text-center text-lg font-semibold text-stone-900 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading ?? t("sectionPreview.defaults.categoriesHeading")}
          </h3>
          {previewCategories.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {previewCategories.map((cat, i) => (
                <div key={cat.id} className="relative overflow-hidden bg-stone-100" style={{ borderRadius: r }}>
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.nameAr || cat.name} className="aspect-square w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${p}${30 + i * 15}, ${sec}${20 + i * 10})` }} />
                  )}
                  <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/55 to-transparent">
                    <span className="text-white text-[10px] font-semibold">{i18n.language === 'ar' ? (cat.nameAr || cat.name) : cat.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-xs text-stone-400">
              {t("sectionPreview.defaults.categoriesEmpty")}
            </div>
          )}
          <div className="hidden">
            {(t("sectionPreview.defaults.categoriesDummy", { returnObjects: true }) as string[]).map((cat, i) => (
              <div key={i} className="relative overflow-hidden" style={{ borderRadius: r }}>
                <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${p}${30 + i * 15}, ${sec}${20 + i * 10})` }} />
                <div className="absolute inset-0 flex items-end p-2">
                  <span className="text-white text-[10px] font-semibold">{cat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "testimonials": {
      const items = (section.content.items ?? []) as Array<{ name: string; text: string; rating: string }>;
      return wrap(
        <div className="bg-[#faf7f4] px-6 py-8">
          <h3 className="text-center text-lg font-semibold text-stone-900 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="bg-white p-3 rounded-xl shadow-sm">
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: parseInt(item.rating ?? "5") }).map((_, j) => (
                    <span key={j} className="text-yellow-400 text-xs">★</span>
                  ))}
                </div>
                <p className="text-[10px] text-stone-600 mb-2 line-clamp-3">{item.text}</p>
                <p className="text-[10px] font-semibold text-stone-800">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "offers": {
      return wrap(
        <div className="px-6 py-8 text-center text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}, ${sec})` }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 50%, white 0%, transparent 50%)" }} />
          <p className="text-2xl font-bold mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading ?? t("sectionPreview.defaults.offersHeading")}
          </p>
          <p className="text-xs opacity-80 mb-4">{section.content.subheading}</p>
          <span
            className="bg-white text-xs px-4 py-1.5 font-semibold inline-block"
            style={{ color: p, borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
          >
            {section.content.ctaText ?? t("sectionPreview.defaults.offersCta")}
          </span>
        </div>
      );
    }

    case "about": {
      return wrap(
        <div className="bg-white px-6 py-8">
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="aspect-[4/3] rounded-xl bg-stone-100" style={{ background: `${p}18` }} />
            <div>
              <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: p }}>{t("sectionPreview.defaults.aboutTag")}</p>
              <h3 className="text-lg font-semibold text-stone-900 mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {section.content.heading}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed line-clamp-4">
                {section.content.body}
              </p>
            </div>
          </div>
        </div>
      );
    }

    case "newsletter": {
      return wrap(
        <div className="py-10 px-6 text-center" style={{ background: `${p}0a` }}>
          <h3 className="text-lg font-semibold text-stone-900 mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading}
          </h3>
          <p className="text-xs text-stone-400 mb-4">{section.content.subheading}</p>
          <div className="flex max-w-xs mx-auto gap-2">
            <div className="flex-1 h-8 bg-white border border-stone-200 rounded-lg" />
            <span
              className="h-8 px-4 text-xs text-white flex items-center font-medium"
              style={{ background: p, borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
            >
              {t("sectionPreview.defaults.newsletterCta")}
            </span>
          </div>
        </div>
      );
    }

    case "faq": {
      const items = (section.content.items ?? []) as Array<{ q: string; a: string }>;
      return wrap(
        <div className="bg-white px-6 py-8">
          <h3 className="text-center text-lg font-semibold text-stone-900 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading}
          </h3>
          <div className="space-y-2 max-w-lg mx-auto">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="border border-stone-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-800">{item.q}</span>
                  <span className="text-stone-400 text-sm">+</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "whatsapp": {
      return wrap(
        <div className="bg-[#faf7f4] px-6 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3 text-white text-xl">💬</div>
          <h3 className="text-lg font-semibold text-stone-900 mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading}
          </h3>
          <p className="text-xs text-stone-400 mb-4">{section.content.subheading}</p>
          <span className="bg-green-500 text-white text-xs px-5 py-2 rounded-full font-medium inline-block">
            {section.content.ctaText ?? t("sectionPreview.defaults.whatsappCta")}
          </span>
        </div>
      );
    }

    case "instagram":
    case "lookbook": {
      const cols = section.settings.columns ?? 3;
      return wrap(
        <div className="bg-white px-6 py-8">
          <h3 className="text-center text-lg font-semibold text-stone-900 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading}
          </h3>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols * 2 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg"
                style={{ background: `${i % 2 === 0 ? p : sec}${15 + i * 5}` }}
              />
            ))}
          </div>
        </div>
      );
    }

    default:
      return wrap(
        <div className="bg-stone-50 px-6 py-8 text-center">
          <p className="text-sm text-stone-500">{t(`sections.${section.type}` as any)}</p>
        </div>
      );
  }
}
