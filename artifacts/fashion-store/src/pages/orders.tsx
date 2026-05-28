import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useListOrders, useUpdateOrder } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  FileText,
  MessageCircle,
  Search,
} from "lucide-react";
import GuideCard from "@/components/admin/GuideCard";
import Returns from "@/pages/returns";
import FollowUp from "@/pages/follow-up";
import { formatCurrency, formatRelativeAge } from "@/lib/ui-format";
import { AdminPageHeader, AdminToolbar } from "@/components/admin/admin-page";
import { AdminTable, AdminTableCell, AdminTableRow } from "@/components/admin/admin-table";
import { StateBlock } from "@/components/admin/state-block";
import { StatusBadge } from "@/components/admin/status-badge";
import { orderStatusMeta } from "@/lib/ui-status";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("tab") || "needsAction";
    }
    return "needsAction";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (activeTab === "all") url.searchParams.delete("tab");
      else url.searchParams.set("tab", activeTab);
      window.history.replaceState({}, "", url.toString());
    }
  }, [activeTab]);

  const { data: ordersResponse, isLoading, refetch } = useListOrders({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search ? search : undefined,
    city: cityFilter ? cityFilter : undefined,
    startDate: dateRange.start ? dateRange.start : undefined,
    endDate: dateRange.end ? dateRange.end : undefined,
    hasFailedContact: activeTab === "failedContact" ? true : undefined,
    limit: 100,
  });
  const orders = ordersResponse?.data ?? [];
  const updateOrder = useUpdateOrder();

  async function handleConfirmOrder(id: number) {
    try {
      await updateOrder.mutateAsync({ id, data: { status: "confirmed" } });
      refetch();
    } catch (err) {
      console.error(err);
    }
  }

  function nextActionFor(status: string) {
    if (["pending", "awaiting_confirmation"].includes(status)) return t("orders.nextAction.confirm", "Confirm customer");
    if (status === "confirmed") return t("orders.nextAction.ship", "Create shipment");
    if (["dispatched", "shipped"].includes(status)) return t("orders.nextAction.track", "Track delivery");
    if (status === "delivered") return t("orders.nextAction.followUp", "Follow up");
    if (["cancelled", "returned"].includes(status)) return t("orders.nextAction.review", "Review reason");
    return t("orders.nextAction.open", "Open order");
  }

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
    let matchesStatus = true;
    if (activeTab === "needsAction") matchesStatus = ["pending", "awaiting_confirmation"].includes(order.status);
    if (activeTab === "ready") matchesStatus = order.status === "confirmed";
    if (activeTab === "shipping") matchesStatus = ["dispatched", "shipped"].includes(order.status);
    if (activeTab === "done") matchesStatus = ["delivered", "cancelled", "returned"].includes(order.status);

    const matchesPaymentFilter = paymentFilter === "all" || order.paymentMethod === paymentFilter;

    return matchesStatus && matchesPaymentFilter;
  });

  const selectedOrders = filtered.filter((order) => selectedIds.includes(order.id));
  const allVisibleSelected = filtered.length > 0 && filtered.every((order) => selectedIds.includes(order.id));

  function toggleOrderSelection(orderId: number) {
    setSelectedIds((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !filtered.some((order) => order.id === id));
      return Array.from(new Set([...current, ...filtered.map((order) => order.id)]));
    });
  }

  const tabs = [
    { id: "all", label: t("orders.filter.all"), count: orderStats.all },
    { id: "needsAction", label: t("orders.queue.needsAction"), count: orderStats.needsAction },
    { id: "ready", label: t("orders.queue.ready"), count: orderStats.ready },
    { id: "shipping", label: t("orders.queue.shipping"), count: orderStats.shipping },
    { id: "done", label: t("orders.queue.done"), count: orderStats.done },
    { id: "failedContact", label: t("orders.queue.failedContact") },
    { id: "returns", label: t("layout.returns") },
    { id: "follow-up", label: t("layout.followUp") },
  ];

  const showOrdersQueue = activeTab !== "returns" && activeTab !== "follow-up";

  return (
    <div className="container mx-auto px-4 py-10" dir={i18n.dir()}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <AdminPageHeader
          icon={<FileText className="h-5 w-5" />}
          title={t("orders.page.title")}
          description={t("orders.page.subtitle")}
        />
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
              <p className="text-xs text-muted-foreground">{t("orders.metrics.open")}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{orderStats.needsAction + orderStats.ready + orderStats.shipping}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("orders.metrics.needsContact")}</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{needsContact}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("orders.metrics.revenue")}</p>
              <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalRevenue, i18n.language)}</p>
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
          <AdminToolbar>
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                placeholder={t("orders.search.placeholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="px-10 h-11"
              />
            </div>
            <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm flex-1 sm:flex-none"
                aria-label={t("orders.filters.status", "Status")}
              >
                <option value="all">{t("orders.filters.allStatuses", "All statuses")}</option>
                {Object.keys(orderStatusMeta).map((status) => (
                  <option key={status} value={status}>
                    {t(`orders.status.${status}`, t(`orderDetail.status.${status}`, status))}
                  </option>
                ))}
              </select>
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm flex-1 sm:flex-none"
                aria-label={t("orders.filters.payment", "Payment")}
              >
                <option value="all">{t("orders.filters.allPayments", "All payments")}</option>
                <option value="cod">{t("orders.payment.cod", "COD")}</option>
                <option value="paymob">{t("orders.payment.paymob", "Online payment")}</option>
              </select>
              <Input
                placeholder={t("orders.filters.city")}
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                className="h-11 w-32 shrink-0"
              />
              <Input
                type="date"
                value={dateRange.start}
                onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
                className="h-11 w-36 shrink-0"
                aria-label={t("orders.filters.startDate", "Start date")}
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
                className="h-11 w-36 shrink-0"
                aria-label={t("orders.filters.endDate", "End date")}
              />
            </div>
          </AdminToolbar>

          {selectedOrders.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-primary">
                {selectedOrders.length} {t("orders.bulk.selected", "selected")}
              </span>
              <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => setSelectedIds([])}>
                {t("orders.bulk.clear", "Clear")}
              </Button>
              <Button size="sm" className="h-9 rounded-full" asChild>
                <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(selectedOrders.map((order) => [order.id, order.customerName ?? "", order.customerPhone ?? "", order.status, order.totalAmount ?? 0].join(",")).join("\n"))}`} download="orders-export.csv">
                  {t("orders.bulk.export", "Export CSV")}
                </a>
              </Button>
            </div>
          )}

          {!isLoading && (
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} {t("orders.list.orderCount")}
            </p>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="hidden lg:block mb-4">
              <AdminTable
                headers={[
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelection}
                    aria-label={t("orders.bulk.selectVisible", "Select visible orders")}
                  />,
                  t("orders.table.order", "Order"),
                  t("orders.table.customer", "Customer"),
                  t("orders.table.status", "Status"),
                  t("orders.table.payment", "Payment"),
                  t("orders.table.total", "Total"),
                  t("orders.table.tracking", "Tracking"),
                  t("orders.table.age", "Age"),
                  t("orders.table.next", "Next action"),
                  <span className="sr-only">{t("orders.table.open", "Open")}</span>,
                ]}
              >
                  {filtered.map((order) => {
                    const statusLabel = t(
                      `orders.status.${order.status}`,
                      t(`orderDetail.status.${order.status}`, order.status),
                    );
                    const isNeedsAction = ["pending", "awaiting_confirmation"].includes(order.status);

                    return (
                      <AdminTableRow key={order.id} className={isNeedsAction ? "bg-amber-50/30" : undefined}>
                        <AdminTableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            aria-label={t("orders.bulk.selectOrder", { id: order.id, defaultValue: "Select order {{id}}" })}
                          />
                        </AdminTableCell>
                        <AdminTableCell className="font-semibold">#{order.id}</AdminTableCell>
                        <AdminTableCell>
                          <div className="font-medium text-foreground">{order.customerName ?? t("orders.list.unknownCustomer")}</div>
                          {order.customerPhone && (
                            <Button variant="outline" size="sm" className="mt-1 h-7 rounded-lg text-xs text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800" asChild>
                              <a dir="ltr" href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-3 h-3 me-1.5" />
                                {order.customerPhone}
                              </a>
                            </Button>
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          <StatusBadge status={order.status} label={statusLabel} />
                        </AdminTableCell>
                        <AdminTableCell className="text-muted-foreground">
                          {order.paymentMethod === "paymob" ? t("orders.payment.paymob", "Online payment") : t("orders.payment.cod", "COD")}
                        </AdminTableCell>
                        <AdminTableCell className="font-semibold text-primary">{formatCurrency(order.totalAmount, i18n.language)}</AdminTableCell>
                        <AdminTableCell className="text-muted-foreground text-xs">
                          {order.trackingNumber ? (
                            <div className="flex flex-col">
                              <span>{order.bostaShipmentId ? "Bosta" : "Courier"}</span>
                              <span className="font-mono">{order.trackingNumber}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </AdminTableCell>
                        <AdminTableCell className="text-muted-foreground">{formatRelativeAge(order.createdAt, i18n.language)}</AdminTableCell>
                        <AdminTableCell>
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            {nextActionFor(order.status)}
                          </span>
                        </AdminTableCell>
                        <AdminTableCell className="text-end">
                          <div className="flex justify-end gap-2">
                            {isNeedsAction && (
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updateOrder.isPending} onClick={() => handleConfirmOrder(order.id)}>
                                {t("orders.actions.confirm", "Confirm")}
                              </Button>
                            )}
                            <Button size="sm" variant={isNeedsAction ? "outline" : "default"} asChild>
                              <Link href={`/orders/${order.id}`}>{t("orders.actions.open", "Open")}</Link>
                            </Button>
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
              </AdminTable>
            </div>
          )}

          <motion.div
            className="space-y-3 lg:hidden"
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
                  const StatusIcon = (orderStatusMeta[order.status] ?? orderStatusMeta.pending).icon;
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
                                  <StatusBadge status={order.status} label={statusLabel} />
                                  <Badge variant="outline" className="text-[10px]">
                                    {order.paymentMethod === "paymob"
                                      ? t("orders.payment.paymob")
                                      : t("orders.payment.cod", "COD")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {order.customerName ?? t("orders.list.unknownCustomer")} ·{" "}
                                  {formatRelativeAge(order.createdAt, i18n.language)}
                                </p>
                                {order.customerPhone && (
                                  <Button variant="outline" size="sm" className="mt-2 h-7 rounded-lg text-xs text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800" asChild>
                                    <a
                                      href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      dir="ltr"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 me-1.5" />
                                      {order.customerPhone}
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-end">
                                <p className="font-bold text-primary">
                                  {formatCurrency(order.totalAmount, i18n.language)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.items?.length ?? 0} {t("orders.list.productCount")}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {isNeedsAction && (
                                  <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updateOrder.isPending} onClick={() => handleConfirmOrder(order.id)}>
                                    {t("orders.actions.confirm", "Confirm")}
                                  </Button>
                                )}
                                <Button variant={isNeedsAction ? "outline" : "default"} size="sm" asChild className="rounded-full">
                                  <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1.5">
                                    <span className="hidden sm:inline">{isNeedsAction ? t("orders.actions.review", "Review") : t("orders.actions.open", "Open")}</span>
                                    <ChevronLeft className={`w-5 h-5 ${i18n.dir() === "ltr" ? "rotate-180" : ""}`} />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
          </motion.div>

          {!isLoading && filtered.length === 0 && (
            <StateBlock icon={<FileText className="h-6 w-6" />} title={t("orders.list.empty")} />
          )}
        </>
      )}
    </div>
  );
}
