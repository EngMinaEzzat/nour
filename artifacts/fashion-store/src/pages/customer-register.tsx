import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

function getRegisterErrorMessage(err: unknown, t: any): string {
  const data = (err as { data?: { error?: unknown } } | null)?.data;
  const error = data?.error;

  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "fieldErrors" in error) {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const firstFieldError = Object.values(fieldErrors ?? {}).flat().find(Boolean);
    if (firstFieldError) return firstFieldError;
  }

  return (err as { message?: string } | null)?.message || t("customerAuth.unknownError", "حدث خطأ غير متوقع");
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
        title: t("customerAuth.registerSuccess", "تم إنشاء الحساب بنجاح"),
        description: t("customerAuth.registerSuccessDesc", "مرحباً بك في متجرنا!"),
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: t("customerAuth.registerError", "خطأ في إنشاء الحساب"),
        description: getRegisterErrorMessage(err, t),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("customerAuth.registerTitle", "إنشاء حساب جديد")}</CardTitle>
          <CardDescription>{t("customerAuth.registerDesc", "أدخل بياناتك لإنشاء حساب عميل للمتجر")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("customerAuth.nameLabel", "الاسم الكامل")}</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
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
              <label className="text-sm font-medium">{t("customerAuth.phoneLabel", "رقم الهاتف")}</label>
              <Input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                required
                inputMode="tel"
                placeholder="01012345678"
                title={t("customerAuth.phoneDesc", "رقم هاتف محمول صحيح")}
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
                minLength={8}
                dir="ltr"
                className="text-left"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? t("customerAuth.registering", "جاري الإنشاء...") : t("customerAuth.registerBtn", "إنشاء حساب")}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-4">
              {t("customerAuth.haveAccount", "لديك حساب بالفعل؟")}{" "}
              <Link href="/customer/login" className="text-primary hover:underline">
                {t("customerAuth.loginBtn", "تسجيل الدخول")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
