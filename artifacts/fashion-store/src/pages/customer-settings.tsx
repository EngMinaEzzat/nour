import { useState } from "react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { startRegistration } from "@simplewebauthn/browser";

// Simple example component to register passkey, this can be integrated into the customer profile or settings page
export function CustomerSettings() {
  const { generatePasskeyRegistrationOptions, verifyPasskeyRegistration } = useCustomerAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRegisterPasskey = async () => {
    setLoading(true);
    try {
      const options = await generatePasskeyRegistrationOptions();
      const attResp = await startRegistration({ optionsJSON: options });

      await verifyPasskeyRegistration(attResp);

      toast({
        title: "تم النجاح",
        description: "تم تسجيل البصمة بنجاح",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "خطأ",
        description: err.response?.data?.error || "فشل تسجيل البصمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات الأمان</CardTitle>
        <CardDescription>أضف بصمة أو وجه لتسجيل الدخول بسهولة وبدون كلمة مرور</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleRegisterPasskey} disabled={loading}>
          {loading ? "جاري الإعداد..." : "إضافة بصمة (Passkey)"}
        </Button>
      </CardContent>
    </Card>
  );
}
