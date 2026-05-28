import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Award, ArrowLeft, ArrowRight } from "lucide-react";
import { StorefrontProductCard, ProductCardData } from "./StorefrontProductCard";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface BestSellersSectionProps {
  products: ProductCardData[];
  primaryColor: string;
  addedIds: Set<number>;
  onAddToCart: (product: ProductCardData) => void;
  onScrollToAll: () => void;
}

export function BestSellersSection({
  products,
  primaryColor: p,
  addedIds,
  onAddToCart,
  onScrollToAll,
}: BestSellersSectionProps) {
  const { t, i18n } = useTranslation();
  const featured = products.filter(pr => pr.featured).slice(0, 4);
  const best = featured.length >= 2 ? featured : products.slice(0, 4);

  if (best.length === 0) return null;

  return (
    <section
      id="best-sellers"
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "#faf7f4", direction: i18n.dir() }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
              style={{ color: p }}
            >
              {t("storefront.home.bestSellers.eyebrow")}
            </p>
            <h2
              className="text-4xl md:text-5xl text-stone-900"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              {t("storefront.home.bestSellers.title1")}
              <br />
              <span style={{ color: p, fontStyle: "italic" }}>{t("storefront.home.bestSellers.title2")}</span>
            </h2>
          </div>
          <button
            onClick={onScrollToAll}
            className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            style={{ color: p }}
          >
            {t("storefront.home.viewAll")}
            {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Featured large card + 3 smaller */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {best.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={i === 0 ? "md:col-span-2 lg:col-span-2" : ""}
            >
              {/* Rank badge */}
              <div className="relative">
                <div
                  className={`absolute top-3 ${i18n.dir() === "rtl" ? "end-3" : "end-3"} z-20 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white`}
                  style={{ background: i === 0 ? "#c8963a" : p }}
                >
                  <Award className="w-2.5 h-2.5" />
                  #{i + 1}
                </div>
                <StorefrontProductCard
                  product={product}
                  primaryColor={p}
                  inCart={addedIds.has(product.id)}
                  onAdd={() => onAddToCart(product)}
                  variant={i === 0 ? "landscape" : "portrait"}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 text-center md:hidden">
          <button
            onClick={onScrollToAll}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold border-2"
            style={{ borderColor: p, color: p }}
          >
            {t("storefront.home.viewAllProducts")}
          </button>
        </div>
      </div>
    </section>
  );
}
