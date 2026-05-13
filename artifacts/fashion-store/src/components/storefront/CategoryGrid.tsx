import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { productImageUrl } from "@/lib/image-url";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface StoreCategory {
  id: number;
  name: string;
  nameAr?: string | null;
  type?: string;
  imageUrl?: string | null;
  productCount?: number;
}

interface CategoryGridProps {
  primaryColor: string;
  categories: StoreCategory[];
  onScrollToProducts: () => void;
  onCategorySelect: (categoryId: number) => void;
}

const ACCENTS = ["#c97b8b", "#8B1A35", "#c8963a", "#6f8f72", "#7a5c4a", "#4f7c8a"];

export function CategoryGrid({
  primaryColor: p,
  categories,
  onScrollToProducts,
  onCategorySelect,
}: CategoryGridProps) {
  if (!categories.length) return null;

  return (
    <section
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "#fff", direction: "rtl" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
              style={{ color: p }}
            >
              تسوقي بالفئة
            </p>
            <h2
              className="text-4xl md:text-5xl text-stone-900"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              اكتشفي مجموعتنا
            </h2>
          </div>
          <button
            onClick={onScrollToProducts}
            className="hidden md:flex items-center gap-2 text-sm font-medium transition-all hover:gap-3"
            style={{ color: p }}
          >
            كل المنتجات
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {categories.map((category, i) => {
            const label = category.nameAr || category.name;
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <motion.button
                key={category.id}
                onClick={() => {
                  onCategorySelect(category.id);
                  window.requestAnimationFrame(onScrollToProducts);
                }}
                className="relative overflow-hidden rounded-2xl group cursor-pointer text-right bg-stone-100"
                style={{ aspectRatio: "3/4" }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${p}18, ${accent}30)` }}
                >
                  <Sparkles className="w-12 h-12 text-stone-900/25" />
                </div>
                {category.imageUrl ? (
                  <img
                    src={productImageUrl(category.imageUrl)}
                    alt={label}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                    style={{ transform: "scale(1)" }}
                  />
                ) : null}

                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(26,22,20,0.76) 0%, rgba(26,22,20,0.18) 52%, transparent 100%)",
                  }}
                />

                <div
                  className="absolute top-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right"
                  style={{ background: accent }}
                />

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white/60 text-[10px] tracking-widest uppercase mb-0.5 font-medium">
                    {category.productCount ?? 0} منتج
                  </p>
                  <h3
                    className="text-white text-xl md:text-2xl"
                    style={{ fontFamily: SERIF, fontWeight: 400 }}
                  >
                    {label}
                  </h3>
                  <div
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ color: accent }}
                  >
                    تسوقي الآن
                    <ArrowLeft className="w-3 h-3" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
