import { useState } from "react";
import { useQuery, useMutation, useQueryClient as useQC } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListStaff, useInviteStaff, useUpdateStaffRole, useRemoveStaff,
  getListStaffQueryKey, MerchantRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus, Shield, User, Crown, Trash2, Pencil, AlertCircle, Users,
  Mail, Link2, Clock, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const INV_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  revoked: "bg-red-100 text-red-600",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  manager: "مدير",
  staff: "موظف",
  catalog_manager: "مدير كتالوج",
  order_operator: "موظف طلبات",
  marketing_analyst: "محلل تسويق",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  manager: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  staff: "bg-muted text-muted-foreground border-border",
  catalog_manager: "bg-emerald-100 text-emerald-800 border-emerald-200",
  order_operator: "bg-orange-100 text-orange-800 border-orange-200",
  marketing_analyst: "bg-pink-100 text-pink-800 border-pink-200",
};

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  manager: Shield,
  staff: User,
  catalog_manager: User,
  order_operator: User,
  marketing_analyst: User,
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

export default function Staff() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = merchant?.role === "owner";

  const { data: staffList, isLoading } = useListStaff({
    query: { queryKey: getListStaffQueryKey() },
  });

  const inviteMutation = useInviteStaff();
  const updateRoleMutation = useUpdateStaffRole();
  const removeMutation = useRemoveStaff();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<{ id: number; role: MerchantRole } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invLinkOpen, setInvLinkOpen] = useState(false);
  const [invLinkForm, setInvLinkForm] = useState({ email: "", role: "staff" });
  const [invLinkResult, setInvLinkResult] = useState<string | null>(null);
  const [copiedInvLink, setCopiedInvLink] = useState(false);

  const { data: invitations = [], refetch: refetchInvs } = useQuery({
    queryKey: ["staff-invitations"],
    queryFn: () => fetch(api("/staff/invitations"), { credentials: "include" }).then((r) => r.json()),
    enabled: isOwner,
  });

  const revokeInvMutation = useMutation({
    mutationFn: (id: number) => fetch(api(`/staff/invitations/${id}`), { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => refetchInvs(),
  });

  const sendInvLinkMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => fetch(api("/staff/invitations"), {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (data) => { setInvLinkResult(data.inviteLink); refetchInvs(); },
  });

  const [form, setForm] = useState({ email: "", name: "", password: "", role: "staff" as "manager" | "staff" | "catalog_manager" | "order_operator" | "marketing_analyst" });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await inviteMutation.mutateAsync({ data: { ...form, role: form.role as MerchantRole } });
      queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
      setInviteOpen(false);
      setForm({ email: "", name: "", password: "", role: "staff" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "حدث خطأ أثناء الإضافة");
    }
  }

  async function handleUpdateRole() {
    if (!editMember) return;
    setError(null);
    try {
      await updateRoleMutation.mutateAsync({
        id: editMember.id,
        data: { role: editMember.role },
      });
      queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
      setEditMember(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "حدث خطأ أثناء التحديث");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setError(null);
    try {
      await removeMutation.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
      setDeleteId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "حدث خطأ أثناء الحذف");
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      {/* Header */}
      <motion.div
        className="flex items-start justify-between mb-8 gap-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Users className="w-9 h-9 text-primary" />
            إدارة الفريق
          </h1>
          <p className="text-muted-foreground">أضف موظفين ومديرين لمتجرك وحدد صلاحياتهم</p>
        </div>
        {isOwner && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" className="rounded-full gap-2" onClick={() => { setInvLinkOpen(true); setInvLinkResult(null); }}>
              <Link2 className="w-4 h-4" /> دعوة برابط
            </Button>
            <Button className="rounded-full gap-2" onClick={() => { setInviteOpen(true); setError(null); }}>
              <UserPlus className="w-4 h-4" /> إضافة مباشر
            </Button>
          </div>
        )}
      </motion.div>

      {/* Role guide */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
      >
        {[
          { role: "owner", desc: "وصول كامل — الإعدادات والفوترة وإدارة الفريق" },
          { role: "manager", desc: "إدارة المنتجات والطلبات والعملاء وعرض التقارير" },
          { role: "catalog_manager", desc: "إدارة المنتجات والفئات والمخزون فقط" },
          { role: "order_operator", desc: "عرض الطلبات وتحديث حالتها ومعالجة الشحن" },
          { role: "marketing_analyst", desc: "عرض التقارير والتحليلات والعملاء فقط" },
          { role: "staff", desc: "عرض الطلبات وتحديث حالتها وعرض المنتجات فقط" },
        ].map(({ role, desc }) => {
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role} className={`rounded-xl border px-4 py-3 flex gap-3 items-start ${ROLE_COLORS[role]}`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-sm">{ROLE_LABELS[role]}</p>
                <p className="text-xs opacity-80 mt-0.5">{desc}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Staff list */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            أعضاء الفريق
            {staffList && (
              <Badge variant="secondary" className="ms-auto text-xs">{staffList.length} عضو</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : !staffList?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا يوجد أعضاء فريق بعد</p>
              {isOwner && (
                <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5 me-1.5" /> أضف أول عضو
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              className="divide-y divide-border/50"
              variants={stagger.container} initial="hidden" animate="show"
            >
              {staffList.map((member) => {
                const Icon = ROLE_ICONS[member.role] ?? User;
                const isMe = member.id === merchant?.merchantId;
                return (
                  <motion.div
                    key={member.id}
                    variants={stagger.item}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${ROLE_COLORS[member.role]}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">
                          {member.name ?? member.email}
                        </p>
                        {isMe && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30">أنت</Badge>
                        )}
                        <Badge className={`text-xs border ${ROLE_COLORS[member.role]} bg-transparent`}>
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                      </div>
                      {member.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        انضم {new Date(member.createdAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>

                    {/* Actions — owner only, not self, not other owners */}
                    {isOwner && !isMe && member.role !== "owner" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditMember({ id: member.id, role: member.role as MerchantRole }); setError(null); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => { setDeleteId(member.id); setError(null); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              إضافة عضو جديد
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات العضو الجديد وحدد دوره في المتجر
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>الاسم (اختياري)</Label>
              <Input
                placeholder="اسم الموظف"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                placeholder="example@store.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور *</Label>
              <Input
                type="password"
                placeholder="6 أحرف على الأقل"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الدور *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as "manager" | "staff" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">مدير — إدارة كاملة</SelectItem>
                  <SelectItem value="catalog_manager">مدير كتالوج — منتجات ومخزون</SelectItem>
                  <SelectItem value="order_operator">موظف طلبات — معالجة الطلبات</SelectItem>
                  <SelectItem value="marketing_analyst">محلل تسويق — تقارير فقط</SelectItem>
                  <SelectItem value="staff">موظف — صلاحيات محدودة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "جارٍ الإضافة..." : "إضافة العضو"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editMember} onOpenChange={(o) => !o && setEditMember(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير الدور</DialogTitle>
            <DialogDescription>حدد الدور الجديد لهذا العضو</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Select
              value={editMember?.role ?? "staff"}
              onValueChange={(v) => setEditMember((m) => m ? { ...m, role: v as MerchantRole } : m)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">مدير</SelectItem>
                <SelectItem value="catalog_manager">مدير كتالوج</SelectItem>
                <SelectItem value="order_operator">موظف طلبات</SelectItem>
                <SelectItem value="marketing_analyst">محلل تسويق</SelectItem>
                <SelectItem value="staff">موظف</SelectItem>
              </SelectContent>
            </Select>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setEditMember(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite by link dialog */}
      <Dialog open={invLinkOpen} onOpenChange={(o) => { if (!o) { setInvLinkOpen(false); setInvLinkResult(null); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> دعوة برابط</DialogTitle>
            <DialogDescription>أنشئ رابط دعوة لمدة 7 أيام يُرسل للعضو عبر أي قناة</DialogDescription>
          </DialogHeader>
          {!invLinkResult ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>البريد الإلكتروني *</Label>
                <input type="email" placeholder="employee@store.com" value={invLinkForm.email} onChange={(e) => setInvLinkForm({ ...invLinkForm, email: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={invLinkForm.role} onValueChange={(v) => setInvLinkForm({ ...invLinkForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">مدير</SelectItem>
                    <SelectItem value="catalog_manager">مدير كتالوج</SelectItem>
                    <SelectItem value="order_operator">موظف طلبات</SelectItem>
                    <SelectItem value="marketing_analyst">محلل تسويق</SelectItem>
                    <SelectItem value="staff">موظف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" disabled={!invLinkForm.email || sendInvLinkMutation.isPending} onClick={() => sendInvLinkMutation.mutate(invLinkForm)}>
                  {sendInvLinkMutation.isPending ? "جاري الإنشاء..." : "إنشاء رابط الدعوة"}
                </Button>
                <Button variant="outline" onClick={() => setInvLinkOpen(false)}>إلغاء</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-800 mb-2">تم إنشاء رابط الدعوة!</p>
                <p className="text-xs text-green-700 font-mono break-all">{window.location.origin}{invLinkResult}</p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${invLinkResult}`); setCopiedInvLink(true); setTimeout(() => setCopiedInvLink(false), 2000); }}>
                  {copiedInvLink ? "تم النسخ ✓" : "نسخ الرابط"}
                </Button>
                <Button variant="outline" onClick={() => { setInvLinkOpen(false); setInvLinkResult(null); }}>إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invitations panel */}
      {isOwner && (invitations as any[]).length > 0 && (
        <Card className="border-border/50 mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> الدعوات المعلّقة
              <Badge variant="secondary" className="ms-auto text-xs">{(invitations as any[]).filter((i: any) => i.status === "pending").length} معلّقة</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {(invitations as any[]).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.invitedEmail}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[inv.role] ?? inv.role} • تنتهي {new Date(inv.expiresAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INV_STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600"}`}>{inv.status === "pending" ? "معلّقة" : inv.status === "accepted" ? "مقبولة" : inv.status === "expired" ? "منتهية" : "ملغاة"}</span>
                  {inv.status === "pending" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => revokeInvMutation.mutate(inv.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={removeMutation.isPending}>
              {removeMutation.isPending ? "جارٍ الحذف..." : "حذف"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
