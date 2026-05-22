import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, ChevronLeft, Home, MessageCircle, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function OrderConfirmation() {
    const { t } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderIds = params.get("orders")?.split(",").filter(Boolean) ?? [];
  const orderTracks = (() => {
    try {
      return JSON.parse(params.get("tracks") ?? "[]") as Array<{ id: number; publicCode?: string; trackingToken?: string }>;
    } catch {
      return [];
    }
  })();
  const name = params.get("name") ?? t("text_a64c3428", "عزيزتنا");
  const phone = params.get("phone") ?? "";
  const paymentMethod = params.get("payment") ?? "cod";

  const firstOrderId = orderIds[0];
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  async function openWhatsApp() {
    if (!firstOrderId || !phone) return;
    const res = await fetch(`${BASE}/api/notifications/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: parseInt(firstOrderId, 10), customerPhone: phone }),
    });
    const data = await res.json() as { configured: boolean; whatsappLink: string };
    if (data.whatsappLink) window.open(data.whatsappLink, "_blank");
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        className="flex justify-center mb-6"
      >
        <div className="bg-primary/10 rounded-full p-6">
          <CheckCircle2 className="w-16 h-16 text-primary" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t("text_f0e42b04", t("text_f0e42b04", "تم تنفيذ طلبك! 🎉"))}
                          </h1>
        <p className="text-lg text-muted-foreground mb-2">
          {t("text_c660f6ca", t("text_c660f6ca", "شكرًا لكِ،"))} <span className="text-foreground font-semibold">{decodeURIComponent(name)}</span>
        </p>
        <p className="text-muted-foreground mb-4">
          {paymentMethod === "paymob"
            ? t("text_5ab8195f", "تم استلام دفعتك بنجاح. سيتم تجهيز طلبك وشحنه في أقرب وقت.")
            : t("text_fe469f1d", "استلمنا طلبك وسيتم تجهيزه في أقرب وقت. ستصلكِ تفاصيل التوصيل قريبًا.")}
        </p>

        {/* Payment badge */}
        <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground mb-8">
          {paymentMethod === "paymob"
            ? <><span>💳</span> {t("text_2005da5e", t("text_2005da5e", "تم الدفع إلكترونياً عبر Paymob"))}</>
            : <><span>💵</span> {t("text_a4fca794", t("text_a4fca794", "الدفع عند الاستلام"))}</>}
        </div>
      </motion.div>

      {orderIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <Card className="border-border/50 mb-6 text-start">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                <Package className="w-4 h-4" />
                {orderIds.length === 1 ? t("text_e9cc2e87", "رقم الطلب") : t("text_83fff70b", "أرقام الطلبات")}
              </div>
              {orderIds.map((id) => (
                <div key={id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground text-sm">{t("text_87e1ced7", t("text_87e1ced7", "طلب #"))}{id}</span>
                  <Link href={(() => {
                    const track = orderTracks.find((t) => String(t.id) === id);
                    return track?.publicCode && track.trackingToken
                      ? `/order-track/${track.publicCode}?token=${track.trackingToken}`
                      : `/orders/${id}`;
                  })()} className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
                    {t("text_a87c906f", t("text_a87c906f", "عرض التفاصيل"))} <ChevronLeft className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* WhatsApp confirmation prompt for customer */}
          {phone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/30 dark:bg-emerald-900/10 mb-6">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-start">
                      <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">{t("text_ed85a1af", t("text_ed85a1af", "احصلي على تأكيد الطلب على واتساب"))}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("text_73f730b1", t("text_73f730b1", "اضغطي لفتح رسالة التأكيد على"))} {phone}</p>
                    </div>
                  </div>
                  <Button
                    onClick={openWhatsApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    size="sm"
                  >
                    <MessageCircle className="w-4 h-4 me-2" />
                    {t("text_f740d8c6", t("text_f740d8c6", "إرسال تأكيد الطلب على واتساب"))}
                                                        </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bosta tracking info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-blue-200/60 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-900/10 mb-8">
              <CardContent className="pt-5 pb-4 text-start">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">{t("text_ba50ec64", t("text_ba50ec64", "التوصيل عبر بوسطة"))}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("text_d69caae6", t("text_d69caae6", "سيقوم المتجر بإنشاء شحنتكِ خلال 24 ساعة — ستصلكِ رسالة برقم التتبع"))}
                                                              </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      <motion.div
        className="flex flex-col sm:flex-row gap-4 justify-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <Button asChild className="rounded-full px-8">
          <Link href="/products">{t("text_279044fb", t("text_279044fb", "متابعة التسوق"))}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-8">
          <Link href="/"><Home className="w-4 h-4 me-2" /> {t("text_d4e81bd2", t("text_d4e81bd2", "الصفحة الرئيسية"))}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
