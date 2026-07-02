import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  CreditCard,
  Home,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type OrderTrackRef = {
  id: number;
  publicCode?: string;
  trackingToken?: string;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function OrderConfirmation() {
  const { t, i18n } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; scale: number; emoji: string }>>([]);

  useEffect(() => {
    const emojis = ["🎉", "✨", "🛍️", "💖", "🌸", "⭐", "💃", "🎀"];
    const list = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      scale: 0.5 + Math.random() * 0.8,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setParticles(list);
  }, []);

  const orderIds = params.get("orders")?.split(",").filter(Boolean) ?? [];
  const orderTracks = (() => {
    try {
      return JSON.parse(params.get("tracks") ?? "[]") as OrderTrackRef[];
    } catch {
      return [];
    }
  })();
  const name = safeDecode(params.get("name") ?? t("storefront.orderConfirmation.dear"));
  const phone = params.get("phone") ?? "";
  const paymentMethod = params.get("payment") ?? "cod";
  const firstOrderId = orderIds[0];
  const isOnlinePayment = paymentMethod === "paymob" || paymentMethod === "kashier";

  function trackHref(id: string) {
    const track = orderTracks.find((item) => String(item.id) === id);
    return track?.publicCode && track.trackingToken
      ? `/order-track/${track.publicCode}?token=${track.trackingToken}`
      : `/orders/${id}`;
  }

  async function copyTrackingLink(id: string) {
    const href = `${window.location.origin}${trackHref(id)}`;
    try {
      await navigator.clipboard?.writeText(href);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  }

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

  const nextSteps = [
    {
      icon: MessageCircle,
      title: t("storefront.orderConfirmation.steps.confirm.title"),
      body: t("storefront.orderConfirmation.steps.confirm.body"),
    },
    {
      icon: Package,
      title: t("storefront.orderConfirmation.steps.prepare.title"),
      body: t("storefront.orderConfirmation.steps.prepare.body"),
    },
    {
      icon: Truck,
      title: t("storefront.orderConfirmation.steps.ship.title"),
      body: t("storefront.orderConfirmation.steps.ship.body"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf7f4] px-4 py-10 overflow-hidden relative" dir={i18n.dir()}>
      {/* Visual Confetti Celebration */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle-emoji"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            transform: `scale(${p.scale})`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center"
        >
          <div className="inline-flex rounded-full bg-primary/10 p-5 mb-5 animate-pulse-badge">
            <CheckCircle2 className="w-14 h-14 text-primary" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
            {t("storefront.orderConfirmation.title")}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {t("storefront.orderConfirmation.thankYou")}{" "}
            <span className="text-foreground font-semibold">{name}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mt-8"
        >
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5 md:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground w-fit">
                  {isOnlinePayment ? <CreditCard className="w-4 h-4 text-primary" /> : <Banknote className="w-4 h-4 text-primary" />}
                  {isOnlinePayment
                    ? t("storefront.orderConfirmation.paidOnline")
                    : t("storefront.orderConfirmation.codPayment")}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700 w-fit">
                  <ShieldCheck className="w-4 h-4" />
                  {t("storefront.orderConfirmation.safeNextStep")}
                </div>
              </div>

              {orderIds.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    {orderIds.length === 1
                      ? t("storefront.orderConfirmation.orderId")
                      : t("storefront.orderConfirmation.orderIds")}
                  </p>

                  {orderIds.map((id) => (
                    <div key={id} className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("storefront.orderConfirmation.orderId")}
                          </p>
                          <p className="font-bold text-foreground" dir="ltr">#{id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" className="rounded-full">
                            <Link href={trackHref(id)} className="inline-flex items-center gap-1">
                              {t("storefront.orderConfirmation.trackOrder")}
                              <ChevronLeft className={`w-3.5 h-3.5 ${i18n.dir() === "rtl" ? "" : "rotate-180"}`} />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-full h-9 w-9"
                            onClick={() => copyTrackingLink(id)}
                            aria-label={t("storefront.orderConfirmation.copyTrackingLink")}
                          >
                            {copiedId === id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"
        >
          {nextSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-border/60 bg-background px-4 py-4 text-start">
                <Icon className="w-5 h-5 text-primary mb-3" />
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-6 mt-1">{step.body}</p>
              </div>
            );
          })}
        </motion.div>

        {phone && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="mt-5"
          >
            <Card className="border-emerald-200/70 bg-emerald-50/60">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="text-start">
                    <p className="font-semibold text-sm text-emerald-800 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      {t("storefront.orderConfirmation.whatsappTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("storefront.orderConfirmation.whatsappDesc")} <span dir="ltr">{phone}</span>
                    </p>
                  </div>
                  <Button
                    onClick={openWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 me-2" />
                    {t("storefront.orderConfirmation.whatsappBtn")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center mt-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.32 }}
        >
          <Button asChild className="rounded-full px-8">
            <Link href="/products">{t("storefront.orderConfirmation.continueShopping")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-8">
            <Link href="/">
              <Home className="w-4 h-4 me-2" />
              {t("storefront.header.links.home")}
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
