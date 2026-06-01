import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Shield, Truck, RotateCcw, Headphones } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

export interface TrustStripProps {
  primaryColor: string;
}

export function TrustStrip({ primaryColor: p }: TrustStripProps) {
  const { t, i18n } = useTranslation();
  
  const TRUST_ITEMS = [
    {
      icon: <Truck className="w-6 h-6" />,
      title: t("storefront.home.trust.shipping"),
      desc: t("storefront.home.trust.shippingDesc"),
      accent: "#8B1A35",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t("storefront.home.trust.secure"),
      desc: t("storefront.home.trust.secureDesc"),
      accent: "#c8963a",
    },
    {
      icon: <RotateCcw className="w-6 h-6" />,
      title: t("storefront.home.trust.returns"),
      desc: t("storefront.home.trust.returnsDesc"),
      accent: "#c97b8b",
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: t("storefront.home.trust.support"),
      desc: t("storefront.home.trust.supportDesc"),
      accent: "#7a5c9e",
    },
  ];

  return (
    <section
      className="py-14 px-4 sm:px-6 border-y"
      style={{
        background: "#fff",
        borderColor: "rgba(139,26,53,0.07)",
        direction: i18n.dir(),
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              className="flex flex-col items-center text-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              {/* Icon ring */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: `${item.accent}12`, color: item.accent }}
              >
                {item.icon}
              </div>

              <div>
                <h4
                  className="text-[hsl(340,20%,15%)] font-semibold text-[15px] mb-1"
                  style={{ fontFamily: SERIF }}
                >
                  {item.title}
                </h4>
                <p className="text-stone-400 text-[12px] leading-relaxed max-w-[150px] mx-auto">
                  {item.desc}
                </p>
              </div>

              {/* Dot accent */}
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: item.accent }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
