import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  ArrowUpRight, AlertTriangle, RefreshCcw, Calendar,
  DollarSign, BarChart2, Star, RotateCcw,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const apiUrl = (path: string) => `${BASE}/api${path}`;

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

const PIE_COLORS = ["#f59e0b","#f97316","#3b82f6","#8b5cf6","#22c55e","#ef4444","#6b7280","#ec4899"];

const STOCK_STATUS_LABELS = (t: any): Record<string, { label: string; color: string }> => ({
  out_of_stock: { label: t("analytics.stockStatus.outOfStock"), color: "bg-red-100 text-red-700 border-red-200" },
  low_stock:    { label: t("analytics.stockStatus.lowStock"), color: "bg-orange-100 text-orange-700 border-orange-200" },
  ok:           { label: t("analytics.stockStatus.ok"), color: "bg-green-100 text-green-700 border-green-200" },
});

interface AnalyticsData {
  period: { from: string; to: string };
  totalOrders: number;
  grossRevenue: number;
  netRevenue: number;
  avgOrderValue: number;
  cancellationRate: number;
  returnRate: number;
  repeatCustomerCount: number;
  openReturnCases: number;
  orderStatusBreakdown: { status: string; label: string; count: number }[];
  salesByDay: { day: string; date: string; revenue: number; orders: number }[];
  topProducts: { id: number; name: string; stock: number; revenue: number; units_sold: number }[];
  lowStockProducts: { id: number; name: string; stock: number; status: string; effective_threshold: number }[];
}

function useAnalytics(tenantId: number | undefined, dateFrom: string, dateTo: string) {
  const { t } = useTranslation();
  return useQuery<AnalyticsData>({
    queryKey: ["analytics-merchant", tenantId, dateFrom, dateTo],
    enabled: !!tenantId,
    queryFn: async () => {
      const r = await fetch(apiUrl(`/analytics/merchant?dateFrom=${dateFrom}&dateTo=${dateTo}`), { credentials: "include" });
      if (!r.ok) throw new Error(t("analytics.toast.fetchError"));
      return r.json();
    },
  });
}

function KpiCard({
  title, value, sub, icon: Icon, color, trend,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div variants={stagger.item}>
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"}`}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Analytics() {
  const { t, i18n } = useTranslation();
  const { merchant } = useAuth();
  const tenantId = merchant?.tenantId;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);

  const { data, isLoading, refetch } = useAnalytics(tenantId, dateFrom, dateTo);
  const stockLabels = STOCK_STATUS_LABELS(t);

  function setPreset(days: number) {
    const d = new Date();
    const f = new Date(d.getTime() - days * 24 * 60 * 60 * 1000);
    setDateFrom(f.toISOString().split("T")[0]);
    setDateTo(d.toISOString().split("T")[0]);
  }

  if (!tenantId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center" dir={i18n.dir()}>
        <p className="text-muted-foreground">{t("analytics.page.requireLogin")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16" dir={i18n.dir()}>
      <div className="border-b bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{t("analytics.page.title")}</h1>
              <p className="text-muted-foreground text-sm mt-1">{t("analytics.page.subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5">
                {[
                  { label: t("analytics.presets.days7"), days: 7 },
                  { label: t("analytics.presets.days30"), days: 30 },
                  { label: t("analytics.presets.days90"), days: 90 },
                ].map((p) => (
                  <Button key={p.days} variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setPreset(p.days)}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-background text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent outline-none text-xs" />
                <span className="text-muted-foreground">—</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent outline-none text-xs" />
              </div>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => refetch()}>
                <RefreshCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* KPI Cards */}
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-md"><CardContent className="pt-5 pb-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : data ? (
            <>
              <KpiCard title={t("analytics.kpi.totalOrders")} value={data.totalOrders.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} icon={ShoppingCart} color="bg-blue-100 text-blue-600" />
              <KpiCard title={t("analytics.kpi.grossRevenue")} value={`${data.grossRevenue.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${i18n.language === "ar" ? "ج.م" : "EGP"}`} icon={DollarSign} color="bg-green-100 text-green-600" />
              <KpiCard title={t("analytics.kpi.netRevenue")} value={`${data.netRevenue.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${i18n.language === "ar" ? "ج.م" : "EGP"}`} sub={t("analytics.kpi.netRevenueSub")} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
              <KpiCard title={t("analytics.kpi.avgOrderValue")} value={`${data.avgOrderValue.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${i18n.language === "ar" ? "ج.م" : "EGP"}`} icon={BarChart2} color="bg-violet-100 text-violet-600" />
              <KpiCard title={t("analytics.kpi.cancellationRate")} value={`${data.cancellationRate}%`} icon={TrendingDown} color="bg-red-100 text-red-600" />
              <KpiCard title={t("analytics.kpi.returnRate")} value={`${data.returnRate}%`} icon={RotateCcw} color="bg-orange-100 text-orange-600" />
              <KpiCard title={t("analytics.kpi.repeatCustomerCount")} value={data.repeatCustomerCount.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} sub={t("analytics.kpi.repeatCustomerSub")} icon={Users} color="bg-pink-100 text-pink-600" />
              <KpiCard title={t("analytics.kpi.openReturnCases")} value={data.openReturnCases.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} icon={RefreshCcw} color="bg-amber-100 text-amber-600" />
            </>
          ) : null}
        </motion.div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Sales by Day */}
          <Card className="md:col-span-2 border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("analytics.charts.salesByDay")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data?.salesByDay ?? []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${i18n.language === "ar" ? "ج.م" : "EGP"}`, t("analytics.charts.revenueTooltip")]} />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Order Status Pie */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("analytics.charts.orderStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-56 w-full" /> : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data?.orderStatusBreakdown.filter((s) => s.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={65} innerRadius={38}>
                        {data?.orderStatusBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1">
                    {data?.orderStatusBreakdown.filter((s) => s.count > 0).slice(0, 4).map((s, i) => (
                      <div key={s.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{t(`common.orderStatus.${s.status}`, { defaultValue: s.label })}</span>
                        </div>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Low Stock */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                {t("analytics.charts.topProducts")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : (
                <div className="space-y-3">
                  {(data?.topProducts ?? []).slice(0, 5).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t("analytics.charts.noSales")}</p>
                  ) : (
                    (data?.topProducts ?? []).slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-orange-50 text-orange-600"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.units_sold} {t("analytics.charts.units")}</p>
                        </div>
                        <span className="text-sm font-semibold shrink-0">{p.revenue.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                {t("analytics.charts.lowStock")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : (
                <div className="space-y-3">
                  {(data?.lowStockProducts ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t("analytics.charts.noLowStock")}</p>
                  ) : (
                    (data?.lowStockProducts ?? []).slice(0, 6).map((p) => {
                      const st = p.stock === 0 ? "out_of_stock" : "low_stock";
                      const info = stockLabels[st];
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{t("analytics.charts.remaining")} {p.stock} {t("analytics.charts.outOf")} {p.effective_threshold}</p>
                          </div>
                          <Badge className={`text-[10px] px-2 py-0.5 border ${info.color} shrink-0`}>{info.label}</Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products Bar Chart */}
        {!isLoading && (data?.topProducts ?? []).length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("analytics.charts.productRevenue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data?.topProducts ?? []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${i18n.language === "ar" ? "ج.م" : "EGP"}`, t("analytics.charts.revenueTooltip")]} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
