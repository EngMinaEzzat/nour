import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Package, Settings2, MessageCircle, Loader2,
  XCircle, TrendingDown, ShoppingBag, Pencil, ExternalLink, Bell,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${BASE}/api${p}`;

type LowStockProduct = {
  id: number;
  name: string;
  imageUrl: string | null;
  stock: number;
  status: string;
  lowStockThreshold: number | null;
  effectiveThreshold: number;
  price: number;
};

type AlertsData = {
  globalThreshold: number;
  stats: { totalProducts: number; outOfStock: number; critical: number; lowStockCount: number };
  lowStock: LowStockProduct[];
};

function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
    const { t } = useTranslation();
  const pct = threshold === 0 ? 0 : Math.min(100, (stock / Math.max(threshold * 2, 1)) * 100);
  const color = stock === 0 ? "bg-destructive" : stock <= 3 ? "bg-orange-500" : "bg-amber-400";
  return (
    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
    const { t } = useTranslation();
  if (stock === 0) return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="w-3 h-3" />{t("text_423e16bb", t("text_423e16bb", "نفذ"))}</Badge>;
  if (stock <= 3) return <Badge className="text-xs gap-1 bg-orange-500 hover:bg-orange-600"><AlertTriangle className="w-3 h-3" />{t("text_ae1ce8d5", t("text_ae1ce8d5", "حرج"))}</Badge>;
  return <Badge className="text-xs gap-1 bg-amber-500 hover:bg-amber-600"><TrendingDown className="w-3 h-3" />{t("text_96a1c4d7", t("text_96a1c4d7", "منخفض"))}</Badge>;
}

export default function InventoryAlerts() {
    const { t } = useTranslation();
  const qc = useQueryClient();
  const [globalInput, setGlobalInput] = useState("");
  const [editingProduct, setEditingProduct] = useState<LowStockProduct | null>(null);
  const [productThresholdInput, setProductThresholdInput] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);

  const { data, isLoading } = useQuery<AlertsData>({
    queryKey: ["inventory-alerts"],
    queryFn: (): Promise<AlertsData> =>
      fetch(api("/inventory-alerts"), { credentials: "include" }).then((r) => r.json()),
  });

  useEffect(() => {
    if (data?.globalThreshold !== undefined && globalInput === "") {
      setGlobalInput(String(data.globalThreshold));
    }
  }, [data?.globalThreshold]);

  const updateGlobal = useMutation({
    mutationFn: (threshold: number) =>
      fetch(api("/inventory-alerts/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ globalThreshold: threshold }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-alerts"] }),
  });

  const updateProductThreshold = useMutation({
    mutationFn: ({ id, threshold }: { id: number; threshold: number | null }) =>
      fetch(api(`/inventory-alerts/product/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ threshold }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory-alerts"] }); setEditingProduct(null); },
  });

  const notifyMutation = useMutation({
    mutationFn: (phone: string) =>
      fetch(api("/inventory-alerts/notify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d as { waUrl: string; count: number }; }),
    onSuccess: (d) => { window.open(d.waUrl, "_blank"); setNotifyOpen(false); },
  });

  const stats = data?.stats;
  const lowStock = data?.lowStock ?? [];
  const globalThreshold = data?.globalThreshold ?? 5;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Bell className="w-9 h-9 text-amber-500" />
              {t("text_750b3c99", t("text_750b3c99", "تنبيهات المخزون"))}
                                      </h1>
            <p className="text-muted-foreground mt-1">{t("text_66980513", t("text_66980513", "راقب المنتجات منخفضة المخزون وأرسل تذكيراً لنفسك"))}</p>
          </div>
          <Button
            className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setNotifyOpen(true)}
            disabled={lowStock.length === 0}
          >
            <MessageCircle className="w-4 h-4" />
            {t("text_06dbcbdb", t("text_06dbcbdb", "إرسال ملخص واتساب"))}
                                </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: t("text_ff4314fa", "نفذ المخزون"), value: stats?.outOfStock ?? 0, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: t("text_cc859970", "حرج (1–3 قطع)"), value: stats?.critical ?? 0, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100" },
            { label: t("text_d186be44", "منخفض المخزون"), value: stats?.lowStockCount ?? 0, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-100" },
            { label: t("text_99fe7f2d", "إجمالي المنتجات"), value: stats?.totalProducts ?? 0, icon: Package, color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.value > 0 && s.label !== t("text_99fe7f2d", "إجمالي المنتجات") ? s.color : ""}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Global threshold setting */}
        <Card className="border-border/50 mb-8">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4 flex-wrap">
              <Settings2 className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t("text_00262df3", t("text_00262df3", "الحد الافتراضي للتنبيه"))}</p>
                <p className="text-xs text-muted-foreground">{t("text_7246c4cc", t("text_7246c4cc", "سيتم تنبيهك عندما يصل مخزون أي منتج إلى هذا الرقم أو أقل"))}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={globalInput !== "" ? globalInput : String(globalThreshold)}
                  onChange={(e) => setGlobalInput(e.target.value)}
                  className="w-20 text-center h-9 text-sm"
                  dir="ltr"
                />
                <span className="text-sm text-muted-foreground">{t("text_5d16c3f6", t("text_5d16c3f6", "قطعة"))}</span>
                <Button
                  size="sm"
                  className="rounded-xl h-9"
                  disabled={updateGlobal.isPending || globalInput === String(globalThreshold)}
                  onClick={() => updateGlobal.mutate(parseInt(globalInput, 10))}
                >
                  {updateGlobal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t("text_871a087a", t("text_871a087a", "حفظ"))}
                                                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low stock list */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : lowStock.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-3xl border border-dashed border-border text-muted-foreground">
            <ShoppingBag className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold mb-1">{t("text_fd39b5f1", t("text_fd39b5f1", "مخزونك ممتاز!"))}</p>
            <p className="text-sm">{t("text_7afaa46c", t("text_7afaa46c", "جميع منتجاتك فوق الحد الأدنى المحدد ("))}{globalThreshold} {t("text_68286658", t("text_68286658", "قطع)"))}</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t("text_cda91010", t("text_cda91010", "المنتجات التي تحتاج إعادة تخزين"))}
                                                <span className="text-sm text-muted-foreground font-normal">({lowStock.length} {t("text_d33d8ad5", t("text_d33d8ad5", "منتج)"))}</span>
            </h2>

            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/50">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("text_726cc064", t("text_726cc064", "المنتج"))}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("text_a089edeb", t("text_a089edeb", "المخزون"))}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("text_838259ac", t("text_838259ac", "المستوى"))}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("text_642c01c2", t("text_642c01c2", "الحد"))}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("text_1253eb56", t("text_1253eb56", "الحالة"))}</th>
                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("text_155e7129", t("text_155e7129", "إجراء"))}</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {lowStock.map((product, i) => (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border/50" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium line-clamp-1">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-lg font-bold ${product.stock === 0 ? "text-destructive" : product.stock <= 3 ? "text-orange-600" : "text-amber-600"}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <StockBar stock={product.stock} threshold={product.effectiveThreshold} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                          {product.lowStockThreshold !== null
                            ? <span className="font-medium text-foreground">{product.lowStockThreshold}</span>
                            : <span className="opacity-60">{globalThreshold} {t("text_582286a7", t("text_582286a7", "(افتراضي)"))}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <StockBadge stock={product.stock} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-xl text-xs gap-1.5"
                            onClick={() => { setEditingProduct(product); setProductThresholdInput(String(product.lowStockThreshold ?? globalThreshold)); }}
                          >
                            <Pencil className="w-3 h-3" />
                            {t("text_2e480635", t("text_2e480635", "تعديل الحد"))}
                                                              </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit product threshold dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("text_29ad72e3", t("text_29ad72e3", "تعديل حد التنبيه"))}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t("text_f9c5c965", t("text_f9c5c965", "منتج:"))} <span className="font-semibold text-foreground">{editingProduct.name}</span>
              </p>
              <div className="space-y-1.5">
                <Label>{t("text_c29773c7", t("text_c29773c7", "الحد الأدنى للمخزون"))}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={productThresholdInput}
                    onChange={(e) => setProductThresholdInput(e.target.value)}
                    className="w-24 text-center"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">{t("text_5d16c3f6", t("text_5d16c3f6", "قطعة"))}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("text_7a444812", t("text_7a444812", "الحد الافتراضي للمتجر:"))} {globalThreshold} {t("text_a7217593", t("text_a7217593", "قطع."))}{" "}
                  <button
                    className="text-primary underline"
                    onClick={() => setProductThresholdInput("")}
                  >
                    {t("text_05ee4e78", t("text_05ee4e78", "حذف التخصيص"))}
                                                        </button>
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditingProduct(null)}>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</Button>
            <Button
              className="rounded-xl"
              disabled={updateProductThreshold.isPending}
              onClick={() =>
                updateProductThreshold.mutate({
                  id: editingProduct!.id,
                  threshold: productThresholdInput.trim() === "" ? null : parseInt(productThresholdInput, 10),
                })
              }
            >
              {updateProductThreshold.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : null}
              {t("text_871a087a", t("text_871a087a", "حفظ"))}
                                      </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp notify dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              {t("text_06dbcbdb", t("text_06dbcbdb", "إرسال ملخص واتساب"))}
                                      </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("text_e554fa09", t("text_e554fa09", "سيتم إرسال قائمة بـ"))} {lowStock.length} {t("text_c1054e4d", t("text_c1054e4d", "منتج منخفض المخزون إلى رقم واتساب"))}
                                      </p>
            <div className="space-y-1.5">
              <Label>{t("text_8eb3925d", t("text_8eb3925d", "رقم واتساب"))}</Label>
              <Input
                type="tel"
                placeholder="01012345678"
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
                dir="ltr"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t("text_4cb2d3da", t("text_4cb2d3da", "أدخلي رقمك لإرسال تذكير لنفسك، أو رقم المورد"))}</p>
            </div>
            {notifyMutation.error && (
              <p className="text-xs text-destructive">{(notifyMutation.error as Error).message}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setNotifyOpen(false)}>{t("text_b9568e86", t("text_b9568e86", "إلغاء"))}</Button>
            <Button
              className="rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={!notifyPhone.trim() || notifyMutation.isPending}
              onClick={() => notifyMutation.mutate(notifyPhone.trim())}
            >
              {notifyMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><MessageCircle className="w-3.5 h-3.5" /><ExternalLink className="w-3 h-3 opacity-70" /></>
              }
              {t("text_8e3d9aa6", t("text_8e3d9aa6", "فتح واتساب"))}
                                      </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
