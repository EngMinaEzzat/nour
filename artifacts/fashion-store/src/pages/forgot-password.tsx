import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
        setError(data.error || t("auth.forgotPassword.generalError"));
        return;
      }
      // Always show the generic success message if the request was successful
      setEmailSent(true);
    } catch {
      setError(t("auth.forgotPassword.connectionError"));
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
            <span className="text-4xl font-bold text-primary cursor-pointer">{t("common.appName")}</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">{t("auth.forgotPassword.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t("auth.forgotPassword.subtitle")}</p>
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
                <h2 className="text-lg font-semibold">{t("auth.forgotPassword.checkEmailTitle")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("auth.forgotPassword.checkEmailDesc")}{" "}
                  <span className="font-medium text-foreground">{email}</span>
                  {t("auth.forgotPassword.checkEmailDescSuffix")}
                </p>
                <p className="text-xs text-muted-foreground">{t("auth.forgotPassword.linkExpireHint")}</p>
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
                  <Label htmlFor="email">{t("auth.forgotPassword.emailLabel")}</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.forgotPassword.emailPlaceholder")}
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
                    <>
                      <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                      {t("auth.forgotPassword.sending")}
                    </>
                  ) : (
                    <>
                      {t("auth.forgotPassword.sendLink")}
                      <ArrowRight className="w-4 h-4 me-2" />
                    </>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.forgotPassword.rememberPassword")}{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            {t("auth.forgotPassword.loginNow")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
