import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { MapPin, MessageCircle, Instagram, Facebook, Twitter, ArrowUp } from "lucide-react";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface StoreFooterProps {
  storeName: string;
  logoUrl?: string | null;
  description?: string | null;
  city?: string | null;
  whatsappNumber?: string | null;
  socialLinks?: string | null;
  primaryColor: string;
  onScrollToProducts: () => void;
}

export function StoreFooter({
  storeName,
  logoUrl,
  description,
  city,
  whatsappNumber,
  socialLinks,
  primaryColor: p,
  onScrollToProducts,
}: StoreFooterProps) {
  const { t, i18n } = useTranslation();
  const waNum = whatsappNumber?.replace(/\D/g, "") ?? null;
  const sl = (() => {
    try { return socialLinks ? JSON.parse(socialLinks) : {}; }
    catch { return {}; }
  })();

  const NAV_SECTIONS = [
    {
      title: t("storefront.footer.shop"),
      links: [
        { label: t("storefront.products.newArrivals"), action: () => document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" }) },
        { label: t("storefront.header.links.bestSellers"), action: () => document.getElementById("best-sellers")?.scrollIntoView({ behavior: "smooth" }) },
        { label: t("storefront.header.links.allProducts"), action: onScrollToProducts },
        { label: t("storefront.footer.offers"), action: onScrollToProducts },
      ],
    },
    {
      title: t("storefront.footer.help"),
      links: [
        { label: t("storefront.footer.trackOrder"), action: () => {} },
        { label: t("storefront.footer.returns"), action: () => {} },
        { label: t("storefront.footer.sizeGuide"), action: () => {} },
        { label: t("storefront.footer.contactUs"), action: () => waNum && window.open(`https://wa.me/${waNum}`) },
      ],
    },
  ];

  return (
    <footer
      style={{
        background: "#1a1614",
        color: "rgba(255,255,255,0.55)",
        direction: i18n.dir(),
      }}
    >
      {/* Top golden rule */}
      <div
        style={{
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(200,150,58,0.4), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl
                ? <img src={logoUrl} alt={storeName} className="w-10 h-10 rounded-xl object-cover" />
                : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                    style={{ background: p }}
                  >
                    {storeName[0]}
                  </div>
                )}
              <span
                className="text-white font-bold text-xl"
                style={{ fontFamily: SERIF }}
              >
                {storeName}
              </span>
            </div>
            {description && (
              <p className="text-sm leading-relaxed mb-4 max-w-xs line-clamp-3">
                {description}
              </p>
            )}
            {city && (
              <p className="text-xs flex items-center gap-1.5 mb-5">
                <MapPin className="w-3.5 h-3.5" />{city}، {t("storefront.footer.egypt")}
              </p>
            )}

            {/* Social icons */}
            <div className="flex gap-2">
              {sl.instagram && (
                <a
                  href={sl.instagram} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-90"
                  style={{ background: "rgba(193,53,132,0.18)", color: "#e1306c" }}
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {sl.facebook && (
                <a
                  href={sl.facebook} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-90"
                  style={{ background: "rgba(24,119,242,0.15)", color: "#1877f2" }}
                >
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {sl.twitter && (
                <a
                  href={sl.twitter} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-90"
                  style={{ background: "rgba(29,155,240,0.12)", color: "#1d9bf0" }}
                >
                  <Twitter className="w-3.5 h-3.5" />
                </a>
              )}
              {waNum && (
                <a
                  href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-90"
                  style={{ background: "rgba(37,211,102,0.12)", color: "#25D366" }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Nav columns */}
          {NAV_SECTIONS.map(section => (
            <div key={section.title}>
              <h5
                className="text-white font-semibold text-sm mb-5"
                style={{ fontFamily: SERIF }}
              >
                {section.title}
              </h5>
              <ul className="space-y-3">
                {section.links.map(link => (
                  <li key={link.label}>
                    <button
                      onClick={link.action}
                      className="text-sm transition-colors hover:text-[hsl(40,30%,98%)] text-start w-full"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Trust + WhatsApp */}
          <div>
            <h5
              className="text-white font-semibold text-sm mb-5"
              style={{ fontFamily: SERIF }}
            >
              {t("storefront.footer.weAreHere")}
            </h5>
            {waNum && (
              <a
                href={`https://wa.me/${waNum}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mb-5 transition-all hover:opacity-90"
                style={{ background: "rgba(37,211,102,0.1)", color: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4" />
                {t("storefront.footer.whatsappDirect")}
              </a>
            )}
            <div className="flex flex-wrap gap-2">
              {[
                t("storefront.trust.secure_badge", { defaultValue: "🔒 Secure Payment" }),
                t("storefront.trust.shipping_badge", { defaultValue: "📦 Fast Shipping" }),
                t("storefront.trust.returns_badge", { defaultValue: "↩️ Free Returns" }),
                t("storefront.trust.authentic_badge", { defaultValue: "⭐ 100% Authentic" })
              ].map(badge => (
                <span
                  key={badge}
                  className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span>© {new Date().getFullYear()} {storeName} — {t("storefront.footer.allRightsReserved")}</span>
          <div className="flex items-center gap-4">
            <a href="/" className="opacity-40 hover:opacity-70 transition-opacity">
              {t("storefront.footer.poweredBy")} <span className="font-black" style={{ color: p }}>Nour</span>
            </a>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <ArrowUp className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
