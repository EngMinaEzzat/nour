import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Pencil, Trash2, Copy, Check, Loader2, Ticket, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

type DiscountCode = {
  id: number;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

type Form = {
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  percentage: t("text_5a93ca0e", "نسبة مئوية %"),
  fixed: t("text_13c7cd26", "مبلغ ثابت ج.م"),
  free_shipping: t("text_a112716d", "شحن مجاني"),
};

const EMPTY_FORM: Form = { code: "", type: "percentage", value: "", minOrderAmount: "", maxUses: "", expiresAt: "" };

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Discounts() {
    const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<number | null>(null);

  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["discounts"],
    queryFn: () => fetch(api("/discounts"), { credentials: "include" }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "failed"); return Array.isArray(d) ? d : []; }),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(api("/discounts"), { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? t("text_c5572cc3", "فشل الحفظ"));
        return d;
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discounts"] }); setOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      fetch(api(`/discounts/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? t("text_1c75bf72", "فشل التحديث"));
        return d;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(api(`/discounts/${id}`), { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discounts"] }); setDeleteTarget(null); },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, code: generateCode() });
    setErrors({});
    setOpen(true);
  }

  function openEdit(code: DiscountCode) {
    setEditing(code);
    setForm({
      code: code.code,
      type: code.type,
      value: String(code.value),
      minOrderAmount: code.minOrderAmount ? String(code.minOrderAmount) : "",
      maxUses: code.maxUses ? String(code.maxUses) : "",
      expiresAt: code.expiresAt ? code.expiresAt.split("T")[0] : "",
    });
    setErrors({});
    setOpen(true);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = t("text_bb97524b", "الكود مطلوب");
    if (form.type !== "free_shipping" && (!form.value || parseFloat(form.value) <= 0)) errs.value = t("text_9b44b441", "القيمة مطلوبة");
    if (form.type === "percentage" && parseFloat(form.value) > 100) errs.value = t("text_46e0a2cb", "النسبة لا تتجاوز 100%");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const body = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: form.type === "free_shipping" ? 0 : parseFloat(form.value),
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
      expiresAt: form.expiresAt || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...body });
      setOpen(false);
    } else {
      createMutation.mutate(body);
    }
  }

  function copyCode(code: DiscountCode) {
    navigator.clipboard.writeText(code.code);
    setCopied(code.id);
    setTimeout(() => setCopied(null), 1500);
  }

  const toggleActive = useCallback((code: DiscountCode) => {
    updateMutation.mutate({ id: code.id, active: !code.active });
  }, [updateMutation]);

  const activeCount = codes.filter((c) => c.active).length;
  const totalUses = codes.reduce((s, c) => s + c.usedCount, 0);

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{t("text_e41d3dfc", t("text_e41d3dfc", "أكواد الخصم"))}</h1>
            <p className="text-muted-foreground mt-1">{t("text_245da854", t("text_245da854", "أنشئ وأدّر أكواد خصم لتشجيع العملاء على الشراء"))}</p>
          </div>
          <Button className="rounded-2xl gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> {t("text_216e9c48", t("text_216e9c48", "كود جديد"))}
                                </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: t("text_58bc7e74", "إجمالي الأكواد"), value: codes.length, icon: Ticket, color: "text-primary" },
            { label: t("text_c0a93623", "أكواد نشطة"), value: activeCount, icon: Tag, color: "text-green-600" },
            { label: t("text_1196a344", "مرات الاستخدام"), value: totalUses, icon: Users, color: "text-amber-600" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted/60 ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : codes.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Ticket className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold mb-2">{t("text_824a383f", t("text_824a383f", "لا توجد أكواد خصم"))}</p>
            <p className="text-sm mb-6">{t("text_7d9d24b9", t("text_7d9d24b9", "أنشئ أول كود خصم لعملائك"))}</p>
            <Button className="rounded-2xl" onClick={openCreate}><Plus className="w-4 h-4 me-2" /> {t("text_216e9c48", t("text_216e9c48", "كود جديد"))}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {codes.map((code) => {
                const expired = code.expiresAt && new Date(code.expiresAt) < new Date();
                const exhausted = code.maxUses !== null && code.usedCount >= code.maxUses;
                return (
                  <motion.div
                    key={code.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={`border-border/50 transition-opacity ${!code.active ? "opacity-60" : ""}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Code */}
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={() => copyCode(code)}
                              className="font-mono text-lg font-bold tracking-widest text-primary bg-primary/8 px-3 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/15 transition-colors flex items-center gap-2"
                            >
                              {code.code}
                              {copied === code.id
                                ? <Check className="w-3.5 h-3.5 text-green-600" />
                                : <Copy className="w-3.5 h-3.5 opacity-50" />}
                            </button>
                          </div>

                          {/* Type + value */}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {code.type === "percentage" ? `${code.value}% خصم` : code.type === "fixed" ? `${code.value.toLocaleString("ar-EG")} ج.م خصم` : t("text_a112716d", "شحن مجاني")}
                            </Badge>
                            {code.minOrderAmount && (
                              <span className="text-xs text-muted-foreground">{t("text_4a2785f0", t("text_4a2785f0", "حد أدنى:"))} {code.minOrderAmount.toLocaleString("ar-EG")} {t("text_3c111129", t("text_3c111129", "ج.م"))}</span>
                            )}
                          </div>

                          {/* Usage */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {code.usedCount}{code.maxUses !== null ? `/${code.maxUses}` : ""} {t("text_16fe54ab", t("text_16fe54ab", "استخدام"))}
                                                                  </div>

                          {/* Expiry */}
                          {code.expiresAt && (
                            <span className={`text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                              {expired ? t("text_2054737d", "منتهي الصلاحية") : `ينتهي ${new Date(code.expiresAt).toLocaleDateString("ar-EG")}`}
                            </span>
                          )}

                          {/* Status badges */}
                          {exhausted && <Badge variant="destructive" className="text-[10px]">{t("text_bf040ab4", t("text_bf040ab4", "استُنفد"))}</Badge>}

                          {/* Actions — pushed to end */}
                          <div className="ms-auto flex items-center gap-3">
                            <Switch
                              checked={code.active}
                              onCheckedChange={() => toggleActive(code)}
                              disabled={updateMutation.isPending}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(code)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteTarget(code)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? t("text_88dd97a9", "تعديل كود الخصم") : t("text_12b19e27", "كود خصم جديد")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("text_ebdff69b", t("text_ebdff69b", "كود الخصم *"))}</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER20"
                  className={`font-mono tracking-widest ${errors.code ? "border-destructive" : ""}`}
                  dir="ltr"
                />
                <Button variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, code: generateCode() }))}>
                  {t("text_a8563d50", t("text_a8563d50", "عشوائي"))}
                                                  </Button>
              </div>
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t("text_a0f11ef7", t("text_a0f11ef7", "نوع الخصم *"))}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Form["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("text_5a93ca0e", t("text_5a93ca0e", "نسبة مئوية %"))}</SelectItem>
                  <SelectItem value="fixed">{t("text_13c7cd26", t("text_13c7cd26", "مبلغ ثابت ج.م"))}</SelectItem>
                  <SelectItem value="free_shipping">{t("text_a112716d", t("text_a112716d", "شحن مجاني"))}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type !== "free_shipping" && (
              <div className="space-y-1.5">
                <Label>{form.type === "percentage" ? t("text_2a92ec41", "نسبة الخصم (1-100) *") : t("text_009f87fe", "مبلغ الخصم (ج.م) *")}</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percentage" ? "20" : "50"}
                  min={1}
                  max={form.type === "percentage" ? 100 : undefined}
                  className={errors.value ? "border-destructive" : ""}
                />
                {errors.value && <p className="text-xs text-destructive">{errors.value}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("text_e9e613c0", t("text_e9e613c0", "حد أدنى للطلب (ج.م)"))}</Label>
                <Input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder={t("text_f36a82bd", "اختياري")}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("text_fe858f0b", t("text_fe858f0b", "أقصى عدد استخدامات"))}</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                  placeholder={t("text_f6e8f985", "بلا حدود")}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("text_f2e306fc", t("text_f2e306fc", "تاريخ انتهاء الصلاحية"))}</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {editing ? t("text_91d6db7f", "حفظ التعديلات") : t("text_589e0013", "إنشاء الكود")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("text_255b296b", t("text_255b296b", "حذف كود الخصم"))}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("text_05ff7d88", t("text_05ff7d88", "هل تريد حذف الكود"))} <span className="font-mono font-bold">{deleteTarget?.code}</span>{t("text_9ec41b10", t("text_9ec41b10", "؟ لا يمكن التراجع."))}
                                      </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t("text_3b9854e1", t("text_3b9854e1", "حذف"))}
                                      </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
