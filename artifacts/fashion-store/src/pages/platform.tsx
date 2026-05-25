import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useListTenants, getListTenantsQueryKey, useGetPlatformStats, getGetPlatformStatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState as useLocalState } from "react";
import {
  Search, Store, Users, TrendingUp, AlertTriangle,
  ShieldCheck, Package, ChevronLeft, BarChart2, Heart,
  Mail, ExternalLink, MapPin, Calendar, Ban, CheckCircle, Loader2,
  CreditCard, Eye, X, ShoppingBag, Banknote,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { getStoreUrl } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const SUB_STATUS: Record<string, { labelKey: string; color: string }> = {
  trial:     { labelKey: "status.trial",     color: "bg-blue-100 text-blue-700 border-blue-200" },
  active:    { labelKey: "status.active",    color: "bg-green-100 text-green-700 border-green-200" },
  past_due:  { labelKey: "status.past_due",  color: "bg-orange-100 text-orange-700 border-orange-200" },
  suspended: { labelKey: "status.suspended", color: "bg-red-100 text-red-700 border-red-200" },
  canceled:  { labelKey: "status.canceled",  color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

type MerchantRow = {
  tenantId: number;
  storeName: string;
  slug: string;
  city: string | null;
  planCode: string;
  subscriptionStatus: string;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  productCount: number;
  orderCount: number;
  totalRevenue: number;
};

function MerchantStatusToggle({ m, onToggled }: { m: MerchantRow; onToggled: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useLocalState(false);
  const isSuspended = m.subscriptionStatus === "suspended";
  const action = isSuspended ? "activate" : "suspend";
  const label = isSuspended ? t("platform.toggleStatus.reactivateBtn") : t("platform.toggleStatus.suspendBtn");
  const Icon = isSuspended ? CheckCircle : Ban;
  const btnClass = isSuspended
    ? "text-green-600 hover:text-green-700 hover:bg-green-50"
    : "text-red-600 hover:text-red-700 hover:bg-red-50";

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(api(`/platform/merchants/${m.tenantId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      onToggled();
    } finally {
      setLoading(false);
    }
  }, [m.tenantId, action, onToggled]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className={`shrink-0 gap-1.5 text-xs px-2 ${btnClass}`} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isSuspended ? t("platform.toggleStatus.reactivateTitle") : t("platform.toggleStatus.suspendTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {isSuspended
              ? t("platform.toggleStatus.reactivateDesc", { storeName: m.storeName })
              : t("platform.toggleStatus.suspendDesc", { storeName: m.storeName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.buttons.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={isSuspended ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const TRANSFER_STATUS: Record<string, { labelKey: string; color: string }> = {
  pending:  { labelKey: "status.pending",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { labelKey: "status.approved", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { labelKey: "status.rejected", color: "bg-red-100 text-red-700 border-red-200" },
};

function TransferRequestCard({ request, onAction }: { request: any; onAction: () => void }) {
  const { t, i18n } = useTranslation();
  const [rejectNote, setRejectNote] = useLocalState("");
  const [loading, setLoading] = useLocalState<"approve" | "reject" | null>(null);
  const s = TRANSFER_STATUS[request.status] ?? TRANSFER_STATUS.pending;
  const isPending = request.status === "pending";

  const act = async (action: "approve" | "reject") => {
    setLoading(action);
    try {
      await fetch(api(`/platform/transfer-requests/${request.id}/${action}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(action === "reject" ? { note: rejectNote } : {}),
      });
      onAction();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold">{request.storeName ?? `${t("layout.myStore")} #${request.tenantId}`}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${s.color}`}>{t(s.labelKey)}</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {t(`plans.${request.planCode}`, { defaultValue: request.planCode })} — {Number(request.amount).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {t("common.currency")}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {request.ownerEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{request.ownerEmail}</span>}
              <span>{t("platform.paymentsSection.reference")} <span className="font-mono font-medium text-foreground">{request.referenceNumber}</span></span>
              <span>{new Date(request.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            {request.adminNote && <p className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{t("platform.paymentsSection.note")} {request.adminNote}</p>}
          </div>
          {request.receiptImageUrl && (
            <a href={request.receiptImageUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline">
              <Eye className="w-3.5 h-3.5" /> {t("platform.paymentsSection.receipt")}
            </a>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" disabled={!!loading}>
                  {loading === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {t("common.buttons.acceptAndActivate")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("platform.paymentsSection.confirmApprove")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("platform.paymentsSection.confirmApproveDesc", {
                      storeName: request.storeName || `${t("layout.myStore")} #${request.tenantId}`,
                      plan: t(`plans.${request.planCode}`, { defaultValue: request.planCode })
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.buttons.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => act("approve")} className="bg-green-600 hover:bg-green-700">{t("common.buttons.confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" disabled={!!loading}>
                  {loading === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  {t("common.buttons.reject")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("platform.paymentsSection.rejectTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("platform.paymentsSection.rejectDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-6 pb-2">
                  <Textarea
                    placeholder={t("platform.paymentsSection.rejectReasonPlaceholder")}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.buttons.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => act("reject")} className="bg-destructive hover:bg-destructive/90">{t("common.buttons.reject")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Platform() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { merchant, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"merchants" | "payments" | "tenants" | "health">("merchants");
  const queryClient = useQueryClient();

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery<MerchantRow[]>({
    queryKey: ["platform-merchants"],
    queryFn: async () => {
      const response = await fetch(api("/platform/merchants"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load platform stores");
      return response.json();
    },
    enabled: !!merchant?.isPlatformAdmin,
  });

  const { data: transferRequests = [], isLoading: transfersLoading } = useQuery<any[]>({
    queryKey: ["platform-transfer-requests"],
    queryFn: () => fetch(api("/platform/transfer-requests"), { credentials: "include" }).then((r) => r.json()),
    enabled: !!merchant?.isPlatformAdmin && activeTab === "payments",
  });

  const { data: healthScores = [], isLoading: healthLoading } = useQuery({
    queryKey: ["platform-health-scores"],
    queryFn: () => fetch(api("/platform/health-scores"), { credentials: "include" }).then((r) => r.json()),
    enabled: !!merchant?.isPlatformAdmin && activeTab === "health",
  });

  const { data: stats, isLoading: statsLoading } = useGetPlatformStats({
    query: { enabled: !!merchant?.isPlatformAdmin, queryKey: getGetPlatformStatsQueryKey() },
  });
  const { data: tenants, isLoading: tenantsLoading } = useListTenants({
    query: { enabled: !!merchant?.isPlatformAdmin && activeTab === "tenants", queryKey: getListTenantsQueryKey() },
  });

  if (authLoading) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t("platform.verifyLoading")}</div>;
  }

  if (!merchant?.isPlatformAdmin) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
        <p className="text-xl font-bold mb-2">{t("platform.restricted")}</p>
        <p className="text-muted-foreground mb-6">{t("platform.restrictedDesc")}</p>
        <Button asChild><Link href="/dashboard">{t("platform.backToDashboard")}</Link></Button>
      </div>
    );
  }

  const filteredMerchants = merchants.filter((m) => {
    const s = search.toLowerCase();
    return !s
      || m.storeName.toLowerCase().includes(s)
      || (m.slug ?? "").includes(s)
      || (m.city ?? "").toLowerCase().includes(s)
      || (m.ownerEmail ?? "").toLowerCase().includes(s)
      || (m.ownerName ?? "").toLowerCase().includes(s);
  });

  const filteredTenants = tenants?.filter((tenant) => {
    const s = search.toLowerCase();
    return !s || tenant.name.toLowerCase().includes(s) || (tenant.slug ?? "").includes(s);
  }) ?? [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">{t("platform.title")}</h1>
        </div>
        <p className="text-muted-foreground mb-6">{t("platform.subtitle")}</p>
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: "merchants", label: t("platform.tabs.merchants"), icon: Store,       badge: merchants.length || null },
            { id: "payments",  label: t("platform.tabs.payments"),    icon: CreditCard,  badge: (transferRequests as any[]).filter((req) => req.status === "pending").length || null },
            { id: "tenants",   label: t("platform.tabs.tenants"),      icon: Users,       badge: null },
            { id: "health",    label: t("platform.tabs.health"),   icon: Heart,       badge: null },
          ].map(({ id, label, icon: Icon, badge }) => (
            <Button key={id} variant={activeTab === id ? "default" : "outline"} size="sm" className="rounded-full gap-2 relative"
              onClick={() => { setSearch(""); setActiveTab(id as typeof activeTab); }}>
              <Icon className="w-4 h-4" />{label}
              {badge ? <span className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{badge}</span> : null}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t("platform.stats.totalStores"),    value: stats?.totalTenants,            icon: Store,         color: "bg-blue-500" },
          { label: t("platform.stats.activeStores"),         value: stats?.activeTenants,           icon: TrendingUp,    color: "bg-green-500" },
          { label: t("platform.stats.trialStores"),      value: stats?.trialTenants,            icon: Users,         color: "bg-violet-500" },
          { label: t("platform.stats.nearLimit"),      value: stats?.tenantsNearProductLimit, icon: AlertTriangle, color: "bg-orange-500" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${s.color}/10`}>
                    <s.icon className={`w-5 h-5 ${s.color.replace("bg-", "text-")}`} />
                  </div>
                  <div>
                    {statsLoading ? (
                      <Skeleton className="h-6 w-12 mb-1" />
                    ) : (
                      <p className="text-2xl font-bold">{s.value ?? 0}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Onboarding + Plans breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> {t("platform.cards.onboarding")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: t("platform.cards.onboardingRows.complete"), count: stats.onboardingCompletion.complete,   color: "bg-green-500" },
                { label: t("platform.cards.onboardingRows.partial"),  count: stats.onboardingCompletion.partial,    color: "bg-yellow-500" },
                { label: t("platform.cards.onboardingRows.notStarted"), count: stats.onboardingCompletion.notStarted, color: "bg-red-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                  <span className="text-muted-foreground flex-1">{row.label}</span>
                  <span className="font-bold">{row.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> {t("platform.cards.plans")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.planBreakdown.map((p) => (
                <div key={p.planCode} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground flex-1">{t(`plans.${p.planCode}`, { defaultValue: p.planCode })}</span>
                  <span className="font-bold">{p.count} {t("platform.storesCount")}</span>
                </div>
              ))}
              {stats.planBreakdown.length === 0 && (
                <p className="text-muted-foreground text-xs">{t("platform.noHealth")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Registered stores tab ── */}
      {activeTab === "merchants" && (
        <div>
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("platform.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 h-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="w-4 h-4" />
              <span>{filteredMerchants.length} {t("platform.storesCount")}</span>
            </div>
          </div>

          <motion.div className="space-y-2" variants={stagger.container} initial="hidden" animate="show">
            {merchantsLoading
              ? Array(6).fill(0).map((_, i) => (
                <motion.div key={i} variants={stagger.item}>
                  <Skeleton className="h-24 w-full rounded-xl" />
                </motion.div>
              ))
              : filteredMerchants.map((m) => {
                const sub = SUB_STATUS[m.subscriptionStatus ?? "trial"] ?? SUB_STATUS.trial;
                const storeUrl = getStoreUrl(m.slug);
                const joinDate = new Date(m.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
                  year: "numeric", month: "long", day: "numeric",
                });
                return (
                  <motion.div key={m.tenantId} variants={stagger.item}>
                    <Card className="border-border/50 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-0.5">
                              {m.storeName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              {/* Row 1: name + badges */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-foreground">{m.storeName}</span>
                                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${sub.color}`}>
                                  {t(sub.labelKey)}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                                  {t(`plans.${m.planCode}`, { defaultValue: m.planCode })}
                                </Badge>
                              </div>
                              {/* Row 2: owner */}
                              {(m.ownerName || m.ownerEmail) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 min-w-0">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  {m.ownerEmail ? (
                                    <a href={`mailto:${m.ownerEmail}`} className="hover:text-foreground transition-colors truncate">
                                      {m.ownerName ? `${m.ownerName} · ${m.ownerEmail}` : m.ownerEmail}
                                    </a>
                                  ) : (
                                    <span className="truncate">{m.ownerName}</span>
                                  )}
                                </div>
                              )}
                              {/* Row 3: store URL + city + date */}
                              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                                <a
                                  href={storeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {m.slug}
                                </a>
                                {m.city && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />{m.city}
                                    </span>
                                  </>
                                )}
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />{joinDate}
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2 max-w-md">
                                {[
                                  { label: t("platform.metrics.products"), value: m.productCount, icon: Package },
                                  { label: t("platform.metrics.orders"), value: m.orderCount, icon: ShoppingBag },
                                  { label: t("platform.metrics.revenue"), value: `${Number(m.totalRevenue ?? 0).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} ${t("common.currency")}`, icon: Banknote },
                                ].map((metric) => (
                                  <div key={metric.label} className="rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2">
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <metric.icon className="w-3.5 h-3.5" />
                                      <span>{metric.label}</span>
                                    </div>
                                    <p className="mt-1 text-sm font-bold text-foreground truncate">{metric.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <MerchantStatusToggle
                              m={m}
                              onToggled={() => queryClient.invalidateQueries({ queryKey: ["platform-merchants"] })}
                            />
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/tenants/${m.tenantId}`}>
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

          {!merchantsLoading && filteredMerchants.length === 0 && (
            <div className="text-center py-20">
              <Store className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("platform.noStores")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Payments tab ── */}
      {activeTab === "payments" && (
        <div className="space-y-8">
          {/* Bank transfer requests */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm font-medium">{t("platform.paymentsSection.bankTransfers")}</p>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t("status.pending")} ({(transferRequests as any[]).filter((req) => req.status === "pending").length})
              </Badge>
            </div>
            <motion.div className="space-y-3" variants={stagger.container} initial="hidden" animate="show">
              {transfersLoading
                ? Array(4).fill(0).map((_, i) => <motion.div key={i} variants={stagger.item}><Skeleton className="h-28 rounded-xl" /></motion.div>)
                : (transferRequests as any[]).length === 0
                  ? <div className="text-center py-20"><CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">{t("platform.paymentsSection.noRequests")}</p></div>
                  : (transferRequests as any[]).map((req: any) => (
                    <motion.div key={req.id} variants={stagger.item}>
                      <TransferRequestCard
                        request={req}
                        onAction={() => queryClient.invalidateQueries({ queryKey: ["platform-transfer-requests"] })}
                      />
                    </motion.div>
                  ))
              }
            </motion.div>
          </div>

          {/* Paymob reconciliation — payment_records summary */}
          <div className="border-t border-border/50 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t("platform.paymentsSection.paymobReconciliation")}</p>
              <Badge variant="secondary" className="text-[10px]">reconciliation</Badge>
            </div>
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("platform.paymentsSection.paymobReconciliationDesc")}
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: t("platform.paymentsSection.paymobCompleted"), color: "text-green-600", key: "captured" },
                    { label: t("platform.paymentsSection.paymobPending"), color: "text-yellow-600", key: "pending" },
                    { label: t("platform.paymentsSection.paymobFailed"), color: "text-red-500", key: "failed" },
                  ].map((s) => (
                    <div key={s.key} className="rounded-lg bg-muted/50 p-3">
                      <p className={`text-lg font-bold ${s.color}`}>—</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("platform.paymentsSection.queryLabel")} <code className="bg-muted px-1 rounded">SELECT * FROM payment_records ORDER BY created_at DESC</code>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tenants tab ── */}
      {activeTab === "tenants" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("platform.searchTenants")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 h-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">{filteredTenants.length} {t("platform.storesCount")}</p>
          </div>

          <motion.div className="space-y-2" variants={stagger.container} initial="hidden" animate="show">
            {tenantsLoading
              ? Array(6).fill(0).map((_, i) => (
                <motion.div key={i} variants={stagger.item}>
                  <Skeleton className="h-16 w-full rounded-xl" />
                </motion.div>
              ))
              : filteredTenants.map((tenant) => {
                const sub = SUB_STATUS[tenant.subscriptionStatus ?? "trial"] ?? SUB_STATUS.trial;
                return (
                  <motion.div key={tenant.id} variants={stagger.item}>
                    <Card className="border-border/50 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {tenant.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground truncate">{tenant.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                                  {tenant.slug}
                                </Badge>
                                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${sub.color}`}>
                                  {t(sub.labelKey)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>{t("platform.tenantsSection.planLabel")} {t(`plans.${tenant.planCode ?? "starter"}`, { defaultValue: tenant.planCode })}</span>
                                <span>·</span>
                                <span>{new Date(tenant.createdAt as unknown as string).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US")}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" asChild className="shrink-0">
                            <Link href={`/tenants/${tenant.id}`}>
                              <ChevronLeft className="w-5 h-5" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </motion.div>

          {!tenantsLoading && filteredTenants.length === 0 && (
            <div className="text-center py-20">
              <Store className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("platform.noTenants")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Health scores tab ── */}
      {activeTab === "health" && (
        <motion.div className="space-y-3" variants={stagger.container} initial="hidden" animate="show">
          {healthLoading
            ? Array(4).fill(0).map((_, i) => (
              <motion.div key={i} variants={stagger.item}>
                <Skeleton className="h-20 w-full rounded-xl" />
              </motion.div>
            ))
            : (healthScores as any[]).map((item: any) => {
              const score: number = item.score ?? 0;
              const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-400" : "bg-red-400";
              return (
                <motion.div key={item.tenantId} variants={stagger.item}>
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(item.tenantName ?? "؟")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-sm truncate">{item.tenantName}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${color}`}>{score}/100</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
                          </div>
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            {(item.signals ?? item.flags ?? []).map((flag: string) => (
                              <span key={flag} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{flag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          {!healthLoading && (healthScores as any[]).length === 0 && (
            <div className="text-center py-20">
              <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("platform.noHealth")}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
