import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Shield, Truck, RotateCcw, Headphones } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

export interface TrustStripProps {
  primaryColor: string;
  content?: any;
}

export function TrustStrip({ primaryColor: p, content }: TrustStripProps) {
  const { t, i18n } = useTranslation();
  
  const defaultItems = [
    {
      icon: <Truck className="w-6 h-6" />,
      title: t("storefront.home.trust.shipping"),
      text: t("storefront.home.trust.shippingDesc"),
      accent: "#8B1A35",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t("storefront.home.trust.secure"),
      text: t("storefront.home.trust.secureDesc"),
      accent: "#c8963a",
    },
    {
      icon: <RotateCcw className="w-6 h-6" />,
      title: t("storefront.home.trust.returns"),
      text: t("storefront.home.trust.returnsDesc"),
      accent: "#c97b8b",
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: t("storefront.home.trust.support"),
      text: t("storefront.home.trust.supportDesc"),
      accent: "#7a5c9e",
    },
  ];

  const itemsToRender = content?.items || defaultItems;

  const getAccentColor = (icon: any, index: number) => {
    if (typeof icon !== "string") {
      return defaultItems[index % defaultItems.length].accent;
    }
    if (icon.includes("🚚") || icon.includes("⚡")) return "#8B1A35";
    if (icon.includes("🔒")) return "#c8963a";
    if (icon.includes("↩️") || icon.includes("🔄")) return "#c97b8b";
    if (icon.includes("⭐") || icon.includes("🛡️")) return "#7a5c9e";
    return p;
  };

  const renderIcon = (icon: any) => {
    if (typeof icon === "string") {
      return <span className="text-2xl">{icon}</span>;
    }
    return icon;
  };

  return (
    <section
      className="py-14 px-4 sm:px-6 border-y"
      style={{
        background: "var(--bg-section, #fff)",
        borderColor: "var(--border-color, rgba(139,26,53,0.07))",
        direction: i18n.dir(),
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {itemsToRender.map((item: any, i: number) => {
            const accent = getAccentColor(item.icon, i);
            const isHex = typeof accent === "string" && accent.startsWith("#");
            const bgStyle = isHex ? `${accent}12` : "rgba(139,26,53,0.07)";
            return (
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
                  style={{ background: bgStyle, color: accent }}
                >
                  {renderIcon(item.icon)}
                </div>

                <div>
                  <h4
                    className="font-semibold text-[15px] mb-1"
                    style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', Georgia, serif)", color: "var(--text-heading, hsl(340,20%,15%))" }}
                  >
                    {item.title}
                  </h4>
                  <p className="text-[12px] leading-relaxed max-w-[150px] mx-auto" style={{ color: "var(--text-body, #78716c)", fontFamily: "var(--font-body)" }}>
                    {"text" in item ? (item as any).text : (item as any).desc}
                  </p>
                </div>

                {/* Dot accent */}
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: accent }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
