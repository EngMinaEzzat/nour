import i18n from "i18next";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { SectionPreview } from "./SectionPreview";
import { DeviceType, StoreConfig, SectionConfig, isColorDark } from "@/lib/store-config";

const SANS = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

interface EditorCanvasProps {
  config: StoreConfig;
  categories?: Array<{
    id: number;
    name: string;
    nameAr?: string;
    imageUrl?: string | null;
    productCount?: number;
  }>;
  selectedId: string | null;
  device: DeviceType;
  onSelectSection: (id: string) => void;
  onDeselectAll: () => void;
}

const DEVICE_WIDTHS: Record<DeviceType, number | string> = {
  desktop: "100%",
  tablet: 768,
  mobile: 390,
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  desktop: "editorCanvas.deviceLabels.desktop",
  tablet: "editorCanvas.deviceLabels.tablet",
  mobile: "editorCanvas.deviceLabels.mobile",
};

export default function EditorCanvas({
  config,
  categories = [],
  selectedId,
  device,
  onSelectSection,
  onDeselectAll,
}: EditorCanvasProps) {
  const { t, i18n } = useTranslation();
  const width = DEVICE_WIDTHS[device];
  const isConstrained = device !== "desktop";

  const p = config.theme.primaryColor;
  const sec = config.theme.secondaryColor;
  const isDark = isColorDark(sec);
  
  const headingFont = (config.theme.fontPairing === "sans-sans") ? SANS : SERIF;
  const bodyFont = (config.theme.fontPairing === "serif-serif") ? SERIF : SANS;

  const cssVars = {
    "--primary-color": p,
    "--secondary-color": sec,
    "--bg-main": isDark ? sec : "#faf7f4",
    "--bg-section": isDark ? sec : "#ffffff",
    "--bg-card": isDark ? "#1c1c1e" : "#ffffff",
    "--border-color": isDark ? "#2c2c2e" : "hsl(340, 30%, 90%)",
    "--text-heading": isDark ? "#ffffff" : "hsl(340, 20%, 15%)",
    "--text-body": isDark ? "#a1a1aa" : "hsl(340, 15%, 45%)",
    "--font-heading": headingFont,
    "--font-body": bodyFont,
    "--btn-radius": config.theme.buttonStyle === "square" ? "0px" : config.theme.buttonStyle === "pill" ? "9999px" : `${config.theme.radius ?? 8}px`,
    "--card-radius": `${config.theme.radius ?? 16}px`,
    "--bg-header-glass": isDark ? "rgba(15,15,15,0.72)" : "rgba(250,247,244,0.72)",
    "--bg-header": isDark ? "rgba(15,15,15,0.98)" : "rgba(250,247,244,0.98)",
    "--bg-drawer": isDark ? "#111111" : "#faf7f4",
  } as React.CSSProperties;

  function translateSectionContent(section: SectionConfig): SectionConfig {
    const s = { ...section, content: { ...section.content } };
    const sn = config.brand.name;
    const isCyberpunk = 
      config.theme.secondaryColor === "#111111" || 
      config.theme.secondaryColor === "#0f0f0f" ||
      config.brand.personality === "cyberpunk";

    if (s.type === "hero") {
      const h = s.content.heading;
      const sh = s.content.subheading;
      const cta = s.content.ctaText;
      const img = s.content.imageUrl;

      const isDefaultHeading = !h || 
        h.includes("اكتشفي أحدث تشكيلة من") || 
        h.includes("اكتشفي جمالكِ مع") || 
        h.includes("Own the Streets with") ||
        h.includes("اكسر القواعد مع");

      const isDefaultSubheading = !sh || 
        sh.includes("أزياء راقية بأسعار تناسبك") || 
        sh.includes("مستحضرات عناية وتجميل تبرز جمالك الطبيعي") || 
        sh.includes("Cyber Drip") ||
        sh.includes("أحدث صيحات الستريت وير");

      const isDefaultCta = !cta || 
        cta === "تسوقي الآن" || 
        cta === "Hack the System" ||
        cta === "اكتشف الآن" ||
        cta === "اكتشفي الآن" ||
        cta === "اكتبي الآن";

      const isDefaultImage = !img ||
        img === "/hero-fashion-optimized.jpg" ||
        img === "/hero-cosmetics-optimized.jpg" ||
        img === "/hero-both-optimized.jpg" ||
        img === "/hero-streetwear-optimized.jpg";

      if (isCyberpunk) {
        if (isDefaultHeading) s.content.heading = t("defaultSections.streetwearCyberpunk.hero.heading", { storeName: sn, defaultValue: `Own the Streets with ${sn}` });
        if (isDefaultSubheading) s.content.subheading = t("defaultSections.streetwearCyberpunk.hero.subheading", { defaultValue: "Cyber Drip & High-Energy Aesthetics" });
        if (isDefaultCta) s.content.ctaText = t("defaultSections.streetwearCyberpunk.hero.ctaText", { defaultValue: "Hack the System" });
        if (isDefaultImage) s.content.imageUrl = "/hero-streetwear-optimized.jpg";
      } else {
        const isCosmetics = config.brand.category === "cosmetics";
        if (isDefaultHeading) {
          s.content.heading = isCosmetics
            ? t("defaultSections.hero.headingCosmetics", { storeName: sn, defaultValue: `اكتشفي جمالكِ مع ${sn}` })
            : t("defaultSections.hero.heading", { storeName: sn, defaultValue: `اكتشفي أحدث تشكيلة من ${sn}` });
        }
        if (isDefaultSubheading) {
          s.content.subheading = isCosmetics
            ? t("defaultSections.hero.subheadingCosmetics", { defaultValue: "مستحضرات عناية وتجميل تبرز جمالك الطبيعي" })
            : t("defaultSections.hero.subheading", { defaultValue: "أزياء راقية بأسعار تناسبك" });
        }
        if (isDefaultCta) s.content.ctaText = t("defaultSections.hero.ctaText", { defaultValue: "تسوقي الآن" });
        if (isDefaultImage) {
          s.content.imageUrl = isCosmetics 
            ? "/hero-cosmetics-optimized.jpg" 
            : config.brand.category === "both" 
            ? "/hero-both-optimized.jpg" 
            : "/hero-fashion-optimized.jpg";
        }
      }
    } else if (s.type === "new-arrivals") {
      if (typeof s.content.heading === "string" && (s.content.heading.includes("وصل حديثاً") || s.content.heading.includes("New Arrivals") || s.content.heading.includes("وصل حديثا"))) {
        s.content.heading = t("defaultSections.newArrivals.heading", { defaultValue: "وصل حديثاً" });
      }
      if (typeof s.content.subheading === "string" && (s.content.subheading.includes("أحدث المنتجات") || s.content.subheading.includes("Our latest additions"))) {
        s.content.subheading = t("defaultSections.newArrivals.subheading", { defaultValue: "أحدث المنتجات في مجموعتنا" });
      }
    } else if (s.type === "best-sellers") {
      if (typeof s.content.heading === "string" && (s.content.heading.includes("الأكثر مبيعاً") || s.content.heading.includes("Best Sellers") || s.content.heading.includes("الاكثر مبيعا"))) {
        s.content.heading = t("defaultSections.bestSellers.heading", { defaultValue: "الأكثر مبيعاً" });
      }
      if (typeof s.content.subheading === "string" && (s.content.subheading.includes("المنتجات المفضلة") || s.content.subheading.includes("Our customers' favorites"))) {
        s.content.subheading = t("defaultSections.bestSellers.subheading", { defaultValue: "المنتجات المفضلة لعملائنا" });
      }
    } else if (s.type === "categories") {
      if (typeof s.content.heading === "string" && (s.content.heading.includes("تسوقي حسب القسم") || s.content.heading.includes("Shop by Category") || s.content.heading.includes("تسوق حسب القسم"))) {
        s.content.heading = t("defaultSections.categories.heading", { defaultValue: "تسوقي حسب القسم" });
      }
    } else if (s.type === "offers") {
      if (s.content.promo1Label === "عروض حصرية") s.content.promo1Label = t("defaultSections.offers.promo1Label", { defaultValue: s.content.promo1Label });
      if (s.content.promo1Heading === "خصم يصل إلى") s.content.promo1Heading = t("defaultSections.offers.promo1Heading", { defaultValue: s.content.promo1Heading });
      if (s.content.promo1Desc === "على تشكيلات مختارة — لفترة محدودة") s.content.promo1Desc = t("defaultSections.offers.promo1Desc", { defaultValue: s.content.promo1Desc });
      if (s.content.promo1Cta === "تسوقي الآن") s.content.promo1Cta = t("defaultSections.offers.promo1Cta", { defaultValue: s.content.promo1Cta });
      if (s.content.promo2Label === "توصيل مجاني") s.content.promo2Label = t("defaultSections.offers.promo2Label", { defaultValue: s.content.promo2Label });
      if (s.content.promo2Heading === "شحن مجاني") s.content.promo2Heading = t("defaultSections.offers.promo2Heading", { defaultValue: s.content.promo2Heading });
      if (s.content.promo2Subheading === "لكل طلب فوق") s.content.promo2Subheading = t("defaultSections.offers.promo2Subheading", { defaultValue: s.content.promo2Subheading });
      if (s.content.promo2Cta === "اطلبي الآن") s.content.promo2Cta = t("defaultSections.offers.promo2Cta", { defaultValue: s.content.promo2Cta });
    } else if (s.type === "about") {
      const h = s.content.heading;
      const b = s.content.body;
      const img = s.content.imageUrl;

      const isDefaultHeading = !h ||
        h.startsWith("قصة ") ||
        h.includes("The Core of") ||
        h.includes("عن ");

      const isDefaultBody = !b ||
        b.includes("نؤمن بأن كل امرأة تستحق") ||
        b.includes("نؤمن بأن الجمال الحقيقي ينبع") ||
        b.includes("Born in the neon glow") ||
        b.includes("صُممت لتبرز في الزحام");

      const isDefaultImage = !img ||
        img === "/about-optimized.jpg" ||
        img === "/about-streetwear-optimized.jpg";

      if (isCyberpunk) {
        if (isDefaultHeading) s.content.heading = t("defaultSections.streetwearCyberpunk.about.heading", { storeName: sn, defaultValue: `The Core of ${sn}` });
        if (isDefaultBody) s.content.body = t("defaultSections.streetwearCyberpunk.about.body", { defaultValue: "Born in the neon glow, forged in the concrete jungle. We bring you the ultimate streetwear aesthetic, blending brutalist design with high-octane energy. Own your narrative." });
        if (isDefaultImage) s.content.imageUrl = "/about-streetwear-optimized.jpg";
      } else {
        const isCosmetics = config.brand.category === "cosmetics";
        if (isDefaultHeading) s.content.heading = t("defaultSections.about.heading", { storeName: sn, defaultValue: `قصة ${sn}` });
        if (isDefaultBody) {
          s.content.body = isCosmetics
            ? t("defaultSections.about.bodyCosmetics", { defaultValue: "نؤمن بأن الجمال الحقيقي ينبع من الداخل، ومهمتنا هي توفير أفضل مستحضرات العناية والتجميل لتعزيز ثقتكِ بنفسكِ. كل منتج نختاره بعناية ليناسب احتياجاتكِ." })
            : t("defaultSections.about.bodyFashion", { defaultValue: "نؤمن بأن كل امرأة تستحق أن تشعر بالثقة والأناقة. بدأنا رحلتنا بشغف حقيقي لتقديم أجمل الأزياء بأفضل الأسعار." });
        }
        if (isDefaultImage) s.content.imageUrl = "/about-optimized.jpg";
      }
    } else if (s.type === "testimonials") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("ماذا يقول عملاؤنا")) s.content.heading = t("defaultSections.testimonials.heading", { defaultValue: s.content.heading });
      if (Array.isArray(s.content.items)) {
        s.content.items = t("defaultSections.testimonials.items", { returnObjects: true, defaultValue: s.content.items }) as any[];
      }
    } else if (s.type === "faq") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("أسئلة شائعة")) s.content.heading = t("defaultSections.faq.heading", { defaultValue: s.content.heading });
      if (Array.isArray(s.content.items)) {
        s.content.items = t("defaultSections.faq.items", { returnObjects: true, defaultValue: s.content.items }) as any[];
      }
    } else if (s.type === "whatsapp") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("تحدثي معنا مباشرة")) s.content.heading = t("defaultSections.whatsapp.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("نرد على استفساراتك")) s.content.subheading = t("defaultSections.whatsapp.subheading", { defaultValue: s.content.subheading });
      if (typeof s.content.ctaText === "string" && s.content.ctaText.includes("تواصلي عبر واتساب")) s.content.ctaText = t("defaultSections.whatsapp.ctaText", { defaultValue: s.content.ctaText });
    } else if (s.type === "newsletter") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("اشتركي")) s.content.heading = t("defaultSections.newsletter.heading", { defaultValue: s.content.heading });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("كوني أول من تعرف")) s.content.subheading = t("defaultSections.newsletter.subheading", { defaultValue: s.content.subheading });
      if (typeof s.content.ctaText === "string" && s.content.ctaText.includes("اشتركي الآن")) s.content.ctaText = t("defaultSections.newsletter.ctaText", { defaultValue: s.content.ctaText });
    } else if (s.type === "lookbook") {
      const h = s.content.heading;
      const items = s.content.items;
      const isDefaultHeading = !h || h.includes("لوك بوك");
      const isDefaultItems = !items || (Array.isArray(items) && items.some(item => 
        item.title?.includes("Egyptian") || 
        item.title?.includes("Spring") || 
        item.title?.includes("Beauty") ||
        item.title?.includes("Neon") ||
        item.title?.includes("Concrete") ||
        item.title?.includes("Glitch") ||
        item.title?.includes("ليالي") ||
        item.title?.includes("روح") ||
        item.title?.includes("واقع")
      ));

      if (isCyberpunk) {
        if (isDefaultHeading) s.content.heading = t("defaultSections.streetwearCyberpunk.lookbook.heading", { defaultValue: "Cyber Drip - Neural Uplink" });
        if (isDefaultItems && Array.isArray(items)) {
          const cyberItems = t("defaultSections.streetwearCyberpunk.lookbook.items", { returnObjects: true, defaultValue: [] }) as any[];
          if (cyberItems.length > 0) {
            s.content.items = items.map((item, idx) => {
              const cItem = cyberItems[idx % cyberItems.length];
              const isItemDefault = !item.title || 
                item.title.includes("Egyptian") || 
                item.title.includes("Spring") || 
                item.title.includes("Beauty") ||
                item.title.includes("Neon") ||
                item.title.includes("Concrete") ||
                item.title.includes("Glitch") ||
                item.title.includes("ليالي") ||
                item.title.includes("روح") ||
                item.title.includes("واقع");
              return {
                ...item,
                title: isItemDefault ? cItem.title : item.title,
                desc: isItemDefault ? cItem.desc : item.desc,
              };
            });
          }
        }
      } else {
        if (isDefaultHeading) s.content.heading = t("defaultSections.lookbook.heading", { defaultValue: "لوك بوك - إلهامي هذا الموسم" });
        if (isDefaultItems && Array.isArray(items)) {
          const fashionItems = t("defaultSections.lookbook.items", { returnObjects: true, defaultValue: [] }) as any[];
          if (fashionItems.length > 0) {
            s.content.items = items.map((item, idx) => {
              const fItem = fashionItems[idx % fashionItems.length];
              const isItemDefault = !item.title || 
                item.title.includes("Egyptian") || 
                item.title.includes("Spring") || 
                item.title.includes("Beauty") ||
                item.title.includes("Neon") ||
                item.title.includes("Concrete") ||
                item.title.includes("Glitch") ||
                item.title.includes("ليالي") ||
                item.title.includes("روح") ||
                item.title.includes("واقع");
              return {
                ...item,
                title: isItemDefault ? fItem.title : item.title,
                desc: isItemDefault ? fItem.desc : item.desc,
              };
            });
          }
        }
      }
    } else if (s.type === "product-catalog") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("جميع المنتجات")) s.content.heading = t("defaultSections.productCatalog.heading", { defaultValue: "جميع المنتجات" });
      if (typeof s.content.subheading === "string" && s.content.subheading.includes("كتالوج كامل")) s.content.subheading = t("defaultSections.productCatalog.subheading", { defaultValue: "كتالوج كامل" });
    } else if (s.type === "trust-strip") {
      const items = s.content.items;
      const isDefaultItems = !items || (Array.isArray(items) && items.some(item => 
        item.title?.includes("توصيل") || 
        item.title?.includes("دفع") || 
        item.title?.includes("إرجاع") || 
        item.title?.includes("جودة") ||
        item.title?.includes("Hyper") ||
        item.title?.includes("Encrypted") ||
        item.title?.includes("System") ||
        item.title?.includes("Prime")
      ));

      if (isCyberpunk) {
        if (isDefaultItems) {
          s.content.items = t("defaultSections.streetwearCyberpunk.trustStrip.items", { returnObjects: true, defaultValue: [
            { icon: "⚡", title: "Hyper Delivery", text: "Light-speed shipping" },
            { icon: "🔒", title: "Encrypted Payment", text: "100% secure checkout" },
            { icon: "🔄", title: "System Reboot", text: "Hassle-free returns" },
            { icon: "🛡️", title: "Prime Quality", text: "Verified authentic gear" }
          ] }) as any[];
        }
      } else {
        if (isDefaultItems) {
          s.content.items = t("defaultSections.trustStrip.items", { returnObjects: true, defaultValue: [
            { icon: "🚚", title: "توصيل سريع", text: "خلال 2-5 أيام" },
            { icon: "🔒", title: "دفع آمن", text: "بطاقة أو كاش" },
            { icon: "↩️", title: "إرجاع مجاني", text: "خلال 14 يوم" },
            { icon: "⭐", title: "جودة مضمونة", text: "منتجات أصلية 100%" }
          ] }) as any[];
        }
      }
    } else if (s.type === "instagram") {
      if (typeof s.content.heading === "string" && s.content.heading.includes("تابعينا")) s.content.heading = t("defaultSections.instagram.heading", { defaultValue: s.content.heading });
    }
    return s;
  }

  const visibleSections = [...config.homepage.sections]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.visible)
    .map(translateSectionContent);

  useEffect(() => {
    if (selectedId) {
      const el = document.getElementById(`section-${selectedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedId]);

  return (
    <div
      className="flex-1 overflow-auto bg-stone-200 flex flex-col items-center"
      style={{ direction: "ltr" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDeselectAll();
      }}
    >
      {/* Device label */}
      <div className="py-3 text-xs text-stone-400 font-medium">
        {t(DEVICE_LABELS[device])}
      </div>

      {/* Canvas frame */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative bg-white shadow-2xl mb-8 overflow-hidden"
        style={{
          width,
          maxWidth: "100%",
          minHeight: 600,
          borderRadius: isConstrained ? 16 : 0,
        }}
      >
        {/* Mobile notch */}
        {device === "mobile" && (
          <div className="h-6 bg-stone-900 rounded-t-2xl flex items-center justify-center">
            <div className="w-16 h-1.5 bg-stone-700 rounded-full" />
          </div>
        )}

        {/* Tablet camera */}
        {device === "tablet" && (
          <div className="h-4 bg-stone-100 border-b border-stone-200 flex items-center justify-center">
            <div className="w-2 h-2 bg-stone-300 rounded-full" />
          </div>
        )}

        {/* Page content */}
        <div
          className="overflow-y-auto"
          style={{
            ...cssVars,
            background: "var(--bg-main)",
            maxHeight:
              device === "mobile"
                ? "85vh"
                : device === "tablet"
                  ? "90vh"
                  : "85vh",
            direction: i18n.dir(),
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onDeselectAll();
          }}
        >
          {visibleSections.length === 0 ? (
            <EmptyCanvas />
          ) : (
            visibleSections.map((section) => (
              <SectionPreview
                key={section.id}
                section={section}
                theme={config.theme}
                brand={config.brand}
                categories={categories}
                selected={section.id === selectedId}
                onClick={() => onSelectSection(section.id)}
              />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EmptyCanvas() {
  const { t, i18n } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] text-center p-8"
      dir={i18n.dir()}
    >
      <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-3xl mb-4">
        🏠
      </div>
      <p className="text-stone-700 font-medium mb-1">
        {t("editorCanvas.empty.title")}
      </p>
      <p className="text-xs text-stone-400 max-w-[200px]">
        {t("editorCanvas.empty.desc")}
      </p>
    </div>
  );
}
