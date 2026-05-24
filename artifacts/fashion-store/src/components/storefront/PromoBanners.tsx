import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Tag, Truck } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface PromoBannersProps {
  primaryColor: string;
  onScrollToProducts: (discount?: number) => void;
  content?: any;
}

export function PromoBanners({ primaryColor: p, onScrollToProducts, content }: PromoBannersProps) {
  const { t, i18n } = useTranslation();
  
  // Use content or fallback to translation defaults
  const promo1Label = content?.promo1Label || t("storefront.home.promos.exclusiveOffers", "عروض حصرية");
  const promo1Heading = content?.promo1Heading || t("storefront.home.promos.discountUpTo", "خصم يصل إلى");
  const promo1Discount = content?.promo1Discount || "40";
  const promo1Desc = content?.promo1Desc || t("storefront.home.promos.discountDesc", "على تشكيلات مختارة — لفترة محدودة");
  const promo1Cta = content?.promo1Cta || t("storefront.hero.shopNow", "تسوقي الآن");
  
  const promo2Label = content?.promo2Label || t("storefront.home.promos.freeShipping", "توصيل مجاني");
  const promo2Heading = content?.promo2Heading || t("storefront.home.promos.freeShippingText", "شحن مجاني");
  const promo2Subheading = content?.promo2Subheading || t("storefront.home.promos.forOrdersOver", "لكل طلب فوق");
  const promo2Threshold = content?.promo2Threshold || "999";
  const promo2Cta = content?.promo2Cta || t("storefront.home.promos.orderNow", "اطلبي الآن");

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
          onClick={() => onScrollToProducts(parseInt(promo1Discount, 10))}
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
                {promo1Label}
              </p>
              <h3
                className="text-white text-3xl mb-2"
                style={{ fontFamily: SERIF, fontWeight: 400 }}
              >
                {promo1Heading}
                <br />
                <span className="text-5xl font-bold">{promo1Discount}%</span>
              </h3>
              <p className="text-white/80 text-sm">{promo1Desc}</p>
              <div className="mt-5 flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-3 transition-all">
                {promo1Cta} {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
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
          onClick={() => onScrollToProducts()}
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
                {promo2Label}
              </p>
              <h3
                className="text-white text-3xl mb-2"
                style={{ fontFamily: SERIF, fontWeight: 400 }}
              >
                {promo2Heading}
                <br />
                <span style={{ color: "#c8963a" }}>{promo2Subheading}</span>
              </h3>
              <p className="text-white/50 text-sm">
                <span
                  className="text-4xl font-black"
                  style={{ fontFamily: SERIF, color: "#c8963a" }}
                >
                  {promo2Threshold}
                </span>
                {" "}{i18n.language === "ar" ? "ج.م" : "EGP"}
              </p>
              <div
                className="mt-5 flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                style={{ color: "#c8963a" }}
              >
                {promo2Cta} {i18n.dir() === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
