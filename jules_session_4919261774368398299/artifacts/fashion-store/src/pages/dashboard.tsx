import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMerchantAnalytics, getGetMerchantAnalyticsQueryKey,
  useGetOnboarding, usePatchOnboarding,
  useGetEntitlements,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Users, Package, ArrowUpRight,
  Clock, ChevronLeft, Store, BarChart2, CheckCircle2,
  Circle, ChevronDown, ChevronUp, Rocket, Zap, AlertTriangle,
  Wand2, Truck, CreditCard, Eye,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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

const PIE_COLORS = ["#f59e0b", "#f97316", "#3b82f6", "#8b5cf6", "#22c55e", "#ef4444", "#6b7280"];

const STATUS_LABELS: Record<string, string> = {
  pending: t("text_e722ee31", "قيد الانتظار"),
  awaiting_confirmation: t("text_0fd95e32", "بانتظار التأكيد"),
  confirmed: t("text_c6310c14", "مؤكد"),
  dispatched: t("text_01c3c4a2", "تم الإرسال"),
  shipped: t("text_c8ebe004", "تم الشحن"),
  delivered: t("text_5dfcc82d", "تم التسليم"),
  cancelled: t("text_f5eb0776", "ملغي"),
  returned: t("text_2768264b", "مُعاد"),
};

const PAYMENT_LABELS: Record<string, string> = { cod: t("text_c23f1e7d", "دفع عند الاستلام"), paymob: "Paymob" };

const PLAN_LABELS: Record<string, string> = { starter: t("text_9edb5340", "ستارتر"), growth: t("text_d12e86e1", "جروث"), pro: t("text_eecc506d", "برو") };

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  trial:     { label: t("text_5abde870", "تجريبي"),  color: "bg-blue-100 text-blue-700 border-blue-200" },
  active:    { label: t("text_8caaf953", "نشط"),     color: "bg-green-100 text-green-700 border-green-200" },
  past_due:  { label: t("text_a3365ac9", "متأخر"),   color: "bg-orange-100 text-orange-700 border-orange-200" },
  suspended: { label: t("text_75e3d97e", "موقوف"),   color: "bg-red-100 text-red-700 border-red-200" },
  canceled:  { label: t("text_f5eb0776", "ملغي"),    color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const MANUAL_ONBOARDING_STEPS = ["homepage_message", "shipping_setup", "integrations_review", "launch_review"] as const;

const ONBOARDING_STORY: Record<string, {
  chapter: string;
  story: string;
  href: string;
  action: string;
  doneAction?: string;
  icon: React.ElementType;
}> = {
  store_identity: {
    chapter: t("text_303ee4a6", "الفصل 1: أول انطباع"),
    story: t("text_6171ad3c", "العميلة تدخل متجرك وتبحث عن إشارة ثقة: اسم واضح، وصف مطمئن، وشكل يشبه علامتك."),
    href: "/store-settings#section-identity",
    action: t("text_e3681b49", "تعديل الهوية"),
    icon: Store,
  },
  homepage_message: {
    chapter: t("text_e861f17d", "الفصل 2: واجهة تحكي القصة"),
    story: t("text_2a9016bd", "قبل أن تتصفح العميلة المنتجات، تحتاج جملة وصورة تقولان لها: هذا المتجر مصمم لك."),
    href: "/store-builder?mode=editor",
    action: t("text_8c6717c5", "تخصيص الواجهة"),
    doneAction: t("text_4d732202", "اعتمدت الواجهة"),
    icon: Wand2,
  },
  first_product: {
    chapter: t("text_5dd0099e", "الفصل 3: أول قطعة تخطف العين"),
    story: t("text_d8c5b80b", "المتجر لا يبدأ حقا إلا عندما ترى العميلة منتجا بصورة وسعر ومخزون واضح."),
    href: "/products",
    action: t("text_1f18717c", "إضافة منتج"),
    icon: Package,
  },
  shipping_setup: {
    chapter: t("text_fb13f77d", "الفصل 4: الوصول للباب"),
    story: t("text_ada02a41", "بعد الإعجاب بالمنتج، العميلة تسأل: هيوصل امتى وبكام؟ اجعلي الإجابة جاهزة."),
    href: "/shipping-rules",
    action: t("text_0f0fba45", "ضبط الشحن"),
    doneAction: t("text_1b06e2db", "راجعت الشحن"),
    icon: Truck,
  },
  integrations_review: {
    chapter: t("text_1955ac16", "الفصل 5: لحظة الدفع"),
    story: t("text_cc58f805", "في آخر خطوة، العميلة تحتاج طريقة دفع واضحة ومطمئنة، خصوصا مع الدفع عند الاستلام."),
    href: "/billing",
    action: t("text_147d618c", "مراجعة الدفع"),
    doneAction: t("text_6d0c7716", "راجعت الدفع"),
    icon: CreditCard,
  },
  launch_review: {
    chapter: t("text_91e87912", "الفصل 6: تجربة العميلة كاملة"),
    story: t("text_0b965c57", "افتحي المتجر كأنك عميلة جديدة: الواجهة، المنتج، الشحن، والدفع يجب أن يشعروا كرحلة واحدة."),
    href: "/store-builder?mode=editor",
    action: t("text_b344b9a7", "معاينة وتهذيب"),
    doneAction: t("text_c9890b11", "جاهزة للإطلاق"),
    icon: Eye,
  },
};

function KPICard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
    const { t } = useTranslation();
  return (
    <motion.div variants={stagger.item}>
      <Card className="border-border/50 hover:shadow-lg transition-all duration-300 overflow-hidden relative group">
        <div className={`absolute inset-x-0 top-0 h-1 ${color} opacity-60 group-hover:opacity-100 transition-opacity`} />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
              <p className="text-2xl font-bold text-foreground truncate">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
              {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                  <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
                  {t("text_1523c823", t("text_1523c823", "هذا الشهر"))}
                                                  </div>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyChart({ height = 200 }: { height?: number }) {
    const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-border/30 rounded-xl"
      style={{ height }}
    >
      <BarChart2 className="w-10 h-10 mb-2" />
      <p className="text-sm">{t("text_de5427b5", t("text_de5427b5", "لا توجد بيانات بعد"))}</p>
      <p className="text-xs mt-1">{t("text_c9e89698", t("text_c9e89698", "ستظهر هنا عند ورود الطلبات"))}</p>
    </div>
  );
}

function UsageBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
    const { t } = useTranslation();
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
        <span>{value.toLocaleString("ar-EG")}</span>
        <span>{max === -1 ? "∞" : max.toLocaleString("ar-EG")}</span>
      </div>
    </div>
  );
}

