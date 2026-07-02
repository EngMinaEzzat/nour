import { Link } from "wouter";
import {
  Store,
  LogOut,
  LogIn,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { getStoreUrl } from "@/lib/utils";
import { NavBadgeKey, BADGE_CONFIG } from "@/hooks/use-layout-data";
import { MerchantNavGroup, PUBLIC_NAV } from "../navigation-config";
import { NavUrgencyBadge } from "../nav-urgency-badge";
import { useState } from "react";

interface MobileMenuContentProps {
  isAuthenticated: boolean;
  merchant: any;
  logout: () => void;
  setMobileOpen: (open: boolean) => void;
  merchantNav: MerchantNavGroup[];
  navBadges: Record<NavBadgeKey, number>;
  isActive: (href: string) => boolean;
}

export function MobileMenuContent({
  isAuthenticated,
  merchant,
  logout,
  setMobileOpen,
  merchantNav,
  navBadges,
  isActive,
}: MobileMenuContentProps) {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <span className="text-2xl font-bold text-primary">
            {t("common.appName")}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setMobileOpen(false)}
          aria-label={t("common.buttons.close", "Close")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col p-4 space-y-1 overflow-y-auto flex-1">
        {isAuthenticated ? (
          (() => {
            const isSubscriptionActive = !merchant || merchant.isPlatformAdmin || !merchant.subscriptionStatus || merchant.subscriptionStatus === "active" || (
              merchant.subscriptionStatus === "trial" &&
              (!merchant.trialEndsAt || new Date(merchant.trialEndsAt) > new Date())
            );
            return (
              <>
                <div className="flex flex-col mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 border-b border-border/40 pb-3 mb-2 flex items-center justify-between">
                    {merchant?.name ?? t("layout.myStore")}
                    {merchant?.slug && (
                      <a
                        href={getStoreUrl(merchant.slug)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary flex items-center gap-1 normal-case hover:underline"
                      >
                        <Store className="w-3 h-3" />
                        {t("layout.myStore")}
                      </a>
                    )}
                  </p>
                </div>

                {!isSubscriptionActive && (
                  <div className="mx-3 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
                      <span className="text-xs font-bold">{t("billing.banners.trialExpiredNotice", { defaultValue: "انتهت الفترة التجريبية" })}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {t("billing.banners.hamburgerRenewNotice", { defaultValue: "يرجى تجديد اشتراكك لتفعيل لوحة التحكم واستعادة جميع الميزات." })}
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full text-[10px] h-8 bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold rounded-lg"
                      asChild
                    >
                      <Link href="/billing" onClick={() => setMobileOpen(false)}>
                        {t("billing.banners.btnRenewNow", { defaultValue: "جدد اشتراكك الآن" })}
                      </Link>
                    </Button>
                  </div>
                )}

            {merchantNav.map((group, groupIdx) => {
              const groupTitle =
                t(group.title) === group.title
                  ? group.fallback
                  : t(group.title);

              if (group.advanced) {
                return (
                  <div key={group.title} className="mt-4">
                    <button
                      onClick={() => setAdvancedOpen(!advancedOpen)}
                      aria-expanded={advancedOpen}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {groupTitle}
                      {advancedOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
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

                            const label =
                              item.name === "common.pricing"
                                ? "Subscription / Plans"
                                : t(item.name);
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
                                  {(
                                    item.badgeKeys ||
                                    (item.badgeKey ? [item.badgeKey] : [])
                                  ).map((key) => (
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

                      const label =
                        item.name === "common.pricing"
                          ? "Subscription / Plans"
                          : t(item.name);
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
                            {(
                              item.badgeKeys ||
                              (item.badgeKey ? [item.badgeKey] : [])
                            ).map((key) => (
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
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                {t("common.buttons.logout")}
              </button>
            </div>
          </> ); })()
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
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  {t("common.buttons.register")}
                </Link>
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
    </>
  );
}
