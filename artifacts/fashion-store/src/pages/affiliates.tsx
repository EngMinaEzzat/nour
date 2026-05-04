import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Instagram, Link2, Plus, Star, Trash2,
  TrendingUp, Users, Wallet, Youtube, ToggleLeft, ToggleRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

interface Affiliate {
  id: number;
  name: string;
  handle: string;
  platform: "instagram" | "tiktok" | "youtube" | "other";
  promoCode: string | null;
  discountCodeId: number | null;
  commissionType: "percent" | "flat";
  commissionValue: number;
  active: boolean;
  notes: string | null;
  uses: number;
  totalRevenue: number;
  totalDiscount: number;
  commissionDue: number;
  createdAt: string;
}

type FormState = {
  name: string;
  handle: string;
  platform: "instagram" | "tiktok" | "youtube" | "other";
  promoCode: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  commissionType: "percent" | "flat";
  commissionValue: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", handle: "", platform: "instagram",
  promoCode: "", discountType: "percentage", discountValue: "10",
  commissionType: "percent", commissionValue: "10", notes: "",
};

function PlatformIcon({ platform }: { platform: Affiliate["platform"] }) {
  if (platform === "instagram") return <Instagram className="w-4 h-4 text-pink-500" />;
  if (platform === "youtube")   return <Youtube className="w-4 h-4 text-red-500" />;
  if (platform === "tiktok")   return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/>
    </svg>
  );
  return <Link2 className="w-4 h-4 text-muted-foreground" />;
}

function PlatformLabel({ platform }: { platform: Affiliate["platform"] }) {
  const map = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", other: "أخرى" };
  return <span>{map[platform]}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "تم النسخ" : "نسخ"}
    </button>
  );
}

