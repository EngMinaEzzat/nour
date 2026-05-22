import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, ChevronLeft } from "lucide-react";
import GuideCard from "@/components/admin/GuideCard";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  },
};

export default function Orders() {
  const { t, i18n } = useTranslation();
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
    <div className="container mx-auto px-4 py-10" dir={i18n.dir()}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">{t("orders.page.title")}</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          {t("orders.page.subtitle")}
        </p>
      </motion.div>

      <GuideCard
        storageKey="orders"
        title={t("orders.guide.title")}
        description={t("orders.guide.description")}
        steps={[
          {
            icon: "📦",
            title: t("orders.guide.step1.title"),
            desc: t("orders.guide.step1.desc"),
          },
          {
            icon: "✅",
            title: t("orders.guide.step2.title"),
            desc: t("orders.guide.step2.desc"),
          },
          {
            icon: "🚚",
            title: t("orders.guide.step3.title"),
            desc: t("orders.guide.step3.desc"),
          },
          {
            icon: "⭐",
            title: t("orders.guide.step4.title"),
            desc: t("orders.guide.step4.desc"),
          },
        ]}
        tips={[
          t("orders.guide.tips.0"),
          t("orders.guide.tips.1"),
          t("orders.guide.tips.2"),
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
          <Search className={`absolute ${i18n.dir() === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            placeholder={t("orders.search.placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-10 h-11"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={!statusFilter ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setStatusFilter(null)}
          >
            {t("orders.filter.all")}
          </Button>
          {Object.keys(STATUS_COLORS).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={statusFilter === key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            >
              {t(`orders.status.${key}`)}
            </Button>
          ))}
        </div>
      </motion.div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-4">
          {filtered?.length ?? 0} {t("orders.list.orderCount")}
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
              const statusLabel = t(`orders.status.${order.status}`) ?? order.status;
              const statusColor = STATUS_COLORS[order.status] ?? "";
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
                                {t("orders.list.orderNum")}{order.id}
                              </span>
                              <Badge className={`text-xs ${statusColor}`}>
                                {statusLabel}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {order.customerName ?? t("orders.list.unknownCustomer")} ·{" "}
                              {new Date(order.createdAt).toLocaleDateString(
                                i18n.language === "ar" ? "ar-EG" : "en-US",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-end hidden sm:block">
                            <p className="font-bold text-primary">
                              {Number(order.totalAmount ?? 0).toLocaleString(
                                i18n.language === "ar" ? "ar-EG" : "en-US",
                              )}{" "}
                              {i18n.language === "ar" ? "ج.م" : "EGP"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.items?.length ?? 0} {t("orders.list.productCount")}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/orders/${order.id}`}>
                              <ChevronLeft className={`w-5 h-5 ${i18n.dir() === "ltr" ? "rotate-180" : ""}`} />
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
          <p className="text-muted-foreground">{t("orders.list.empty")}</p>
        </div>
      )}
    </div>
  );
}
