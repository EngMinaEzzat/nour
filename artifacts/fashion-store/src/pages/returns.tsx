import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { StateBlock } from "@/components/admin/state-block";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; icon: React.ElementType }> = {
  REQUESTED: { labelKey: "returns.status.REQUESTED", color: "bg-blue-100 text-blue-700 border-blue-200",    icon: Clock },
  APPROVED:  { labelKey: "returns.status.APPROVED",  color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  REJECTED:  { labelKey: "returns.status.REJECTED", color: "bg-red-100 text-red-700 border-red-200",        icon: XCircle },
  RECEIVED:  { labelKey: "returns.status.RECEIVED", color: "bg-violet-100 text-violet-700 border-violet-200", icon: Package },
  RESOLVED:  { labelKey: "returns.status.RESOLVED", color: "bg-gray-100 text-gray-700 border-gray-200",     icon: RefreshCcw },
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
  const { t } = useTranslation();
  return useQuery<ReturnCase[]>({
    queryKey: ["returns"],
    queryFn: async () => {
      const r = await fetch(api("/returns"), { credentials: "include" });
      if (!r.ok) throw new Error(t("returns.toast.fetchError"));
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
      <h3 className="font-medium text-sm">{t("returns.create.title")}</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("returns.create.orderId")}</Label>
          <Input type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder={t("returns.create.orderIdPlaceholder")} className="rounded-lg text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("returns.create.reason")}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("returns.create.reasonPlaceholder")} className="rounded-lg text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
          <Label className="text-xs">{t("returns.create.note")}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("returns.create.notePlaceholder")} className="rounded-lg text-sm min-h-[70px]" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>{t("returns.create.btnCancel")}</Button>
        <Button size="sm" className="h-8 rounded-lg" disabled={!orderId || !reason} onClick={() => onSave({ orderId: parseInt(orderId), reason, note: note.trim() || undefined })}>
          {t("returns.create.btnCreate")}
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
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.note ?? "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      dir={i18n.dir()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold">{t("returns.update.title").replace("{id}", item.id.toString())}</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("returns.update.newStatus")}</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{t(v.labelKey)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("returns.update.note")}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg text-sm min-h-[80px]" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t("returns.update.btnCancel")}</Button>
          <Button size="sm" className="rounded-lg" onClick={() => { onUpdate(item.id, { status, note: note.trim() || undefined }); onClose(); }}>
            {t("returns.update.btnSave")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Returns({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation();
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
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? t("returns.toast.actionError")); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); setShowCreate(false); toast({ title: t("returns.toast.createSuccess") }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateReturn = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status: string; note?: string } }) => {
      const r = await fetch(api(`/returns/${id}`), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? t("returns.toast.actionError")); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); toast({ title: t("returns.toast.updateSuccess") }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const filtered = (returns ?? []).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(r.orderId).includes(s) || r.reason.toLowerCase().includes(s) || (r.customerName ?? "").toLowerCase().includes(s);
  });

  const isOwnerOrManager = merchant?.role === "owner" || merchant?.role === "manager";

  return (
    <div className={embedded ? "pb-8" : "min-h-screen bg-background pb-16"} dir={i18n.dir()}>
      {!embedded && (
        <div className="border-b bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" />{t("returns.page.title")}</h1>
              <p className="text-muted-foreground text-sm mt-1">{t("returns.page.subtitle")}</p>
            </div>
            {isOwnerOrManager && (
              <Button className="rounded-xl gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />{t("returns.btnNew")}
              </Button>
            )}
          </div>
        </div>
        </div>
      )}

      <div className={embedded ? "space-y-5" : "container mx-auto px-4 py-8 space-y-5"}>
        {/* Status summary */}
        {!isLoading && returns && (
          <div className="flex gap-3 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => {
              const cnt = returns.filter((r) => r.status === k).length;
              if (cnt === 0) return null;
              return (
                <div key={k} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${v.color}`}>
                  <v.icon className="w-3 h-3" />{t(v.labelKey)}: {cnt}
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className={`absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("returns.search.placeholder")}
            className="px-9 rounded-xl"
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
          <StateBlock
            icon={<RotateCcw className="h-6 w-6" />}
            title={search ? t("returns.list.emptySearch") : t("returns.list.empty")}
          />
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
                            <span className="font-semibold text-sm">{t("returns.list.returnNum")}{rc.id}</span>
                            <span className="text-xs text-muted-foreground">{t("returns.list.orderNum")}{rc.orderId}</span>
                            {rc.customerName && <span className="text-xs text-muted-foreground">— {rc.customerName}</span>}
                            <Badge className={`text-[10px] px-2 py-0 border ${st.color} ${i18n.dir() === "ltr" ? "ml-auto" : "mr-auto"}`}>{t(st.labelKey)}</Badge>
                          </div>
                          <p className="text-sm mt-1 text-foreground/80">{rc.reason}</p>
                          {rc.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{rc.note}</p>}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {rc.orderTotal && <span className="text-xs font-medium">{rc.orderTotal.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</span>}
                            <span className="text-xs text-muted-foreground">{new Date(rc.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US")}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Link href={`/orders/${rc.orderId}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1">
                              {t("returns.list.btnOrder")} <ChevronLeft className={`w-3 h-3 ${i18n.dir() === "ltr" ? "rotate-180" : ""}`} />
                            </Button>
                          </Link>
                          {isOwnerOrManager && (
                            <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => setUpdateItem(rc)}>
                              {t("returns.list.btnUpdate")}
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
