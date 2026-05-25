import { useState, useRef } from "react";
import { getCsrfToken } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard, FileText, Clock, TrendingUp, CheckCircle,
  Upload, Send, AlertCircle, Copy, Building2, Smartphone,
  ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const PLAN_PRICES: Record<string, number> = { starter: 299, growth: 699, pro: 1499 };
const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-700 border-gray-200",
  growth: "bg-blue-100 text-blue-700 border-blue-200",
  pro: "bg-purple-100 text-purple-700 border-purple-200",
};

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

function BankDetailsCard({ details }: { details: any }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!details) return null;

  const rows: { label: string; value: string | null }[] = [
    { label: t("billing.bankDetails.bankName"), value: details.bankName },
    { label: t("billing.bankDetails.accountName"), value: details.accountName },
    { label: t("billing.bankDetails.accountNumber"), value: details.accountNumber },
    { label: "IBAN", value: details.iban },
  ];
  if (details.instapayNumber) rows.push({ label: "Instapay", value: details.instapayNumber });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> {t("billing.bankDetails.title")}
          </CardTitle>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-3">
          {rows.map((r) => r.value && (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-foreground">{r.value}</span>
                <CopyButton text={r.value} />
              </div>
            </div>
          ))}
          {details.instapayNumber && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <Smartphone className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-800">{t("billing.bankDetails.instapayText")} <span className="font-mono">{details.instapayNumber}</span></span>
              <CopyButton text={details.instapayNumber} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function TransferRequestForm({ currentPlanCode, onSubmitted }: { currentPlanCode: string; onSubmitted: () => void }) {
  const { t } = useTranslation();
  const [planCode, setPlanCode] = useState(currentPlanCode);
  const [ref, setRef] = useState("");
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
    if (!ref.trim()) { setError(t("billing.form.errRefRequired")); return; }
    setSubmitting(true);
    try {
      const csrfHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const csrfVal = getCsrfToken();
      if (csrfVal) csrfHeaders["x-csrf-token"] = csrfVal;
      const res = await fetch(api("/billing/transfer-request"), {
        method: "POST",
        headers: csrfHeaders,
        credentials: "include",
        body: JSON.stringify({ planCode, referenceNumber: ref.trim(), receiptImageUrl: receiptUrl || null }),
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-1.5 block text-sm">{t("billing.form.planLabel")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["starter", "growth", "pro"] as const).map((p) => (
            <button type="button" key={p}
              onClick={() => setPlanCode(p)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${planCode === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <p className="font-bold text-sm">{t(`billing.planNames.${p}`)}</p>
              <p className="text-xs text-muted-foreground">{PLAN_PRICES[p]} {t("billing.planPrices.currency")}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="ref" className="mb-1.5 block text-sm">{t("billing.form.refLabel")}</Label>
        <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("billing.form.refPlaceholder")} />
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">{t("billing.form.receiptLabel")}</Label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        {receiptUrl ? (
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-xs text-green-700 flex-1 truncate">{t("billing.form.receiptUploaded")}</span>
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
      <Button type="submit" disabled={submitting} className="w-full gap-2">
        <Send className="w-4 h-4" />
        {submitting ? t("billing.form.btnSubmitting") : t("billing.form.btnSubmit")}
      </Button>
    </form>
  );
}

export default function BillingPage() {
  const { t, i18n } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => fetch(api("/billing/status"), { credentials: "include" }).then((r) => r.json()),
  });
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
    queryFn: () => fetch(api("/billing/bank-details"), { credentials: "include" }).then((r) => r.json()),
  });

  const subStatus = status?.subscriptionStatus ?? "trial";
  const isTrial = subStatus === "trial";
  const isSuspended = subStatus === "suspended" || subStatus === "past_due";
  const hasPending = (transfers as any[]).some((t) => t.status === "pending");

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("billing.subtitle")}</p>
      </motion.div>

      {/* Status banners */}
      {isTrial && status?.trialEndsAt && <TrialBanner trialEndsAt={status.trialEndsAt} />}
      {isSuspended && <SuspendedBanner />}

      {/* Current plan card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("billing.currentPlan.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-5 w-1/2" />)}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("billing.currentPlan.plan")}</p>
                  <Badge variant="outline" className={PLAN_COLORS[status?.planCode] ?? ""}>
                    {t(`billing.planNames.${status?.planCode}`) ?? status?.planCode}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("billing.currentPlan.status")}</p>
                  <Badge variant="outline" className={STATUS_MAP_COLORS[subStatus] ?? ""}>
                    {t(`billing.status.${subStatus}`) ?? subStatus}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("billing.currentPlan.price")}</p>
                  <p className="font-bold text-sm">{status?.monthlyPrice ? fmtAmt(status.monthlyPrice, i18n.language) : "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isTrial ? t("billing.currentPlan.trialEnds") : t("billing.currentPlan.nextRenewal")}
                  </p>
                  <p className="text-sm font-medium">{fmt(isTrial ? status?.trialEndsAt : status?.nextRenewalAt, i18n.language)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan options */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["starter", "growth", "pro"] as const).map((code) => {
          // use static fallback array if translation returns something weird
          const featTransl = t(`billing.planFeatures.${code}`, { returnObjects: true });
          const feats = Array.isArray(featTransl) ? featTransl : [];
          return (
            <Card key={code} className={`border-2 transition-all ${status?.planCode === code ? "border-primary shadow-sm" : "border-border/50"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{t(`billing.planNames.${code}`)}</span>
                  {status?.planCode === code && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{t("billing.currentPlan.yourPlan")}</Badge>}
                </div>
                <p className="text-xl font-extrabold mb-3">{PLAN_PRICES[code].toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} <span className="text-xs font-normal text-muted-foreground">{t("billing.planPrices.currency")}</span></p>
                <ul className="space-y-1.5">
                  {feats.map((f: string) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Bank details */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <BankDetailsCard details={bankDetails} />
      </motion.div>

      {/* Transfer request form */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowForm((o) => !o)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> {t("billing.transferRequest.title")}
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasPending && <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{t("billing.transferRequest.pendingBadge")}</Badge>}
                {showForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
          {showForm && (
            <CardContent className="pt-0">
              {hasPending ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  {t("billing.transferRequest.pendingNotice")}
                </div>
              ) : (
                <TransferRequestForm
                  currentPlanCode={status?.planCode ?? "starter"}
                  onSubmitted={() => { qc.invalidateQueries({ queryKey: ["billing-transfers"] }); }}
                />
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Transfer history */}
      {(transfers as any[]).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> {t("billing.transferHistory.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {loadingTransfers
                ? Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                : (transfers as any[]).map((tItem: any) => {
                  const sColor = TRANSFER_STATUS_COLORS[tItem.status] ?? TRANSFER_STATUS_COLORS.pending;
                  const sLabel = t(`billing.transferStatus.${tItem.status}`);
                  return (
                    <div key={tItem.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t(`billing.planNames.${tItem.planCode}`)} — {fmtAmt(tItem.amount, i18n.language)}</p>
                        <p className="text-xs text-muted-foreground">{t("billing.transferHistory.ref")} {tItem.referenceNumber} · {new Date(tItem.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US")}</p>
                        {tItem.adminNote && <p className="text-xs text-red-600 mt-0.5">{tItem.adminNote}</p>}
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${sColor}`}>{sLabel}</Badge>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Invoice history */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> {t("billing.invoices.title")}
              </CardTitle>
              <Badge variant="outline" className={`text-[10px] text-muted-foreground ${i18n.dir() === "rtl" ? "mr-auto" : "ml-auto"}`}>{(invoices as any[]).length} {t("billing.invoices.count")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingInv ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (invoices as any[]).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />{t("billing.invoices.noInvoices")}
              </div>
            ) : (
              <div className="space-y-2">
                {(invoices as any[]).map((inv: any) => {
                  const sColor = INV_STATUS_COLORS[inv.status] ?? INV_STATUS_COLORS.issued;
                  const sLabel = t(`billing.invStatus.${inv.status}`);
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{t(`billing.planNames.${inv.planCode}`) ?? inv.planCode} · {fmt(inv.createdAt, i18n.language)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className={sColor}>{sLabel}</Badge>
                        <span className="font-bold">{fmtAmt(inv.amount, i18n.language)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
