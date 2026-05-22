import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  RotateCcw, Plus, ChevronLeft, Clock, CheckCircle2,
  XCircle, Package, RefreshCcw, Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  REQUESTED: { label: t("text_bbd73382", "مطلوب"),    color: "bg-blue-100 text-blue-700 border-blue-200",    icon: Clock },
  APPROVED:  { label: t("text_48015ce2", "موافق"),    color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  REJECTED:  { label: t("text_20a971a3", "مرفوض"),   color: "bg-red-100 text-red-700 border-red-200",        icon: XCircle },
  RECEIVED:  { label: t("text_1f606562", "مستلم"),   color: "bg-violet-100 text-violet-700 border-violet-200", icon: Package },
  RESOLVED:  { label: t("text_dc2398d2", "محلول"),   color: "bg-gray-100 text-gray-700 border-gray-200",     icon: RefreshCcw },
};

interface ReturnCase {
  id: number;
  orderId: number;
  status: string;
  reason: string;
  note: string | null;
  orderTotal: number | null;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

function useReturns() {
  return useQuery<ReturnCase[]>({
    queryKey: ["returns"],
    queryFn: async () => {
      const r = await fetch(api("/returns"), { credentials: "include" });
      if (!r.ok) throw new Error(t("text_8616a8d1", "فشل جلب طلبات الإرجاع"));
      return r.json();
    },
  });
}

function CreateReturnForm({ onSave, onCancel }: { onSave: (data: { orderId: number; reason: string; note?: string }) => void; onCancel: () => void }) {
    const { t } = useTranslation();
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
      <h3 className="font-medium text-sm">{t("text_8f7af216", t("text_8f7af216", "طلب إرجاع / استبدال جديد"))}</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("text_e9cc2e87", t("text_e9cc2e87", "رقم الطلب"))}</Label>
          <Input type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder={t("text_0fd8c4e0", "ادخل رقم الطلب")} className="rounded-lg text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("text_4b1ae274", t("text_4b1ae274", "سبب الإرجاع"))}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("text_56bae646", "مثال: منتج تالف / مقاس خاطئ")} className="rounded-lg text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t("text_19659ede", t("text_19659ede", "ملاحظات (اختياري)"))}</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("text_d8161382", "تفاصيل إضافية...")} className="rounded-lg text-sm min-h-[70px]" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</Button>
        <Button size="sm" className="h-8 rounded-lg" disabled={!orderId || !reason} onClick={() => onSave({ orderId: parseInt(orderId), reason, note: note.trim() || undefined })}>
          {t("text_79464845", t("text_79464845", "إنشاء الطلب"))}
                          </Button>
      </div>
    </motion.div>
  );
}

