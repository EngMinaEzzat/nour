import { ReactNode, useState, useEffect } from "react";
import { AiAssistant } from "@/components/ai-assistant";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useLayoutData } from "@/hooks/use-layout-data";
import { getMerchantNav } from "./layout-components/navigation-config";
import { Sidebar } from "./layout-components/sidebar";
import { Header } from "./layout-components/header/header";
import { Footer } from "./layout-components/footer";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout, merchant } = useAuth();
  const { i18n, t } = useTranslation();
  const { toast } = useToast();


  const isSubscriptionActive = !merchant || merchant.isPlatformAdmin || !merchant.subscriptionStatus || merchant.subscriptionStatus === "active" || (
    merchant.subscriptionStatus === "trial" &&
    (!(merchant as any).trialEndsAt || new Date((merchant as any).trialEndsAt) > new Date())
  );

  useEffect(() => {
    const currentPath = location.split("?")[0];
    if (isAuthenticated && !isSubscriptionActive && currentPath !== "/billing") {
      toast({
        title: t("billing.banners.trialExpiredNotice", { defaultValue: "انتهت الفترة التجريبية" }),
        description: t("billing.banners.trialExpiredToast", { defaultValue: "تم توجيهك إلى صفحة الاشتراك لتجديد حسابك." }),
        variant: "destructive",
      });
      navigate("/billing");
    }
  }, [isAuthenticated, isSubscriptionActive, location, navigate, toast, t]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    const newVal = !sidebarCollapsed;
    setSidebarCollapsed(newVal);
    localStorage.setItem("sidebar-collapsed", String(newVal));
  };

  const merchantNav = getMerchantNav(merchant ?? null);
  const { navBadges } = useLayoutData();

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split("?");
    const [locationPath, locationQuery = ""] = location.split("?");
    if (hrefQuery)
      return (
        locationPath === hrefPath &&
        new URLSearchParams(locationQuery).toString() === hrefQuery
      );
    if (hrefPath === "/orders" && new URLSearchParams(locationQuery).has("tab"))
      return false;
    if (href === "/") return location === "/";
    if (href.startsWith("/#")) return false;
    return locationPath === href || locationPath.startsWith(href);
  }

  useEffect(() => {
    if (mobileOpen) {
      setTimeout(() => {
        const activeEl = document.querySelector('[data-active="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 50);
    }
  }, [mobileOpen]);

  return (
    <div className={`min-h-screen bg-background flex`}>
      {/* ─── Sidebar (Desktop) ─── */}
      {isAuthenticated && merchantNav.length > 0 && (
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          merchantNav={merchantNav}
          navBadges={navBadges}
          isActive={isActive}
        />
      )}

      {/* ─── Main Content Stack ─── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* ─── Header ─── */}
        <Header
          isAuthenticated={isAuthenticated}
          merchant={merchant}
          logout={logout}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          merchantNav={merchantNav}
          navBadges={navBadges}
          isActive={isActive}
        />

        {/* ─── Main content ─── */}
        <motion.main
          key={location}
          className="flex-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.main>

        {/* ─── AI Assistant floating widget ─── */}
        {!location.startsWith("/store-builder") && <AiAssistant />}

        {/* ─── Footer ─── */}
        <Footer />
      </div>
    </div>
  );
}
