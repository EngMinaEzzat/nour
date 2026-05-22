import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const ROLE_LABELS: Record<string, string> = {
  owner: t("text_99d7ff35", "مالك"),
  manager: t("text_bd4c63dd", "مدير"),
  staff: t("text_841e1ac2", "موظف"),
  catalog_manager: t("text_6df53b5d", "مدير كتالوج"),
  order_operator: t("text_66923665", "موظف طلبات"),
  marketing_analyst: t("text_d30752a4", "محلل تسويق"),
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800",
  manager: "bg-blue-100 text-blue-800",
  staff: "bg-gray-100 text-gray-700",
  catalog_manager: "bg-emerald-100 text-emerald-800",
  order_operator: "bg-orange-100 text-orange-800",
  marketing_analyst: "bg-pink-100 text-pink-800",
};

type InvitePreview = {
  invitedEmail: string;
  role: string;
  tenantName: string;
  expiresAt: string;
};

type Stage = "loading" | "preview" | "form" | "success" | "error";

export default function AcceptInvite() {
    const { t } = useTranslation();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError(t("text_0662bd44", "رابط الدعوة غير صالح — لا يوجد token."));
      setStage("error");
      return;
    }
    fetch(api(`/staff/invitations/preview/${token}`))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? t("text_6ac12294", "الدعوة غير موجودة"));
        return d as InvitePreview;
      })
      .then((d) => { setPreview(d); setStage("preview"); })
      .catch((e) => { setLoadError(e.message); setStage("error"); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) return setFormError(t("text_66f77d44", "الاسم مطلوب"));
    if (password.length < 8) return setFormError(t("text_2d3bbcb7", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"));
    if (password !== confirmPassword) return setFormError(t("text_d7729159", "كلمتا المرور غير متطابقتين"));

    setSubmitting(true);
    try {
      const res = await fetch(api(`/staff/invitations/${token}/accept`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("text_6f5c48a5", "فشل قبول الدعوة"));
      setStage("success");
    } catch (e: unknown) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary font-cairo">{t("text_8cbcf6d9", t("text_8cbcf6d9", "نـور"))}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("text_45188266", t("text_45188266", "منصة نور للتجارة الإلكترونية المصرية"))}</p>
        </div>

        {/* Loading */}
        {stage === "loading" && (
          <Card className="border-border/50">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("text_a4d76205", t("text_a4d76205", "جارٍ تحميل تفاصيل الدعوة..."))}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {stage === "error" && (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-2">{t("text_371c0e78", t("text_371c0e78", "الدعوة غير صالحة"))}</h2>
              <p className="text-muted-foreground text-sm mb-6">{loadError}</p>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/login">{t("text_288e5aab", t("text_288e5aab", "الذهاب إلى تسجيل الدخول"))}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview — confirm before filling form */}
        {stage === "preview" && preview && (
          <Card className="border-border/50 shadow-md">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">{t("text_91604d25", t("text_91604d25", "دعوة للانضمام إلى متجر"))}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("text_e18fb66b", t("text_e18fb66b", "المتجر"))}</span>
                  <span className="font-semibold">{preview.tenantName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("text_2436aacc", t("text_2436aacc", "البريد الإلكتروني"))}</span>
                  <span className="font-mono text-xs">{preview.invitedEmail}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("text_16479210", t("text_16479210", "الدور"))}</span>
                  <Badge className={`text-xs border-0 ${ROLE_COLORS[preview.role] ?? "bg-gray-100 text-gray-700"}`}>
                    {ROLE_LABELS[preview.role] ?? preview.role}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("text_5c2030c4", t("text_5c2030c4", "صلاحية حتى"))}</span>
                  <span className="text-xs">{new Date(preview.expiresAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t("text_1c4dfff5", t("text_1c4dfff5", "ستنضم إلى متجر"))} <strong>{preview.tenantName}</strong> {t("text_7c272549", t("text_7c272549", "بدور"))} <strong>{ROLE_LABELS[preview.role] ?? preview.role}</strong>
              </p>
              <Button className="w-full rounded-xl gap-2" onClick={() => setStage("form")}>
                <UserPlus className="w-4 h-4" /> {t("text_52249146", t("text_52249146", "قبول الدعوة وإنشاء حسابي"))}
                                            </Button>
              <p className="text-xs text-center text-muted-foreground">
                {t("text_ff7cd917", t("text_ff7cd917", "لديك حساب بالفعل؟"))}{" "}
                <Link href="/login" className="text-primary underline">{t("text_c0babe00", t("text_c0babe00", "سجّل دخولك"))}</Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Form — create account */}
        {stage === "form" && preview && (
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> {t("text_09167330", t("text_09167330", "إنشاء حسابك في"))} {preview.tenantName}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t("text_f0d7d017", t("text_f0d7d017", "ستنضم كـ"))} <strong>{ROLE_LABELS[preview.role] ?? preview.role}</strong> {t("text_148a261a", t("text_148a261a", "على البريد"))} {preview.invitedEmail}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("text_6eacf065", t("text_6eacf065", "الاسم الكامل *"))}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("text_5473720e", "محمد أحمد")}
                    className="h-11"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("text_88fd9f79", t("text_88fd9f79", "كلمة المرور *"))}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("text_2c598bb6", "8 أحرف على الأقل")}
                      className="h-11 pe-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((s) => !s)}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">{t("text_a255bc3d", t("text_a255bc3d", "تأكيد كلمة المرور *"))}</Label>
                  <Input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("text_e801e2ea", "أعِد كتابة كلمة المرور")}
                    className="h-11"
                    dir="ltr"
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 rounded-xl gap-2" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t("text_3d1f964a", t("text_3d1f964a", "جارٍ إنشاء الحساب..."))}</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> {t("text_92c3061c", t("text_92c3061c", "إنشاء الحساب والانضمام"))}</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {stage === "success" && preview && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="border-green-200 shadow-md">
              <CardContent className="py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("text_aaeea891", t("text_aaeea891", "مرحباً بك في"))} {preview.tenantName}! 🎉</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("text_f07f9d7a", t("text_f07f9d7a", "تم إنشاء حسابك بنجاح بدور"))} <strong>{ROLE_LABELS[preview.role] ?? preview.role}</strong>{t("text_ebbdb12d", ".
                                                    يمكنك الآن تسجيل الدخول والبدء في العمل.")}
                                                  </p>
                <Button className="w-full rounded-xl" onClick={() => navigate("/login")}>
                  {t("text_83ed06bc", t("text_83ed06bc", "تسجيل الدخول الآن"))}
                                                  </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
