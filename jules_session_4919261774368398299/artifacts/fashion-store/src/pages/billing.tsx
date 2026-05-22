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

const PLAN_NAMES: Record<string, string> = { starter: t("text_9edb5340", "ستارتر"), growth: t("text_d12e86e1", "جروث"), pro: t("text_eecc506d", "برو") };
const PLAN_PRICES: Record<string, number> = { starter: 299, growth: 699, pro: 1499 };
const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-700 border-gray-200",
  growth: "bg-blue-100 text-blue-700 border-blue-200",
  pro: "bg-purple-100 text-purple-700 border-purple-200",
};
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:   { label: t("text_8caaf953", "نشط"),              color: "text-green-600 bg-green-50 border-green-200" },
  trial:    { label: t("text_5abde870", "تجريبي"),           color: "text-amber-600 bg-amber-50 border-amber-200" },
  past_due: { label: t("text_96e0b94d", "متأخر السداد"),     color: "text-red-600 bg-red-50 border-red-200" },
  suspended:{ label: t("text_75e3d97e", "موقوف"),            color: "text-red-700 bg-red-100 border-red-200" },
  canceled: { label: t("text_59875063", "ملغى"),             color: "text-gray-500 bg-gray-100 border-gray-200" },
};
const INV_STATUS: Record<string, { label: string; color: string }> = {
  draft:   { label: t("text_9071af8f", "مسودة"),  color: "text-gray-500 bg-gray-100" },
  issued:  { label: t("text_212b6913", "صادرة"),  color: "text-blue-600 bg-blue-50" },
  paid:    { label: t("text_04abd34f", "مدفوعة"), color: "text-green-600 bg-green-50" },
  failed:  { label: t("text_5b8b8a53", "فشلت"),   color: "text-red-600 bg-red-50" },
  voided:  { label: t("text_e92ebe02", "ملغاة"),  color: "text-gray-400 bg-gray-50" },
};
const TRANSFER_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: t("text_0b836421", "قيد المراجعة"), color: "text-amber-600 bg-amber-50 border-amber-200" },
  approved: { label: t("text_19837e3e", "مقبول"),        color: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: t("text_20a971a3", "مرفوض"),        color: "text-red-600 bg-red-50 border-red-200" },
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [t("text_ea213f7d", "50 منتج"), t("text_13751833", "100 طلب/شهر"), t("text_8c7e8219", "دعم أساسي")],
  growth:  [t("text_75088bcd", "500 منتج"), t("text_c69778b8", "1000 طلب/شهر"), "Paymob", t("text_0d8c9bb4", "واتساب")],
  pro:     [t("text_e9eae126", "غير محدود"), t("text_7518b95c", "نطاق مخصص"), t("text_411c0588", "أولوية الدعم"), t("text_1e10731b", "تقارير متقدمة")],
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}
function fmtAmt(a: string | number) { return `${Number(a).toLocaleString("ar-EG")} ج.م`; }

