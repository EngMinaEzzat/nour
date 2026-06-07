import i18n from "i18next";
import { useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import {
  StorefrontProductCard,
  ProductCardData,
} from "./StorefrontProductCard";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface TrendingSectionProps {
  products: ProductCardData[];
  primaryColor: string;
  addedIds: Set<number>;
  onAddToCart: (product: ProductCardData) => void;
}

export function TrendingSection({
  products,
  primaryColor: p,
  addedIds,
  onAddToCart,
}: TrendingSectionProps) {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const trending = products.slice(0, 10);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section
      id="trending"
      className="py-16 md:py-24"
      style={{
        background: "linear-gradient(180deg, #faf7f4 0%, #fff 100%)",
        direction: i18n.dir(),
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p
              className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
              style={{ color: p }}
            >
              {t("storefront.home.trending.eyebrow")}
            </p>
            <h2
              className="text-4xl md:text-5xl text-stone-900"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              {t("storefront.home.trending.title1")}
              <br />
              <span style={{ color: p, fontStyle: "italic" }}>
                {t("storefront.home.trending.title2")}
              </span>
            </h2>
          </div>
          {/* Scroll arrows */}
          <div className="flex gap-2">
            <button
              onClick={() => scroll("right")}
              className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:shadow-md"
              style={{ borderColor: "rgba(139,26,53,0.2)", color: p }}
              aria-label={t("storefront.products.scrollRight", "Scroll right")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("left")}
              className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:shadow-md"
              style={{ borderColor: "rgba(139,26,53,0.2)", color: p }}
              aria-label={t("storefront.products.scrollLeft", "Scroll left")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trend tags */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
          {(
            t("storefront.home.trending.tags", {
              returnObjects: true,
              defaultValue: [
                t("storefront.trending.tags.sneakers", {
                  defaultValue: "Sneakers",
                }),
                t("storefront.trending.tags.ballerina", {
                  defaultValue: "Ballerina",
                }),
                t("storefront.trending.tags.mini", { defaultValue: "Mini" }),
                t("storefront.trending.tags.streetStyle", {
                  defaultValue: "Street Style",
                }),
                t("storefront.trending.tags.softLuxury", {
                  defaultValue: "Soft Luxury",
                }),
                t("storefront.trending.tags.boho", { defaultValue: "Boho" }),
                t("storefront.trending.tags.monochrome", {
                  defaultValue: "Monochrome",
                }),
                t("storefront.trending.tags.floral", {
                  defaultValue: "Floral",
                }),
              ],
            }) as string[]
          ).map((tag, i) => (
            <motion.span
              key={tag}
              className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium border"
              style={{
                borderColor: i === 0 ? p : "rgba(122,96,96,0.2)",
                color: i === 0 ? p : "#7a6060",
                background: i === 0 ? `${p}0e` : "transparent",
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {i === 0 && <TrendingUp className="w-3 h-3" />}
              {tag}
            </motion.span>
          ))}
        </div>

        {/* Horizontal scroll */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {trending.map((product, i) => (
            <motion.div
              key={product.id}
              className="shrink-0 snap-start"
              style={{ width: 220 }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
            >
              <StorefrontProductCard
                product={product}
                primaryColor={p}
                inCart={addedIds.has(product.id)}
                onAdd={() => onAddToCart(product)}
                variant="portrait"
                showRating={false}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
