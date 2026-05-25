import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, ChevronLeft, Home, MessageCircle, Truck } from "lucide-react";

export default function OrderConfirmation() {
  const { t, i18n } = useTranslation();
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
  const name = params.get("name") ?? t("storefront.orderConfirmation.dear", "عزيزتنا");
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
          {t("storefront.orderConfirmation.title")} 🎉
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          {t("storefront.orderConfirmation.thankYou", "شكرًا لكِ، ")} <span className="text-foreground font-semibold">{decodeURIComponent(name)}</span>
        </p>
        <p className="text-muted-foreground mb-4">
          {paymentMethod === "paymob"
            ? t("storefront.orderConfirmation.paymentSuccess", "تم استلام دفعتك بنجاح. سيتم تجهيز طلبك وشحنه في أقرب وقت.")
            : t("storefront.orderConfirmation.subtitle")}
        </p>

        {/* Payment badge */}
        <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground mb-8">
          {paymentMethod === "paymob"
            ? <><span>💳</span> {t("storefront.orderConfirmation.paidOnline", "تم الدفع إلكترونياً عبر Paymob")}</>
            : <><span>💵</span> {t("storefront.checkout.cod")}</>}
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
                {orderIds.length === 1 ? t("storefront.orderConfirmation.orderId") : t("storefront.orderConfirmation.orderIds", "أرقام الطلبات")}
              </div>
              {orderIds.map((id) => (
                <div key={id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground text-sm">{t("storefront.orderConfirmation.orderId")} #{id}</span>
                  <Link href={(() => {
                    const track = orderTracks.find((t) => String(t.id) === id);
                    return track?.publicCode && track.trackingToken
                      ? `/order-track/${track.publicCode}?token=${track.trackingToken}`
                      : `/orders/${id}`;
                  })()} className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
                    {t("storefront.orderConfirmation.trackOrder")} <ChevronLeft className={`w-3 h-3 ${i18n.dir() === "rtl" ? "" : "rotate-180"}`} />
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
                      <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">{t("storefront.orderConfirmation.whatsappTitle", "احصلي على تأكيد الطلب على واتساب")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("storefront.orderConfirmation.whatsappDesc", "اضغطي لفتح رسالة التأكيد على")} {phone}</p>
                    </div>
                  </div>
                  <Button
                    onClick={openWhatsApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    size="sm"
                  >
                    <MessageCircle className={`w-4 h-4 ${i18n.dir() === "rtl" ? "me-2" : "mr-2"}`} />
                    {t("storefront.orderConfirmation.whatsappBtn", "إرسال تأكيد الطلب على واتساب")}
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
                    <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">{t("storefront.orderConfirmation.bostaTitle", "التوصيل عبر بوسطة")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("storefront.orderConfirmation.bostaDesc", "سيقوم المتجر بإنشاء شحنتكِ خلال 24 ساعة — ستصلكِ رسالة برقم التتبع")}
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
          <Link href="/products">{t("storefront.orderConfirmation.continueShopping")}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-8">
          <Link href="/"><Home className={`w-4 h-4 ${i18n.dir() === "rtl" ? "me-2" : "mr-2"}`} /> {t("storefront.header.links.home")}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
