import { ReactNode, useState } from "react";
import { AiAssistant } from "@/components/ai-assistant";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Store, Package, Tags, Users, FileText,
  Menu, LogOut, LogIn, UserCog, X, Settings, ShieldCheck,
  BarChart2, Truck, Bell, RotateCcw, Zap, CreditCard, Globe,
  Download, TrendingUp, Ticket, Star, ShoppingCart, AlertTriangle, Facebook, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { getStoreUrl } from "@/lib/utils";

function getMerchantNav(merchant: { slug?: string; role?: string; isPlatformAdmin?: boolean } | null) {
  const base = [
    { name: "layout.dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "layout.storeBuilder", href: "/store-builder", icon: Wand2 },
    { name: "layout.analytics", href: "/analytics", icon: BarChart2 },
    { name: "layout.orders", href: "/orders", icon: FileText },
    { name: "layout.followUp", href: "/follow-up", icon: Bell },
    { name: "layout.products", href: "/products", icon: Package },
    { name: "layout.customers", href: "/customers", icon: Users },
    { name: "layout.returns", href: "/returns", icon: RotateCcw },
    { name: "layout.shipping", href: "/shipping-rules", icon: Truck },
    { name: "layout.automation", href: "/automation", icon: Zap },
    { name: "layout.categories", href: "/categories", icon: Tags },
    ...(merchant?.role === "owner" || merchant?.role === "manager"
      ? [{ name: "layout.staff", href: "/staff", icon: UserCog }]
      : []),
    { name: "layout.storeSettings", href: "/store-settings", icon: Settings },
    { name: "layout.tracking", href: "/tracking", icon: BarChart2 },
    { name: "layout.exports", href: "/exports", icon: Download },
    { name: "layout.billing", href: "/billing", icon: CreditCard },
    { name: "layout.domains", href: "/domains", icon: Globe },
    { name: "layout.discounts", href: "/discounts", icon: Ticket },
    { name: "layout.reviews", href: "/reviews", icon: Star },
    { name: "layout.abandonedCarts", href: "/abandoned-carts", icon: ShoppingCart },
    { name: "layout.inventoryAlerts", href: "/inventory-alerts", icon: AlertTriangle },
    { name: "layout.facebookModerator", href: "/facebook-moderator", icon: Facebook },
    { name: "layout.growth", href: "/growth", icon: TrendingUp },
    ...(merchant?.slug ? [{ name: "layout.myStore", href: getStoreUrl(merchant.slug), icon: Store, external: true }] : []),
  ];

  if (merchant?.isPlatformAdmin) {
    base.push({ name: "platform.title", href: "/platform", icon: ShieldCheck });
  }

  return base;
}

const PUBLIC_NAV = [
  { name: "common.pricing", href: "/pricing" },
];

function NavLink({ href, children, active }: { href: string; children: ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`relative text-sm font-medium transition-colors hover:text-primary ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute -bottom-[21px] start-0 end-0 h-0.5 bg-primary rounded-full"
        />
      )}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout, merchant } = useAuth();
  const { t, i18n } = useTranslation();

  const merchantNav = getMerchantNav(merchant ?? null);

  function isActive(href: string) {
    if (href === "/") return location === "/";
    if (href.startsWith("/#")) return false;
    return location === href || location.startsWith(href);
  }

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 gap-4">

          {/* Hamburger menu trigger (all screen sizes) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("layout.menu") || "Menu"}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <span className="text-2xl font-bold text-primary">{t("common.appName")}</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col p-4 space-y-1 overflow-y-auto flex-1">
                {isAuthenticated ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                      {merchant?.name ?? t("layout.myStore")}
                    </p>
                    {merchantNav.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      const navItemContent = (
                        <>
                          <Icon className="h-4 w-4" />
                          {t(item.name)}
                          {item.name === "layout.myStore" && (
                            <Badge variant="outline" className="ms-auto text-[10px] px-1.5 py-0">{t("common.public")}</Badge>
                          )}
                          {item.name === "platform.title" && (
                            <Badge className="ms-auto text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">Admin</Badge>
                          )}
                        </>
                      );
                      const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`;

                      return item.external ? (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={className}
                        >
                          {navItemContent}
                        </a>
                      ) : (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={className}
                        >
                          {navItemContent}
                        </Link>
                      );
                    })}
                    <div className="pt-4 border-t border-border/40 mt-2">
                      <button
                        onClick={() => { logout(); setMobileOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("common.buttons.logout")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {PUBLIC_NAV.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {t(item.name)}
                      </Link>
                    ))}
                    <div className="pt-4 border-t border-border/40 mt-2 space-y-2">
                      <Button className="w-full rounded-xl" asChild>
                        <Link href="/register" onClick={() => setMobileOpen(false)}>{t("common.buttons.register")}</Link>
                      </Button>
                      <Button variant="outline" className="w-full rounded-xl" asChild>
                        <Link href="/login" onClick={() => setMobileOpen(false)}>
                          <LogIn className="w-4 h-4 me-1.5" />
                          {t("common.buttons.login")}
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <motion.span
              className="text-2xl font-bold text-primary"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {t("common.appName")}
            </motion.span>
          </Link>


          {/* Right actions */}
          <div className="ms-auto flex items-center gap-2">
            {/* Language Switcher Widget */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">
                {i18n.language === "ar" ? "EN" : "العربية"}
              </span>
            </Button>

            {isAuthenticated ? (
              <>
                {merchant?.name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border/50 rounded-full px-3 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                      {merchant.name[0]}
                    </div>
                    <span className="max-w-[120px] truncate hidden sm:inline">{merchant.name}</span>
                    {merchant.isPlatformAdmin ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                        {t("common.admin")}
                      </Badge>
                    ) : merchant.role && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize hidden sm:inline-flex">
                        {t(`roles.${merchant.role}`)}
                      </Badge>
                    )}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="flex text-muted-foreground hover:text-destructive gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("common.buttons.logout")}</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="flex text-muted-foreground">
                  <Link href="/login">
                    <LogIn className="w-4 h-4 me-1.5" />
                    <span className="hidden sm:inline">{t("common.buttons.login")}</span>
                  </Link>
                </Button>
                <Button size="sm" className="rounded-full px-5" asChild>
                  <Link href="/register">{t("common.buttons.register")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

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
      <AiAssistant />

      {/* ─── Footer ─── */}
      <footer className="border-t bg-muted/20 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-primary">{t("common.appName")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("common.appSubtitle")}</p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-primary transition-colors">{t("common.pricing")}</Link>
              <Link href="/register" className="hover:text-primary transition-colors">{t("common.buttons.register")}</Link>
              <Link href="/login" className="hover:text-primary transition-colors">{t("common.buttons.login")}</Link>
            </div>
          </div>
          <div className="border-t border-border/40 mt-6 pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t("common.appName")} — {t("common.allRightsReserved")}
          </div>
        </div>
      </footer>
    </div>
  );
}
