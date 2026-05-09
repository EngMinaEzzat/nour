import { SectionConfig, StoreConfig } from "@/lib/store-config";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PreviewProps {
  section: SectionConfig;
  theme: StoreConfig["theme"];
  brand: StoreConfig["brand"];
  selected: boolean;
  onClick: () => void;
}

export function SectionPreview({ section, theme, brand, selected, onClick }: PreviewProps) {
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
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-stone-600 text-[10px] px-2 py-0.5 rounded-md shadow-sm border border-stone-200">
            تعديل
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
      const imageUrl = section.content.imageUrl ? (section.content.imageUrl.startsWith("/") ? `${BASE}${section.content.imageUrl}` : section.content.imageUrl) : null;
      return wrap(
        <div
          className="relative overflow-hidden flex items-center"
          style={{ height, background: imageUrl ? `url(${imageUrl}) center/cover` : `linear-gradient(135deg, ${p}cc, ${sec}88)` }}
        >
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
          <div className={`relative z-10 px-8 py-6 w-full text-${align}`}>
            <p className="text-white text-[10px] font-medium mb-1 opacity-80 tracking-widest uppercase">
              {brand.name}
            </p>
            <h2 className="text-white text-xl font-bold mb-2 leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {section.content.heading ?? "العنوان الرئيسي"}
            </h2>
            <p className="text-white/80 text-xs mb-4">{section.content.subheading ?? "النص التوضيحي"}</p>
            <div className={`flex gap-2 ${align === "center" ? "justify-center" : align === "left" ? "justify-end" : "justify-start"}`}>
              <span
                className="text-white text-xs px-4 py-1.5 font-medium"
                style={{ background: p, borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
              >
                {section.content.ctaText ?? "تسوقي الآن"}
              </span>
              <span
                className="text-white text-xs px-4 py-1.5 font-medium border border-white/60"
                style={{ borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
              >
                وصل حديثاً
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
              {section.type === "new-arrivals" ? "NEW" : "POPULAR"}
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

    case "categories": {
      return wrap(
        <div className="bg-white px-6 py-8">
          <h3 className="text-center text-lg font-semibold text-stone-900 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {section.content.heading ?? "الأقسام"}
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {["أزياء", "عناية", "إكسسوار", "عطور"].map((cat, i) => (
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
            {section.content.heading ?? "خصم 30%"}
          </p>
          <p className="text-xs opacity-80 mb-4">{section.content.subheading}</p>
          <span
            className="bg-white text-xs px-4 py-1.5 font-semibold"
            style={{ color: p, borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 6 : 0 }}
          >
            {section.content.ctaText ?? "احصلي على العرض"}
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
              <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: p }}>قصتنا</p>
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
              اشتركي
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
            {section.content.ctaText ?? "تواصلي عبر واتساب"}
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
          <p className="text-sm text-stone-500">{section.label}</p>
        </div>
      );
  }
}
