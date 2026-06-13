import { useState, useRef, useEffect } from "react";
import { getCsrfToken, useListPlans } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard, FileText, Clock, TrendingUp, CheckCircle,
  Upload, Send, AlertCircle, Copy, Building2, Smartphone,
  X, Crown, Zap, Package, ShieldCheck,
  Globe, Users, BarChart2, Check, Lock, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const STATUS_MAP_COLORS: Record<string, string> = {
  active: "text-green-600 bg-green-50 border-green-200",
  trial: "text-amber-600 bg-amber-50 border-amber-200",
  past_due: "text-red-600 bg-red-50 border-red-200",
  suspended: "text-red-700 bg-red-100 border-red-200",
  canceled: "text-gray-500 bg-gray-100 border-gray-200",
};

const INV_STATUS_COLORS: Record<string, string> = {
  draft: "text-gray-500 bg-gray-100",
  issued: "text-blue-600 bg-blue-50",
  paid: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50",
  voided: "text-gray-400 bg-gray-50",
};

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  approved: "text-green-600 bg-green-50 border-green-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
};

const PLAN_COLORS: Record<string, { bg: string; border: string; badge: string; btn: string; text: string }> = {
  starter: {
    bg: "from-blue-50/60 to-blue-100/30 dark:from-blue-950/30",
    border: "border-blue-200/60 dark:border-blue-800/40",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    text: "text-blue-700"
  },
  growth: {
    bg: "from-violet-50/60 to-violet-100/30 dark:from-violet-950/30",
    border: "border-violet-300 dark:border-violet-700",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    btn: "bg-violet-600 hover:bg-violet-700 text-white",
    text: "text-violet-700"
  },
  pro: {
    bg: "from-amber-50/60 to-orange-100/30 dark:from-amber-950/30",
    border: "border-amber-200/60 dark:border-amber-800/40",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    btn: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
    text: "text-amber-700"
  },
};

const PLAN_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  growth: TrendingUp,
  pro: Crown,
};

const PLAN_ORDER = ["free", "starter", "growth", "pro"];

const FEATURE_MATRIX = (t: any) => [
  { label: t("growth.features.products"), starter: t("growth.features.productsV1"), growth: t("growth.features.productsV2"), pro: t("growth.features.productsV3"), icon: Package },
  { label: t("growth.features.orders"), starter: t("growth.features.ordersV1"), growth: t("growth.features.ordersV2"), pro: t("growth.features.ordersV3"), icon: ShieldCheck },
  { label: t("growth.features.paymob"), starter: false, growth: true, pro: true, icon: CreditCard },
  { label: t("growth.features.whatsapp"), starter: false, growth: true, pro: true, icon: Users },
  { label: t("growth.features.pixels"), starter: false, growth: true, pro: true, icon: BarChart2 },
  { label: t("growth.features.domain"), starter: false, growth: false, pro: true, icon: Globe },
  { label: t("growth.features.export"), starter: false, growth: false, pro: true, icon: Zap },
  { label: t("growth.features.automation"), starter: false, growth: true, pro: true, icon: Zap },
];

const getPlanFeatures = (code: string, t: any) => {
  if (code === "starter") {
    return [
      t("growth.plans.starter.f1"),
      t("growth.plans.starter.f2"),
      t("growth.plans.starter.f3"),
      t("growth.plans.starter.f4"),
    ];
  }
  if (code === "growth") {
    return [
      t("growth.plans.growth.f1"),
      t("growth.plans.growth.f2"),
      t("growth.plans.growth.f3"),
      t("growth.plans.growth.f4"),
      t("growth.plans.growth.f5"),
      t("growth.plans.growth.f6"),
    ];
  }
  if (code === "pro") {
    return [
      t("growth.plans.pro.f1"),
      t("growth.plans.pro.f2"),
      t("growth.plans.pro.f3"),
      t("growth.plans.pro.f4"),
      t("growth.plans.pro.f5"),
      t("growth.plans.pro.f6"),
    ];
  }
  return [];
};