function CopyButton({ text }: { text: string }) {
    const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-primary hover:text-primary/80 transition-colors">
      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
    const { t } = useTranslation();
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
  const urgent = daysLeft <= 3;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${urgent ? "text-red-500" : "text-amber-500"}`} />
      <div>
        <p className={`text-sm font-semibold ${urgent ? "text-red-800" : "text-amber-800"}`}>
          {daysLeft === 0 ? t("text_9609f81c", "انتهت فترتك التجريبية اليوم!") : `تبقّى ${daysLeft} ${daysLeft === 1 ? t("text_10954620", "يوم") : t("text_3f6bf715", "أيام")} على انتهاء الفترة التجريبية`}
        </p>
        <p className={`text-xs mt-0.5 ${urgent ? "text-red-600" : "text-amber-700"}`}>
          {t("text_aff328da", t("text_aff328da", "تنتهي في"))} {fmt(trialEndsAt)} {t("text_234af196", t("text_234af196", "— حوّل اشتراكك الآن لضمان استمرار متجرك"))}
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
        <p className="text-sm font-semibold text-red-800">{t("text_800b7c58", t("text_800b7c58", "متجرك موقوف مؤقتًا"))}</p>
        <p className="text-xs mt-0.5 text-red-600">{t("text_f922670b", t("text_f922670b", "جدّد اشتراكك بالتحويل البنكي أدناه وسيُعاد تفعيل متجرك فور مراجعة الإدارة."))}</p>
      </div>
    </div>
  );
}

function BankDetailsCard({ details }: { details: any }) {
    const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!details) return null;

  const rows: { label: string; value: string | null }[] = [
    { label: t("text_d6bdf1ef", "اسم البنك"), value: details.bankName },
    { label: t("text_909db8ed", "اسم صاحب الحساب"), value: details.accountName },
    { label: t("text_032ef480", "رقم الحساب"), value: details.accountNumber },
    { label: "IBAN", value: details.iban },
  ];
  if (details.instapayNumber) rows.push({ label: "Instapay", value: details.instapayNumber });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> {t("text_c85112ad", t("text_c85112ad", "بيانات التحويل البنكي"))}
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
              <span className="text-sm text-green-800">{t("text_42762a49", t("text_42762a49", "أو حوّل عبر"))} <strong>Instapay</strong> {t("text_2a1fc4dc", t("text_2a1fc4dc", "على:"))} <span className="font-mono">{details.instapayNumber}</span></span>
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
      setError(t("text_e1c136f1", "فشل رفع الصورة، حاول مرة أخرى"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ref.trim()) { setError(t("text_a96da568", "أدخل رقم مرجع التحويل")); return; }
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
      if (!res.ok) { setError(data.error ?? t("text_8cfe7d04", "حدث خطأ")); return; }
      setSuccess(true);
      onSubmitted();
    } catch {
      setError(t("text_9cebf5c5", "فشل إرسال الطلب"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle className="w-10 h-10 text-green-500" />
        <p className="font-semibold text-foreground">{t("text_64f8ce0d", t("text_64f8ce0d", "تم إرسال طلبك بنجاح!"))}</p>
        <p className="text-sm text-muted-foreground">{t("text_6c9a5da3", t("text_6c9a5da3", "سيتم مراجعته خلال 24 ساعة عمل وسيُعاد تفعيل متجرك فور القبول."))}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-1.5 block text-sm">{t("text_c5381938", t("text_c5381938", "الخطة المراد الاشتراك فيها"))}</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["starter", "growth", "pro"] as const).map((p) => (
            <button type="button" key={p}
              onClick={() => setPlanCode(p)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${planCode === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <p className="font-bold text-sm">{PLAN_NAMES[p]}</p>
              <p className="text-xs text-muted-foreground">{PLAN_PRICES[p]} {t("text_2d729e1f", t("text_2d729e1f", "ج.م/شهر"))}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="ref" className="mb-1.5 block text-sm">{t("text_0a56c5ec", t("text_0a56c5ec", "رقم مرجع التحويل"))} <span className="text-red-500">*</span></Label>
        <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("text_c51435c0", "مثال: TXN-20240501-123456")} />
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">{t("text_8781babd", t("text_8781babd", "إيصال التحويل (صورة — اختياري)"))}</Label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        {receiptUrl ? (
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-xs text-green-700 flex-1 truncate">{t("text_0ee686d2", t("text_0ee686d2", "تم رفع الإيصال"))}</span>
            <button type="button" onClick={() => setReceiptUrl("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
            {uploading
              ? <p className="text-sm text-muted-foreground">{t("text_c40243fc", t("text_c40243fc", "جارٍ الرفع..."))}</p>
              : <><Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-sm text-muted-foreground">{t("text_9da52718", t("text_9da52718", "اضغط لرفع صورة الإيصال"))}</p></>}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full gap-2">
        <Send className="w-4 h-4" />
        {submitting ? t("text_5061a538", "جارٍ الإرسال...") : t("text_c492d5d8", "إرسال طلب التجديد")}
      </Button>
    </form>
  );
}

export default function BillingPage() {
    const { t } = useTranslation();
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
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">{t("text_d12dd911", t("text_d12dd911", "الفوترة والاشتراك"))}</h1>
        <p className="text-muted-foreground mt-1">{t("text_531a0d50", t("text_531a0d50", "تفاصيل خطتك الحالية وتجديد الاشتراك"))}</p>
      </motion.div>

      {/* Status banners */}
      {isTrial && status?.trialEndsAt && <TrialBanner trialEndsAt={status.trialEndsAt} />}
      {isSuspended && <SuspendedBanner />}

      {/* Current plan card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("text_4e6ed7fe", t("text_4e6ed7fe", "خطتك الحالية"))}
                                      </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-5 w-1/2" />)}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("text_1b73e0af", t("text_1b73e0af", "الخطة"))}</p>
                  <Badge variant="outline" className={PLAN_COLORS[status?.planCode] ?? ""}>
                    {PLAN_NAMES[status?.planCode] ?? status?.planCode}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("text_1253eb56", t("text_1253eb56", "الحالة"))}</p>
                  <Badge variant="outline" className={STATUS_MAP[subStatus]?.color ?? ""}>
                    {STATUS_MAP[subStatus]?.label ?? subStatus}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("text_d12980d0", t("text_d12980d0", "السعر الشهري"))}</p>
                  <p className="font-bold text-sm">{status?.monthlyPrice ? fmtAmt(status.monthlyPrice) : "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isTrial ? t("text_373aad56", "انتهاء التجربة") : t("text_7e4c7fb8", "التجديد القادم")}
                  </p>
                  <p className="text-sm font-medium">{fmt(isTrial ? status?.trialEndsAt : status?.nextRenewalAt)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan options */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["starter", "growth", "pro"] as const).map((code) => (
          <Card key={code} className={`border-2 transition-all ${status?.planCode === code ? "border-primary shadow-sm" : "border-border/50"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{PLAN_NAMES[code]}</span>
                {status?.planCode === code && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{t("text_5b43f601", t("text_5b43f601", "خطتك"))}</Badge>}
              </div>
              <p className="text-xl font-extrabold mb-3">{PLAN_PRICES[code].toLocaleString("ar-EG")} <span className="text-xs font-normal text-muted-foreground">{t("text_2d729e1f", t("text_2d729e1f", "ج.م/شهر"))}</span></p>
              <ul className="space-y-1.5">
                {PLAN_FEATURES[code].map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
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
                <CreditCard className="w-4 h-4 text-primary" /> {t("text_5635eeb7", t("text_5635eeb7", "إرسال إيصال تحويل بنكي"))}
                                            </CardTitle>
              <div className="flex items-center gap-2">
                {hasPending && <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{t("text_0b836421", t("text_0b836421", "قيد المراجعة"))}</Badge>}
                {showForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
          {showForm && (
            <CardContent className="pt-0">
              {hasPending ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  {t("text_f2182b40", t("text_f2182b40", "لديك طلب قيد المراجعة. سيتم تفعيل اشتراكك بعد قبوله."))}
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
                <FileText className="w-4 h-4 text-primary" /> {t("text_738c3a33", t("text_738c3a33", "طلبات التحويل"))}
                                            </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {loadingTransfers
                ? Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                : (transfers as any[]).map((t: any) => {
                  const s = TRANSFER_STATUS[t.status] ?? TRANSFER_STATUS.pending;
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{PLAN_NAMES[t.planCode]} — {fmtAmt(t.amount)}</p>
                        <p className="text-xs text-muted-foreground">{t("text_c2020559", t("text_c2020559", "مرجع:"))} {t.referenceNumber} · {new Date(t.createdAt).toLocaleDateString("ar-EG")}</p>
                        {t.adminNote && <p className="text-xs text-red-600 mt-0.5">{t.adminNote}</p>}
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${s.color}`}>{s.label}</Badge>
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
                <FileText className="w-4 h-4 text-blue-500" /> {t("text_8d269cdb", t("text_8d269cdb", "سجل الفواتير"))}
                                            </CardTitle>
              <Badge variant="outline" className="text-[10px] text-muted-foreground mr-auto">{(invoices as any[]).length} {t("text_f95919d1", t("text_f95919d1", "فاتورة"))}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingInv ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (invoices as any[]).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />{t("text_422576fc", t("text_422576fc", "لا توجد فواتير بعد"))}
                                                </div>
            ) : (
              <div className="space-y-2">
                {(invoices as any[]).map((inv: any) => {
                  const s = INV_STATUS[inv.status] ?? INV_STATUS.issued;
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{PLAN_NAMES[inv.planCode] ?? inv.planCode} · {fmt(inv.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className={s.color}>{s.label}</Badge>
                        <span className="font-bold">{fmtAmt(inv.amount)}</span>
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