function PlanUsageCard() {
    const { t } = useTranslation();
  const { data: ent, isLoading } = useGetEntitlements();

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </motion.div>
    );
  }
  if (!ent) return null;

  const sub = SUB_STATUS[ent.subscriptionStatus] ?? SUB_STATUS.trial;
  const productLimit = ent.plan.productLimit;
  const unlimited = productLimit === -1;
  const atLimit = ent.atProductLimit;
  const nearLimit = ent.nearProductLimit;

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
                  <span className="font-bold text-foreground">{t("text_8fc75cd7", t("text_8fc75cd7", "خطة"))} {PLAN_LABELS[ent.planCode] ?? ent.planCode}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 border ${sub.color}`}>{sub.label}</Badge>
                  {atLimit && (
                    <Badge className="text-[10px] px-1.5 py-0 border bg-red-100 text-red-700 border-red-200">
                      <AlertTriangle className="w-2.5 h-2.5 me-0.5" /> {t("text_76052213", t("text_76052213", "وصلت للحد"))}
                                                              </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unlimited
                    ? t("text_4cdbd285", "منتجات غير محدودة")
                    : `${ent.usage.productCount} من ${productLimit} منتج`}
                </p>
              </div>
            </div>

            {!unlimited && (
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1.5">{t("text_99f85fb8", t("text_99f85fb8", "استخدام المنتجات"))}</p>
                <UsageBar value={ent.usage.productCount} max={productLimit} />
              </div>
            )}

            {(atLimit || nearLimit) && ent.planCode !== "pro" && (
              <Button size="sm" className="shrink-0 rounded-xl" asChild>
                <Link href="/pricing">{t("text_2a6680bc", t("text_2a6680bc", "ترقية الخطة"))}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function OnboardingChecklist() {
    const { t } = useTranslation();
  const { data: onboarding, refetch } = useGetOnboarding();
  const patch = usePatchOnboarding();
  const [collapsed, setCollapsed] = useState(false);

  if (!onboarding || onboarding.isComplete) return null;

  const { steps, completedCount, totalCount } = onboarding;
  const pct = Math.round((completedCount / totalCount) * 100);

  async function markDone(stepKey: string) {
    if (!MANUAL_ONBOARDING_STEPS.includes(stepKey as (typeof MANUAL_ONBOARDING_STEPS)[number])) return;
    await patch.mutateAsync({ data: { step: stepKey as "homepage_message" | "shipping_setup" | "integrations_review" | "launch_review", done: true } });
    refetch();
  }

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t("text_e58034b3", t("text_e58034b3", "رحلة أول عميلة في متجرك"))}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("text_b07288cc", t("text_b07288cc", "ابنِ التجربة كقصة: من أول نظرة إلى أول طلب."))} {completedCount} {t("text_99fb92ed", t("text_99fb92ed", "من"))} {totalCount} {t("text_f74d5e32", t("text_f74d5e32", "فصول مكتملة"))}
                                                  </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 font-bold">
                {pct}%
              </Badge>
              <Button size="sm" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
                <Link href="/store-builder?mode=editor">
                  <Rocket className="w-3.5 h-3.5" />
                  {t("text_ed1b326b", t("text_ed1b326b", "تحسين المتجر"))}
                                                  </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed((c) => !c)}>
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </CardHeader>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {steps.map((step, i) => {
                    const meta = ONBOARDING_STORY[step.key] ?? {
                      chapter: step.label,
                      story: step.description,
                      href: step.href,
                      action: t("text_759fdc24", "تعديل"),
                      icon: Circle,
                    };
                    const Icon = meta.icon;
                    const canMarkDone = MANUAL_ONBOARDING_STEPS.includes(step.key as (typeof MANUAL_ONBOARDING_STEPS)[number]);

                    return (
                      <motion.div
                        key={step.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex h-full flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm ${
                          step.done
                            ? "border-green-200 bg-green-50/60 dark:border-green-800/30 dark:bg-green-900/10"
                            : "border-border/50 bg-background/75 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.done ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
                            {step.done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-primary/80">{meta.chapter}</p>
                            <p className={`mt-1 text-sm font-semibold leading-tight ${step.done ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
                              {step.label}
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                              {meta.story}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                          <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs" asChild>
                            <Link href={meta.href}>
                              {meta.action}
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          {canMarkDone && !step.done && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl text-xs"
                              disabled={patch.isPending}
                              onClick={() => markDone(step.key)}
                            >
                              {meta.doneAction ?? t("text_ae2bddfa", "تمت المراجعة")}
                            </Button>
                          )}
                          {step.done && (
                            <span className="inline-flex h-8 items-center rounded-xl bg-green-100 px-2.5 text-xs font-medium text-green-700">
                              {t("text_95159717", t("text_95159717", "مكتمل"))}
                                                                    </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
    const { t } = useTranslation();
  const { merchant } = useAuth();
  const tenantId = merchant?.tenantId;

  const { data: analytics, isLoading } = useGetMerchantAnalytics(
    { tenantId: tenantId! },
    { query: { enabled: !!tenantId, queryKey: getGetMerchantAnalyticsQueryKey({ tenantId: tenantId! }) } }
  );

  const kpiCards = analytics
    ? [
        {
          label: t("text_33a72bdf", "إجمالي الإيرادات"),
          value: `${analytics.totalRevenue.toLocaleString("ar-EG")} ج.م`,
          sub: `متوسط الطلب: ${analytics.avgOrderValue.toLocaleString("ar-EG")} ج.م`,
          icon: TrendingUp,
          color: "bg-primary",
          trend: analytics.revenueThisMonth,
        },
        {
          label: t("text_f755f8a6", "إجمالي الطلبات"),
          value: analytics.totalOrders,
          sub: `${analytics.pendingOrders} قيد الانتظار`,
          icon: ShoppingCart,
          color: "bg-blue-500",
          trend: analytics.ordersThisMonth,
        },
        {
          label: t("text_8dee682a", "العملاء"),
          value: analytics.totalCustomers,
          sub: t("text_b143f110", "عميل مسجّل"),
          icon: Users,
          color: "bg-violet-500",
        },
        {
          label: t("text_d15fc51d", "إيرادات هذا الشهر"),
          value: `${analytics.revenueThisMonth.toLocaleString("ar-EG")} ج.م`,
          sub: `${analytics.ordersThisMonth} طلب هذا الشهر`,
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
              {t("text_4ed1e111", t("text_4ed1e111", "أهلاً،"))} {merchant?.storeName ?? t("text_b8a0907b", "التاجر")} 👋
            </h1>
            <p className="text-muted-foreground text-sm">{t("text_77f3b4a9", t("text_77f3b4a9", "نظرة شاملة على أداء متجرك"))}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl" size="sm">
              <Link href="/analytics">
                <BarChart2 className="w-4 h-4" /> {t("text_d5e6f403", t("text_d5e6f403", "التحليلات"))} <ChevronLeft className="w-3 h-3" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 rounded-xl" size="sm">
              <Link href="/orders">
                <ShoppingCart className="w-4 h-4" /> {t("text_889f5569", t("text_889f5569", "الطلبات"))} <ChevronLeft className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

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

      {/* Revenue chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-6"
      >
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t("text_0536339a", t("text_0536339a", "الإيرادات — آخر 30 يوم"))}
                                      </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : !hasOrders || !analytics?.salesByDay.length ? (
              <EmptyChart height={224} />
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
                    tick={{ fontFamily: "Cairo", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false} tickLine={false}
                    interval={Math.floor((analytics.salesByDay.length - 1) / 6)}
                  />
                  <YAxis
                    tick={{ fontFamily: "Cairo", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? "k" : ""}`}
                    width={42}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString("ar-EG")} ج.م`, t("text_cd39bdf8", "الإيرادات")]}
                    labelFormatter={(l) => `يوم ${l}`}
                    contentStyle={{
                      fontFamily: "Cairo", direction: "rtl",
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

      {/* Bottom 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Products */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {t("text_40f9f9cd", t("text_40f9f9cd", "أفضل المنتجات"))}
                                            </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !analytics?.topProducts.length ? (
                <EmptyChart height={200} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                      type="number"
                      tick={{ fontFamily: "Cairo", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontFamily: "Cairo", fontSize: 10, fill: "hsl(var(--foreground))" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toLocaleString("ar-EG")} ج.م`, t("text_cd39bdf8", "الإيرادات")]}
                      contentStyle={{
                        fontFamily: "Cairo", direction: "rtl",
                        borderRadius: "12px", border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))",
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status Donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                {t("text_22e320a6", t("text_22e320a6", "حالة الطلبات"))}
                                            </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full rounded-xl" />
              ) : !hasOrders ? (
                <EmptyChart height={192} />
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={analytics?.orderStatusBreakdown.filter((s) => s.count > 0)}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {analytics?.orderStatusBreakdown.filter((s) => s.count > 0).map((entry, index) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _name: string, props: { payload?: { label?: string } }) => [v, props.payload?.label ?? ""]}
                        contentStyle={{
                          fontFamily: "Cairo", direction: "rtl",
                          borderRadius: "12px", border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {analytics?.orderStatusBreakdown.filter((s) => s.count > 0).map((s) => (
                      <div key={s.status} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#888" }} />
                        <span className="text-muted-foreground">{STATUS_LABELS[s.status] ?? s.label}</span>
                        <span className="font-bold text-foreground ms-auto">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                  {t("text_82d9cd87", t("text_82d9cd87", "آخر الطلبات"))}
                                                  </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                  <Link href="/orders">{t("text_1eab5c6c", t("text_1eab5c6c", "عرض الكل"))} <ChevronLeft className="w-3 h-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : !analytics?.recentOrders.length ? (
                <div className="text-center py-12 text-muted-foreground/40">
                  <Store className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">{t("text_df706c23", t("text_df706c23", "لا توجد طلبات بعد"))}</p>
                </div>
              ) : (
                analytics.recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group border border-transparent hover:border-border/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground">#{order.id}</span>
                          <Badge
                            className="text-[10px] px-1.5 py-0 border"
                            style={{
                              backgroundColor: `${STATUS_COLORS[order.status]}15`,
                              color: STATUS_COLORS[order.status],
                              borderColor: `${STATUS_COLORS[order.status]}40`,
                            }}
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                          {" · "}
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-sm font-bold text-primary">
                          {Number(order.totalAmount ?? 0).toLocaleString("ar-EG")} {t("text_3c111129", t("text_3c111129", "ج.م"))}
                                                            </p>
                        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground ms-auto mt-0.5 group-hover:text-primary transition-colors" />
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
