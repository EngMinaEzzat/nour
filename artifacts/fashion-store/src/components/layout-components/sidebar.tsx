import { Link } from "wouter";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { NavUrgencyBadge } from "./nav-urgency-badge";
import { MerchantNavGroup, MerchantNavItem } from "./navigation-config";
import { BADGE_CONFIG, NavBadgeKey } from "@/hooks/use-layout-data";
import { useState } from "react";

interface SidebarProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  merchantNav: MerchantNavGroup[];
  navBadges: Record<NavBadgeKey, number>;
  isActive: (href: string) => boolean;
}

export function Sidebar({
  sidebarCollapsed,
  toggleSidebar,
  merchantNav,
  navBadges,
  isActive,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const renderSidebarNav = (isCollapsed: boolean) => {
    return merchantNav.map((group) => {
      const groupTitle =
        t(group.title) === group.title ? group.fallback : t(group.title);

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
                {advancedOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="h-px bg-border/40 my-2 mx-3" />
            )}

            <AnimatePresence initial={false}>
              {(!isCollapsed ? advancedOpen : true) && (
                <motion.div
                  initial={!isCollapsed ? { height: 0, opacity: 0 } : undefined}
                  animate={
                    !isCollapsed ? { height: "auto", opacity: 1 } : undefined
                  }
                  exit={!isCollapsed ? { height: 0, opacity: 0 } : undefined}
                  className={`overflow-hidden flex flex-col space-y-1 mt-1 ${
                    !isCollapsed ? "pe-2 border-e-2 me-4 border-border/40" : ""
                  }`}
                >
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const label =
                      item.name === "common.pricing"
                        ? "Subscription / Plans"
                        : t(item.name);
                    const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } ${isCollapsed ? "justify-center" : ""}`;

                    const badgeCount = (
                      item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])
                    ).reduce((acc, key) => acc + (navBadges[key] || 0), 0);

                    const content = (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={className}
                        aria-current={active ? "page" : undefined}
                      >
                        <motion.div
                          whileHover={{ rotate: 8, scale: 1.15, y: -1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          }}
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
                        )}
                      </Link>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>{content}</TooltipTrigger>
                          <TooltipContent
                            side={i18n.dir() === "rtl" ? "left" : "right"}
                          >
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
              const label =
                item.name === "common.pricing"
                  ? "Subscription / Plans"
                  : t(item.name);
              const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${isCollapsed ? "justify-center" : ""}`;

              const badgeCount = (
                item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])
              ).reduce((acc, key) => acc + (navBadges[key] || 0), 0);

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
                      {(
                        item.badgeKeys || (item.badgeKey ? [item.badgeKey] : [])
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
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent
                      side={i18n.dir() === "rtl" ? "left" : "right"}
                    >
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

  return (
    <aside
      className={`hidden md:flex flex-col border-e border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
        sidebarCollapsed
          ? "w-[var(--sidebar-width-collapsed)]"
          : "w-[var(--sidebar-width-expanded)]"
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40 shrink-0">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">
              {t("common.appName")}
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ms-auto text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? t("layout.expand") : t("layout.collapse")}
          aria-label={sidebarCollapsed ? t("layout.expand") : t("layout.collapse")}
        >
          <Menu className="h-4 w-4" />
          {!sidebarCollapsed && (
            <span className="sr-only">{t("layout.collapse")}</span>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {renderSidebarNav(sidebarCollapsed)}
      </div>
    </aside>
  );
}
