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
  const pct = threshold === 0 ? 0 : Math.min(100, (stock / Math.max(threshold * 2, 1)) * 100);
  const color = stock === 0 ? "bg-destructive" : stock <= 3 ? "bg-orange-500" : "bg-amber-400";
  return (
    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="w-3 h-3" />نفذ</Badge>;
  if (stock <= 3) return <Badge className="text-xs gap-1 bg-orange-500 hover:bg-orange-600"><AlertTriangle className="w-3 h-3" />حرج</Badge>;
  return <Badge className="text-xs gap-1 bg-amber-500 hover:bg-amber-600"><TrendingDown className="w-3 h-3" />منخفض</Badge>;
}

export default function InventoryAlerts() {
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
              تنبيهات المخزون
            </h1>
            <p className="text-muted-foreground mt-1">راقب المنتجات منخفضة المخزون وأرسل تذكيراً لنفسك</p>
          </div>
          <Button
            className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setNotifyOpen(true)}
            disabled={lowStock.length === 0}
          >
            <MessageCircle className="w-4 h-4" />
            إرسال ملخص واتساب
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "نفذ المخزون", value: stats?.outOfStock ?? 0, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "حرج (1–3 قطع)", value: stats?.critical ?? 0, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100" },
            { label: "منخفض المخزون", value: stats?.lowStockCount ?? 0, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "إجمالي المنتجات", value: stats?.totalProducts ?? 0, icon: Package, color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.value > 0 && s.label !== "إجمالي المنتجات" ? s.color : ""}`}>{s.value}</p>
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
                <p className="font-semibold text-sm">الحد الافتراضي للتنبيه</p>
                <p className="text-xs text-muted-foreground">سيتم تنبيهك عندما يصل مخزون أي منتج إلى هذا الرقم أو أقل</p>
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
                <span className="text-sm text-muted-foreground">قطعة</span>
                <Button
                  size="sm"
                  className="rounded-xl h-9"
                  disabled={updateGlobal.isPending || globalInput === String(globalThreshold)}
                  onClick={() => updateGlobal.mutate(parseInt(globalInput, 10))}
                >
                  {updateGlobal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  حفظ
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
            <p className="text-xl font-semibold mb-1">مخزونك ممتاز!</p>
            <p className="text-sm">جميع منتجاتك فوق الحد الأدنى المحدد ({globalThreshold} قطع)</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              المنتجات التي تحتاج إعادة تخزين
              <span className="text-sm text-muted-foreground font-normal">({lowStock.length} منتج)</span>
            </h2>

            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/50">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">المنتج</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">المخزون</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">المستوى</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">الحد</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">إجراء</th>
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
                              <img src={product.imageUrl.startsWith("/") ? `${BASE}${product.imageUrl}` : product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border/50" />
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
                            : <span className="opacity-60">{globalThreshold} (افتراضي)</span>
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
                            تعديل الحد
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
            <DialogTitle>تعديل حد التنبيه</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                منتج: <span className="font-semibold text-foreground">{editingProduct.name}</span>
              </p>
              <div className="space-y-1.5">
                <Label>الحد الأدنى للمخزون</Label>
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
                  <span className="text-sm text-muted-foreground">قطعة</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  الحد الافتراضي للمتجر: {globalThreshold} قطع.{" "}
                  <button
                    className="text-primary underline"
                    onClick={() => setProductThresholdInput("")}
                  >
                    حذف التخصيص
                  </button>
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditingProduct(null)}>إلغاء</Button>
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
              حفظ
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
              إرسال ملخص واتساب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              سيتم إرسال قائمة بـ {lowStock.length} منتج منخفض المخزون إلى رقم واتساب
            </p>
            <div className="space-y-1.5">
              <Label>رقم واتساب</Label>
              <Input
                type="tel"
                placeholder="01012345678"
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
                dir="ltr"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">أدخلي رقمك لإرسال تذكير لنفسك، أو رقم المورد</p>
            </div>
            {notifyMutation.error && (
              <p className="text-xs text-destructive">{(notifyMutation.error as Error).message}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setNotifyOpen(false)}>إلغاء</Button>
            <Button
              className="rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={!notifyPhone.trim() || notifyMutation.isPending}
              onClick={() => notifyMutation.mutate(notifyPhone.trim())}
            >
              {notifyMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><MessageCircle className="w-3.5 h-3.5" /><ExternalLink className="w-3 h-3 opacity-70" /></>
              }
              فتح واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
