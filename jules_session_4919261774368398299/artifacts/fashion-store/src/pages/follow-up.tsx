import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Bell, Clock, PhoneCall, AlertTriangle, RotateCcw, Package, ChevronLeft, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

const REASON_ICONS: Record<string, React.ElementType> = {
  no_contact_attempt: PhoneCall,
  awaiting_confirmation: Clock,
  failed_contact: AlertTriangle,
  delayed_dispatch: Package,
  return_needs_note: RotateCcw,
  cancellation_needs_review: AlertTriangle,
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: t("text_c8422f60", "عاجل"),   color: "text-red-700",    bg: "bg-red-100 border-red-200" },
  medium: { label: t("text_14184253", "متوسط"),  color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  low:    { label: t("text_96a1c4d7", "منخفض"),  color: "text-blue-700",   bg: "bg-blue-100 border-blue-200" },
};

interface QueueItem {
  orderId: number;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
  reason: string;
  reasonCode: string;
  priority: "high" | "medium" | "low";
}

interface FollowUpQueue {
  total: number;
  items: QueueItem[];
}

function useQueue() {
  return useQuery<FollowUpQueue>({
    queryKey: ["follow-up-queue"],
    queryFn: async () => {
      const r = await fetch(api("/follow-up/queue"), { credentials: "include" });
      if (!r.ok) throw new Error(t("text_4e4b09d0", "فشل جلب قائمة المتابعة"));
      return r.json();
    },
    refetchInterval: 60_000,
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 60) return `منذ ${diff} دقيقة`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

export default function FollowUp() {
    const { t } = useTranslation();
  const { merchant } = useAuth();
  const { data, isLoading, refetch } = useQueue();

  const high = data?.items.filter((i) => i.priority === "high") ?? [];
  const medium = data?.items.filter((i) => i.priority === "medium") ?? [];
  const low = data?.items.filter((i) => i.priority === "low") ?? [];

  if (!merchant?.tenantId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">{t("text_5fe531e2", t("text_5fe531e2", "يجب تسجيل الدخول لعرض قائمة المتابعة"))}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="border-b bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="w-6 h-6 text-primary" />
                {t("text_9b43353b", t("text_9b43353b", "قائمة المتابعة"))}
                                              {(data?.total ?? 0) > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {data!.total > 9 ? "9+" : data!.total}
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{t("text_2a41781d", t("text_2a41781d", "الطلبات التي تحتاج إجراءً فورياً"))}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => refetch()}>
              <RefreshCcw className="w-3.5 h-3.5" />{t("text_061401dc", t("text_061401dc", "تحديث"))}
                                      </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary */}
        {!isLoading && data && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("text_c8422f60", "عاجل"), count: high.length, color: "text-red-600 bg-red-50 border-red-200" },
              { label: t("text_14184253", "متوسط"), count: medium.length, color: "text-orange-600 bg-orange-50 border-orange-200" },
              { label: t("text_96a1c4d7", "منخفض"), count: low.length, color: "text-blue-600 bg-blue-50 border-blue-200" },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Queue Items */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : (data?.total ?? 0) === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">{t("text_85b209a0", t("text_85b209a0", "قائمة المتابعة فارغة"))}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("text_031a7683", t("text_031a7683", "لا توجد طلبات تحتاج إجراء في الوقت الحالي"))}</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-3">
            {data!.items.map((item) => {
              const Icon = REASON_ICONS[item.reasonCode] ?? Bell;
              const priority = PRIORITY_CONFIG[item.priority];
              return (
                <motion.div key={item.orderId} variants={stagger.item}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${priority.bg}`}>
                          <Icon className={`w-4 h-4 ${priority.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{t("text_87e1ced7", t("text_87e1ced7", "طلب #"))}{item.orderId}</span>
                            {item.customerName && (
                              <span className="text-xs text-muted-foreground">— {item.customerName}</span>
                            )}
                            <Badge className={`text-[10px] px-2 py-0 border ${priority.bg} ${priority.color} ms-auto`}>
                              {priority.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.reason}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {item.customerPhone && (
                              <a href={`tel:${item.customerPhone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <PhoneCall className="w-3 h-3" />{item.customerPhone}
                              </a>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatTime(item.createdAt)}
                            </span>
                            <span className="text-xs font-medium">{item.totalAmount.toLocaleString("ar-EG")} {t("text_3c111129", t("text_3c111129", "ج.م"))}</span>
                          </div>
                        </div>
                        <Link href={`/orders/${item.orderId}`}>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg shrink-0 gap-1">
                            {t("text_6e63a5f0", t("text_6e63a5f0", "عرض"))} <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
