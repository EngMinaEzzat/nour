import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
    const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("text_9332f119", "حدث خطأ، حاول مرة أخرى"));
        return;
      }
      if (data.emailSent) {
        setEmailSent(true);
      } else {
        setResetLink(data.resetLink ?? "");
      }
    } catch {
      setError(t("text_c47e1cc6", "حدث خطأ في الاتصال، حاول مرة أخرى"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Link href="/">
            <span className="text-4xl font-bold text-primary cursor-pointer">{t("text_56012c89", t("text_56012c89", "نور"))}</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">{t("text_efdc1740", t("text_efdc1740", "نسيت كلمة المرور؟"))}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t("text_6aaca15e", t("text_6aaca15e", "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"))}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm"
        >
          <AnimatePresence mode="wait">
            {emailSent ? (
              <motion.div
                key="email-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold">{t("text_b6a53345", t("text_b6a53345", "تحقق من بريدك الإلكتروني"))}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("text_1bce4d9c", t("text_1bce4d9c", "أرسلنا رابط إعادة تعيين كلمة المرور إلى"))} <span className="font-medium text-foreground">{email}</span>{t("text_791769e6", ".
                                                    تحقق من صندوق الوارد وربما مجلد الرسائل غير المرغوب فيها.")}
                                                  </p>
                <p className="text-xs text-muted-foreground">{t("text_da774d32", t("text_da774d32", "الرابط صالح لمدة ساعة واحدة."))}</p>
              </motion.div>
            ) : resetLink ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold">{t("text_59a24e7b", t("text_59a24e7b", "رابط إعادة التعيين جاهز"))}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("text_6df1c806", t("text_6df1c806", "لم يتم تفعيل البريد الإلكتروني بعد. انقر على الرابط أدناه لإعادة تعيين كلمة المرور:"))}
                                                      </p>
                <a
                  href={resetLink}
                  className="flex items-center justify-center w-full bg-primary text-primary-foreground rounded-2xl h-12 font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  {t("text_2831a883", t("text_2831a883", "إعادة تعيين كلمة المرور"))}
                                                      </a>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="space-y-5"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("text_2436aacc", t("text_2436aacc", "البريد الإلكتروني"))}</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@nour.eg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 text-base ps-10"
                      dir="ltr"
                    />
                    <Mail className="absolute inset-y-0 start-3 my-auto w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base rounded-2xl"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 ms-2 animate-spin" /> {t("text_5061a538", t("text_5061a538", "جارٍ الإرسال..."))}</>
                  ) : (
                    <>{t("text_e3f241aa", t("text_e3f241aa", "إرسال رابط إعادة التعيين"))} <ArrowRight className="w-4 h-4 me-2" /></>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("text_f1636c37", t("text_f1636c37", "تذكّرت كلمة المرور؟"))}{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            {t("text_c0babe00", t("text_c0babe00", "سجّل دخولك"))}
                                </Link>
        </p>
      </motion.div>
    </div>
  );
}