function fmt(d: string | null, i18nLang: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(i18nLang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtAmt(a: string | number, i18nLang: string) {
  return `${Number(a).toLocaleString(i18nLang === "ar" ? "ar-EG" : "en-US")} ${i18nLang === "ar" ? "ج.م" : "EGP"}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-primary hover:text-primary/80 transition-colors">
      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const { t, i18n } = useTranslation();
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
  const urgent = daysLeft <= 3;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${urgent ? "text-red-500" : "text-amber-500"}`} />
      <div>
        <p className={`text-sm font-semibold ${urgent ? "text-red-800" : "text-amber-800"}`}>
          {daysLeft === 0 ? t("billing.banners.trialEnded") : t("billing.banners.trialDaysLeft", { days: daysLeft })}
        </p>
        <p className={`text-xs mt-0.5 ${urgent ? "text-red-600" : "text-amber-700"}`}>
          {t("billing.banners.trialEndsOn", { date: fmt(trialEndsAt, i18n.language) })}
        </p>
      </div>
    </div>
  );
}

function SuspendedBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border bg-red-50 border-red-200">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
      <div>
        <p className="text-sm font-semibold text-red-800">{t("billing.banners.suspendedTitle")}</p>
        <p className="text-xs mt-0.5 text-red-600">{t("billing.banners.suspendedDesc")}</p>
      </div>
    </div>
  );
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  instapayNumber?: string | null;
  instapayName?: string | null;
}

