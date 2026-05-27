import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetOrder, getGetOrderQueryKey, useUpdateOrder,
  useListContactAttempts, useCreateContactAttempt,
  useGetCustomer, getGetCustomerQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronRight, Package, User, MapPin, CreditCard, ShoppingCart,
  MessageCircle, Truck, ExternalLink, CheckCircle2, AlertCircle,
  Phone, Copy, Check, History, PhoneCall, Plus, Send, RotateCcw,
  Wand2, Loader2, TrendingDown, TrendingUp, Minus,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, { color: string; dot: string }> = {
  pending:               { color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "#f59e0b" },
  awaiting_confirmation: { color: "bg-orange-100 text-orange-800 border-orange-200", dot: "#f97316" },
  confirmed:             { color: "bg-blue-100 text-blue-800 border-blue-200",       dot: "#3b82f6" },
  dispatched:            { color: "bg-violet-100 text-violet-800 border-violet-200", dot: "#8b5cf6" },
  shipped:               { color: "bg-purple-100 text-purple-800 border-purple-200", dot: "#8b5cf6" },
  delivered:             { color: "bg-green-100 text-green-800 border-green-200",    dot: "#22c55e" },
  cancelled:             { color: "bg-red-100 text-red-800 border-red-200",          dot: "#ef4444" },
  returned:              { color: "bg-gray-100 text-gray-700 border-gray-200",       dot: "#6b7280" },
};

const PAYMENT_COLORS: Record<string, { color: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid:    { color: "bg-green-100 text-green-800 border-green-200" },
  failed:  { color: "bg-red-100 text-red-800 border-red-200" },
};

const METHOD_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  phone:    { icon: PhoneCall,    color: "text-blue-600" },
  whatsapp: { icon: MessageCircle, color: "text-emerald-600" },
  email:    { icon: Send,          color: "text-violet-600" },
  other:    { icon: Phone,         color: "text-muted-foreground" },
};

function ActionFeedback({ success, message }: { success: boolean; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
        success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {message}
    </motion.div>
  );
}

