import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StorefrontProductCard, ProductCardData } from "./StorefrontProductCard";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface Category {
  id: number;
  name: string;
}

interface NewArrivalsSectionProps {
  products: ProductCardData[];
  categories: Category[];
  primaryColor: string;
  addedIds: Set<number>;
  onAddToCart: (product: ProductCardData) => void;
  onScrollToAll: () => void;
}

export function NewArrivalsSection({
  products,
  categories,
  primaryColor: p,
  addedIds,
  onAddToCart,
  onScrollToAll,
}: NewArrivalsSectionProps) {
  const { t, i18n } = useTranslation();
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  const filtered = selectedCat
    ? products.filter(pr => (pr as any).categoryId === selectedCat).slice(0, 8)
    : products.slice(0, 8);

  const tabs = [
    { id: null, label: t("storefront.home.all") },
    ...categories.slice(0, 5).map(c => ({ id: c.id, label: c.name })),
  ];

  if (products.length === 0) return null;

  return (
    <section
      id="new-arrivals"
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "#faf7f4", direction: i18n.dir() }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p
              className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
              style={{ color: p }}
            >
              {t("storefront.home.newArrivals.eyebrow")}
            </p>
            <h2
              className="text-4xl md:text-5xl text-[hsl(340,20%,15%)]"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              {t("storefront.home.newArrivals.title")}
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

        {/* Category tabs */}
        {tabs.length > 1 && (
          <div className="flex gap-2 mb-10 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map(tab => (
              <button
                key={String(tab.id)}
                onClick={() => setSelectedCat(tab.id)}
                className="shrink-0 px-5 py-2 rounded-full text-xs font-semibold transition-all"
                style={
                  selectedCat === tab.id
                    ? { background: p, color: "#fff" }
                    : {
                        background: "#fff",
                        color: "#7a6060",
                        border: "1px solid rgba(122,96,96,0.2)",
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={String(selectedCat)}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
              >
                <StorefrontProductCard
                  product={product}
                  primaryColor={p}
                  inCart={addedIds.has(product.id)}
                  onAdd={() => onAddToCart(product)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Mobile CTA */}
        <div className="mt-10 text-center md:hidden">
          <button
            onClick={onScrollToAll}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold text-white"
            style={{ background: p }}
          >
            {t("storefront.home.viewAllProducts")}
            {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
