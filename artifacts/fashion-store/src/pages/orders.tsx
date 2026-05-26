import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  MessageCircle,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import GuideCard from "@/components/admin/GuideCard";
import Returns from "@/pages/returns";
import FollowUp from "@/pages/follow-up";

const STATUS_META: Record<string, { color: string; icon: React.ElementType }> = {
  pending: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  awaiting_confirmation: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertCircle,
  },
  confirmed: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle2,
  },
  dispatched: {
    color: "bg-violet-100 text-violet-800 border-violet-200",
    icon: Truck,
  },
  shipped: {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Truck,
  },
  delivered: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: PackageCheck,
  },
  cancelled: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  returned: {
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
  },
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
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const currency = i18n.language === "ar" ? "ج.م" : "EGP";

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("tab") || "all";
    }
    return "all";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (activeTab === "all") url.searchParams.delete("tab");
      else url.searchParams.set("tab", activeTab);
      window.history.replaceState({}, "", url.toString());
    }
  }, [activeTab]);

  const { data: ordersResponse, isLoading } = useListOrders();
  const orders = ordersResponse?.data ?? [];

  const orderStats = {
    all: orders.length,
    needsAction: orders.filter((order) => ["pending", "awaiting_confirmation"].includes(order.status)).length,
    ready: orders.filter((order) => order.status === "confirmed").length,
    shipping: orders.filter((order) => ["dispatched", "shipped"].includes(order.status)).length,
    done: orders.filter((order) => ["delivered", "cancelled", "returned"].includes(order.status)).length,
  };
  const totalRevenue = orders
    .filter((order) => !["cancelled", "returned"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  const needsContact = orders.filter((order) =>
    ["pending", "awaiting_confirmation"].includes(order.status) && !!order.customerPhone
  ).length;

  const filtered = orders.filter((order) => {
    const normalizedSearch = search.trim().toLowerCase();
    const phoneSearch = normalizedSearch.replace(/\D/g, "");
    const matchesSearch =
      !normalizedSearch ||
      String(order.id).includes(normalizedSearch) ||
      order.customerName?.toLowerCase().includes(normalizedSearch) ||
      order.customerPhone?.replace(/\D/g, "").includes(phoneSearch);

    let matchesStatus = true;
    if (activeTab === "needsAction") matchesStatus = ["pending", "awaiting_confirmation"].includes(order.status);
    if (activeTab === "ready") matchesStatus = order.status === "confirmed";
    if (activeTab === "shipping") matchesStatus = ["dispatched", "shipped"].includes(order.status);
    if (activeTab === "done") matchesStatus = ["delivered", "cancelled", "returned"].includes(order.status);

    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: "all", label: t("orders.filter.all", "كل الطلبات"), count: orderStats.all },
    { id: "needsAction", label: t("orders.queue.needsAction", "تحتاج تأكيد"), count: orderStats.needsAction },
    { id: "ready", label: t("orders.queue.ready", "جاهزة للشحن"), count: orderStats.ready },
    { id: "shipping", label: t("orders.queue.shipping", "قيد الشحن"), count: orderStats.shipping },
    { id: "done", label: t("orders.queue.done", "مغلقة"), count: orderStats.done },
    { id: "returns", label: t("layout.returns", "المرتجعات") },
    { id: "follow-up", label: t("layout.followUp", "المتابعة") },
  ];

  const showOrdersQueue = activeTab !== "returns" && activeTab !== "follow-up";

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
        <p className="text-muted-foreground mb-4">{t("orders.page.subtitle")}</p>
      </motion.div>

      <GuideCard
        storageKey="orders"
        title={t("orders.guide.title")}
        description={t("orders.guide.description")}
        steps={[
          { icon: "1", title: t("orders.guide.step1.title"), desc: t("orders.guide.step1.desc") },
          { icon: "2", title: t("orders.guide.step2.title"), desc: t("orders.guide.step2.desc") },
          { icon: "3", title: t("orders.guide.step3.title"), desc: t("orders.guide.step3.desc") },
          { icon: "4", title: t("orders.guide.step4.title"), desc: t("orders.guide.step4.desc") },
        ]}
        tips={[
          t("orders.guide.tips.0"),
          t("orders.guide.tips.1"),
          t("orders.guide.tips.2"),
        ]}
        variant="guide"
      />

      {showOrdersQueue && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("orders.metrics.open", "طلبات مفتوحة")}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{orderStats.needsAction + orderStats.ready + orderStats.shipping}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("orders.metrics.needsContact", "تحتاج تواصل")}</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{needsContact}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("orders.metrics.revenue", "قيمة الطلبات")}</p>
              <p className="text-2xl font-bold text-primary mt-1">{totalRevenue.toLocaleString(locale)} {currency}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-2 flex-wrap mb-8 border-b border-border/40 pb-4"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {"count" in tab && (
              <span className={`ms-1 rounded-full px-1.5 text-[10px] ${activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                {tab.count}
              </span>
            )}
          </Button>
        ))}
      </motion.div>

      {activeTab === "returns" && <Returns embedded />}
      {activeTab === "follow-up" && <FollowUp embedded />}

      {showOrdersQueue && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute ${i18n.dir() === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                placeholder={t("orders.search.placeholder", "ابحث برقم الطلب أو العميل أو الهاتف")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="px-10 h-11"
              />
            </div>
          </div>

          {!isLoading && (
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} {t("orders.list.orderCount")}
            </p>
          )}

          <motion.div
            className="space-y-3"
            variants={stagger.container}
            initial="hidden"
            animate="show"
          >
            {isLoading
              ? Array(6).fill(0).map((_, index) => (
                  <motion.div key={index} variants={stagger.item}>
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </motion.div>
                ))
              : filtered.map((order) => {
                  const statusLabel = t(
                    `orders.status.${order.status}`,
                    t(`orderDetail.status.${order.status}`, order.status),
                  );
                  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending;
                  const StatusIcon = statusMeta.icon;
                  const isNeedsAction = ["pending", "awaiting_confirmation"].includes(order.status);

                  return (
                    <motion.div key={order.id} variants={stagger.item}>
                      <Card className={`border-border/50 hover:shadow-sm transition-shadow ${isNeedsAction ? "ring-1 ring-amber-200 bg-amber-50/20" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className={`rounded-xl p-3 shrink-0 ${isNeedsAction ? "bg-amber-100" : "bg-primary/10"}`}>
                                <StatusIcon className={`w-5 h-5 ${isNeedsAction ? "text-amber-700" : "text-primary"}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-foreground">
                                    {t("orders.list.orderNum")}{order.id}
                                  </span>
                                  <Badge className={`text-xs ${statusMeta.color}`}>
                                    {statusLabel}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    {order.paymentMethod === "paymob"
                                      ? t("orders.payment.paymob", "دفع إلكتروني")
                                      : t("orders.payment.cod", "COD")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {order.customerName ?? t("orders.list.unknownCustomer")} ·{" "}
                                  {new Date(order.createdAt).toLocaleDateString(locale)}
                                </p>
                                {order.customerPhone && (
                                  <a
                                    href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline"
                                    dir="ltr"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {order.customerPhone}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-end">
                                <p className="font-bold text-primary">
                                  {Number(order.totalAmount ?? 0).toLocaleString(locale)} {currency}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.items?.length ?? 0} {t("orders.list.productCount")}
                                </p>
                              </div>
                              <Button variant={isNeedsAction ? "default" : "ghost"} size="sm" asChild className="rounded-full">
                                <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1.5">
                                  <span className="hidden sm:inline">{isNeedsAction ? t("orders.actions.review", "مراجعة") : t("orders.actions.open", "فتح")}</span>
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

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-24">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground">{t("orders.list.empty")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
