import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTenant, getGetTenantQueryKey, useGetTenantStats, getGetTenantStatsQueryKey,
  useListProducts, getListProductsQueryKey,
  useListTenantSupportNotes, useCreateTenantSupportNote,
  useUpdateTenantPlan,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin, Package, ShoppingBag, TrendingUp, AlertCircle,
  ShieldCheck, ClipboardList, Plus, Zap, Save, MessageSquare,
} from "lucide-react";
import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  fashion: "أزياء",
  cosmetics: "تجميل",
  both: "أزياء وتجميل",
};

const PLAN_LABELS: Record<string, string> = { starter: "ستارتر", growth: "جروث", pro: "برو" };

const SUB_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "trial",     label: "تجريبي" },
  { value: "active",    label: "نشط" },
  { value: "past_due",  label: "متأخر السداد" },
  { value: "suspended", label: "موقوف" },
  { value: "canceled",  label: "ملغي" },
];

const SUB_COLORS: Record<string, string> = {
  trial:     "bg-blue-100 text-blue-700 border-blue-200",
  active:    "bg-green-100 text-green-700 border-green-200",
  past_due:  "bg-orange-100 text-orange-700 border-orange-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  canceled:  "bg-gray-100 text-gray-600 border-gray-200",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } },
};

function PlatformAdminPanel({ tenantId }: { tenantId: number }) {
  const { data: tenant, refetch: refetchTenant } = useGetTenant(tenantId, {
    query: { queryKey: getGetTenantQueryKey(tenantId) },
  });
  const { data: notes, refetch: refetchNotes } = useListTenantSupportNotes(tenantId);
  const updatePlan = useUpdateTenantPlan();
  const createNote = useCreateTenantSupportNote();

  const [planCode, setPlanCode] = useState((tenant as { planCode?: string } | undefined)?.planCode ?? "starter");
  const [subStatus, setSubStatus] = useState((tenant as { subscriptionStatus?: string } | undefined)?.subscriptionStatus ?? "trial");
  const [planNote, setPlanNote] = useState("");
  const [planSaved, setPlanSaved] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);

  async function handleSavePlan() {
    await updatePlan.mutateAsync({
      id: tenantId,
      data: {
        planCode: planCode as "starter" | "growth" | "pro",
        subscriptionStatus: subStatus as "trial" | "active" | "past_due" | "suspended" | "canceled",
        note: planNote || undefined,
      },
    });
    setPlanNote("");
    setPlanSaved(true);
    refetchTenant();
    setTimeout(() => setPlanSaved(false), 2500);
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await createNote.mutateAsync({ id: tenantId, data: { note: noteText.trim() } });
    setNoteText("");
    setShowNoteForm(false);
    refetchNotes();
  }

  return (
    <div className="space-y-5">
      {/* Plan management */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              إدارة الخطة — مشغّل المنصة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">الخطة</p>
                <Select value={planCode} onValueChange={setPlanCode}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">حالة الاشتراك</p>
                <Select value={subStatus} onValueChange={setSubStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              placeholder="ملاحظة داخلية عن التغيير (اختياري)"
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleSavePlan}
                disabled={updatePlan.isPending}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {updatePlan.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </Button>
              <AnimatePresence>
                {planSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-green-600 font-medium"
                  >
                    ✅ تم الحفظ
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Support notes */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                ملاحظات الدعم
                {notes && notes.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{notes.length}</Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => setShowNoteForm((f) => !f)}
              >
                <Plus className="w-3 h-3" />
                إضافة ملاحظة
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {showNoteForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Textarea
                    placeholder="أكتب ملاحظتك هنا..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddNote} disabled={createNote.isPending || !noteText.trim()} className="flex-1">
                      {createNote.isPending ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNoteForm(false)}>إلغاء</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {notes && notes.length > 0 ? (
              <div className="space-y-2">
                {[...notes].reverse().map((note) => (
                  <div key={note.id} className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-muted/40 border border-border/30">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdByName && <span>{note.createdByName} · </span>}
                        {new Date(note.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !showNoteForm && (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد ملاحظات بعد</p>
              )
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const { merchant } = useAuth();

  const { data: tenant, isLoading: loadingTenant } = useGetTenant(tenantId, {
    query: { queryKey: getGetTenantQueryKey(tenantId) },
  });
  const { data: stats } = useGetTenantStats(tenantId, {
    query: { queryKey: getGetTenantStatsQueryKey(tenantId) },
  });
  const { data: products, isLoading: loadingProducts } = useListProducts(
    { tenantId },
    { query: { queryKey: getListProductsQueryKey({ tenantId }) } },
  );

  const isPlatformAdmin = merchant?.isPlatformAdmin === true;

  if (loadingTenant) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="text-muted-foreground">المتجر غير موجود</p>
      </div>
    );
  }

  const tenantAny = tenant as typeof tenant & { planCode?: string; subscriptionStatus?: string };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      {/* Cover + Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl overflow-hidden mb-6"
      >
        {tenant.coverUrl ? (
          <img src={tenant.coverUrl.startsWith("/") ? `${BASE}${tenant.coverUrl}` : tenant.coverUrl} alt={tenant.name} className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-primary/30" />
          </div>
        )}
        <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 to-transparent p-6">
          <div className="flex items-end gap-4">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl.startsWith("/") ? `${BASE}${tenant.logoUrl}` : tenant.logoUrl} alt={tenant.name} className="w-20 h-20 rounded-2xl border-4 border-white/20 object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {tenant.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                {isPlatformAdmin && tenantAny.subscriptionStatus && (
                  <Badge className={`text-xs border ${SUB_COLORS[tenantAny.subscriptionStatus] ?? "bg-white/20 text-white border-white/30"}`}>
                    {SUB_STATUS_OPTIONS.find((s) => s.value === tenantAny.subscriptionStatus)?.label ?? tenantAny.subscriptionStatus}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {CATEGORY_LABELS[tenant.category] ?? tenant.category}
                </Badge>
                {isPlatformAdmin && tenantAny.planCode && (
                  <Badge className="bg-primary/80 text-white border-primary/40 text-xs">
                    خطة {PLAN_LABELS[tenantAny.planCode] ?? tenantAny.planCode}
                  </Badge>
                )}
                {tenant.city && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {tenant.city}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Description */}
      {tenant.description && (
        <p className="text-muted-foreground mb-6 leading-relaxed">{tenant.description}</p>
      )}

      {/* Stats */}
      {stats && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {[
            { label: "المنتجات", value: stats.totalProducts, icon: Package },
            { label: "الطلبات", value: stats.totalOrders, icon: ShoppingBag },
            { label: "الإيرادات", value: `${Number(stats.totalRevenue ?? 0).toLocaleString("ar-EG")} ج.م`, icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border/50 rounded-2xl p-4 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Platform admin panel */}
      {isPlatformAdmin && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">أدوات المشغّل</h2>
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Admin</Badge>
          </div>
          <PlatformAdminPanel tenantId={tenantId} />
        </motion.div>
      )}

      {/* Products */}
      <div>
        <h2 className="text-2xl font-bold mb-6">منتجات المتجر</h2>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={stagger.container} initial="hidden" animate="show"
        >
          {loadingProducts
            ? Array(8).fill(0).map((_, i) => (
              <motion.div key={i} variants={stagger.item}>
                <Skeleton className="aspect-[3/4] rounded-xl" />
              </motion.div>
            ))
            : products?.map((p) => (
              <motion.div key={p.id} variants={stagger.item}>
                <ProductCard product={p} />
              </motion.div>
            ))}
        </motion.div>
        {!loadingProducts && !products?.length && (
          <p className="text-muted-foreground text-center py-16">لا توجد منتجات في هذا المتجر بعد</p>
        )}
      </div>
    </div>
  );
}
