import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Check, X, Trash2, Loader2, MessageSquare, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

type Review = {
  id: number;
  productId: number;
  productName: string | null;
  customerName: string;
  customerEmail: string;
  rating: number;
  body: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
    const { t } = useTranslation();
  const cls = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: t("text_e9210fb9", "بانتظار المراجعة"),
  approved: t("text_2088d925", "تمت الموافقة"),
  rejected: t("text_20a971a3", "مرفوض"),
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function Reviews() {
    const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["reviews", tab],
    queryFn: () => {
      const qs = tab !== "all" ? `?status=${tab}` : "";
      return fetch(api(`/reviews${qs}`), { credentials: "include" }).then((r) => r.json());
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(api(`/reviews/${id}/status`), { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(api(`/reviews/${id}`), { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews"] }); setDeleteTarget(null); },
  });

  const pending = reviews.filter((r) => r.status === "pending").length;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-bold text-foreground">{t("text_4487be69", t("text_4487be69", "تقييمات المنتجات"))}</h1>
            {pending > 0 && (
              <Badge className="bg-amber-500 text-white text-sm px-2.5">{pending} {t("text_c590a35c", t("text_c590a35c", "جديد"))}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{t("text_6a35ab3e", t("text_6a35ab3e", "راجع وأدّر تقييمات العملاء لمنتجاتك"))}</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="pending" className="rounded-xl gap-1.5">
              {t("text_e9210fb9", t("text_e9210fb9", "بانتظار المراجعة"))}
                                        {pending > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{pending}</span>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-xl">{t("text_2088d925", t("text_2088d925", "تمت الموافقة"))}</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-xl">{t("text_2937b8a9", t("text_2937b8a9", "مرفوضة"))}</TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl">{t("text_6d08f196", t("text_6d08f196", "الكل"))}</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <MessageSquare className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold mb-1">{t("text_74394c6a", t("text_74394c6a", "لا توجد تقييمات"))}</p>
            <p className="text-sm">
              {tab === "pending" ? t("text_db9c042d", "لا تقييمات بانتظار المراجعة") : tab === "approved" ? t("text_99113263", "لا تقييمات موافق عليها") : tab === "rejected" ? t("text_c81bcfc4", "لا تقييمات مرفوضة") : t("text_86c0e052", "لم يترك العملاء أي تقييم بعد")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {review.customerName[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{review.customerName}</span>
                            <StarRow rating={review.rating} />
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[review.status]}`}>
                              {STATUS_LABELS[review.status]}
                            </span>
                            <span className="text-xs text-muted-foreground ms-auto">
                              {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                            </span>
                          </div>

                          {review.productName && (
                            <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
                              <Package className="w-3 h-3" />
                              {review.productName}
                            </div>
                          )}

                          {review.body && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/70 mt-1.5 dir-ltr">{review.customerEmail}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {review.status !== "approved" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:text-green-600 hover:bg-green-50"
                              title={t("text_bd78c08e", "موافقة")}
                              onClick={() => statusMutation.mutate({ id: review.id, status: "approved" })}
                              disabled={statusMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {review.status !== "rejected" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:text-amber-600 hover:bg-amber-50"
                              title={t("text_b7dee974", "رفض")}
                              onClick={() => statusMutation.mutate({ id: review.id, status: "rejected" })}
                              disabled={statusMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            title={t("text_3b9854e1", "حذف")}
                            onClick={() => setDeleteTarget(review)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("text_4fc2295f", t("text_4fc2295f", "حذف التقييم"))}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("text_05146ec6", t("text_05146ec6", "هل تريد حذف تقييم"))} <span className="font-semibold">{deleteTarget?.customerName}</span>{t("text_9ec41b10", t("text_9ec41b10", "؟ لا يمكن التراجع."))}
                                      </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t("text_3b9854e1", t("text_3b9854e1", "حذف"))}
                                      </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
