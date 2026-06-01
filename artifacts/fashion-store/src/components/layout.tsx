import { ReactNode, useState, useEffect, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiAssistant } from "@/components/ai-assistant";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Store, Package, Tags, Users, FileText,
  Menu, LogOut, LogIn, UserCog, X, Settings, ShieldCheck,
  BarChart2, Truck, Bell, RotateCcw, Zap, CreditCard, Globe,
  Download, TrendingUp, Ticket, Star, ShoppingCart, AlertTriangle, Facebook, Wand2,
  ChevronDown, ChevronRight, ChevronLeft, Link as LinkIcon, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { getStoreUrl } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

type NavBadgeKey = "pendingOrders" | "lowStock" | "returns" | "followUp";

const BADGE_CONFIG: Record<NavBadgeKey, { icon?: ElementType; colorClass?: string }> = {
  pendingOrders: { colorClass: "bg-primary text-primary-foreground" },
  lowStock: { colorClass: "bg-destructive text-destructive-foreground" },
  returns: { icon: RotateCcw, colorClass: "bg-amber-500 text-white" },
  followUp: { icon: Bell, colorClass: "bg-red-500 text-white" },
};

type MerchantNavItem = {
  name: string;
  href: string;
  icon: ElementType;
  badgeKey?: NavBadgeKey;
  badgeKeys?: NavBadgeKey[];
};
type MerchantNavGroup = {
  title: string;
  fallback: string;
  advanced?: boolean;
  items: MerchantNavItem[];
};
type ShellOrder = { status: string };
type ShellProduct = { status: string; stock: number };

