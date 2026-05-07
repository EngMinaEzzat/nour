import { useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Package, Clock, CheckCircle2, Truck, XCircle, RotateCcw, MapPin, Phone, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:    { label: "قيد المراجعة",  icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  confirmed:  { label: "مؤكد",          icon: CheckCircle2,  color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  dispatched: { label: "تم الإرسال",    icon: Truck,         color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  shipped:    { label: "في الطريق",     icon: Truck,         color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  delivered:  { label: "تم التسليم",   icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50 border-green-200" },
  cancelled:  { label: "ملغي",         icon: XCircle,       color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  returned:   { label: "مرتجع",        icon: RotateCcw,     color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
};

const TIMELINE_STATUSES = ["pending", "confirmed", "dispatched", "shipped", "delivered"];

export default function OrderTrack() {
  const [, params] = useRoute("/order-track/:orderId");
  const publicCode = params?.orderId ?? "";
  const token = new URLSearchParams(useSearch()).get("token") ?? "";

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["public-order", publicCode, token],
    queryFn: () =>
      fetch(`${BASE}/api/orders/track/${encodeURIComponent(publicCode)}?token=${encodeURIComponent(token)}`).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
    enabled: !!publicCode && !!token,
    retry: false,
  });

  if (!publicCode || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">رقم طلب غير صالح</p>
          <Button asChild variant="outline"><Link href="/">الرئيسية</Link></Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جارٍ البحث عن طلبك...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">لم يتم العثور على الطلب</p>
          <p className="text-muted-foreground text-sm mb-6">تأكد من رقم الطلب أو تواصل مع المتجر</p>
          <Button asChild variant="outline"><Link href="/">الرئيسية</Link></Button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
  const StatusIcon = statusInfo.icon;
  const currentIdx = TIMELINE_STATUSES.indexOf(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "returned";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 text-center">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-80" />
        <h1 className="text-xl font-bold">تتبع طلبك</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">رقم الطلب #{order.id}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`border ${statusInfo.bg}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusInfo.bg} shrink-0`}>
                <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">حالة الطلب</p>
                <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                {order.trackingNumber && (
                  <p className="text-xs text-muted-foreground mt-0.5">رقم التتبع: {order.trackingNumber}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline */}
        {!isCancelled && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm">مراحل الطلب</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-3">
                  {TIMELINE_STATUSES.map((s, idx) => {
                    const info = STATUS_MAP[s];
                    const Icon = info.icon;
                    const done = idx <= currentIdx;
                    const active = idx === currentIdx;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        } ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                            {info.label}
                          </p>
                        </div>
                        {done && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Order details */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm">تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              {order.items?.map((item: { productId: number; productName: string; quantity: number; unitPrice: number }) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                  <span className="font-medium">{(item.unitPrice * item.quantity).toLocaleString("ar-EG")} ج.م</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                <span>الإجمالي</span>
                <span>{order.totalAmount?.toLocaleString("ar-EG")} ج.م</span>
              </div>
              {order.shippingAddress && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{order.shippingAddress}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span dir="ltr">{order.customerPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Store info */}
        {order.tenantName && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">المتجر</p>
                  <p className="font-semibold text-sm">{order.tenantName}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/store/${order.tenantName?.toLowerCase()}`}>
                    زيارة المتجر <ArrowRight className="w-3.5 h-3.5 mr-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
