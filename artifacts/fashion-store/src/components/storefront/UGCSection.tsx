import { motion } from "framer-motion";
import { Instagram, Heart } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

const UGC_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400&q=80&fit=crop&crop=faces",
    likes: "2.4k",
  },
  {
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80&fit=crop&crop=faces",
    likes: "1.8k",
  },
  {
    src: "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=400&q=80&fit=crop&crop=faces",
    likes: "3.1k",
  },
  {
    src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80&fit=crop&crop=faces",
    likes: "956",
  },
  {
    src: "https://images.unsplash.com/photo-1502767089025-6572583495f9?w=400&q=80&fit=crop&crop=faces",
    likes: "4.2k",
  },
  {
    src: "https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=400&q=80&fit=crop&crop=faces",
    likes: "1.3k",
  },
];

interface UGCSectionProps {
  primaryColor: string;
  instagramUrl?: string | null;
}

export function UGCSection({ primaryColor: p, instagramUrl }: UGCSectionProps) {
  return (
    <section
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "#faf7f4", direction: "rtl" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p
            className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
            style={{ color: p }}
          >
            مجتمعنا
          </p>
          <h2
            className="text-4xl md:text-5xl text-stone-900 mb-3"
            style={{ fontFamily: SERIF, fontWeight: 400 }}
          >
            إلهامنا من
            <br />
            <span style={{ color: p, fontStyle: "italic" }}>عملاءنا</span>
          </h2>
          <p className="text-stone-400 text-sm max-w-sm mx-auto">
            شاركينا لوك اليوم بـ <span className="font-semibold text-stone-600">#نور</span>
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {UGC_IMAGES.map((item, i) => (
            <motion.div
              key={i}
              className="relative aspect-square overflow-hidden rounded-2xl group cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              whileHover={{ scale: 1.02 }}
            >
              <img
                src={item.src}
                alt={`لوك ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-1">
                  <Heart className="w-5 h-5 text-white fill-white" />
                  <span className="text-white text-xs font-bold">{item.likes}</span>
                </div>
              </div>

              {/* Instagram icon on corner */}
              <div
                className="absolute top-2 start-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(255,255,255,0.9)" }}
              >
                <Instagram className="w-2.5 h-2.5" style={{ color: "#c13584" }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        {instagramUrl && (
          <div className="text-center mt-8">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold border-2 transition-all hover:shadow-lg"
              style={{ borderColor: "#c13584", color: "#c13584" }}
            >
              <Instagram className="w-4 h-4" />
              تابعينا على إنستغرام
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