function StatusTimeline({ history }: { history: Array<{ id: number; fromStatus?: string | null; toStatus: string; note?: string | null; createdAt: string }> }) {
  const { t, i18n } = useTranslation();
  if (!history.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> {t("orderDetail.history.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute top-2 bottom-2 end-[10px] w-0.5 bg-border/50 rounded-full" />
            <div className="space-y-4">
              {[...history].reverse().map((entry, i) => {
                const toInfo = STATUS_COLORS[entry.toStatus] ?? { dot: "#888", color: "" };
                const toLabel = t(`orderDetail.status.${entry.toStatus}`);
                return (
                  <div key={entry.id} className="flex items-start gap-3 pe-6 relative">
                    <div
                      className="absolute end-[4px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background z-10 shrink-0"
                      style={{ backgroundColor: toInfo.dot }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${toInfo.color}`}>
                          {toLabel}
                        </span>
                        {entry.fromStatus && (
                          <span className="text-xs text-muted-foreground">
                            ← {t(`orderDetail.status.${entry.fromStatus}`) ?? entry.fromStatus}
                          </span>
                        )}
                        {i === 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">{t("orderDetail.history.now")}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.createdAt).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      {entry.note && <p className="text-xs text-foreground/70 mt-0.5 italic">{entry.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const MESSAGE_TYPES = [
  { id: "confirmation", emoji: "✅" },
  { id: "shipping", emoji: "🚚" },
  { id: "followup", emoji: "⭐" },
] as const;

type MsgType = typeof MESSAGE_TYPES[number]["id"];
type AiModel = "claude" | "gemini";

function AiReplySection({
  customerName,
  customerPhone,
  orderTotal,
  orderStatus,
  items,
  storeName,
}: {
  customerName?: string | null;
  customerPhone?: string | null;
  orderTotal?: number | string | null;
  orderStatus?: string;
  items?: Array<{ productName?: string | null; quantity?: number | null }>;
  storeName?: string;
}) {
  const { t, i18n } = useTranslation();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [msgType, setMsgType] = useState<MsgType>("confirmation");
  const [aiModel, setAiModel] = useState<AiModel>("claude");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateDraft() {
    setLoading(true);
    setError("");
    setDraft("");
    try {
      const res = await fetch(`${BASE}/api/ai/draft-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName,
          orderTotal: Number(orderTotal ?? 0),
          orderStatus,
          items,
          messageType: msgType,
          storeName,
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("orderDetail.ai.error"));
      setDraft(data.message ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("orderDetail.ai.error"));
    } finally {
      setLoading(false);
    }
  }

  function copyDraft() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waLink = customerPhone && draft
    ? `https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(draft)}`
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }}>
      <Card className="border-violet-200/60 bg-violet-50/30 dark:border-violet-800/30 dark:bg-violet-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-violet-700 dark:text-violet-400">
            <Wand2 className="w-4 h-4" /> {t("orderDetail.ai.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Message type selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {MESSAGE_TYPES.map((ty) => (
              <button
                key={ty.id}
                type="button"
                onClick={() => { setMsgType(ty.id); setDraft(""); setError(""); }}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-center text-xs font-medium transition-all",
                  msgType === ty.id
                    ? "border-violet-400 bg-violet-100 text-violet-800 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
                    : "border-border/50 text-muted-foreground hover:border-violet-200 hover:bg-violet-50/50"
                )}
              >
                <span className="text-base">{ty.emoji}</span>
                <span className="leading-tight">{t(`orderDetail.msgTypes.${ty.id}`)}</span>
              </button>
            ))}
          </div>

          {/* Model + Generate row */}
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border/60 overflow-hidden text-[11px] font-medium shrink-0">
              {(["claude", "gemini"] as AiModel[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAiModel(m)}
                  className={cn(
                    "px-2.5 py-1.5 transition-colors capitalize",
                    aiModel === m
                      ? "bg-violet-600 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {m === "claude" ? "Claude" : "Gemini"}
                </button>
              ))}
            </div>
            <Button
              onClick={generateDraft}
              disabled={loading}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              size="sm"
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("orderDetail.ai.btnGenerating")}</>
                : <><Wand2 className="w-3.5 h-3.5" /> {t("orderDetail.ai.btnGenerate")}</>
              }
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Loading animation */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 bg-background/60 rounded-xl p-3"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-500"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("orderDetail.ai.loading")}</p>
            </motion.div>
          )}

          {/* Draft result */}
          <AnimatePresence>
            {draft && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={6}
                  className="text-sm resize-none bg-background border-violet-200 dark:border-violet-800/50 leading-relaxed"
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={copyDraft}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t("orderDetail.ai.btnCopied") : t("orderDetail.ai.btnCopy")}
                  </Button>
                  {waLink && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      asChild
                    >
                      <a href={waLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {t("orderDetail.ai.btnWhatsapp")}
                      </a>
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ContactAttemptsSection({ orderId }: { orderId: number }) {
  const { t, i18n } = useTranslation();
  const [method, setMethod] = useState("phone");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: attempts, refetch } = useListContactAttempts(orderId);
  const createAttempt = useCreateContactAttempt();

  async function handleSubmit() {
    await createAttempt.mutateAsync({ id: orderId, data: { method: method as "phone" | "whatsapp" | "email" | "other", note: note || undefined } });
    setNote("");
    setShowForm(false);
    refetch();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-primary" /> {t("orderDetail.contact.title")}
              {(attempts?.length ?? 0) > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{attempts!.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setShowForm((f) => !f)}>
              <Plus className="w-3 h-3" /> {t("orderDetail.contact.btnAdd")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-border/50 rounded-xl p-4 bg-muted/30 space-y-3"
              >
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(METHOD_ICONS).map((key) => (
                      <SelectItem key={key} value={key}>{t(`orderDetail.method.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder={t("orderDetail.contact.notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={createAttempt.isPending}
                    className="flex-1"
                  >
                    {createAttempt.isPending ? t("orderDetail.contact.btnSaving") : t("orderDetail.contact.btnSave")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>{t("orderDetail.contact.btnCancel")}</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {attempts && attempts.length > 0 ? (
            <div className="space-y-2">
              {attempts.map((attempt) => {
                const m = METHOD_ICONS[attempt.method] ?? METHOD_ICONS.other;
                const Icon = m.icon;
                return (
                  <div key={attempt.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="p-1.5 rounded-lg bg-muted/50 shrink-0">
                      <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t(`orderDetail.method.${attempt.method}`) || t("orderDetail.method.other")}</p>
                      {attempt.note && <p className="text-xs text-muted-foreground mt-0.5">{attempt.note}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(attempt.createdAt).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            !showForm && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("orderDetail.contact.empty")}
              </p>
            )
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CodRiskBadge({ rate, confirmed, cancelled }: { rate: number | null; confirmed: number; cancelled: number }) {
  const { t } = useTranslation();
  const resolved = confirmed + cancelled;
  if (rate === null || resolved < 2) return null;
  if (rate >= 80) return (
    <div className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2 mt-2">
      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
      {t("orderDetail.cod.rate")} <strong>{rate}%</strong> — {t("orderDetail.cod.trusted")} ({confirmed} {t("orderDetail.cod.confirmed")} / {cancelled} {t("orderDetail.cod.cancelled")})
    </div>
  );
  if (rate >= 50) return (
    <div className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 mt-2">
      <Minus className="w-3.5 h-3.5 shrink-0" />
      {t("orderDetail.cod.rate")} <strong>{rate}%</strong> — {t("orderDetail.cod.medium")} ({confirmed} {t("orderDetail.cod.confirmed")} / {cancelled} {t("orderDetail.cod.cancelled")}) — {t("orderDetail.cod.callFirst")}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 mt-2">
      <TrendingDown className="w-3.5 h-3.5 shrink-0" />
      {t("orderDetail.cod.rate")} <strong>{rate}%</strong> — {t("orderDetail.cod.high")} ({confirmed} {t("orderDetail.cod.confirmed")} / {cancelled} {t("orderDetail.cod.cancelled")}) — {t("orderDetail.cod.verifyFirst")}
    </div>
  );
}

export default function OrderDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { isAuthenticated, merchant } = useAuth();
  const { data: order, isLoading, refetch } = useGetOrder(orderId, { query: { queryKey: getGetOrderQueryKey(orderId) } });
  const updateOrder = useUpdateOrder();
  const [newStatus, setNewStatus] = useState("");

  const customerId = (order as any)?.customerId as number | undefined;
  const { data: customerData } = useGetCustomer(customerId!, {
    query: {
      enabled: !!customerId && order?.paymentMethod === "cod",
      queryKey: getGetCustomerQueryKey(customerId!),
    },
  });

  const [waPhone, setWaPhone] = useState("");
  const [waLoading, setWaLoading] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);

  const [bostaPhone, setBostaPhone] = useState("");
  const [bostaCity, setBostaCity] = useState("Cairo");
  const [bostaLoading, setBostaLoading] = useState(false);
  const [bostaResult, setBostaResult] = useState<{ success: boolean; message: string } | null>(null);

  const [copied, setCopied] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  async function handleStatusUpdate() {
    if (!newStatus) return;
    await updateOrder.mutateAsync({
      id: orderId,
      data: {
        status: newStatus as
          | "pending" | "awaiting_confirmation" | "confirmed"
          | "dispatched" | "shipped" | "delivered" | "cancelled" | "returned",
      },
    });
    setNewStatus("");
    refetch();
  }

  async function handleSendWhatsApp() {
    const phone = waPhone || order?.customerPhone || "";
    if (!phone) { setWaResult({ success: false, message: t("orderDetail.whatsapp.missingPhone") }); return; }
    setWaLoading(true); setWaResult(null);
    try {
      const res = await fetch(`${BASE}/api/notifications/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, customerPhone: phone }),
      });
      const data = await res.json() as { success: boolean; whatsappLink: string; configured: boolean };
      if (data.configured && data.success) {
        setWaResult({ success: true, message: t("orderDetail.whatsapp.successConfigured") });
      } else {
        setWaResult({ success: true, message: t("orderDetail.whatsapp.successManual"), link: data.whatsappLink });
      }
    } catch {
      setWaResult({ success: false, message: t("orderDetail.whatsapp.error") });
    } finally {
      setWaLoading(false);
    }
  }

  async function handleCreateShipment() {
    const phone = bostaPhone || order?.customerPhone || "";
    if (!phone) { setBostaResult({ success: false, message: t("orderDetail.bosta.missingPhone") }); return; }
    setBostaLoading(true); setBostaResult(null);
    try {
      const res = await fetch(`${BASE}/api/shipping/bosta/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, customerPhone: phone, dropOffCity: bostaCity }),
      });
      const data = await res.json() as { configured: boolean; trackingNumber?: string; shipmentId?: string; message?: string };
      if (!data.configured) {
        setBostaResult({ success: false, message: data.message ?? t("orderDetail.bosta.errorUnconfigured") });
      } else {
        setBostaResult({ success: true, message: t("orderDetail.bosta.success").replace("{trackingNumber}", data.trackingNumber || "") });
        refetch();
      }
    } catch {
      setBostaResult({ success: false, message: t("orderDetail.bosta.error") });
    } finally {
      setBostaLoading(false);
    }
  }

  function copyTracking() {
    if (!order?.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-24 text-center" dir={i18n.dir()}>
        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="text-muted-foreground">{t("orderDetail.page.notFound")}</p>
        <Button variant="ghost" asChild className="mt-4"><Link href="/orders">{t("orderDetail.page.back")}</Link></Button>
      </div>
    );
  }

  const s = STATUS_COLORS[order.status] ?? { color: "" };
  const sLabel = t(`orderDetail.status.${order.status}`) ?? order.status;
  const ps = PAYMENT_COLORS[order.paymentStatus ?? "pending"] ?? { color: "" };
  const psLabel = t(`orderDetail.paymentStatus.${order.paymentStatus ?? "pending"}`) ?? order.paymentStatus;
  const defaultPhone = order.customerPhone ?? "";

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Button variant="ghost" size="sm" asChild className="mb-4 -me-2">
          <Link href="/orders">
            <ChevronRight className={`w-4 h-4 me-1 ${i18n.dir() === "ltr" ? "rotate-180" : ""}`} />
            {t("orderDetail.page.back")}
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{t("orderDetail.page.orderId")}{order.id}</h1>
            <p className="text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", { dateStyle: "full" })}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={`text-sm px-3 py-1 border ${s.color}`}>{sLabel}</Badge>
            <Badge className={`text-sm px-3 py-1 border ${ps.color}`}>
              {order.paymentMethod === "paymob" ? "💳" : "💵"} {psLabel}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Sticky top action bar for fulfillment */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="sticky top-4 z-20 mb-6 bg-background/90 backdrop-blur-xl rounded-xl border border-border/60 shadow-sm p-4"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-semibold">{t("orderDetail.card.totalTitle")}</span>
            <span className="text-xl font-bold text-primary ms-2">
              {Number(order.totalAmount ?? 0).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}
            </span>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="flex-1 sm:w-[200px] h-10" dir={i18n.dir()}>
                  <SelectValue placeholder={t("orderDetail.card.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent dir={i18n.dir()}>
                  {Object.keys(STATUS_COLORS).map((key) => (
                    <SelectItem key={key} value={key}>{t(`orderDetail.status.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleStatusUpdate} disabled={!newStatus || updateOrder.isPending} className="shrink-0">
                {updateOrder.isPending ? t("orderDetail.card.btnUpdating") : t("orderDetail.card.btnUpdate")}
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
          <TabsTrigger value="overview">{t("orderDetail.tabs.overview") || "Overview"}</TabsTrigger>
          <TabsTrigger value="communications">{t("orderDetail.tabs.communications") || "Communications & Log"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 outline-none">
        {/* Customer */}
        {order.customerName && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> {t("orderDetail.card.customerTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <p className="font-semibold text-foreground">{order.customerName}</p>
                {order.customerPhone && (
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
                    </p>
                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 text-xs flex items-center gap-1 hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> {t("orderDetail.card.whatsapp")}
                    </a>
                  </div>
                )}
                {order.paymentMethod === "cod" && customerData && (
                  <CodRiskBadge
                    rate={(customerData as any).codConfirmationRate ?? null}
                    confirmed={(customerData as any).codConfirmedOrders ?? 0}
                    cancelled={(customerData as any).codCancelledOrders ?? 0}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Shipping address */}
        {order.shippingAddress && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {t("orderDetail.card.shippingTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
                {order.trackingNumber && (
                  <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
                    <Truck className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-mono">{order.trackingNumber}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 ms-auto" onClick={copyTracking}>
                      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Order items */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> {t("orderDetail.card.itemsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.productName ?? `منتج #${item.productId}`}</p>
                    <p className="text-xs text-muted-foreground">{t("orderDetail.card.quantity")} {item.quantity}</p>
                  </div>
                  <p className="font-bold text-primary text-sm">{Number(item.totalPrice ?? 0).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>



        {/* ─── Merchant-only integration actions (Bosta) ─── */}
        {isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Card className="border-blue-200/60 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Truck className="w-4 h-4" />
                  {t("orderDetail.bosta.title")}
                  {order.bostaShipmentId && (
                    <Badge className={`ms-auto text-xs bg-blue-100 text-blue-700 border-blue-200`}>{t("orderDetail.bosta.badge")}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.bostaShipmentId ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t("orderDetail.bosta.successLabel")} <strong>{order.trackingNumber}</strong></span>
                    </div>
                    {order.trackingNumber && (
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700" asChild>
                        <a href={`https://app.bosta.co/tracking/${order.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 me-1.5" /> {t("orderDetail.bosta.btnTrack")}
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder={defaultPhone || t("orderDetail.bosta.phonePlaceholder")}
                        value={bostaPhone}
                        onChange={(e) => setBostaPhone(e.target.value)}
                        dir="ltr"
                        className="flex-1 text-left"
                      />
                      <Input
                        placeholder={t("orderDetail.bosta.cityPlaceholder")}
                        value={bostaCity}
                        onChange={(e) => setBostaCity(e.target.value)}
                        className="w-32 shrink-0"
                        dir={i18n.dir()}
                      />
                    </div>
                    <Button
                      onClick={handleCreateShipment}
                      disabled={bostaLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Truck className="w-4 h-4 me-2" />
                      {bostaLoading ? t("orderDetail.bosta.btnCreating") : t("orderDetail.bosta.btnCreate")}
                    </Button>
                    <Link href="/orders?tab=returns">
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg border-orange-200 text-orange-700 hover:bg-orange-50">
                        <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                        {t("orderDetail.bosta.btnReturn")}
                      </Button>
                    </Link>
                    <AnimatePresence>
                      {bostaResult && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                          <ActionFeedback success={bostaResult.success} message={bostaResult.message} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        </TabsContent>

        <TabsContent value="communications" className="space-y-5 outline-none">
        {/* Status History Timeline */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <StatusTimeline history={order.statusHistory} />
        )}

        {/* Contact Attempts — merchant only */}
        {isAuthenticated && <ContactAttemptsSection orderId={orderId} />}

        {/* ─── Merchant-only communication actions ─── */}
        {isAuthenticated && (
          <>
            {/* WhatsApp confirmation */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}>
              <Card className="border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-800/30 dark:bg-emerald-900/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <MessageCircle className="w-4 h-4" /> {t("orderDetail.whatsapp.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={defaultPhone || t("orderDetail.whatsapp.placeholder")}
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      dir="ltr"
                      className="flex-1 text-left"
                    />
                    <Button
                      onClick={handleSendWhatsApp}
                      disabled={waLoading}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {waLoading ? t("orderDetail.whatsapp.btnSending") : t("orderDetail.whatsapp.btnSend")}
                    </Button>
                  </div>
                  <AnimatePresence>
                    {waResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <ActionFeedback success={waResult.success} message={waResult.message} />
                        {waResult.link && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            asChild
                          >
                            <a href={waResult.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 me-1.5" />
                              {t("orderDetail.whatsapp.btnManual")}
                            </a>
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="text-xs text-muted-foreground">
                    {t("orderDetail.whatsapp.help")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Reply Assistant */}
            <AiReplySection
              customerName={order.customerName}
              customerPhone={order.customerPhone}
              orderTotal={order.totalAmount}
              orderStatus={order.status}
              items={order.items?.map((i) => ({ productName: i.productName, quantity: i.quantity }))}
              storeName={merchant?.storeName ?? undefined}
            />
            </>
        )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
