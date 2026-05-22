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
import { useTranslation } from "react-i18next";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: {
    label: t("text_e722ee31", "قيد الانتظار"),
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  confirmed: {
    label: t("text_c6310c14", "مؤكد"),
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  shipped: {
    label: t("text_c8ebe004", "تم الشحن"),
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  delivered: {
    label: t("text_3a0c4fb4", "تم التوصيل"),
    color: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: { label: t("text_f5eb0776", "ملغي"), color: "bg-red-100 text-red-800 border-red-200" },
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  },
};

export default function Orders() {
    const { t } = useTranslation();
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
          <h1 className="text-3xl font-bold">{t("text_889f5569", t("text_889f5569", "الطلبات"))}</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          {t("text_a5c5651a", t("text_a5c5651a", "إدارة ومتابعة جميع الطلبات الواردة من متجرك"))}
                          </p>
      </motion.div>

      <GuideCard
        storageKey="orders"
        title={t("text_90a4f041", "كيف تدير طلباتك؟")}
        description={t("text_04d0ed83", "هنا تجد كل الطلبات التي وردت من متجرك. انقر على أي طلب لعرض تفاصيله وتحديث حالته.")}
        steps={[
          {
            icon: "📦",
            title: t("text_03946c6f", "استلام الطلب"),
            desc: t("text_8d11bbc5", "عند ورود طلب جديد ستصلك إشعار — تأكد من مراجعته خلال 24 ساعة."),
          },
          {
            icon: "✅",
            title: t("text_b0a53cd8", "تأكيد وتحضير"),
            desc: t("text_c9c3f6e6", "غير الحالة إلى «مؤكد» عند التحقق من الطلب وبدء التحضير."),
          },
          {
            icon: "🚚",
            title: t("text_4ae4ef6f", "الشحن والتوصيل"),
            desc: t("text_9ff2f023", "عند الإرسال للشحن غير الحالة إلى «تم الشحن» وأضف رقم التتبع."),
          },
          {
            icon: "⭐",
            title: t("text_278375e3", "ما بعد التوصيل"),
            desc: t("text_096f0bb6", "تابع مع العميل للتأكد من رضاه وشجعه على ترك تقييم."),
          },
        ]}
        tips={[
          t("text_1a19feb9", "رد على طلبات COD خلال ساعتين لتقليل نسبة الإلغاء."),
          t("text_5ec491f0", "استخدم فلتر «قيد الانتظار» لعرض الطلبات التي تحتاج اهتماماً فورياً."),
          t("text_fa3d28a7", "أرسل رسالة واتساب للعميل فور تأكيد طلبه لبناء الثقة."),
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
            placeholder={t("text_1b0a963a", "بحث بالرقم أو اسم العميل...")}
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
            {t("text_6d08f196", t("text_6d08f196", "الكل"))}
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
          {filtered?.length ?? 0} {t("text_f48e3aa7", t("text_f48e3aa7", "طلب"))}
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
                                {t("text_87e1ced7", t("text_87e1ced7", "طلب #"))}{order.id}
                              </span>
                              <Badge className={`text-xs ${s.color}`}>
                                {s.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {order.customerName ?? t("text_1515cdc0", "عميل غير معروف")} ·{" "}
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
                              {t("text_3c111129", t("text_3c111129", "ج.م"))}
                                                                          </p>
                            <p className="text-xs text-muted-foreground">
                              {order.items?.length ?? 0} {t("text_bb7632a2", t("text_bb7632a2", "منتج"))}
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
          <p className="text-muted-foreground">{t("text_c821e6e7", t("text_c821e6e7", "لا توجد طلبات"))}</p>
        </div>
      )}
    </div>
  );
}