export default function Affiliates() {
  const { merchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery<{ affiliates: Affiliate[] }>({
    queryKey: ["affiliates", merchant?.tenantId],
    queryFn: async () => {
      const r = await fetch(api("/affiliates"), { credentials: "include" });
      if (!r.ok) throw new Error("فشل تحميل المؤثرين");
      return r.json();
    },
    enabled: !!merchant,
  });

  const affiliates = data?.affiliates ?? [];

  const totalCommission = affiliates.reduce((s, a) => s + a.commissionDue, 0);
  const totalRevenue = affiliates.reduce((s, a) => s + a.totalRevenue, 0);
  const totalUses = affiliates.reduce((s, a) => s + a.uses, 0);

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const r = await fetch(api("/affiliates"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "فشل الإنشاء");
      return json;
    },
    onSuccess: () => {
      toast({ title: "تم إضافة المؤثر", description: "تم إنشاء الكود تلقائياً وربطه بالمؤثر" });
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setFormError("");
    },
    onError: (e: any) => setFormError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const r = await fetch(api(`/affiliates/${id}`), {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!r.ok) throw new Error("فشل التحديث");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
    onError: () => toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(api(`/affiliates/${id}`), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("فشل الحذف");
    },
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      setDeleteId(null);
    },
    onError: () => toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" }),
  });

  function f(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleCreate() {
    setFormError("");
    if (!form.name || !form.handle || !form.promoCode) {
      setFormError("الاسم والحساب وكود الخصم مطلوبة");
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      handle: form.handle.trim(),
      platform: form.platform,
      promoCode: form.promoCode.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue) || 10,
      commissionType: form.commissionType,
      commissionValue: parseFloat(form.commissionValue) || 10,
      notes: form.notes.trim() || null,
    });
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            برنامج المؤثرين والعمولات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            أنشئ كوداً فريداً لكل مؤثر، تتبع مبيعاته، واحسب عمولته تلقائياً
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          إضافة مؤثر
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
          <>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{affiliates.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" /> مؤثرون
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{totalUses}</p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" /> طلب محوّل
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {totalCommission.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Wallet className="w-3 h-3" /> عمولة مستحقة ج.م
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Affiliate list */}
      <div className="space-y-3">
        {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />) :
         affiliates.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="py-16 text-center space-y-3">
              <Star className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="font-medium text-muted-foreground">لم تضف أي مؤثر بعد</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                أضف مؤثراً وسيُنشأ له كود خصم تلقائياً — تتبع مبيعاته وعمولاته من هنا
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-2 mt-2">
                <Plus className="w-3.5 h-3.5" /> إضافة أول مؤثر
              </Button>
            </CardContent>
          </Card>
         ) : (
          <AnimatePresence>
            {affiliates.map((a) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className={`border-border/50 transition-opacity ${!a.active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 text-base font-bold text-primary">
                        {a.name[0]}
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{a.name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <PlatformIcon platform={a.platform} />
                                {a.handle}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                <PlatformLabel platform={a.platform} />
                              </Badge>
                              {!a.active && <Badge variant="secondary" className="text-[10px]">متوقف</Badge>}
                            </div>
                            {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleMutation.mutate({ id: a.id, active: !a.active })}
                              title={a.active ? "إيقاف" : "تفعيل"}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                              {a.active
                                ? <ToggleRight className="w-5 h-5 text-primary" />
                                : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                            </button>
                            <button
                              onClick={() => setDeleteId(a.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Promo code */}
                        {a.promoCode && (
                          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/40">
                            <span className="text-xs text-muted-foreground shrink-0">كود الخصم:</span>
                            <code className="text-sm font-mono font-bold tracking-wider flex-1">{a.promoCode}</code>
                            <CopyButton text={a.promoCode} />
                          </div>
                        )}

                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "استخدامات", value: a.uses.toString(), color: "text-foreground" },
                            { label: "إيرادات", value: `${a.totalRevenue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م`, color: "text-green-600" },
                            {
                              label: "العمولة",
                              value: a.commissionType === "percent"
                                ? `${a.commissionValue}%`
                                : `${a.commissionValue} ج.م/طلب`,
                              color: "text-muted-foreground",
                            },
                            { label: "مستحق", value: `${a.commissionDue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م`, color: "text-amber-600 font-bold" },
                          ].map((stat, i) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-2 text-center">
                              <p className={`text-sm font-semibold ${stat.color}`}>{stat.value}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
         )}
      </div>

      {/* How it works banner */}
      {affiliates.length === 0 && (
        <Card className="border-border/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">كيف يعمل البرنامج؟</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
              {[
                { step: "١", title: "أضف مؤثراً", desc: "أدخل اسمه وحسابه وكود الخصم الخاص به" },
                { step: "٢", title: "شارك الكود", desc: "يستخدم متابعوه الكود عند الشراء من متجرك" },
                { step: "٣", title: "تتبع وادفع", desc: "ترى إيراداته وعمولته تلقائياً — ادفعها له شهرياً" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setForm(EMPTY_FORM); setFormError(""); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> إضافة مؤثر جديد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>اسم المؤثر *</Label>
                <Input value={form.name} onChange={f("name")} placeholder="سارة أحمد" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label>حساب التواصل *</Label>
                <Input value={form.handle} onChange={f("handle")} placeholder="@sara_style" className="h-9" dir="ltr" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>المنصة</Label>
              <Select value={form.platform} onValueChange={(v) => setForm(p => ({ ...p, platform: v as FormState["platform"] }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border/50 pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">كود الخصم للمؤثر</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-3">
                  <Label>كود الخصم (يُنشأ تلقائياً للمؤثر) *</Label>
                  <Input value={form.promoCode} onChange={f("promoCode")} placeholder="SARA20" className="h-9 font-mono uppercase" dir="ltr" />
                  <p className="text-[10px] text-muted-foreground">يُشارَك مع المتابعين — لا يمكن تكراره</p>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>نوع الخصم</Label>
                  <Select value={form.discountType} onValueChange={(v) => setForm(p => ({ ...p, discountType: v as FormState["discountType"] }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت ج.م</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>قيمة الخصم</Label>
                  <Input value={form.discountValue} onChange={f("discountValue")} type="number" min={0} className="h-9" />
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">عمولة المؤثر</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>نوع العمولة</Label>
                  <Select value={form.commissionType} onValueChange={(v) => setForm(p => ({ ...p, commissionType: v as FormState["commissionType"] }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">% من الإيراد</SelectItem>
                      <SelectItem value="flat">مبلغ ثابت / طلب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>القيمة</Label>
                  <Input value={form.commissionValue} onChange={f("commissionValue")} type="number" min={0} className="h-9" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {form.commissionType === "percent"
                  ? `المؤثر يحصل على ${form.commissionValue || 0}% من قيمة كل طلب يُحوّله`
                  : `المؤثر يحصل على ${form.commissionValue || 0} ج.م عن كل طلب مكتمل`}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات (اختياري)</Label>
              <Input value={form.notes} onChange={f("notes")} placeholder="تعاون شهري، يغطي فئة الفساتين..." className="h-9" />
            </div>

            {formError && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? "جاري الإنشاء..." : <><Plus className="w-3.5 h-3.5" />إضافة المؤثر</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المؤثر</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المؤثر من قائمتك. كود الخصم الخاص به سيظل موجوداً في صفحة الخصومات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
