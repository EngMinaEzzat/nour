import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface Category {
  label: string;
  labelEn: string;
  image: string;
  accent: string;
}

const FASHION_CATS: Category[] = [
  {
    label: "فساتين",
    labelEn: "Dresses",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&fit=crop",
    accent: "#c97b8b",
  },
  {
    label: "توبات وبلوزات",
    labelEn: "Tops",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80&fit=crop",
    accent: "#8B1A35",
  },
  {
    label: "شنط وإكسسوارات",
    labelEn: "Bags",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80&fit=crop",
    accent: "#c8963a",
  },
  {
    label: "أحذية",
    labelEn: "Shoes",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80&fit=crop",
    accent: "#7a5c4a",
  },
];

const BEAUTY_CATS: Category[] = [
  {
    label: "مكياج",
    labelEn: "Makeup",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80&fit=crop",
    accent: "#c97b8b",
  },
  {
    label: "عناية بالبشرة",
    labelEn: "Skincare",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80&fit=crop",
    accent: "#8B1A35",
  },
  {
    label: "عناية بالشعر",
    labelEn: "Hair Care",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80&fit=crop",
    accent: "#c8963a",
  },
  {
    label: "عطور",
    labelEn: "Fragrance",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80&fit=crop",
    accent: "#7a5c4a",
  },
];

interface CategoryGridProps {
  primaryColor: string;
  storeCategory?: string;
  onScrollToProducts: () => void;
}

export function CategoryGrid({
  primaryColor: p,
  storeCategory,
  onScrollToProducts,
}: CategoryGridProps) {
  const cats =
    storeCategory === "cosmetics"
      ? BEAUTY_CATS
      : storeCategory === "both"
      ? [...FASHION_CATS.slice(0, 2), ...BEAUTY_CATS.slice(0, 2)]
      : FASHION_CATS;

  return (
    <section
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "#fff", direction: "rtl" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {cats.map((cat, i) => (
            <motion.button
              key={cat.labelEn}
              onClick={onScrollToProducts}
              className="relative overflow-hidden rounded-2xl group cursor-pointer text-right"
              style={{ aspectRatio: "3/4" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              {/* Image */}
              <img
                src={cat.image}
                alt={cat.label}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                style={{ transform: "scale(1)" }}
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(26,22,20,0.75) 0%, rgba(26,22,20,0.15) 50%, transparent 100%)",
                }}
              />

              {/* Accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right"
                style={{ background: cat.accent }}
              />

              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p
                  className="text-white/60 text-[10px] tracking-widest uppercase mb-0.5 font-medium"
                >
                  {cat.labelEn}
                </p>
                <h3
                  className="text-white text-xl md:text-2xl"
                  style={{ fontFamily: SERIF, fontWeight: 400 }}
                >
                  {cat.label}
                </h3>
                <div
                  className="mt-2 flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: cat.accent }}
                >
                  تسوقي الآن
                  <ArrowLeft className="w-3 h-3" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
