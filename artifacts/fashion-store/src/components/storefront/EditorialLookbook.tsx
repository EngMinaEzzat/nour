import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

const PANELS = [
  {
    image:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80&fit=crop&crop=faces",
    tag: "أزياء • Fashion",
    headline: "الجمال\nالمصري",
    sub: "تشكيلة حصرية مستوحاة من التراث",
    span: "col-span-2 md:col-span-1 row-span-2",
    textPos: "bottom-8 start-6",
    imgClass: "object-center",
  },
  {
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80&fit=crop&crop=faces",
    tag: "ربيع 2025",
    headline: "ألوان\nالربيع",
    sub: "درجات ناعمة لإطلالة مثالية",
    span: "col-span-2 md:col-span-1",
    textPos: "bottom-5 start-5",
    imgClass: "object-top",
  },
  {
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80&fit=crop&crop=faces",
    tag: "جمال • Beauty",
    headline: "سحر\nالتجميل",
    sub: "منتجات عناية فائقة الجودة",
    span: "col-span-2 md:col-span-1",
    textPos: "bottom-5 start-5",
    imgClass: "object-top",
  },
];

interface EditorialLookbookProps {
  primaryColor: string;
  onScrollToProducts: () => void;
}

export function EditorialLookbook({
  primaryColor: p,
  onScrollToProducts,
}: EditorialLookbookProps) {
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
              إلهامنا
            </p>
            <h2
              className="text-4xl md:text-5xl text-stone-900"
              style={{ fontFamily: SERIF, fontWeight: 400 }}
            >
              لوك بوك
              <br />
              <span style={{ color: p, fontStyle: "italic" }}>الموسم</span>
            </h2>
          </div>
          <button
            onClick={onScrollToProducts}
            className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            style={{ color: p }}
          >
            اكتشفي الكولكشن
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[260px] md:auto-rows-[320px]">
          {PANELS.map((panel, i) => (
            <motion.div
              key={i}
              className={`relative overflow-hidden rounded-3xl cursor-pointer group ${panel.span}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              whileHover={{ y: -4 }}
              onClick={onScrollToProducts}
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
                className="absolute top-0 start-0 end-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-start"
                style={{ background: p }}
              />

              {/* Text */}
              <div className={`absolute ${panel.textPos} z-10`}>
                <p className="text-[10px] tracking-widest uppercase text-white/60 mb-1 font-medium">
                  {panel.tag}
                </p>
                <h3
                  className="text-white text-2xl md:text-3xl leading-tight mb-1 whitespace-pre-line"
                  style={{ fontFamily: SERIF, fontWeight: 400 }}
                >
                  {panel.headline}
                </h3>
                <p className="text-white/70 text-[12px] font-medium">
                  {panel.sub}
                </p>
                <div
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: "#f5d6a0" }}
                >
                  تسوقي الآن <ArrowLeft className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
