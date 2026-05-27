import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export default function CustomerLogin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { login, isLoading } = useCustomerAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast({
        title: t("customerAuth.loginSuccess", "تم تسجيل الدخول بنجاح"),
        description: t("customerAuth.loginSuccessDesc", "مرحباً بك مجدداً!"),
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: t("customerAuth.loginError", "خطأ في تسجيل الدخول"),
        description: err.response?.data?.error || t("customerAuth.invalidCreds", "البريد الإلكتروني أو كلمة المرور غير صحيحة"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("customerAuth.loginTitle", "تسجيل الدخول للعملاء")}</CardTitle>
          <CardDescription>{t("customerAuth.loginDesc", "أدخل بريدك الإلكتروني وكلمة المرور للمتابعة")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customerAuth.emailLabel", "البريد الإلكتروني")}</label>
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
              <label className="text-sm font-medium">{t("customerAuth.passwordLabel", "كلمة المرور")}</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? t("customerAuth.loggingIn", "جاري تسجيل الدخول...") : t("customerAuth.loginBtn", "تسجيل الدخول")}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-4">
              {t("customerAuth.noAccount", "ليس لديك حساب؟")}{" "}
              <Link href="/customer/register" className="text-primary hover:underline">
                {t("customerAuth.registerNow", "سجل الآن")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
