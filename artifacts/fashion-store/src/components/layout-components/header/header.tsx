import { ReactNode } from "react";
import { Link } from "wouter";
import { Menu, LogOut, LogIn, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { getStoreUrl } from "@/lib/utils";
import { NavBadgeKey, BADGE_CONFIG } from "@/hooks/use-layout-data";
import { MerchantNavGroup } from "../navigation-config";
import { MobileMenuContent } from "./mobile-menu-content";

interface HeaderProps {
  isAuthenticated: boolean;
  merchant: any;
  logout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  merchantNav: MerchantNavGroup[];
  navBadges: Record<NavBadgeKey, number>;
  isActive: (href: string) => boolean;
}

export function Header({
  isAuthenticated,
  merchant,
  logout,
  mobileOpen,
  setMobileOpen,
  merchantNav,
  navBadges,
  isActive,
}: HeaderProps) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 gap-4">
        {/* Hamburger menu trigger (mobile/tablet only) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label={t("layout.menu") || "Menu"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side={i18n.dir() === "rtl" ? "right" : "left"}
            className="w-72 p-0 flex flex-col [&>button]:hidden"
          >
            <MobileMenuContent
              isAuthenticated={isAuthenticated}
              merchant={merchant}
              logout={logout}
              setMobileOpen={setMobileOpen}
              merchantNav={merchantNav}
              navBadges={navBadges}
              isActive={isActive}
            />
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
                  <span className="max-w-[120px] truncate hidden sm:inline">
                    {merchant.name}
                  </span>
                  {merchant.isPlatformAdmin ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-primary border-primary/30"
                    >
                      {t("common.admin")}
                    </Badge>
                  ) : (
                    merchant.role && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 capitalize hidden sm:inline-flex"
                      >
                        {t(`roles.${merchant.role}`)}
                      </Badge>
                    )
                  )}
                </div>
              )}
              {merchant?.slug && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex text-muted-foreground hover:text-primary gap-1.5"
                  title={t("layout.myStore")}
                  aria-label={t("layout.myStore")}
                >
                  <a
                    href={getStoreUrl(merchant.slug)}
                    target="_blank"
                    rel="noreferrer"
                  >
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
                <span className="hidden sm:inline">
                  {t("common.buttons.logout")}
                </span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex text-muted-foreground"
              >
                <Link href="/login">
                  <LogIn className="w-4 h-4 me-1.5" />
                  <span className="hidden sm:inline">
                    {t("common.buttons.login")}
                  </span>
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
  );
}