function getMerchantNav(merchant: { slug?: string; role?: string; isPlatformAdmin?: boolean } | null): MerchantNavGroup[] {
  const groups: MerchantNavGroup[] = [
    {
      title: "layout.group.storeManagement",
      fallback: "Store Management",
      items: [
        { name: "layout.dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "layout.orders", href: "/orders", icon: FileText, badgeKeys: ["pendingOrders", "returns", "followUp"] },
        { name: "layout.shipping", href: "/shipping-rules", icon: Truck },
        { name: "layout.products", href: "/products", icon: Package, badgeKey: "lowStock" },
        { name: "layout.categories", href: "/categories", icon: Tags },
        { name: "layout.customers", href: "/customers", icon: Users },
      ]
    },
    {
      title: "layout.group.marketingGrowth",
      fallback: "Marketing & Growth",
      items: [
        { name: "layout.analytics", href: "/analytics", icon: BarChart2 },
        { name: "layout.discounts", href: "/discounts", icon: Ticket },
        { name: "layout.abandonedCarts", href: "/abandoned-carts", icon: ShoppingCart },
        { name: "layout.growth", href: "/growth", icon: TrendingUp },
        { name: "layout.tracking", href: "/tracking", icon: BarChart2 },
      ]
    },
    {
      title: "layout.group.settingsPreferences",
      fallback: "Settings & Preferences",
      items: [
        { name: "layout.storeBuilder", href: "/store-builder", icon: Wand2 },
        { name: "layout.storeSettings", href: "/store-settings", icon: Settings },
        { name: "layout.domains", href: "/domains", icon: Globe },
        { name: "layout.billing", href: "/billing", icon: CreditCard },
        { name: "common.pricing", href: "/pricing", icon: CreditCard },
        ...(merchant?.role === "owner" || merchant?.role === "manager"
          ? [{ name: "layout.staff", href: "/staff", icon: UserCog }]
          : []),
      ]
    },
    {
      title: "layout.group.advancedIntegrations",
      fallback: "Advanced / Integrations",
      advanced: true,
      items: [
        { name: "layout.facebookModerator", href: "/facebook-moderator", icon: Facebook },
        { name: "layout.affiliates", href: "/affiliates", icon: LinkIcon },
        { name: "layout.automation", href: "/automation", icon: Zap },
        { name: "layout.exports", href: "/exports", icon: Download },
      ]
    }
  ];

  return groups;
}

const PUBLIC_NAV = [
  { name: "common.pricing", href: "/pricing" },
];

function NavUrgencyBadge({ count, label, icon: Icon, colorClass = "bg-destructive text-destructive-foreground" }: { count?: number; label: string; icon?: ElementType; colorClass?: string }) {
  if (!count) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none gap-0.5 ${colorClass}`}
      aria-label={`${label}: ${display}`}
      title={`${label}: ${display}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {display}
    </span>
  );
}

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { isAuthenticated, logout, merchant } = useAuth();
  const { t, i18n } = useTranslation();
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
  const tenantId = merchant?.tenantId;
  const { data: ordersResponse } = useQuery<{ data: ShellOrder[] }>({
    queryKey: ["layout-orders"],
    queryFn: async () => {
      const response = await fetch(api("/orders"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load order badges");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const { data: products = [] } = useQuery<ShellProduct[]>({
    queryKey: ["layout-products", tenantId],
    queryFn: async () => {
      const search = tenantId ? `?tenantId=${tenantId}` : "";
      const response = await fetch(api(`/products${search}`), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load product badges");
      return response.json();
    },
    enabled: isAuthenticated && !!tenantId,
    staleTime: 30_000,
  });
  const { data: returns = [] } = useQuery<Array<{ status: string }>>({
    queryKey: ["returns"],
    queryFn: async () => {
      const response = await fetch(api("/returns"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load returns");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const { data: followUpQueue } = useQuery<{ total: number }>({
    queryKey: ["follow-up-queue"],
    queryFn: async () => {
      const response = await fetch(api("/follow-up/queue"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load follow-up queue");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const navBadges: Record<NavBadgeKey, number> = {
    pendingOrders: (ordersResponse?.data ?? []).filter((order) => ["pending", "awaiting_confirmation"].includes(order.status)).length,
    lowStock: products.filter((product) => product.status === "out_of_stock" || (product.stock ?? 0) <= 5).length,
    returns: returns.filter((item) => ["REQUESTED", "APPROVED", "RECEIVED"].includes(item.status)).length,
    followUp: followUpQueue?.total ?? 0,
  };

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split("?");
    const [locationPath, locationQuery = ""] = location.split("?");
    if (hrefQuery) return locationPath === hrefPath && new URLSearchParams(locationQuery).toString() === hrefQuery;
    if (hrefPath === "/orders" && new URLSearchParams(locationQuery).has("tab")) return false;
    if (href === "/") return location === "/";
    if (href.startsWith("/#")) return false;
    return locationPath === href || locationPath.startsWith(href);
  }

  function getBadge(item: MerchantNavItem) {
    return item.badgeKey ? navBadges[item.badgeKey] : 0;
  }

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };

  const renderSidebarNav = (isCollapsed: boolean) => {
    return merchantNav.map((group) => {
      const groupTitle = t(group.title) === group.title ? group.fallback : t(group.title);

      if (group.advanced) {
        return (
          <div key={group.title} className="mt-4 shrink-0">
            {!isCollapsed ? (
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                aria-expanded={advancedOpen}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-lg transition-colors"
              >
                {groupTitle}
                {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <div className="h-px bg-border/40 my-2 mx-3" />
            )}
            
            <AnimatePresence initial={false}>
              {(!isCollapsed ? advancedOpen : true) && (
                <motion.div
                  initial={!isCollapsed ? { height: 0, opacity: 0 } : undefined}
                  animate={!isCollapsed ? { height: "auto", opacity: 1 } : undefined}
                  exit={!isCollapsed ? { height: 0, opacity: 0 } : undefined}
                  className={`overflow-hidden flex flex-col space-y-1 mt-1 ${
                    !isCollapsed ? "pe-2 border-e-2 me-4 border-border/40" : ""
                  }`}
                >
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const label = item.name === "common.pricing" ? "Subscription / Plans" : t(item.name);
                    const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } ${isCollapsed ? "justify-center" : ""}`;

                    const badgeCount = (item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])).reduce(
                      (acc, key) => acc + (navBadges[key] || 0),
                      0
                    );

                    const content = (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={className}
                        aria-current={active ? "page" : undefined}
                      >
                        <motion.div
                          whileHover={{ rotate: 8, scale: 1.15, y: -1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          className="shrink-0"
                        >
                          <Icon className="h-4 w-4" />
                        </motion.div>
                        {!isCollapsed && <span>{label}</span>}
                        
                        {isCollapsed ? (
                          badgeCount > 0 && (
                            <span className="absolute top-2.5 end-2.5 w-1.5 h-1.5 rounded-full bg-destructive border border-card" />
                          )
                        ) : (
                          <div className="ms-auto flex items-center gap-1">
                            {(item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])).map((key) => (
                              <NavUrgencyBadge
                                key={key}
                                count={navBadges[key]}
                                label={key}
                                icon={BADGE_CONFIG[key]?.icon}
                                colorClass={BADGE_CONFIG[key]?.colorClass}
                              />
                            ))}
                          </div>
                        )}
                      </Link>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>{content}</TooltipTrigger>
                          <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
                            {label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return content;
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      return (
        <div key={group.title} className="mb-4 shrink-0">
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              {groupTitle}
            </p>
          )}
          <div className="flex flex-col space-y-1">
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const label = item.name === "common.pricing" ? "Subscription / Plans" : t(item.name);
              const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${isCollapsed ? "justify-center" : ""}`;

              const badgeCount = (item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])).reduce(
                (acc, key) => acc + (navBadges[key] || 0),
                0
              );

              const content = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={className}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                >
                  <motion.div
                    whileHover={{ rotate: 8, scale: 1.15, y: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="shrink-0"
                  >
                    <Icon className="h-4 w-4" />
                  </motion.div>
                  {!isCollapsed && <span>{label}</span>}
                  
                  {isCollapsed ? (
                    badgeCount > 0 && (
                      <span className="absolute top-2.5 end-2.5 w-1.5 h-1.5 rounded-full bg-destructive border border-card" />
                    )
                  ) : (
                    <div className="ms-auto flex items-center gap-1">
                      {(item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])).map((key) => (
                        <NavUrgencyBadge
                          key={key}
                          count={navBadges[key]}
                          label={key}
                          icon={BADGE_CONFIG[key]?.icon}
                          colorClass={BADGE_CONFIG[key]?.colorClass}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
                      {label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}
          </div>
        </div>
      );
    });
  };

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
        <aside
          className={`hidden md:flex flex-col border-e border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
            sidebarCollapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width-expanded)]"
          }`}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-border/40 shrink-0">
            {!sidebarCollapsed && (
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">{t("common.appName")}</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ms-auto text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? t("layout.expand") : t("layout.collapse")}
            >
              <Menu className="h-4 w-4" />
              {!sidebarCollapsed && <span className="sr-only">{t("layout.collapse")}</span>}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            {renderSidebarNav(sidebarCollapsed)}
          </div>
        </aside>
      )}

      {/* ─── Main Content Stack ─── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* ─── Header ─── */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center px-4 gap-4">

            {/* Hamburger menu trigger (mobile/tablet only) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("layout.menu") || "Menu"}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={i18n.dir() === 'rtl' ? 'right' : 'left'} className="w-72 p-0 flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
                  <Link href="/" onClick={() => setMobileOpen(false)}>
                    <span className="text-2xl font-bold text-primary">{t("common.appName")}</span>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setMobileOpen(false)} aria-label={t("common.buttons.close", "Close")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col p-4 space-y-1 overflow-y-auto flex-1">
                  {isAuthenticated ? (
                    <>
                      <div className="flex flex-col mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 border-b border-border/40 pb-3 mb-2 flex items-center justify-between">
                          {merchant?.name ?? t("layout.myStore")}
                          {merchant?.slug && (
                             <a href={getStoreUrl(merchant.slug)} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 normal-case hover:underline">
                               <Store className="w-3 h-3" />
                               {t("layout.myStore")}
                             </a>
                          )}
                        </p>
                      </div>

                      {merchantNav.map((group, groupIdx) => {
                        const groupTitle = t(group.title) === group.title ? group.fallback : t(group.title);
                        
                        if (group.advanced) {
                          return (
                            <div key={group.title} className="mt-4">
                              <button
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                aria-expanded={advancedOpen}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-lg transition-colors"
                              >
                                {groupTitle}
                                {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </button>
                              <AnimatePresence>
                                {advancedOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden flex flex-col space-y-1 mt-1 pe-2 border-e-2 me-4 border-border/40"
                                  >
                                    {group.items.map((item) => {
                                      const active = isActive(item.href);
                                      const Icon = item.icon;
                                      const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        active
                                          ? "bg-primary text-primary-foreground"
                                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                      }`;

                                      const label = item.name === "common.pricing" ? "Subscription / Plans" : t(item.name);
                                      return (
                                        <Link
                                          key={item.name}
                                          href={item.href}
                                          onClick={() => setMobileOpen(false)}
                                          className={className}
                                          data-active={active}
                                          aria-current={active ? "page" : undefined}
                                        >
                                          <Icon className="h-4 w-4" />
                                          <span>{label}</span>
                                          <div className="ms-auto flex items-center gap-1">
                                            {(item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])).map((key) => (
                                              <NavUrgencyBadge
                                                key={key}
                                                count={navBadges[key]}
                                                label={key}
                                                icon={BADGE_CONFIG[key]?.icon}
                                                colorClass={BADGE_CONFIG[key]?.colorClass}
                                              />
                                            ))}
                                          </div>
                                        </Link>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }

                        return (
                          <div key={group.title} className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                              {groupTitle}
                            </p>
                            <div className="flex flex-col space-y-1">
                              {group.items.map((item) => {
                                const active = isActive(item.href);
                                const Icon = item.icon;
                                const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`;

                                const label = item.name === "common.pricing" ? "Subscription / Plans" : t(item.name);
                                return (
                                  <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={className}
                                    data-active={active}
                                    aria-current={active ? "page" : undefined}
                                  >
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                    <div className="ms-auto flex items-center gap-1">
                                      {(item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])).map((key) => (
                                        <NavUrgencyBadge
                                          key={key}
                                          count={navBadges[key]}
                                          label={key}
                                          icon={BADGE_CONFIG[key]?.icon}
                                          colorClass={BADGE_CONFIG[key]?.colorClass}
                                        />
                                      ))}
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
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

          {/* Logo (mobile/tablet only) */}
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
              aria-label={t("layout.languageSwitcher", "Switch language")}
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
                {merchant?.slug && (
                  <Button variant="ghost" size="sm" asChild className="flex text-muted-foreground hover:text-primary gap-1.5" title={t("layout.myStore")} aria-label={t("layout.myStore")}>
                    <a href={getStoreUrl(merchant.slug)} target="_blank" rel="noreferrer">
                      <Eye className="w-4 h-4" />
                    </a>
                  </Button>
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
    </div>
  );
}
