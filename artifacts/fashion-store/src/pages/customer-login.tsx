import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { startAuthentication } from "@simplewebauthn/browser";

export default function CustomerLogin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { login, generatePasskeyAuthenticationOptions, verifyPasskeyAuthentication, isLoading } = useCustomerAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast({
        title: t("customerAuth.loginSuccess"),
        description: t("customerAuth.loginSuccessDesc"),
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: t("customerAuth.loginError"),
        description: err.response?.data?.error || t("customerAuth.invalidCreds"),
        variant: "destructive",
      });
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      const options = await generatePasskeyAuthenticationOptions(email);
      const asseResp = await startAuthentication({ optionsJSON: options });

      await verifyPasskeyAuthentication(asseResp);

      toast({
        title: t("customerAuth.loginSuccess"),
        description: t("customerAuth.loginSuccessDesc"),
      });
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("customerAuth.loginError"),
        description: err.response?.data?.error || "فشل تسجيل الدخول بالبصمة",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("customerAuth.loginTitle")}</CardTitle>
          <CardDescription>{t("customerAuth.loginDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customerAuth.emailLabel")}</label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customerAuth.passwordLabel")}</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? t("customerAuth.loggingIn") : t("customerAuth.loginBtn")}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  أو
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePasskeyLogin}
              disabled={isLoading || !email}
            >
              تسجيل الدخول بالبصمة (Passkey)
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              {t("customerAuth.noAccount")}{" "}
              <Link href="/customer/register" className="text-primary hover:underline">
                {t("customerAuth.registerNow")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
