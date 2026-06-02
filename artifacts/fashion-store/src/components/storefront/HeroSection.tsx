import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown, Sparkles } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface HeroSectionProps {
  storeName: string;
  description?: string | null;
  coverUrl?: string | null;
  headline?: string | null;
  eyebrow?: string | null;
  ctaText?: string | null;
  imageUrl?: string | null;
  category?: string;
  primaryColor: string;
  secondaryColor?: string;
  onScrollToProducts: () => void;
}

export function HeroSection({
  storeName,
  description,
  coverUrl,
  headline,
  eyebrow,
  ctaText,
  imageUrl,
  category,
  primaryColor: p,
  secondaryColor: s,
  onScrollToProducts,
}: HeroSectionProps) {
  const { t, i18n } = useTranslation();
  const defaultHero = category === "cosmetics" ? "/hero-cosmetics-optimized.jpg" : category === "both" ? "/hero-both-optimized.jpg" : "/hero-fashion-optimized.jpg";
  const imgSrc = imageUrl || coverUrl || defaultHero;
  const tagline =
    eyebrow ||
    category === "cosmetics"
      ? t("storefront.hero.beautyDesc", { defaultValue: "Real Beauty, Ultimate Care" })
      : category === "both"
      ? t("storefront.hero.bothDesc", { defaultValue: "Elegant Fashion & Authentic Beauty" })
      : t("storefront.hero.fashionDesc", { defaultValue: "Contemporary Elegance" });

  return (
    <section
      className="relative overflow-hidden flex flex-col-reverse md:flex-row"
      style={{ minHeight: "88vh", direction: "ltr" }}
    >
      {/* Text Panel */}
      <motion.div
        className="md:w-[44%] flex flex-col justify-center px-8 md:px-14 lg:px-20 py-16 md:py-0 relative z-10"
        style={{ background: "#faf7f4" }}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      >
        {/* Eyebrow */}
        <motion.div
          className="flex items-center gap-2 mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: p }} />
          <span
            className="text-[11px] tracking-[0.25em] uppercase font-semibold"
            style={{ color: p, direction: i18n.dir() }}
          >
            {tagline}
          </span>
        </motion.div>

        {/* Store name as editorial headline */}
        <motion.h1
          className="text-6xl md:text-7xl lg:text-8xl leading-[0.9] text-[hsl(340,20%,15%)] mb-6"
          style={{ fontFamily: SERIF, fontWeight: 300, direction: i18n.dir() }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
        >
          {headline || storeName}
        </motion.h1>

        {description && (
          <motion.p
            className="text-[hsl(340,15%,45%)] text-[15px] leading-relaxed mb-8 max-w-xs"
            style={{ direction: i18n.dir() }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {description}
          </motion.p>
        )}

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          style={{ direction: i18n.dir() }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onScrollToProducts}
            className="px-8 py-3.5 text-sm font-semibold text-white rounded-full transition-all"
            style={{ background: p, letterSpacing: "0.04em" }}
            whileHover={{ scale: 1.03, boxShadow: `0 8px 28px ${p}55` }}
            whileTap={{ scale: 0.97 }}
          >
            {ctaText || t("storefront.hero.shopNow")}
          </motion.button>
          <motion.button
            onClick={() => document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 text-sm font-semibold rounded-full border-2 transition-all text-stone-700"
            style={{ borderColor: "rgba(26,22,20,0.2)" }}
            whileHover={{ borderColor: p, color: p }}
            whileTap={{ scale: 0.97 }}
          >
            {t("storefront.products.newArrivals")}
          </motion.button>
        </motion.div>

        {/* Scroll cue */}
        <motion.button
          onClick={onScrollToProducts}
          className="absolute bottom-8 right-0 left-0 flex flex-col items-center gap-1 opacity-30 hover:opacity-60 transition-opacity"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-stone-600" />
        </motion.button>
      </motion.div>

      {/* Image Panel */}
      <motion.div
        className="md:w-[56%] relative min-h-[55vw] md:min-h-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <img
          src={imgSrc}
          alt={storeName}
          width={900}
          height={1200}
          className="absolute inset-0 w-full h-full object-cover object-top"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        {/* Subtle left-edge blend */}
        <div
          className="absolute inset-0"
          style={{
            background:
              i18n.dir() === "rtl" ? "linear-gradient(to right, #faf7f4 0%, transparent 18%)" : "linear-gradient(to left, #faf7f4 0%, transparent 18%)",
          }}
        />
        {/* Bottom blend on mobile */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 md:hidden"
          style={{ background: "linear-gradient(to top, #faf7f4, transparent)" }}
        />

        {/* Floating product badge */}
        <motion.div
          className="absolute bottom-8 left-8 right-auto md:left-auto md:right-8 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
          style={{
            background: "rgba(250,247,244,0.92)",
            backdropFilter: "blur(16px)",
            direction: i18n.dir(),
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: `${p}18` }}
          >
            <Sparkles className="w-4 h-4" style={{ color: p }} />
          </div>
          <div>
            <p className="text-[11px] text-stone-400 font-medium">{t("storefront.hero.newCollection", { defaultValue: "New Collection" })}</p>
            <p className="text-[13px] font-bold text-stone-800" style={{ fontFamily: SERIF }}>
              {t("storefront.hero.seasonName", { defaultValue: "Summer 2025" })}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
