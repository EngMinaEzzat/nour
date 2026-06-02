import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

function getRegisterErrorMessage(err: unknown, t: any): string {
  const data = (err as { data?: { error?: unknown } } | null)?.data;
  const error = data?.error;

  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "fieldErrors" in error) {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> })
      .fieldErrors;
    const firstFieldError = Object.values(fieldErrors ?? {})
      .flat()
      .find(Boolean);
    if (firstFieldError) return firstFieldError;
  }

  return (
    (err as { message?: string } | null)?.message ||
    t("customerAuth.unknownError")
  );
}

export default function CustomerRegister() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [, setLocation] = useLocation();
  const { register, isLoading } = useCustomerAuth();
  const { toast } = useToast();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9][0-9\s-]{7,19}$/;

  const isEmailValid = email.length > 0 && emailRegex.test(email);
  const isEmailInvalid = email.length > 0 && !isEmailValid;

  const isPhoneValid = phone.length > 0 && phoneRegex.test(phone);
  const isPhoneInvalid = phone.length > 0 && !isPhoneValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });
      toast({
        title: t("customerAuth.registerSuccess"),
        description: t("customerAuth.registerSuccessDesc"),
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: t("customerAuth.registerError"),
        description: getRegisterErrorMessage(err, t),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("customerAuth.registerTitle")}</CardTitle>
          <CardDescription>{t("customerAuth.registerDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("customerAuth.nameLabel")}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("customerAuth.emailLabel")}
              </label>
              <div className="relative flex items-center">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className={`text-left pe-10 ${isEmailValid ? "border-green-500 focus-visible:ring-green-400" : isEmailInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {email.length > 0 && (
                  <span className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
                    {isEmailValid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </span>
                )}
              </div>
              {isEmailInvalid && (
                <p className="text-xs text-destructive">
                  {t(
                    "auth.register.emailInvalid",
                    "Invalid email address format",
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("customerAuth.phoneLabel")}
              </label>
              <div className="relative flex items-center">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  placeholder="01012345678"
                  title={t("customerAuth.phoneDesc")}
                  dir="ltr"
                  className={`text-left pe-10 ${isPhoneValid ? "border-green-500 focus-visible:ring-green-400" : isPhoneInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {phone.length > 0 && (
                  <span className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
                    {isPhoneValid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </span>
                )}
              </div>
              {isPhoneInvalid && (
                <p className="text-xs text-destructive">
                  {t(
                    "auth.register.phoneInvalid",
                    "Invalid phone number format",
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("customerAuth.passwordLabel")}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                dir="ltr"
                className="text-left"
              />
            </div>
            <Button
              className="w-full"
              type="submit"
              disabled={isLoading || isEmailInvalid || isPhoneInvalid}
            >
              {isLoading
                ? t("customerAuth.registering")
                : t("customerAuth.registerBtn")}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-4">
              {t("customerAuth.haveAccount")}{" "}
              <Link
                href="/customer/login"
                className="text-primary hover:underline"
              >
                {t("customerAuth.loginBtn")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
