import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { normalizeStoredImageUrl } from "@/lib/image-url";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface EditorialLookbookProps {
  primaryColor: string;
  onScrollToProducts: () => void;
  onCategorySelect?: (categoryId: number) => void;
  content?: any;
  isCyberpunk?: boolean;
}

export function EditorialLookbook({
  primaryColor: p,
  onScrollToProducts,
  onCategorySelect,
  content,
  isCyberpunk,
}: EditorialLookbookProps) {
  const { t, i18n } = useTranslation();

  const defaultPanels = [
    {
      image: isCyberpunk ? "/hero-streetwear-optimized.jpg" : "/lookbook-1-optimized.jpg",
      tag: isCyberpunk ? "Cyber" : t("storefront.home.lookbook.panel1.tag"),
      headline: isCyberpunk ? "Neon\n Nights" : t("storefront.home.lookbook.panel1.title"),
      sub: isCyberpunk ? "High visibility. Zero stealth." : t("storefront.home.lookbook.panel1.desc"),
      span: "col-span-2 md:col-span-1 row-span-2",
      textPos: i18n.dir() === "rtl" ? "bottom-8 start-6" : "bottom-8 left-6",
      imgClass: "object-center",
    },
    {
      image: isCyberpunk ? "/about-streetwear-optimized.jpg" : "/lookbook-2-optimized.jpg",
      tag: isCyberpunk ? "Brutalist" : t("storefront.home.lookbook.panel2.tag"),
      headline: isCyberpunk ? "Concrete\n Jungle" : t("storefront.home.lookbook.panel2.title"),
      sub: isCyberpunk ? "Brutalist aesthetics for the modern rogue." : t("storefront.home.lookbook.panel2.desc"),
      span: "col-span-2 md:col-span-1",
      textPos: i18n.dir() === "rtl" ? "bottom-5 start-5" : "bottom-5 left-5",
      imgClass: "object-top",
    },
    {
      image: isCyberpunk ? "/hero-streetwear-optimized.jpg" : "/lookbook-3-optimized.jpg",
      tag: isCyberpunk ? "Glitch" : t("storefront.home.lookbook.panel3.tag"),
      headline: isCyberpunk ? "Glitch\n Reality" : t("storefront.home.lookbook.panel3.title"),
      sub: isCyberpunk ? "Distorted reality, perfected." : t("storefront.home.lookbook.panel3.desc"),
      span: "col-span-2 md:col-span-1",
      textPos: i18n.dir() === "rtl" ? "bottom-5 start-5" : "bottom-5 left-5",
      imgClass: "object-top",
    },
  ];

  const customItems = content?.items;
  const PANELS = customItems
    ? customItems.map((item: any, i: number) => {
        const fallback = defaultPanels[i % defaultPanels.length];
        const categoryId = Number.parseInt(String(item.categoryId ?? ""), 10);
        return {
          image: normalizeStoredImageUrl(item.imageUrl ?? item.image),
          tag: item.tag || "",
          headline: (item.title || "").replace(/\\n/g, "\n").replace(/\/n/g, "\n"),
          sub: item.desc || "",
          categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : undefined,
          span: fallback.span,
          textPos: fallback.textPos,
          imgClass: fallback.imgClass,
        };
      }).filter((p: any) => p.image)
    : defaultPanels.map((p) => ({
        ...p,
        headline: p.headline.replace(/\\n/g, "\n").replace(/\/n/g, "\n"),
      }));

  const handlePanelClick = (categoryId?: number) => {
    if (categoryId && onCategorySelect) {
      onCategorySelect(categoryId);
      window.requestAnimationFrame(onScrollToProducts);
      return;
    }

    onScrollToProducts();
  };

  return (
    <section
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "var(--bg-section, #fff)", direction: i18n.dir() }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
              style={{ color: p, fontFamily: "var(--font-body)" }}
            >
              {t("storefront.home.lookbook.eyebrow")}
            </p>
            <h2
              className="text-4xl md:text-5xl"
              style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)", color: "var(--text-heading, #1c1917)", fontWeight: 400 }}
            >
              {t("storefront.home.lookbook.title1")}
              <br />
              <span style={{ color: p, fontStyle: "italic" }}>{t("storefront.home.lookbook.title2")}</span>
            </h2>
          </div>
          <button
            onClick={onScrollToProducts}
            className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            style={{ color: p, fontFamily: "var(--font-body)" }}
          >
            {t("storefront.home.lookbook.discover")}
            {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[260px] md:auto-rows-[320px]">
          {PANELS.map((panel: any, i: number) => (
            <motion.div
              key={i}
              className={`relative overflow-hidden cursor-pointer group ${panel.span}`}
              style={{ borderRadius: "var(--card-radius, 24px)" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              whileHover={{ y: -4 }}
              onClick={() => handlePanelClick(panel.categoryId)}
            >
              {/* Image */}
              <img
                src={panel.image}
                alt={panel.headline}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover ${panel.imgClass} transition-transform duration-700 group-hover:scale-105`}
              />

              {/* Gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(26,22,20,0.78) 0%, rgba(26,22,20,0.1) 55%, transparent 100%)",
                }}
              />

              {/* Hover accent */}
              <div
                className={`absolute top-0 start-0 end-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ${i18n.dir() === "rtl" ? "origin-start" : "origin-start"}`}
                style={{ background: p }}
              />

              {/* Text */}
              <div className={`absolute ${panel.textPos} z-10`}>
                <p className="text-[10px] tracking-widest uppercase text-white/60 mb-1 font-medium" style={{ fontFamily: "var(--font-body)" }}>
                  {panel.tag}
                </p>
                <h3
                  className="text-white text-2xl md:text-3xl leading-tight mb-1 whitespace-pre-line"
                  style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)", fontWeight: 400 }}
                >
                  {panel.headline}
                </h3>
                <p className="text-white/70 text-[12px] font-medium" style={{ fontFamily: "var(--font-body)" }}>
                  {panel.sub}
                </p>
                <div
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: "#f5d6a0", fontFamily: "var(--font-body)" }}
                >
                  {t("storefront.hero.shopNow")} {i18n.dir() === "rtl" ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
