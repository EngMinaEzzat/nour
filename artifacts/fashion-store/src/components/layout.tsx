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

function getMerchantNav(merchant: { slug?: string; role?: string; isPlatformAdmin?: boolean } | null) {
  const base = [
    { name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
    { name: "محرر المتجر", href: "/store-builder", icon: Wand2 },
    { name: "التحليلات", href: "/analytics", icon: BarChart2 },
    { name: "الطلبات", href: "/orders", icon: FileText },
    { name: "المتابعة", href: "/follow-up", icon: Bell },
    { name: "المنتجات", href: "/products", icon: Package },
    { name: "العملاء", href: "/customers", icon: Users },
    { name: "المرتجعات", href: "/returns", icon: RotateCcw },
    { name: "الشحن", href: "/shipping-rules", icon: Truck },
    { name: "الأتمتة", href: "/automation", icon: Zap },
    { name: "الفئات", href: "/categories", icon: Tags },
    ...(merchant?.role === "owner" || merchant?.role === "manager"
      ? [{ name: "الفريق", href: "/staff", icon: UserCog }]
      : []),
    { name: "إعدادات المتجر", href: "/store-settings", icon: Settings },
    { name: "التتبع والبيكسلات", href: "/tracking", icon: BarChart2 },
    { name: "تصدير البيانات", href: "/exports", icon: Download },
    { name: "الفوترة", href: "/billing", icon: CreditCard },
    { name: "النطاق المخصص", href: "/domains", icon: Globe },
    { name: "أكواد الخصم", href: "/discounts", icon: Ticket },
    { name: "التقييمات", href: "/reviews", icon: Star },
    { name: "سلات متروكة", href: "/abandoned-carts", icon: ShoppingCart },
    { name: "تنبيهات المخزون", href: "/inventory-alerts", icon: AlertTriangle },
    { name: "مشرف Facebook", href: "/facebook-moderator", icon: Facebook },
    { name: "ارتقِ بمتجرك", href: "/growth", icon: TrendingUp },
    ...(merchant?.slug ? [{ name: "متجري", href: `/store/${merchant.slug}`, icon: Store }] : []),
  ];

  if (merchant?.isPlatformAdmin) {
    base.push({ name: "لوحة المشغّل", href: "/platform", icon: ShieldCheck });
  }

  return base;
}

const PUBLIC_NAV = [
  { name: "الأسعار", href: "/pricing" },
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

  const merchantNav = getMerchantNav(merchant ?? null);

  function isActive(href: string) {
    if (href === "/") return location === "/";
    if (href.startsWith("/#")) return false;
    return location === href || location.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 gap-4">

          {/* Hamburger menu trigger (all screen sizes) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <span className="text-2xl font-bold text-primary">نور</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col p-4 space-y-1 overflow-y-auto flex-1">
                {isAuthenticated ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                      {merchant?.name ?? "متجري"}
                    </p>
                    {merchantNav.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                          {item.name === "متجري" && (
                            <Badge variant="outline" className="ms-auto text-[10px] px-1.5 py-0">عام</Badge>
                          )}
                          {item.name === "لوحة المشغّل" && (
                            <Badge className="ms-auto text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">Admin</Badge>
                          )}
                        </Link>
                      );
                    })}
                    <div className="pt-4 border-t border-border/40 mt-2">
                      <button
                        onClick={() => { logout(); setMobileOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        تسجيل الخروج
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
                        {item.name}
                      </Link>
                    ))}
                    <div className="pt-4 border-t border-border/40 mt-2 space-y-2">
                      <Button className="w-full rounded-xl" asChild>
                        <Link href="/register" onClick={() => setMobileOpen(false)}>ابدأ مجاناً</Link>
                      </Button>
                      <Button variant="outline" className="w-full rounded-xl" asChild>
                        <Link href="/login" onClick={() => setMobileOpen(false)}>
                          <LogIn className="w-4 h-4 me-1.5" />
                          دخول التجار
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
              نور
            </motion.span>
          </Link>


          {/* Right actions */}
          <div className="ms-auto flex items-center gap-2">
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
                        مشغّل
                      </Badge>
                    ) : merchant.role && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize hidden sm:inline-flex">
                        {merchant.role === "owner" ? "مالك" : merchant.role === "manager" ? "مدير" : "موظف"}
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
                  <span className="hidden sm:inline">خروج</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="flex text-muted-foreground">
                  <Link href="/login">
                    <LogIn className="w-4 h-4 me-1.5" />
                    <span className="hidden sm:inline">دخول</span>
                  </Link>
                </Button>
                <Button size="sm" className="rounded-full px-5" asChild>
                  <Link href="/register">ابدأ مجاناً</Link>
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
              <p className="text-2xl font-bold text-primary">نور</p>
              <p className="text-sm text-muted-foreground mt-1">منصة التجارة الإلكترونية المصرية للأزياء والجمال</p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-primary transition-colors">الأسعار</Link>
              <Link href="/register" className="hover:text-primary transition-colors">ابدأ مجاناً</Link>
              <Link href="/login" className="hover:text-primary transition-colors">دخول التجار</Link>
            </div>
          </div>
          <div className="border-t border-border/40 mt-6 pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} نور — جميع الحقوق محفوظة
          </div>
        </div>
      </footer>
    </div>
  );
}
