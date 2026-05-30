import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useGetMerchantAnalytics, getGetMerchantAnalyticsQueryKey,
  useGetEntitlements, useGetStorefront, getGetStorefrontQueryKey
} from "@workspace/api-client-react";
import LaunchReadinessFlow from "@/components/launch-readiness-flow";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Users, Package, ArrowUpRight,
  Clock, ChevronLeft, Store, BarChart2, CheckCircle2,
  Circle, ChevronDown, ChevronUp, Rocket, Zap, AlertTriangle,
  Wand2, Truck, CreditCard, Eye,
} from "lucide-react";
import { useState } from "react";

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  awaiting_confirmation: "#f97316",
  confirmed: "#3b82f6",
  dispatched: "#8b5cf6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  returned: "#6b7280",
};

const SUB_STATUS_COLORS: Record<string, string> = {
  trial:     "bg-blue-100 text-blue-700 border-blue-200",
  active:    "bg-green-100 text-green-700 border-green-200",
  past_due:  "bg-orange-100 text-orange-700 border-orange-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  canceled:  "bg-gray-100 text-gray-600 border-gray-200",
};

// removed manual onboarding constants
function KPICard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
  return (
    <motion.div
      variants={stagger.item}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      <Card className="border-border/60 hover:border-primary/30 bg-card/60 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative group">
        <div className={`absolute inset-y-0 start-0 w-1.5 ${color} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <CardContent className="p-5 ps-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">{label}</p>
              <p className="text-2xl font-black text-foreground truncate tracking-tight">{value}</p>
              {sub && <p className="text-xs text-muted-foreground/80 mt-1 font-medium leading-relaxed">{sub}</p>}
              {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                  <ArrowUpRight className={`w-3.5 h-3.5 ${trend < 0 ? "rotate-180" : ""}`} strokeWidth={2.5} />
                  <span>{trend >= 0 ? "+" : ""}{trend}%</span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20 shrink-0 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyChart({ height = 200, t }: { height?: number; t: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-muted-foreground/60 border border-dashed border-border/60 rounded-2xl bg-muted/10 p-6 text-center"
      style={{ height }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-3 p-3 rounded-full bg-primary/5 text-primary shrink-0"
      >
        <BarChart2 className="w-8 h-8" strokeWidth={1.5} />
      </motion.div>
      <p className="text-sm font-bold text-foreground mb-1 leading-normal px-4">{t("dashboard.kpi.noData")}</p>
      <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-[280px] px-4">{t("dashboard.kpi.noDataSub")}</p>
    </motion.div>
  );
}

function UsageBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const warn = pct >= 90;
  const near = pct >= 70;
  return (
    <div className="space-y-1">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${warn ? "bg-red-500" : near ? "bg-orange-400" : color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value.toLocaleString()}</span>
        <span>{max === -1 ? "∞" : max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function PlanUsageCard() {
  const { t, i18n } = useTranslation();
  const { data: ent, isLoading } = useGetEntitlements();

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </motion.div>
    );
  }
  if (!ent) return null;

  const subColor = SUB_STATUS_COLORS[ent.subscriptionStatus] ?? SUB_STATUS_COLORS.trial;
  const subLabel = t(`dashboard.subStatus.${ent.subscriptionStatus}`, { defaultValue: t("dashboard.subStatus.trial") });
  const productLimit = ent.plan.productLimit;
  const unlimited = productLimit === -1;
  const atLimit = ent.atProductLimit;
  const nearLimit = ent.nearProductLimit;
  const { merchant } = useAuth();
  
  const daysLeft = (merchant as any)?.trialEndsAt 
    ? Math.max(0, Math.ceil((new Date((merchant as any).trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;
  const isTrial = ent.subscriptionStatus === "trial";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-6"
    >
      <Card className={`border ${atLimit ? "border-red-200 bg-red-50/30 dark:border-red-800/30" : nearLimit ? "border-orange-200 bg-orange-50/20 dark:border-orange-800/20" : "border-border/50"} overflow-hidden`}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">{t("dashboard.kpi.plan")} {t(`dashboard.plan.${ent.planCode}`, { defaultValue: ent.planCode })}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 border ${subColor}`}>{subLabel}</Badge>
                  {isTrial && (merchant as any)?.trialEndsAt && (
                    <span className="text-xs text-muted-foreground ms-1">
                      ({daysLeft} {t("billing.banners.trialDaysLeft", { days: "" }).replace(/\d+/, "").trim()} · {t("billing.banners.trialEndsOn", { date: new Date((merchant as any).trialEndsAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US") }).replace("Trial ends on ", "")})
                    </span>
                  )}
                  {atLimit && (
                    <Badge className="text-[10px] px-1.5 py-0 border bg-red-100 text-red-700 border-red-200">
                      <AlertTriangle className="w-2.5 h-2.5 me-0.5" /> {t("dashboard.kpi.reachedLimit")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unlimited
                    ? t("dashboard.kpi.unlimited")
                    : `${ent.usage.productCount} / ${productLimit}`}
                </p>
              </div>
            </div>

            {!unlimited && (
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1.5">{t("dashboard.kpi.productUsage")}</p>
                <UsageBar value={ent.usage.productCount} max={productLimit} />
              </div>
            )}

            {(atLimit || nearLimit) && ent.planCode !== "pro" && (
              <Button size="sm" className="shrink-0 rounded-xl" asChild>
                <Link href="/pricing">{t("dashboard.kpi.upgradePlan")}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// old onboarding checklist removed

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { merchant } = useAuth();
  const tenantId = merchant?.tenantId;

  const { data: analytics, isLoading: analyticsLoading } = useGetMerchantAnalytics(
    { tenantId: tenantId! },
    { query: { enabled: !!tenantId, queryKey: getGetMerchantAnalyticsQueryKey({ tenantId: tenantId! }) } }
  );

  const { data: storefront } = useGetStorefront(merchant?.slug ?? "", {
    query: { enabled: !!merchant?.slug, queryKey: getGetStorefrontQueryKey(merchant?.slug ?? "") }
  });

  const isLoading = analyticsLoading;

  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const curr = i18n.language === "ar" ? "ج.م" : "EGP";

  const kpiCards = analytics
    ? [
        {
          label: t("dashboard.kpi.revenue"),
          value: `${analytics.totalRevenue.toLocaleString(locale)} ${curr}`,
          sub: `${t("dashboard.kpi.avgOrder")} ${analytics.avgOrderValue.toLocaleString(locale)} ${curr}`,
          icon: TrendingUp,
          color: "bg-primary",
          trend: analytics.revenueThisMonth,
        },
        {
          label: t("dashboard.kpi.totalOrders"),
          value: analytics.totalOrders,
          sub: `${analytics.pendingOrders} ${t("dashboard.kpi.pendingOrders")}`,
          icon: ShoppingCart,
          color: "bg-blue-500",
          trend: analytics.ordersThisMonth,
        },
        {
          label: t("dashboard.kpi.customers"),
          value: analytics.totalCustomers,
          sub: t("dashboard.kpi.registeredCustomer"),
          icon: Users,
          color: "bg-violet-500",
        },
        {
          label: t("dashboard.kpi.revenueThisMonth"),
          value: `${analytics.revenueThisMonth.toLocaleString(locale)} ${curr}`,
          sub: `${analytics.ordersThisMonth} ${t("dashboard.kpi.ordersThisMonth")}`,
          icon: ArrowUpRight,
          color: "bg-green-500",
        },
      ]
    : [];

  const hasOrders = (analytics?.totalOrders ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {t("dashboard.header.welcome", { name: merchant?.storeName ?? t("dashboard.header.merchant") })}
            </h1>
            <p className="text-muted-foreground text-sm">{t("dashboard.header.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl" size="sm">
              <Link href="/analytics">
                <BarChart2 className="w-4 h-4" /> {t("dashboard.header.analytics")} <ChevronLeft className="w-3 h-3 rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 rounded-xl" size="sm">
              <Link href="/orders">
                <ShoppingCart className="w-4 h-4" /> {t("dashboard.header.orders")} <ChevronLeft className="w-3 h-3 rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Launch Readiness Flow */}
      {storefront && (
        <LaunchReadinessFlow 
          config={storefront.storeConfig as any} 
          productCount={storefront.totalProducts ?? 0}
          storeSlug={merchant?.slug ?? ""}
        />
      )}

      {/* Plan usage */}
      <PlanUsageCard />

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
        variants={stagger.container} initial="hidden" animate="show"
      >
        {isLoading
          ? Array(4).fill(0).map((_, i) => (
            <motion.div key={i} variants={stagger.item}>
              <Card className="border-border/50"><CardContent className="pt-5 pb-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            </motion.div>
          ))
          : kpiCards.map((c) => <KPICard key={c.label} {...c} />)
        }
      </motion.div>

      {/* Bottom layout: Revenue + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue chart */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t("dashboard.charts.revenue30d")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : !hasOrders || !analytics?.salesByDay.length ? (
                <EmptyChart height={224} t={t} />
              ) : (
                <ResponsiveContainer width="100%" height={224}>
                  <AreaChart data={analytics.salesByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontFamily: "inherit", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false}
                      interval={Math.floor((analytics.salesByDay.length - 1) / 6)}
                    />
                    <YAxis
                      tick={{ fontFamily: "inherit", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? "k" : ""}`}
                      width={42}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toLocaleString(locale)} ${curr}`, t("dashboard.charts.revenue")]}
                      labelFormatter={(l) => `${l}`}
                      contentStyle={{
                        fontFamily: "inherit", direction: i18n.dir(),
                        borderRadius: "12px", border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {t("dashboard.charts.recentOrders")}
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                  <Link href="/orders">{t("dashboard.charts.viewAll")} <ChevronLeft className="w-3 h-3 rtl:-scale-x-100" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : !analytics?.recentOrders.length ? (
                <div className="text-center py-12 text-muted-foreground/40">
                  <Store className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">{t("dashboard.charts.noOrders")}</p>
                </div>
              ) : (
                analytics.recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group border border-transparent hover:border-border/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-foreground">#{order.id}</span>
                          <Badge
                            className="text-[9px] px-1.5 py-0 border leading-tight"
                            style={{
                              backgroundColor: `${STATUS_COLORS[order.status]}15`,
                              color: STATUS_COLORS[order.status],
                              borderColor: `${STATUS_COLORS[order.status]}40`,
                            }}
                          >
                            {t(`dashboard.status.${order.status}`, { defaultValue: order.status })}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t(`dashboard.payment.${order.paymentMethod}`, { defaultValue: order.paymentMethod })}
                          {" · "}
                          {new Date(order.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-[13px] font-bold text-primary">
                          {Number(order.totalAmount ?? 0).toLocaleString(locale)} {curr}
                        </p>
                        <ChevronLeft className="w-3 h-3 text-muted-foreground ms-auto mt-0.5 group-hover:text-primary transition-colors rtl:-scale-x-100" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
