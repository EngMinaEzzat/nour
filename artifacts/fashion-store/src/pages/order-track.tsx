import { useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getStoreUrl } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PublicOrderItem = {
  id?: number;
  productId: number;
  variantId?: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
};

type StatusHistoryItem = {
  id: number;
  fromStatus?: string | null;
  toStatus: string;
  note?: string | null;
  createdAt: string;
};

type PublicOrder = {
  id: number;
  publicCode?: string | null;
  tenantName?: string | null;
  tenantSlug?: string | null;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  totalAmount?: number;
  shippingCost?: number;
  shippingAddress?: string | null;
  customerPhone?: string | null;
  trackingNumber?: string | null;
  createdAt?: string;
  items?: PublicOrderItem[];
  statusHistory?: StatusHistoryItem[];
};

const TIMELINE_STATUSES = ["pending", "awaiting_confirmation", "confirmed", "dispatched", "shipped", "delivered"];

function getStatusMap(t: ReturnType<typeof useTranslation>["t"]) {
  return {
    pending: {
      label: t("storefront.orderTrack.status.pending"),
      body: t("storefront.orderTrack.statusBody.pending"),
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    awaiting_confirmation: {
      label: t("storefront.orderTrack.status.awaitingConfirmation"),
      body: t("storefront.orderTrack.statusBody.awaitingConfirmation"),
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    confirmed: {
      label: t("storefront.orderTrack.status.confirmed"),
      body: t("storefront.orderTrack.statusBody.confirmed"),
      icon: CheckCircle2,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    dispatched: {
      label: t("storefront.orderTrack.status.dispatched"),
      body: t("storefront.orderTrack.statusBody.dispatched"),
      icon: Truck,
      color: "text-indigo-700",
      bg: "bg-indigo-50 border-indigo-200",
    },
    shipped: {
      label: t("storefront.orderTrack.status.shipped"),
      body: t("storefront.orderTrack.statusBody.shipped"),
      icon: Truck,
      color: "text-indigo-700",
      bg: "bg-indigo-50 border-indigo-200",
    },
    delivered: {
      label: t("storefront.orderTrack.status.delivered"),
      body: t("storefront.orderTrack.statusBody.delivered"),
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    cancelled: {
      label: t("storefront.orderTrack.status.cancelled"),
      body: t("storefront.orderTrack.statusBody.cancelled"),
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    },
    returned: {
      label: t("storefront.orderTrack.status.returned"),
      body: t("storefront.orderTrack.statusBody.returned"),
      icon: RotateCcw,
      color: "text-orange-700",
      bg: "bg-orange-50 border-orange-200",
    },
  };
}

export default function OrderTrack() {
  const { t, i18n } = useTranslation();
  const [, params] = useRoute("/order-track/:orderId");
  const publicCode = params?.orderId ?? "";
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const currency = i18n.language === "ar" ? "ج.م" : "EGP";

  const { data: order, isLoading, isError } = useQuery<PublicOrder>({
    queryKey: ["public-order", publicCode, token],
    queryFn: () =>
      fetch(`${BASE}/api/orders/track/${encodeURIComponent(publicCode)}?token=${encodeURIComponent(token)}`).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
    enabled: !!publicCode && !!token,
    retry: false,
  });

  function money(value?: number) {
    return `${(value ?? 0).toLocaleString(locale)} ${currency}`;
  }

  if (!publicCode || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#faf7f4]" dir={i18n.dir()}>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">{t("storefront.orderTrack.invalidLink")}</p>
          <p className="text-sm text-muted-foreground mb-6">{t("storefront.orderTrack.invalidLinkDesc")}</p>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/"><Home className="w-4 h-4 me-2" />{t("storefront.orderTrack.home")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f4]" dir={i18n.dir()}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t("storefront.orderTrack.loading")}</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#faf7f4]" dir={i18n.dir()}>
        <div className="text-center max-w-sm">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">{t("storefront.orderTrack.notFound")}</p>
          <p className="text-muted-foreground text-sm mb-6">{t("storefront.orderTrack.notFoundDesc")}</p>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">{t("storefront.orderTrack.home")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const STATUS_MAP = getStatusMap(t);
  const statusInfo = STATUS_MAP[order.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending;
  const StatusIcon = statusInfo.icon;
  const currentIdx = Math.max(0, TIMELINE_STATUSES.indexOf(order.status));
  const isCancelled = order.status === "cancelled" || order.status === "returned";
  const itemsSubtotal = order.items?.reduce((sum, item) => sum + (item.totalPrice ?? item.unitPrice * item.quantity), 0) ?? 0;
  const storeHref = order.tenantSlug ? getStoreUrl(order.tenantSlug) : "/";

  return (
    <div className="min-h-screen bg-[#faf7f4]" dir={i18n.dir()}>
      <div className="bg-primary text-primary-foreground px-4 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div>
            <p className="text-primary-foreground/70 text-sm mb-1">{t("storefront.orderTrack.title")}</p>
            <h1 className="text-2xl font-bold" dir="ltr">{order.publicCode ?? `#${order.id}`}</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm w-fit">
            {order.paymentMethod === "paymob" ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
            {order.paymentMethod === "paymob"
              ? t("storefront.orderTrack.paidOnline")
              : t("storefront.orderTrack.cod")}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`border ${statusInfo.bg}`}>
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/70 shrink-0`}>
                <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">{t("storefront.orderTrack.statusLabel")}</p>
                <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-6">{statusInfo.body}</p>
                {order.trackingNumber && (
                  <p className="text-xs text-muted-foreground mt-2" dir="ltr">
                    {t("storefront.orderTrack.trackingNo")}: {order.trackingNumber}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!isCancelled && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm">{t("storefront.orderTrack.timeline")}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-4">
                  {TIMELINE_STATUSES.map((status, index) => {
                    const info = STATUS_MAP[status as keyof typeof STATUS_MAP];
                    const Icon = info.icon;
                    const done = index <= currentIdx;
                    const active = index === currentIdx;
                    const history = order.statusHistory?.find((item) => item.toStatus === status);
                    return (
                      <div key={status} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        } ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                            {info.label}
                          </p>
                          {history?.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(history.createdAt).toLocaleDateString(locale)}
                            </p>
                          )}
                        </div>
                        {done && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Card>
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm">{t("storefront.orderTrack.details")}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {order.items?.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? "base"}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground min-w-0">
                    {item.productName} x {item.quantity}
                  </span>
                  <span className="font-medium shrink-0">{money(item.totalPrice ?? item.unitPrice * item.quantity)}</span>
                </div>
              ))}
              {order.shippingCost != null && order.shippingCost > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground border-t pt-3">
                  <span>{t("storefront.orderTrack.shipping")}</span>
                  <span>{money(order.shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-3">
                <span>{t("storefront.orderTrack.total")}</span>
                <span>{money(order.totalAmount ?? itemsSubtotal + (order.shippingCost ?? 0))}</span>
              </div>
              {order.shippingAddress && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="whitespace-pre-line">{order.shippingAddress}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span dir="ltr">{order.customerPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {order.tenantName && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    {t("storefront.orderTrack.store")}
                  </p>
                  <p className="font-semibold text-sm truncate">{order.tenantName}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full shrink-0">
                  <a href={storeHref}>
                    {t("storefront.orderTrack.visitStore")}
                    {i18n.dir() === "rtl" ? <ArrowLeft className="w-3.5 h-3.5 ms-1" /> : <ArrowRight className="w-3.5 h-3.5 ms-1" />}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
