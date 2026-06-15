import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  return (
    <section
      className="py-16 md:py-24 px-4 sm:px-6"
      style={{ background: "var(--bg-main, #faf7f4)", direction: i18n.dir() }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p
            className="text-[11px] tracking-[0.25em] uppercase mb-2 font-medium"
            style={{ color: p, fontFamily: "var(--font-body)" }}
          >
            {t("storefront.home.ugc.eyebrow")}
          </p>
          <h2
            className="text-4xl md:text-5xl mb-3"
            style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)", color: "var(--text-heading, #1c1917)", fontWeight: 400 }}
          >
            {t("storefront.home.ugc.title1")}
            <br />
            <span style={{ color: p, fontStyle: "italic" }}>{t("storefront.home.ugc.title2")}</span>
          </h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-body, #78716c)", fontFamily: "var(--font-body)" }}>
            {t("storefront.home.ugc.subtitle")} <span className="font-semibold" style={{ color: "var(--text-heading, #44403c)" }}>#{t("storefront.home.ugc.hashtag")}</span>
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {UGC_IMAGES.map((item, i) => (
            <motion.div
              key={i}
              className="relative aspect-square overflow-hidden group cursor-pointer"
              style={{ borderRadius: "var(--card-radius, 16px)" }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              whileHover={{ scale: 1.02 }}
            >
              <img
                src={item.src}
                alt={`${t("storefront.home.ugc.look")} ${i + 1}`}
                loading="lazy"
                decoding="async"
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
                className={`absolute top-2 ${i18n.dir() === "rtl" ? "start-2" : "start-2"} w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
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
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold border-2 transition-all hover:shadow-lg"
              style={{ borderColor: "#c13584", color: "#c13584", borderRadius: "var(--btn-radius, 9999px)", fontFamily: "var(--font-body)" }}
            >
              <Instagram className="w-4 h-4" />
              {t("storefront.home.ugc.followUs")}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
