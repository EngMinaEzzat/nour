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

const ROLE_KEYS: Record<string, string> = {
  owner: "roles.owner",
  manager: "roles.manager",
  staff: "roles.staff",
  catalog_manager: "roles.catalog_manager",
  order_operator: "roles.order_operator",
  marketing_analyst: "roles.marketing_analyst",
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
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const { t, i18n } = useTranslation();

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
      setLoadError(t("auth.acceptInvite.tokenMissing"));
      setStage("error");
      return;
    }
    fetch(api(`/staff/invitations/preview/${token}`))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? t("auth.acceptInvite.inviteNotFound"));
        return d as InvitePreview;
      })
      .then((d) => { setPreview(d); setStage("preview"); })
      .catch((e) => { setLoadError(e.message); setStage("error"); });
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) return setFormError(t("auth.acceptInvite.nameRequired"));
    if (password.length < 8) return setFormError(t("auth.acceptInvite.pwTooShort"));
    if (password !== confirmPassword) return setFormError(t("auth.acceptInvite.pwMismatch"));

    setSubmitting(true);
    try {
      const res = await fetch(api(`/staff/invitations/${token}/accept`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("auth.acceptInvite.acceptFailed"));
      setStage("success");
    } catch (e: unknown) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary font-cairo">{t("common.appName")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("common.appSubtitle")}</p>
        </div>

        {/* Loading */}
        {stage === "loading" && (
          <Card className="border-border/50">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {i18n.language === "ar" ? "جارٍ تحميل تفاصيل الدعوة..." : "Loading invite details..."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {stage === "error" && (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-2">{t("auth.acceptInvite.inviteNotFound")}</h2>
              <p className="text-muted-foreground text-sm mb-6">{loadError}</p>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/login">{t("common.buttons.backToLogin")}</Link>
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
              <CardTitle className="text-xl">{t("auth.acceptInvite.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("auth.acceptInvite.store")}</span>
                  <span className="font-semibold">{preview.tenantName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("auth.acceptInvite.email")}</span>
                  <span className="font-mono text-xs">{preview.invitedEmail}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("auth.acceptInvite.role")}</span>
                  <Badge className={`text-xs border-0 ${ROLE_COLORS[preview.role] ?? "bg-gray-100 text-gray-700"}`}>
                    {t(ROLE_KEYS[preview.role] ?? `roles.${preview.role}`)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t("auth.acceptInvite.expiresAt")}</span>
                  <span className="text-xs">
                    {new Date(preview.expiresAt).toLocaleDateString(
                      i18n.language === "ar" ? "ar-EG" : "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t("auth.acceptInvite.invitedTo")} <strong>{preview.tenantName}</strong> {t("auth.acceptInvite.asRole")} <strong>{t(ROLE_KEYS[preview.role] ?? `roles.${preview.role}`)}</strong>
              </p>
              <Button className="w-full rounded-xl gap-2" onClick={() => setStage("form")}>
                <UserPlus className="w-4 h-4" /> {t("common.buttons.acceptAndCreate")}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {t("auth.acceptInvite.hasAccount")}{" "}
                <Link href="/login" className="text-primary underline">{t("auth.acceptInvite.loginNow")}</Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Form — create account */}
        {stage === "form" && preview && (
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> {t("auth.acceptInvite.createAccount")} {preview.tenantName}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("auth.acceptInvite.joinAs")} <strong>{t(ROLE_KEYS[preview.role] ?? `roles.${preview.role}`)}</strong> {t("auth.acceptInvite.onEmail")} {preview.invitedEmail}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("auth.acceptInvite.fullName")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("common.placeholder.fullName") || "محمد أحمد"}
                    className="h-11"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.acceptInvite.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("common.placeholder.password") || "8 أحرف على الأقل"}
                      className="h-11 pr-10 text-left"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={t("auth.login.togglePasswordVisibility", "Toggle password visibility")}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">{t("auth.acceptInvite.confirmPassword")}</Label>
                  <Input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("common.placeholder.confirmPassword") || "أعِد كتابة كلمة المرور"}
                    className="h-11 text-left"
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t("auth.acceptInvite.creatingAccount")}</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> {t("common.buttons.createAndJoin")}</>
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
                <h2 className="text-xl font-bold mb-2">{t("auth.acceptInvite.successTitle")} {preview.tenantName}! 🎉</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("auth.acceptInvite.successDesc")} <strong>{t(ROLE_KEYS[preview.role] ?? `roles.${preview.role}`)}</strong>{t("auth.acceptInvite.successDescSuffix")}
                </p>
                <Button className="w-full rounded-xl" onClick={() => navigate("/login")}>
                  {t("auth.acceptInvite.loginCta")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
