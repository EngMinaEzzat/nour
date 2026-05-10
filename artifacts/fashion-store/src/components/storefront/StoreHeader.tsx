import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingBag, Menu, X, MessageCircle,
  Instagram, Facebook, MapPin,
} from "lucide-react";
import { productImageUrl } from "@/lib/image-url";

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
}

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
}: StoreHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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

  const NAV_LINKS = [
    { label: "وصل حديثاً", id: "new-arrivals" },
    { label: "أزياء", id: "trending" },
    { label: "جمال وعناية", id: "beauty-routine" },
    { label: "الأفضل مبيعاً", id: "best-sellers" },
    { label: "جميع المنتجات", id: "products-section" },
  ];

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
          direction: "rtl",
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
            {NAV_LINKS.map(link => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
              >
                {link.label}
                <span
                  className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-center"
                  style={{ background: p }}
                />
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onSearchOpen}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
              aria-label="بحث"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/checkout")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-stone-100"
              style={{ color: p }}
              aria-label="السلة"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                  style={{ background: p }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-all"
              aria-label="القائمة"
            >
              <Menu className="w-4 h-4" />
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
              className="fixed top-0 right-0 h-full w-[280px] z-[70] flex flex-col"
              style={{
                background: "#faf7f4",
                direction: "rtl",
                boxShadow: "-8px 0 40px rgba(26,22,20,0.15)",
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
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
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className="text-right py-3 px-3 rounded-xl text-stone-700 hover:bg-stone-100 hover:text-stone-900 font-medium text-[15px] transition-all"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {link.label}
                  </motion.button>
                ))}

                {waNum && (
                  <a
                    href={`https://wa.me/${waNum}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center gap-2 py-3 px-3 rounded-xl text-green-700 font-medium text-[15px]"
                    style={{ background: "rgba(37,211,102,0.08)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    تواصل عبر واتساب
                  </a>
                )}
              </nav>

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
                <div className="flex gap-2 mr-auto">
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
