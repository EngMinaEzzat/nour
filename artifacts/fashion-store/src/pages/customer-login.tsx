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
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك مجدداً!",
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: err.response?.data?.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>تسجيل الدخول للعملاء</CardTitle>
          <CardDescription>أدخل بريدك الإلكتروني وكلمة المرور للمتابعة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-4">
              ليس لديك حساب؟{" "}
              <Link href="/customer/register" className="text-primary hover:underline">
                سجل الآن
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
