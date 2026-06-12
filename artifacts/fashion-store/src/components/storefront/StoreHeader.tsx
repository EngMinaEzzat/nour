import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Search, ShoppingBag, Menu, X, MessageCircle,
  Instagram, Facebook, MapPin, Globe, ChevronDown, Languages
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface StoreHeaderProps {
  storeName: string;
  logoUrl?: string | null;
  primaryColor: string;
  city?: string | null;
  whatsappNumber?: string | null;
  socialLinks?: string | null;
  cartCount: number;
  onSearchOpen: () => void;
  announcementVisible: boolean;
  categories?: Array<{ id: number; name: string; nameAr?: string | null; parentId?: number | null }>;
  onCategorySelect?: (id: number) => void;
}

import { productImageUrl } from "@/lib/image-url";

export function StoreHeader({
  storeName,
  logoUrl,
  primaryColor: p,
  city,
  whatsappNumber,
  socialLinks,
  cartCount,
  onSearchOpen,
  announcementVisible,
  categories = [],
  onCategorySelect,
}: StoreHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [animateBadge, setAnimateBadge] = useState(false);
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useCustomerAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (cartCount > 0) {
      setAnimateBadge(true);
      const timer = setTimeout(() => setAnimateBadge(false), 400);
      return () => clearTimeout(timer);
    }
    return;
  }, [cartCount]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const waNum = whatsappNumber?.replace(/\D/g, "") ?? null;
  const sl = (() => {
    try { return socialLinks ? JSON.parse(socialLinks) : {}; }
    catch { return {}; }
  })();

  const topOffset = announcementVisible ? 36 : 0;
  const glass = !scrolled;

  const rootCategories = categories.filter(c => !c.parentId);
  const childrenMap = new Map<number, typeof categories>();
  categories.forEach(c => {
    if (c.parentId) {
      if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
      childrenMap.get(c.parentId)!.push(c);
    }
  });

  function handleNavClick(id: number) {
    onCategorySelect?.(id);
    scrollTo("products-section");
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setDrawerOpen(false);
  }

  function toggleLanguage(lang: string) {
    i18n.changeLanguage(lang);
    setDrawerOpen(false);
  }

  return (
    <>
      <header
        className="fixed left-0 right-0 z-50 transition-all duration-400"
        style={{
          top: topOffset,
          height: 64,
          background: glass
            ? "rgba(250,247,244,0.72)"
            : "rgba(250,247,244,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(139,26,53,0.12)"
            : "1px solid rgba(139,26,53,0.06)",
          boxShadow: scrolled
            ? "0 2px 24px rgba(26,22,20,0.07)"
            : "none",
          direction: i18n.dir(),
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            {logoUrl
              ? <img src={productImageUrl(logoUrl)} alt={storeName} className="w-9 h-9 rounded-xl object-cover" />
              : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                  style={{ background: p }}
                >
                  {storeName[0]}
                </div>
              )}
            <span
              className="font-bold text-[15px] tracking-tight text-stone-900 hidden sm:block"
              style={{ fontFamily: SERIF, letterSpacing: "0.02em" }}
            >
              {storeName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <button
              onClick={() => scrollTo("new-arrivals")}
              className="text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              {t("storefront.products.newArrivals")}
              <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-center" style={{ background: p }} />
            </button>
            
            {rootCategories.map(cat => {
              const children = childrenMap.get(cat.id) || [];
              let label = i18n.language === "ar" ? (cat.nameAr || cat.name) : cat.name;
              if (i18n.language === "en" && typeof label === "string") {
                label = label
                  .replace("أزياء", "Fashion")
                  .replace("عناية وتجميل", "Beauty & Care")
                  .replace("إكسسوارات", "Accessories")
                  .replace("عطور", "Perfumes");
              }
              
              if (children.length > 0) {
                return (
                  <DropdownMenu key={cat.id}>
                    <DropdownMenuTrigger asChild>
                      <button className="text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors relative group flex items-center gap-1">
                        {label}
                        <ChevronDown className="w-3 h-3 opacity-50" />
                        <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-center" style={{ background: p }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuItem onClick={() => handleNavClick(cat.id)} className="font-semibold">
                        {t("storefront.home.allProducts")} {label}
                      </DropdownMenuItem>
                      {children.map(child => {
                        let childLabel = i18n.language === "ar" ? (child.nameAr || child.name) : child.name;
                        if (i18n.language === "en" && typeof childLabel === "string") {
                          childLabel = childLabel
                            .replace("أزياء", "Fashion")
                            .replace("عناية وتجميل", "Beauty & Care")
                            .replace("إكسسوارات", "Accessories")
                            .replace("عطور", "Perfumes");
                        }
                        return (
                          <DropdownMenuItem key={child.id} onClick={() => handleNavClick(child.id)}>
                            {childLabel}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              return (
                <button
                  key={cat.id}
                  onClick={() => handleNavClick(cat.id)}
                  className="text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
                >
                  {label}
                  <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-center" style={{ background: p }} />
                </button>
              );
            })}

            <button
              onClick={() => scrollTo("products-section")}
              className="text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
            >
              {t("storefront.header.links.allProducts")}
              <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-center" style={{ background: p }} />
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onSearchOpen}
              className="w-11 h-11 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
              aria-label={t("storefront.header.search")}
            >
              <Search className="w-5 h-5 md:w-4 md:h-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-11 md:h-9 px-2 min-w-[44px] md:min-w-9 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
                  aria-label={t("storefront.header.actions.language", "Language")}
                >
                  <span className="font-semibold text-xs md:text-xs uppercase tracking-wider">
                    {i18n.language === "ar" ? "العربية" : "EN"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleLanguage("ar")} className="justify-between">
                  العربية (AR)
                  {i18n.language === "ar" && <span className="text-xs text-stone-400">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleLanguage("en")} className="justify-between">
                  English (EN)
                  {i18n.language === "en" && <span className="text-xs text-stone-400">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => navigate(isAuthenticated ? "/customer/orders" : "/customer/login")}
              className="h-11 md:h-9 px-3 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all text-sm md:text-[13px] font-medium"
            >
              {isAuthenticated ? t("storefront.header.actions.account") : t("storefront.header.actions.login")}
            </button>

            <button
              onClick={() => navigate("/checkout")}
              className="relative w-11 h-11 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all hover:bg-stone-100 cursor-pointer"
              style={{ color: p }}
              aria-label={t("storefront.header.actions.cart")}
            >
              <ShoppingBag className="w-5 h-5 md:w-4 md:h-4" />
              {cartCount >= 0 && (
                <span
                  className={`absolute top-1.5 right-1.5 md:-top-0.5 md:-right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center ${animateBadge ? "animate-pulse-badge" : ""}`}
                  style={{ background: p }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-all"
              aria-label={t("layout.menu", { defaultValue: "Menu" })}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className={`fixed top-0 end-0 h-full w-[280px] z-[70] flex flex-col`}
              style={{
                background: "#faf7f4",
                direction: i18n.dir(),
                boxShadow: i18n.dir() === "rtl" ? "8px 0 40px rgba(26,22,20,0.15)" : "-8px 0 40px rgba(26,22,20,0.15)",
              }}
              initial={{ x: i18n.dir() === "rtl" ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: i18n.dir() === "rtl" ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "rgba(139,26,53,0.1)" }}
              >
                <span
                  className="font-bold text-xl text-stone-900"
                  style={{ fontFamily: SERIF }}
                >
                  {storeName}
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100"
                  aria-label={t("common.buttons.close", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav links */}
              <div className="flex-1 overflow-y-auto">
                <nav className="px-4 py-6 flex flex-col gap-1">
                  <motion.button
                    onClick={() => scrollTo("new-arrivals")}
                    className={`py-3 px-3 rounded-xl text-stone-700 hover:bg-stone-100 hover:text-stone-900 font-medium text-[15px] transition-all text-start`}
                    initial={{ opacity: 0, x: i18n.dir() === "rtl" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {t("storefront.products.newArrivals")}
                  </motion.button>

                  {rootCategories.map((cat, i) => {
                    const children = childrenMap.get(cat.id) || [];
                    const label = i18n.language === "ar" ? (cat.nameAr || cat.name) : cat.name;

                    if (children.length > 0) {
                      return (
                        <div key={cat.id} className="py-1">
                          <div className={`px-3 py-2 text-stone-900 font-semibold text-[15px] text-start`}>
                            {label}
                          </div>
                          <div className="flex flex-col gap-1 pl-4 pr-4 border-l-2 border-stone-100 ml-3">
                            <button
                              onClick={() => handleNavClick(cat.id)}
                              className={`py-2 px-3 rounded-lg text-stone-600 hover:bg-stone-100 font-medium text-sm transition-all text-start`}
                            >
                              {t("storefront.home.allProducts")}
                            </button>
                            {children.map(child => (
                              <button
                                key={child.id}
                                onClick={() => handleNavClick(child.id)}
                                className={`py-2 px-3 rounded-lg text-stone-600 hover:bg-stone-100 font-medium text-sm transition-all text-start`}
                              >
                                {i18n.language === "ar" ? (child.nameAr || child.name) : child.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <motion.button
                        key={cat.id}
                        onClick={() => handleNavClick(cat.id)}
                        className={`py-3 px-3 rounded-xl text-stone-700 hover:bg-stone-100 hover:text-stone-900 font-medium text-[15px] transition-all text-start`}
                        initial={{ opacity: 0, x: i18n.dir() === "rtl" ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        {label}
                      </motion.button>
                    );
                  })}

                  <motion.button
                    onClick={() => scrollTo("products-section")}
                    className={`py-3 px-3 rounded-xl text-stone-700 hover:bg-stone-100 hover:text-stone-900 font-medium text-[15px] transition-all text-start`}
                    initial={{ opacity: 0, x: i18n.dir() === "rtl" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {t("storefront.header.links.allProducts")}
                  </motion.button>

                {waNum && (
                  <a
                    href={`https://wa.me/${waNum}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center gap-2 py-3 px-3 rounded-xl text-green-700 font-medium text-[15px]"
                    style={{ background: "rgba(37,211,102,0.08)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    {t("storefront.header.whatsapp", { defaultValue: "Contact on WhatsApp" })}
                  </a>
                )}

                <div className="mt-auto pt-6 pb-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-stone-100 rounded-xl">
                    <span className="text-sm font-medium text-stone-600 flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      {t("storefront.header.language", { defaultValue: "Language" })}
                    </span>
                    <div className="flex bg-white rounded-lg p-0.5 shadow-sm">
                      <button
                        onClick={() => toggleLanguage("ar")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${i18n.language === "ar" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
                      >
                        AR
                      </button>
                      <button
                        onClick={() => toggleLanguage("en")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${i18n.language === "en" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                </div>
              </nav>
            </div>

              {/* Social + City */}
              <div
                className="px-5 py-5 border-t flex items-center gap-3"
                style={{ borderColor: "rgba(139,26,53,0.08)" }}
              >
                {city && (
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <MapPin className="w-3 h-3" />{city}
                  </span>
                )}
                <div className={`flex gap-2 me-auto`}>
                  {sl.instagram && (
                    <a href={sl.instagram} target="_blank" rel="noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(193,53,132,0.1)", color: "#c13584" }}>
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {sl.facebook && (
                    <a href={sl.facebook} target="_blank" rel="noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(24,119,242,0.1)", color: "#1877f2" }}>
                      <Facebook className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