function TransferRequestForm({
  currentPlanCode,
  preselectedPlanCode,
  onSubmitted
}: {
  currentPlanCode: string;
  preselectedPlanCode?: string | null;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { data: plans } = useListPlans();
  const [planCode, setPlanCode] = useState(preselectedPlanCode || currentPlanCode || "starter");
  const generatedRef = useRef(`TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`).current;
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const headers: Record<string, string> = {};
      const csrf = getCsrfToken();
      if (csrf) headers["x-csrf-token"] = csrf;
      const res = await fetch(api("/uploads/image"), { method: "POST", credentials: "include", headers, body: form });
      const data = await res.json();
      setReceiptUrl(data.url ?? "");
    } catch {
      setError(t("billing.form.errUpload"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!receiptUrl) {
      setError(t("billing.form.errReceiptRequired", { defaultValue: "إيصال التحويل (صورة الإثبات) مطلوب." }));
      return;
    }
    setSubmitting(true);
    try {
      const csrfHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const csrfVal = getCsrfToken();
      if (csrfVal) csrfHeaders["x-csrf-token"] = csrfVal;
      const res = await fetch(api("/billing/transfer-request"), {
        method: "POST",
        headers: csrfHeaders,
        credentials: "include",
        body: JSON.stringify({ planCode, referenceNumber: generatedRef, receiptImageUrl: receiptUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("billing.form.errSubmit")); return; }
      setSuccess(true);
      onSubmitted();
    } catch {
      setError(t("billing.form.errSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle className="w-10 h-10 text-green-500" />
        <p className="font-semibold text-foreground">{t("billing.form.successTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("billing.form.successDesc")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("billing.form.planLabel")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["starter", "growth", "pro"] as const).map((p) => {
            const planDetails = plans?.find((pd) => pd.code === p);
            const price = planDetails?.priceEgp ?? 0;
            return (
              <button
                type="button"
                key={p}
                disabled={!!preselectedPlanCode && preselectedPlanCode !== p}
                onClick={() => setPlanCode(p)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  planCode === p
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:border-primary/40 opacity-60"
                }`}
              >
                <p className="font-bold text-xs">{t(`billing.planNames.${p}`)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{price} {t("billing.planPrices.currency")}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("billing.form.receiptLabel")} *</Label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        {receiptUrl ? (
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/40">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-xs text-green-700 dark:text-green-300 flex-1 truncate">{t("billing.form.receiptUploaded")}</span>
            <button type="button" onClick={() => setReceiptUrl("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
            {uploading
              ? <p className="text-sm text-muted-foreground">{t("billing.form.uploading")}</p>
              : <><Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-sm text-muted-foreground">{t("billing.form.uploadPrompt")}</p></>}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full gap-2 mt-2">
        <Send className="w-4 h-4" />
        {submitting ? t("billing.form.btnSubmitting") : t("billing.form.btnSubmit")}
      </Button>
    </form>
  );
}

export default function BillingPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [upgradePlanCode, setUpgradePlanCode] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab") || "overview";
    setActiveTab(tab);
  }, [window.location.search]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", val);
    window.history.pushState({}, "", url.pathname + url.search);
  };

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => fetch(api("/billing/status"), { credentials: "include" }).then((r) => r.json()),
  });
  const { data: plans, isLoading: loadingPlans } = useListPlans();

  const { data: invoices = [], isLoading: loadingInv } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => fetch(api("/billing/invoices"), { credentials: "include" }).then((r) => r.json()),
  });
  const { data: transfers = [], isLoading: loadingTransfers } = useQuery({
    queryKey: ["billing-transfers"],
    queryFn: () => fetch(api("/billing/transfer-requests"), { credentials: "include" }).then((r) => r.json()),
  });
  const { data: bankDetails } = useQuery({
    queryKey: ["billing-bank-details"],
    queryFn: () => fetch(api("/billing/bank-details"), { credentials: "include" }).then((r) => r.json() as Promise<BankDetails>),
  });

  const subStatus = status?.subscriptionStatus ?? "trial";
  const currentPlan = status?.planCode ?? "starter";
  const isTrial = subStatus === "trial";
  const isSuspended = subStatus === "suspended" || subStatus === "past_due";
  const hasPending = (transfers as any[]).some((tItem) => tItem.status === "pending");

  const matrix = FEATURE_MATRIX(t);
  const commercialPlans = plans?.filter((p) => p.code !== "free") ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={i18n.dir()}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("billing.subtitle")}</p>
        </div>
      </div>

      {/* Status banners */}
      {isTrial && status?.trialEndsAt && <TrialBanner trialEndsAt={status.trialEndsAt} />}
      {isSuspended && <SuspendedBanner />}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg py-2 text-xs md:text-sm font-medium">
            {t("billing.tabs.overview", { defaultValue: "نظرة عامة والفوترة" })}
          </TabsTrigger>
          <TabsTrigger value="plans" className="rounded-lg py-2 text-xs md:text-sm font-medium">
            {t("billing.tabs.plans", { defaultValue: "الخطط والترقية" })}
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: OVERVIEW ─── */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          {/* Current plan card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                  <TrendingUp className="w-4 h-4 text-primary" /> {t("billing.currentPlan.title")}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleTabChange("plans")} className="h-8 text-xs font-semibold">
                  {t("billing.currentPlan.btnViewPlans")}
                </Button>
              </CardHeader>
              <CardContent className="pt-5">
                {loadingStatus ? (
                  <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-5 w-1/2" />)}</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">{t("billing.currentPlan.plan")}</p>
                      <Badge variant="outline" className={`font-bold ${PLAN_COLORS[status?.planCode]?.badge ?? ""}`}>
                        {t(`billing.planNames.${status?.planCode}`) ?? status?.planCode}
                      </Badge>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">{t("billing.currentPlan.status")}</p>
                      <Badge variant="outline" className={`font-semibold ${STATUS_MAP_COLORS[subStatus] ?? ""}`}>
                        {t(`billing.status.${subStatus}`) ?? subStatus}
                      </Badge>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">{t("billing.currentPlan.price")}</p>
                      <p className="font-extrabold text-sm text-foreground">{status?.monthlyPrice ? fmtAmt(status.monthlyPrice, i18n.language) : "—"}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">
                        {isTrial ? t("billing.currentPlan.trialEnds") : t("billing.currentPlan.nextRenewal")}
                      </p>
                      <p className="text-sm font-bold text-foreground">{fmt(isTrial ? status?.trialEndsAt : status?.nextRenewalAt, i18n.language)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending notification banner */}
          {hasPending && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-sm">
              <Clock className="w-5 h-5 shrink-0 text-amber-500 animate-pulse" />
              <span>{t("billing.transferRequest.pendingNotice")}</span>
            </div>
          )}

          {/* Transfer history */}
          {(transfers as any[]).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3 bg-muted/10 border-b border-border/40">
                  <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                    <FileText className="w-4 h-4 text-primary" /> {t("billing.transferHistory.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {loadingTransfers
                    ? Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                    : (transfers as any[]).map((tItem: any) => {
                      const sColor = TRANSFER_STATUS_COLORS[tItem.status] ?? TRANSFER_STATUS_COLORS.pending;
                      const sLabel = t(`billing.transferStatus.${tItem.status}`);
                      return (
                        <div key={tItem.id} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/30 rounded-xl text-sm gap-3 hover:bg-muted/40 transition-colors">
                          <div className="min-w-0">
                            <p className="font-bold truncate text-foreground">{t(`billing.planNames.${tItem.planCode}`)} — {fmtAmt(tItem.amount, i18n.language)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t("billing.transferHistory.ref")} <span className="font-mono text-foreground font-medium">{tItem.referenceNumber}</span> · {new Date(tItem.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US")}</p>
                            {tItem.adminNote && <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded inline-block">{tItem.adminNote}</p>}
                          </div>
                          <Badge variant="outline" className={`shrink-0 font-medium ${sColor}`}>{sLabel}</Badge>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Invoice history */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 bg-muted/10 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                    <FileText className="w-4 h-4 text-blue-500" /> {t("billing.invoices.title")}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-semibold">{(invoices as any[]).length} {t("billing.invoices.count")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingInv ? (
                  <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : (invoices as any[]).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-35" />{t("billing.invoices.noInvoices")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(invoices as any[]).map((inv: any) => {
                      const sColor = INV_STATUS_COLORS[inv.status] ?? INV_STATUS_COLORS.issued;
                      const sLabel = t(`billing.invStatus.${inv.status}`);
                      return (
                        <div key={inv.id} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/30 rounded-xl text-sm gap-3 hover:bg-muted/40 transition-colors">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t(`billing.planNames.${inv.planCode}`) ?? inv.planCode} · {fmt(inv.createdAt, i18n.language)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className={`font-medium ${sColor}`}>{sLabel}</Badge>
                            <span className="font-bold text-foreground">{fmtAmt(inv.amount, i18n.language)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── TAB 2: PLANS & UPGRADE ─── */}
        <TabsContent value="plans" className="space-y-8 outline-none">
          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-2xl bg-muted/40 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {commercialPlans.map((plan, i) => {
                const planKey = plan.code;
                const c = PLAN_COLORS[planKey] ?? PLAN_COLORS.starter;
                const Icon = PLAN_ICONS[planKey] ?? Zap;
                const isCurrent = planKey === currentPlan;
                const isUpgrade = PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(currentPlan);
                const featuresList = getPlanFeatures(planKey, t);

                return (
                  <motion.div key={planKey} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className={`bg-card rounded-2xl border-2 p-6 flex flex-col ${isCurrent ? "border-rose-400 dark:border-rose-500 shadow-md scale-[1.01]" : "border-border/50"} ${planKey === "pro" ? "relative overflow-hidden" : ""}`}>
                    {planKey === "pro" && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-1 text-[10px] font-bold uppercase tracking-wider">
                        {t("growth.cards.bestFor")}
                      </div>
                    )}
                    <div className={planKey === "pro" ? "mt-4" : ""}>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.badge}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {i18n.language === "ar" ? plan.nameAr : plan.name}
                        </span>
                        {isCurrent && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">{t("growth.cards.yourPlan")}</span>}
                      </div>
                      <p className="text-3xl font-extrabold text-foreground mb-1">{plan.priceEgp.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}</p>
                      <p className="text-xs text-muted-foreground mb-5">{t("growth.cards.currency", { currency: i18n.language === "ar" ? "ج.م" : "EGP" })}</p>
                      <ul className="space-y-2.5 mb-6 flex-1">
                        {featuresList.map((f: string) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        disabled={isCurrent || !isUpgrade || hasPending}
                        onClick={() => {
                          if (isUpgrade) {
                            setUpgradePlanCode(planKey);
                            setShowUpgradeModal(true);
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isCurrent ? "bg-muted text-muted-foreground cursor-not-allowed" :
                          hasPending ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" :
                          isUpgrade ? `${c.btn} shadow-sm hover:shadow-md` :
                          "bg-muted text-muted-foreground cursor-not-allowed opacity-40"
                        }`}
                      >
                        {isCurrent ? (
                          t("growth.cards.btnCurrent")
                        ) : hasPending ? (
                          t("billing.transferRequest.pendingBadge")
                        ) : isUpgrade ? (
                          <><span>{t("growth.cards.btnUpgrade")}</span><ArrowRight className="w-3.5 h-3.5" /></>
                        ) : (
                          <><Lock className="w-3.5 h-3.5" /> {t("growth.cards.btnPrevious")}</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Feature Matrix */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden mt-8">
            <div className="p-4 bg-muted/20 border-b border-border/40">
              <h2 className="text-sm font-bold text-foreground">{t("growth.matrix.title")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" dir={i18n.dir()}>
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40">
                    <th className={`text-start px-5 py-3 font-semibold text-muted-foreground`}>{t("growth.matrix.feature")}</th>
                    {["starter", "growth", "pro"].map((p) => (
                      <th key={p} className={`text-center px-4 py-3 font-bold ${p === currentPlan ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                        {t(`billing.planNames.${p}`)}
                        {p === currentPlan && <span className="block text-[9px] font-normal text-rose-500 mt-0.5">{t("growth.matrix.yourPlan")}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {matrix.map((row, i) => {
                    const IconC = row.icon;
                    return (
                      <tr key={i} className="hover:bg-muted/25 transition-colors">
                        <td className="px-5 py-3.5 text-foreground flex items-center gap-2.5 font-medium">
                          <IconC className="w-4 h-4 text-muted-foreground shrink-0" /> {row.label}
                        </td>
                        {["starter", "growth", "pro"].map((p) => {
                          const val = (row as any)[p];
                          return (
                            <td key={p} className="text-center px-4 py-3.5">
                              {typeof val === "boolean" ? (
                                val ? <Check className="w-4 h-4 text-green-500 mx-auto stroke-[3px]" /> : <X className="w-3.5 h-3.5 text-muted-foreground/30 mx-auto" />
                              ) : (
                                <span className={`font-semibold ${p === currentPlan ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ─── UPGRADE MODAL ─── */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={i18n.dir()}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold ${i18n.dir() === "rtl" ? "text-right" : "text-left"}`}>
              {t("billing.upgradeTitle", { defaultValue: "ترقية الاشتراك إلى" })} {t(`billing.planNames.${upgradePlanCode}`) || upgradePlanCode}
            </DialogTitle>
            <DialogDescription className={`text-xs text-muted-foreground mt-1 ${i18n.dir() === "rtl" ? "text-right" : "text-left"}`}>
              {t("billing.upgradeDesc", { defaultValue: "قم بتحويل قيمة الاشتراك ثم أرسل إيصال التحويل لتفعيل الخطة." })}
            </DialogDescription>
          </DialogHeader>

          {/* Bank Details Summary */}
          <div className="bg-muted/50 p-4 rounded-xl space-y-2 text-xs border border-border/30">
            <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" /> {t("billing.bankDetails.title")}
            </p>
            {bankDetails && (
              <div className="space-y-1.5 pt-1.5 border-t border-border/30 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("billing.bankDetails.bankName")}</span>
                  <span className="font-medium text-foreground">{bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("billing.bankDetails.accountName")}</span>
                  <span className="font-medium text-foreground">{bankDetails.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("billing.bankDetails.accountNumber")}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium text-foreground">{bankDetails.accountNumber}</span>
                    <CopyButton text={bankDetails.accountNumber} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">IBAN</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium text-foreground">{bankDetails.iban}</span>
                    <CopyButton text={bankDetails.iban} />
                  </div>
                </div>
                {bankDetails.instapayNumber && (
                  <>
                    <div className="flex justify-between items-center border-t border-border/30 pt-1.5 mt-1.5 text-green-700 dark:text-green-400">
                      <span>Instapay</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold">{bankDetails.instapayNumber}</span>
                        <CopyButton text={bankDetails.instapayNumber} />
                      </div>
                    </div>
                    {bankDetails.instapayName && (
                      <div className="flex justify-between items-center text-[10px] text-green-600 dark:text-green-500 font-semibold mt-0.5">
                        <span>{t("billing.bankDetails.instapayHolder", { defaultValue: "اسم المستلم (Instapay):" })}</span>
                        <span>{bankDetails.instapayName}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Form */}
          <TransferRequestForm
            currentPlanCode={status?.planCode ?? "starter"}
            preselectedPlanCode={upgradePlanCode}
            onSubmitted={() => {
              setShowUpgradeModal(false);
              qc.invalidateQueries({ queryKey: ["billing-transfers"] });
              qc.invalidateQueries({ queryKey: ["billing-status"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
