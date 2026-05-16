import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, ChevronLeft } from "lucide-react";
import GuideCard from "@/components/admin/GuideCard";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: {
    label: "قيد الانتظار",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  confirmed: {
    label: "مؤكد",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  shipped: {
    label: "تم الشحن",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  delivered: {
    label: "تم التوصيل",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800 border-red-200" },
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  },
};

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { data: ordersResponse, isLoading } = useListOrders();
  const orders = ordersResponse?.data ?? [];

  const filtered = orders?.filter((o) => {
    const matchesSearch =
      !search ||
      String(o.id).includes(search) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">الطلبات</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          إدارة ومتابعة جميع الطلبات الواردة من متجرك
        </p>
      </motion.div>

      <GuideCard
        storageKey="orders"
        title="كيف تدير طلباتك؟"
        description="هنا تجد كل الطلبات التي وردت من متجرك. انقر على أي طلب لعرض تفاصيله وتحديث حالته."
        steps={[
          {
            icon: "📦",
            title: "استلام الطلب",
            desc: "عند ورود طلب جديد ستصلك إشعار — تأكد من مراجعته خلال 24 ساعة.",
          },
          {
            icon: "✅",
            title: "تأكيد وتحضير",
            desc: "غير الحالة إلى «مؤكد» عند التحقق من الطلب وبدء التحضير.",
          },
          {
            icon: "🚚",
            title: "الشحن والتوصيل",
            desc: "عند الإرسال للشحن غير الحالة إلى «تم الشحن» وأضف رقم التتبع.",
          },
          {
            icon: "⭐",
            title: "ما بعد التوصيل",
            desc: "تابع مع العميل للتأكد من رضاه وشجعه على ترك تقييم.",
          },
        ]}
        tips={[
          "رد على طلبات COD خلال ساعتين لتقليل نسبة الإلغاء.",
          "استخدم فلتر «قيد الانتظار» لعرض الطلبات التي تحتاج اهتماماً فورياً.",
          "أرسل رسالة واتساب للعميل فور تأكيد طلبه لبناء الثقة.",
        ]}
        variant="guide"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالرقم أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-11"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={!statusFilter ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setStatusFilter(null)}
          >
            الكل
          </Button>
          {Object.entries(STATUS_MAP).map(([key, val]) => (
            <Button
              key={key}
              size="sm"
              variant={statusFilter === key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            >
              {val.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-4">
          {filtered?.length ?? 0} طلب
        </p>
      )}

      <motion.div
        className="space-y-3"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <motion.div key={i} variants={stagger.item}>
                  <Skeleton className="h-20 w-full rounded-xl" />
                </motion.div>
              ))
          : filtered?.map((order) => {
              const s = STATUS_MAP[order.status] ?? {
                label: order.status,
                color: "",
              };
              return (
                <motion.div key={order.id} variants={stagger.item}>
                  <Card className="border-border/50 hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 rounded-xl p-3">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                طلب #{order.id}
                              </span>
                              <Badge className={`text-xs ${s.color}`}>
                                {s.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {order.customerName ?? "عميل غير معروف"} ·{" "}
                              {new Date(order.createdAt).toLocaleDateString(
                                "ar-EG",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-end hidden sm:block">
                            <p className="font-bold text-primary">
                              {Number(order.totalAmount ?? 0).toLocaleString(
                                "ar-EG",
                              )}{" "}
                              ج.م
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.items?.length ?? 0} منتج
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/orders/${order.id}`}>
                              <ChevronLeft className="w-5 h-5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </motion.div>

      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-24">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">لا توجد طلبات</p>
        </div>
      )}
    </div>
  );
}
