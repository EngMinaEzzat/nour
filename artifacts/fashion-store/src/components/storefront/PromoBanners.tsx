import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Tag, Truck } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface PromoBannersProps {
  primaryColor: string;
  onScrollToProducts: () => void;
}

export function PromoBanners({ primaryColor: p, onScrollToProducts }: PromoBannersProps) {
  const { t, i18n } = useTranslation();
  return (
    <section
      className="py-10 px-4 sm:px-6"
      style={{ background: "#fff", direction: i18n.dir() }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Promo 1 — discount */}
        <motion.div
          className="relative overflow-hidden rounded-3xl cursor-pointer group"
          style={{
            minHeight: 200,
            background: `linear-gradient(135deg, ${p}f0, #c97b8b)`,
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.01 }}
          onClick={onScrollToProducts}
        >
          {/* BG decorative circle */}
          <div
            className="absolute -bottom-8 -start-8 w-36 h-36 rounded-full opacity-20"
            style={{ background: "rgba(255,255,255,0.3)" }}
          />
          <div
            className="absolute -top-4 -end-4 w-24 h-24 rounded-full opacity-15"
            style={{ background: "rgba(255,255,255,0.4)" }}
          />

          <div className="relative z-10 p-8 flex flex-col h-full justify-between">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-[11px] tracking-widest uppercase mb-1 font-medium">
                {t("storefront.home.promos.exclusiveOffers", "عروض حصرية")}
              </p>
              <h3
                className="text-white text-3xl mb-2"
                style={{ fontFamily: SERIF, fontWeight: 400 }}
              >
                {t("storefront.home.promos.discountUpTo", "خصم يصل إلى")}
                <br />
                <span className="text-5xl font-bold">40%</span>
              </h3>
              <p className="text-white/80 text-sm">{t("storefront.home.promos.discountDesc", "على تشكيلات مختارة — لفترة محدودة")}</p>
              <div className="mt-5 flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-3 transition-all">
                {t("storefront.hero.shopNow", "تسوقي الآن")} {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Promo 2 — shipping */}
        <motion.div
          className="relative overflow-hidden rounded-3xl cursor-pointer group"
          style={{
            minHeight: 200,
            background: "linear-gradient(135deg, #1a1614 0%, #2d2420 100%)",
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          onClick={onScrollToProducts}
        >
          {/* Golden accent */}
          <div
            className="absolute top-0 start-0 end-0 h-0.5"
            style={{ background: "linear-gradient(to left, transparent, #c8963a, transparent)" }}
          />
          <div
            className="absolute -bottom-12 -end-12 w-40 h-40 rounded-full opacity-10"
            style={{ background: "#c8963a" }}
          />

          <div className="relative z-10 p-8 flex flex-col h-full justify-between">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(200,150,58,0.15)" }}
            >
              <Truck className="w-5 h-5" style={{ color: "#c8963a" }} />
            </div>
            <div>
              <p
                className="text-[11px] tracking-widest uppercase mb-1 font-medium"
                style={{ color: "#c8963a" }}
              >
                {t("storefront.home.promos.freeShipping", "توصيل مجاني")}
              </p>
              <h3
                className="text-white text-3xl mb-2"
                style={{ fontFamily: SERIF, fontWeight: 400 }}
              >
                {t("storefront.home.promos.freeShippingText", "شحن مجاني")}
                <br />
                <span style={{ color: "#c8963a" }}>{t("storefront.home.promos.forOrdersOver", "لكل طلب فوق")}</span>
              </h3>
              <p className="text-white/50 text-sm">
                <span
                  className="text-4xl font-black"
                  style={{ fontFamily: SERIF, color: "#c8963a" }}
                >
                  999
                </span>
                {" "}{i18n.language === "ar" ? "ج.م" : "EGP"}
              </p>
              <div
                className="mt-5 flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                style={{ color: "#c8963a" }}
              >
                {t("storefront.home.promos.orderNow", "اطلبي الآن")} {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