function UpdateStatusModal({
  item,
  onUpdate,
  onClose,
}: {
  item: ReturnCase;
  onUpdate: (id: number, data: { status: string; note?: string }) => void;
  onClose: () => void;
}) {
    const { t } = useTranslation();
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.note ?? "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold">{t("text_d79214bf", t("text_d79214bf", "تحديث طلب الإرجاع #"))}{item.id}</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("text_906609b4", t("text_906609b4", "الحالة الجديدة"))}</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("text_531afb09", t("text_531afb09", "ملاحظة"))}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg text-sm min-h-[80px]" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</Button>
          <Button size="sm" className="rounded-lg" onClick={() => { onUpdate(item.id, { status, note: note.trim() || undefined }); onClose(); }}>
            {t("text_02f31ae2", t("text_02f31ae2", "حفظ التغييرات"))}
                                </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Returns() {
    const { t } = useTranslation();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: returns, isLoading } = useReturns();
  const [showCreate, setShowCreate] = useState(false);
  const [updateItem, setUpdateItem] = useState<ReturnCase | null>(null);
  const [search, setSearch] = useState("");

  const createReturn = useMutation({
    mutationFn: async (data: { orderId: number; reason: string; note?: string }) => {
      const r = await fetch(api("/returns"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? t("text_a838e35c", "فشل")); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); setShowCreate(false); toast({ title: t("text_0058fd1f", "تم إنشاء طلب الإرجاع") }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateReturn = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status: string; note?: string } }) => {
      const r = await fetch(api(`/returns/${id}`), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? t("text_a838e35c", "فشل")); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); toast({ title: t("text_68063318", "تم تحديث الحالة") }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const filtered = (returns ?? []).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(r.orderId).includes(s) || r.reason.toLowerCase().includes(s) || (r.customerName ?? "").toLowerCase().includes(s);
  });

  const isOwnerOrManager = merchant?.role === "owner" || merchant?.role === "manager";

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="border-b bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" />{t("text_f0507fa8", t("text_f0507fa8", "المرتجعات والاستبدال"))}</h1>
              <p className="text-muted-foreground text-sm mt-1">{t("text_6702668a", t("text_6702668a", "تتبع طلبات الإرجاع والاستبدال لطلباتك"))}</p>
            </div>
            {isOwnerOrManager && (
              <Button className="rounded-xl gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />{t("text_bad17729", t("text_bad17729", "طلب إرجاع جديد"))}
                                            </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-5">
        {/* Status summary */}
        {!isLoading && returns && (
          <div className="flex gap-3 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => {
              const cnt = returns.filter((r) => r.status === k).length;
              if (cnt === 0) return null;
              return (
                <div key={k} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${v.color}`}>
                  <v.icon className="w-3 h-3" />{v.label}: {cnt}
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("text_1a76b9fe", "بحث برقم الطلب أو اسم العميل أو السبب...")}
            className="ps-9 rounded-xl"
          />
        </div>

        <AnimatePresence>
          {showCreate && (
            <CreateReturnForm
              onSave={(data) => createReturn.mutate(data)}
              onCancel={() => setShowCreate(false)}
            />
          )}
        </AnimatePresence>

        {/* Returns List */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-14 text-center">
              <RotateCcw className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">{search ? t("text_b3b1ad3b", "لا توجد نتائج مطابقة") : t("text_08554b3e", "لا توجد طلبات إرجاع بعد")}</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-3">
            {filtered.map((rc) => {
              const st = STATUS_CONFIG[rc.status] ?? STATUS_CONFIG.REQUESTED;
              const Icon = st.icon;
              return (
                <motion.div key={rc.id} variants={stagger.item}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${st.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{t("text_12bddb60", t("text_12bddb60", "إرجاع #"))}{rc.id}</span>
                            <span className="text-xs text-muted-foreground">{t("text_87e1ced7", t("text_87e1ced7", "طلب #"))}{rc.orderId}</span>
                            {rc.customerName && <span className="text-xs text-muted-foreground">— {rc.customerName}</span>}
                            <Badge className={`text-[10px] px-2 py-0 border ${st.color} ms-auto`}>{st.label}</Badge>
                          </div>
                          <p className="text-sm mt-1 text-foreground/80">{rc.reason}</p>
                          {rc.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{rc.note}</p>}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {rc.orderTotal && <span className="text-xs font-medium">{rc.orderTotal.toLocaleString("ar-EG")} {t("text_3c111129", t("text_3c111129", "ج.م"))}</span>}
                            <span className="text-xs text-muted-foreground">{new Date(rc.createdAt).toLocaleDateString("ar-EG")}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Link href={`/orders/${rc.orderId}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1">
                              {t("text_bf9c02da", t("text_bf9c02da", "الطلب"))} <ChevronLeft className="w-3 h-3" />
                            </Button>
                          </Link>
                          {isOwnerOrManager && (
                            <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => setUpdateItem(rc)}>
                              {t("text_061401dc", t("text_061401dc", "تحديث"))}
                                                                          </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {updateItem && (
          <UpdateStatusModal
            item={updateItem}
            onUpdate={(id, data) => updateReturn.mutate({ id, data })}
            onClose={() => setUpdateItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
