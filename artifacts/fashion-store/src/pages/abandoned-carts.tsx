import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, Phone, Mail, User, Clock, Trash2, MessageCircle,
  Loader2, TrendingDown, DollarSign, AlertCircle, ExternalLink, Package,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

type CartSession = {
  id: number;
  sessionId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  items: Array<{ productId: number; name: string; price: number; quantity: number; imageUrl?: string }>;
  totalAmount: number;
  itemCount: number;
  status: "active" | "abandoned";
  lastActivityAt: string;
  createdAt: string;
};

type Stats = {
  totalAbandoned: number;
  totalActive: number;
  totalValue: number;
  withPhone: number;
};

function timeAgo(iso: string, t: any): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return t("abandonedCarts.timeAgo.minutes", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("abandonedCarts.timeAgo.hours", { hours });
  return t("abandonedCarts.timeAgo.days", { days: Math.floor(hours / 24) });
}

export default function AbandonedCarts() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"abandoned" | "active">("abandoned");
  const [remindingId, setRemindingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ carts: CartSession[]; stats: Stats }>({
    queryKey: ["abandoned-carts", tab],
    queryFn: () =>
      fetch(api(`/abandoned-carts?status=${tab}`), { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const remindMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(api(`/abandoned-carts/${id}/remind`), { method: "POST", credentials: "include" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? t("abandonedCarts.toast.remindError"));
          return d as { waUrl: string; message: string };
        }),
    onSuccess: (data) => {
      window.open(data.waUrl, "_blank");
      setRemindingId(null);
    },
    onError: (err) => {
      alert((err as Error).message);
      setRemindingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(api(`/abandoned-carts/${id}`), { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["abandoned-carts"] }),
  });

  const carts = data?.carts ?? [];
  const stats = data?.stats;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-5xl" dir={i18n.dir()}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">{t("abandonedCarts.page.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("abandonedCarts.page.subtitle")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: t("abandonedCarts.stats.abandoned"), value: stats?.totalAbandoned ?? 0, icon: TrendingDown, color: "text-destructive" },
            { label: t("abandonedCarts.stats.lostValue", { currency: i18n.language === "ar" ? "ج.م" : "EGP" }), value: (stats?.totalValue ?? 0).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US"), icon: DollarSign, color: "text-amber-600" },
            { label: t("abandonedCarts.stats.withPhone"), value: stats?.withPhone ?? 0, icon: MessageCircle, color: "text-green-600" },
            { label: t("abandonedCarts.stats.active"), value: stats?.totalActive ?? 0, icon: ShoppingCart, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-muted/60 ${s.color}`}><s.icon className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <p className="text-xl font-bold truncate">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
          <TabsList className="rounded-2xl" dir={i18n.dir()}>
            <TabsTrigger value="abandoned" className="rounded-xl gap-1.5">
              {t("abandonedCarts.tabs.abandoned")}
              {(stats?.totalAbandoned ?? 0) > 0 && (
                <span className="bg-destructive text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {stats?.totalAbandoned}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl">{t("abandonedCarts.tabs.active")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : carts.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-border">
            <ShoppingCart className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold mb-1">
              {tab === "abandoned" ? t("abandonedCarts.empty.abandonedTitle") : t("abandonedCarts.empty.activeTitle")}
            </p>
            <p className="text-sm">
              {tab === "abandoned"
                ? t("abandonedCarts.empty.abandonedDesc")
                : t("abandonedCarts.empty.activeDesc")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {carts.map((cart) => {
                const hasContact = !!(cart.customerPhone || cart.customerEmail);
                const itemsList = Array.isArray(cart.items) ? cart.items : [];
                return (
                  <motion.div
                    key={cart.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={`border-border/50 ${cart.status === "abandoned" ? "border-s-4 border-s-destructive/40" : "border-s-4 border-s-primary/40"}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Customer info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              {/* Identity */}
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${hasContact ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                  {cart.customerName ? cart.customerName[0] : <User className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">
                                    {cart.customerName ?? <span className="text-muted-foreground italic">{t("abandonedCarts.customer.anonymous")}</span>}
                                  </p>
                                  {cart.customerEmail && (
                                    <p className="text-[11px] text-muted-foreground dir-ltr">{cart.customerEmail}</p>
                                  )}
                                </div>
                              </div>

                              {/* Status + time */}
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${cart.status === "abandoned" ? "border-destructive/40 text-destructive" : "border-primary/40 text-primary"}`}
                              >
                                {cart.status === "abandoned" ? t("abandonedCarts.cart.abandoned") : t("abandonedCarts.cart.active")}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(cart.lastActivityAt, t)}
                              </span>
                            </div>

                            {/* Items preview */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {itemsList.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-5 h-5 rounded object-cover" />
                                  ) : (
                                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-foreground line-clamp-1 max-w-[100px]">{item.name}</span>
                                  <span className="text-[10px] text-muted-foreground">×{item.quantity}</span>
                                </div>
                              ))}
                              {itemsList.length > 3 && (
                                <span className="text-xs text-muted-foreground">{t("abandonedCarts.cart.itemsMore", { count: itemsList.length - 3 })}</span>
                              )}
                              {itemsList.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">{t("abandonedCarts.cart.emptyCart")}</span>
                              )}
                            </div>

                            {/* Contact details */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              {cart.customerPhone && (
                                <span className="flex items-center gap-1 dir-ltr">
                                  <Phone className="w-3 h-3" />{cart.customerPhone}
                                </span>
                              )}
                              {!cart.customerPhone && !cart.customerEmail && (
                                <span className="flex items-center gap-1 text-muted-foreground/60 italic">
                                  <AlertCircle className="w-3 h-3" /> {t("abandonedCarts.customer.noContact")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Value + actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <p className="text-lg font-bold text-foreground">
                              {cart.totalAmount.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{t("abandonedCarts.cart.productCount", { count: cart.itemCount })}</p>

                            <div className="flex items-center gap-1.5 mt-1">
                              {cart.customerPhone ? (
                                <Button
                                  size="sm"
                                  className="rounded-xl gap-1.5 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                  onClick={() => {
                                    setRemindingId(cart.id);
                                    remindMutation.mutate(cart.id);
                                  }}
                                  disabled={remindMutation.isPending && remindingId === cart.id}
                                >
                                  {remindMutation.isPending && remindingId === cart.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <MessageCircle className="w-3.5 h-3.5" />}
                                  {t("abandonedCarts.cart.btnWhatsapp")}
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" disabled>
                                  <MessageCircle className="w-3.5 h-3.5 me-1 opacity-40" />
                                  {t("abandonedCarts.cart.btnNoPhone")}
                                </Button>
                              )}

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate(cart.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}

        {tab === "abandoned" && (stats?.totalAbandoned ?? 0) > 0 && (stats?.withPhone ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-800 flex items-start gap-3"
          >
            <MessageCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
            <div>
              <p className="font-semibold">
                {t("abandonedCarts.whatsappTip.title", { count: stats?.withPhone })}
              </p>
              <p className="text-green-700/80 mt-0.5">
                {t("abandonedCarts.whatsappTip.desc")}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
