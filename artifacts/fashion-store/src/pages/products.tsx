import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useListCategories, useListProductVariants, useCreateProductVariant,
  useUpdateProductVariant, useDeleteProductVariant,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package, Plus, Pencil, Trash2, Search, Star, Eye, EyeOff,
  AlertCircle, Layers, X, Check, Palette, AlertTriangle, Sparkles, Loader2,
} from "lucide-react";
import { ImageUpload } from "@/components/image-upload";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "فري سايز", "مقاس واحد"];
const PRESET_COLORS = [
  { name: "أسود", hex: "#1a1a1a" },
  { name: "أبيض", hex: "#ffffff" },
  { name: "أحمر", hex: "#ef4444" },
  { name: "وردي", hex: "#ec4899" },
  { name: "بنفسجي", hex: "#8b5cf6" },
  { name: "أزرق", hex: "#3b82f6" },
  { name: "أخضر", hex: "#22c55e" },
  { name: "بيج", hex: "#d4a574" },
  { name: "كحلي", hex: "#1e3a5f" },
  { name: "رمادي", hex: "#6b7280" },
  { name: "ذهبي", hex: "#f59e0b" },
  { name: "بني", hex: "#92400e" },
];

const STATUS_MAP = {
  active: { label: "نشط", color: "bg-green-100 text-green-700 border-green-200" },
  out_of_stock: { label: "نفذ", color: "bg-red-100 text-red-700 border-red-200" },
  hidden: { label: "مخفي", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

type ProductForm = {
  name: string; description: string; price: string; originalPrice: string;
  imageUrl: string; stock: string; featured: boolean;
  status: "active" | "out_of_stock" | "hidden"; categoryId: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", description: "", price: "", originalPrice: "",
  imageUrl: "", stock: "0", featured: false, status: "active", categoryId: "",
};

type VariantRow = { id?: number; size: string; color: string; colorHex: string; stock: string; isNew?: boolean };

/* ─── Variant Manager sub-component ─── */
function VariantManager({ productId }: { productId: number }) {
  const { data: variants, refetch } = useListProductVariants(productId);
  const createVariant = useCreateProductVariant();
  const updateVariant = useUpdateProductVariant();
  const deleteVariant = useDeleteProductVariant();

  const [rows, setRows] = useState<VariantRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && variants) {
    setRows(variants.map((v) => ({
      id: v.id,
      size: v.size ?? "",
      color: v.color ?? "",
      colorHex: v.colorHex ?? "#000000",
      stock: String(v.stock),
    })));
    setInitialized(true);
  }

  function addRow() {
    setRows((r) => [...r, { size: "", color: "", colorHex: "#000000", stock: "0", isNew: true }]);
  }

  function updateRow(i: number, field: keyof VariantRow, value: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function setPresetColor(i: number, name: string, hex: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, color: name, colorHex: hex } : row));
  }

  async function saveRow(i: number) {
    const row = rows[i];
    if (!row) return;
    const payload = {
      size: row.size || null,
      color: row.color || null,
      colorHex: row.colorHex || null,
      stock: parseInt(row.stock, 10) || 0,
    };
    if (row.id) {
      await updateVariant.mutateAsync({ id: productId, variantId: row.id, data: payload });
    } else {
      await createVariant.mutateAsync({ id: productId, data: payload });
    }
    refetch();
    setInitialized(false);
  }

  async function removeRow(i: number) {
    const row = rows[i];
    if (!row) return;
    if (row.id) {
      await deleteVariant.mutateAsync({ id: productId, variantId: row.id });
      refetch();
      setInitialized(false);
    } else {
      setRows((r) => r.filter((_, idx) => idx !== i));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="w-3.5 h-3.5 text-primary" /> المقاسات والألوان
        </Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addRow}>
          <Plus className="w-3 h-3" /> إضافة متغيّر
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-xl">
          لا يوجد متغيرات — اضغط "إضافة متغيّر" لإضافة مقاس أو لون
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end bg-muted/30 rounded-xl p-2.5 border border-border/50"
          >
            {/* Size */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">المقاس</Label>
              <Select value={row.size} onValueChange={(v) => updateRow(i, "size", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— بدون —</SelectItem>
                  {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">اللون</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input
                    value={row.color}
                    onChange={(e) => updateRow(i, "color", e.target.value)}
                    placeholder="اسم اللون"
                    className="h-8 text-xs ps-7"
                  />
                  <div
                    className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-border/50 cursor-pointer"
                    style={{ backgroundColor: row.colorHex || "#000" }}
                  />
                </div>
                <div className="relative">
                  <Select onValueChange={(v) => {
                    const preset = PRESET_COLORS.find((c) => c.name === v);
                    if (preset) setPresetColor(i, preset.name, preset.hex);
                  }}>
                    <SelectTrigger className="h-8 w-8 p-0 border-border/50">
                      <Palette className="w-3 h-3 mx-auto text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_COLORS.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stock */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">الكمية</Label>
              <Input
                type="number"
                min="0"
                value={row.stock}
                onChange={(e) => updateRow(i, "stock", e.target.value)}
                className="h-8 text-xs w-16"
              />
            </div>

            {/* Save */}
            <Button
              type="button"
              size="icon"
              className="h-8 w-8 mt-5 bg-primary/10 hover:bg-primary/20 text-primary"
              onClick={() => saveRow(i)}
              title="حفظ"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>

            {/* Delete */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 mt-5 text-destructive hover:bg-destructive/10"
              onClick={() => removeRow(i)}
              title="حذف"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Products Page ─── */
export default function Products() {
  const { merchant } = useAuth();
  const tenantId = merchant?.tenantId;

  const { data: products, isLoading, refetch } = useListProducts(
    tenantId ? { tenantId } : undefined
  );
  const { data: categories } = useListCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [variantsProductId, setVariantsProductId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Pricing advisor state
  type PricingProduct = { id: number; name: string; price: number; originalPrice?: number | null; stock: number; orderCount: number; description: string; categoryName?: string | null };
  const [pricingProduct, setPricingProduct] = useState<PricingProduct | null>(null);
  const [pricingAdvice, setPricingAdvice] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingModel, setPricingModel] = useState<"claude" | "gemini">("claude");

  async function fetchPricingAdvice(product: PricingProduct, model: "claude" | "gemini") {
    setPricingLoading(true);
    setPricingAdvice(null);
    try {
      const res = await fetch(`${BASE}/api/ai/pricing-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productName: product.name,
          category: product.categoryName,
          price: product.price,
          originalPrice: product.originalPrice,
          stock: product.stock,
          orderCount: product.orderCount,
          description: product.description,
          model,
        }),
      });
      const data = await res.json() as { advice?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "فشل التحليل");
      setPricingAdvice(data.advice ?? null);
    } catch (e: unknown) {
      setPricingAdvice(`خطأ: ${e instanceof Error ? e.message : "حدث خطأ"}`);
    } finally {
      setPricingLoading(false);
    }
  }

  function openPricingAdvisor(p: NonNullable<typeof products>[0]) {
    const product: PricingProduct = {
      id: p.id, name: p.name, price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      stock: p.stock, orderCount: p.orderCount ?? 0,
      description: p.description, categoryName: p.categoryName,
    };
    setPricingProduct(product);
    setPricingAdvice(null);
    fetchPricingAdvice(product, pricingModel);
  }

  const filtered = products?.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setVariantsProductId(null);
    setDialogOpen(true);
  }

  function openEdit(p: NonNullable<typeof products>[0]) {
    setForm({
      name: p.name, description: p.description,
      price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      imageUrl: p.imageUrl ?? "", stock: String(p.stock),
      featured: p.featured, status: p.status,
      categoryId: p.categoryId ? String(p.categoryId) : "",
    });
    setEditingId(p.id);
    setVariantsProductId(p.id);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        stock: parseInt(form.stock, 10) || 0,
        featured: form.featured,
        status: form.status,
        categoryId: form.categoryId ? parseInt(form.categoryId, 10) : undefined,
      };
      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, data: payload });
      } else {
        const created = await createProduct.mutateAsync({ data: { ...payload, tenantId } });
        setVariantsProductId(created.id);
        setEditingId(created.id);
      }
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteProduct.mutateAsync({ id: deleteId });
    setDeleteId(null);
    refetch();
  }

  const field = (key: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">المنتجات</h1>
          </div>
          <p className="text-muted-foreground text-sm">إدارة منتجات متجرك — الأسعار والمخزون والمقاسات</p>
        </div>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> منتج جديد
        </Button>
      </motion.div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10 h-10"
        />
      </div>

      {/* Stats summary */}
      {!isLoading && products && (
        <div className="flex gap-4 mb-6 text-sm text-muted-foreground flex-wrap">
          <span>{products.length} منتج إجمالي</span>
          <span className="text-green-600">{products.filter((p) => p.status === "active").length} نشط</span>
          <span className="text-red-500">{products.filter((p) => p.status === "out_of_stock").length} نفذ</span>
          <span className="text-gray-500">{products.filter((p) => p.featured).length} مميّز</span>
        </div>
      )}

      {/* Products grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-24">
          <Package className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-medium mb-2">
            {search ? "لا توجد منتجات تطابق البحث" : "لا توجد منتجات بعد"}
          </p>
          {!search && (
            <Button className="mt-4 gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> أضف أول منتج
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {filtered?.map((p) => {
            const statusInfo = STATUS_MAP[p.status];
            const discount = p.originalPrice && p.originalPrice > p.price
              ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
            return (
              <motion.div
                key={p.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <Card className="border-border/50 hover:shadow-md transition-all duration-300 overflow-hidden group">
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    <img
                      src={p.imageUrl || "/product-fashion.png"}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    <div className="absolute top-2 start-2 flex gap-1.5 flex-wrap">
                      <Badge className={`text-[10px] border px-2 py-0.5 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                      {p.featured && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 px-2 py-0.5">
                          <Star className="w-2.5 h-2.5 me-0.5 fill-amber-500 text-amber-500" /> مميّز
                        </Badge>
                      )}
                      {discount > 0 && (
                        <Badge className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5">
                          -{discount}%
                        </Badge>
                      )}
                    </div>
                    {/* Quick actions overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 shadow-lg text-xs"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="w-3 h-3" /> تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 shadow-lg text-xs bg-white/90 hover:bg-amber-50 border-amber-300 text-amber-700"
                        onClick={(e) => { e.stopPropagation(); openPricingAdvisor(p); }}
                        title="استشارة السعر بالذكاء الاصطناعي"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 shadow-lg text-xs"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm text-foreground line-clamp-1 mb-1">{p.name}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-primary font-bold">{Number(p.price).toLocaleString("ar-EG")} ج.م</span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-xs text-muted-foreground line-through ms-1.5">
                            {Number(p.originalPrice).toLocaleString("ar-EG")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.stock === 0 ? (
                          <span className="text-[10px] font-medium text-red-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> نفد
                          </span>
                        ) : p.stock <= 5 ? (
                          <span className="text-[10px] font-medium text-orange-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> {p.stock}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.stock}</span>
                        )}
                        <span className="text-xs text-muted-foreground">قطعة</span>
                      </div>
                    </div>
                    {p.categoryName && (
                      <p className="text-[10px] text-muted-foreground mt-1">{p.categoryName}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingId ? "تعديل المنتج" : "منتج جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>اسم المنتج *</Label>
                <Input value={form.name} onChange={field("name")} placeholder="فستان أنيق..." />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>الوصف *</Label>
                <Textarea value={form.description} onChange={field("description")} placeholder="وصف المنتج..." rows={3} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label>السعر (ج.م) *</Label>
                <Input type="number" value={form.price} onChange={field("price")} placeholder="299" />
              </div>
              <div className="space-y-1.5">
                <Label>السعر قبل الخصم (اختياري)</Label>
                <Input type="number" value={form.originalPrice} onChange={field("originalPrice")} placeholder="399" />
              </div>
              <div className="space-y-1.5">
                <Label>المخزون الإجمالي</Label>
                <Input type="number" value={form.stock} onChange={field("stock")} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>الفئة</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر فئة..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— بدون فئة —</SelectItem>
                    {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <ImageUpload
                  label="صورة المنتج"
                  value={form.imageUrl}
                  onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProductForm["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="out_of_stock">نفذت الكمية</SelectItem>
                    <SelectItem value="hidden">مخفي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border border-border/50 rounded-xl px-4 py-3">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" /> منتج مميّز
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">يظهر في القسم المميز</p>
                </div>
                <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
              </div>
            </div>

            {/* Save basic info first before showing variants */}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إغلاق</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.price}>
                {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التغييرات" : "إنشاء المنتج"}
              </Button>
            </DialogFooter>

            {/* Variants section — shown after product exists */}
            {variantsProductId && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t border-border/50 pt-5"
                >
                  <VariantManager productId={variantsProductId} />
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 كل متغيّر له مخزونه الخاص. اضغط ✓ بعد تعديل كل صف للحفظ.
                  </p>
                </motion.div>
              </AnimatePresence>
            )}

            {!variantsProductId && (
              <div className="border border-dashed border-border/60 rounded-xl p-4 text-center">
                <Layers className="w-5 h-5 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">احفظ المنتج أولاً لإضافة المقاسات والألوان</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm ─── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع متغيراته أيضاً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── AI Pricing Advisor Dialog ─── */}
      <Dialog open={!!pricingProduct} onOpenChange={(o) => { if (!o) { setPricingProduct(null); setPricingAdvice(null); } }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-amber-500" />
              مستشار التسعير الذكي
              {pricingProduct && (
                <span className="text-muted-foreground font-normal text-sm">— {pricingProduct.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Model selector */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>النموذج:</span>
            {(["claude", "gemini"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setPricingModel(m);
                  if (pricingProduct) fetchPricingAdvice(pricingProduct, m);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all ${pricingModel === m ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40"}`}
              >
                {m === "claude" ? "Claude" : "Gemini"}
              </button>
            ))}
            {pricingProduct && !pricingLoading && (
              <button
                onClick={() => fetchPricingAdvice(pricingProduct, pricingModel)}
                className="ms-auto px-2.5 py-1 rounded-lg border border-border hover:border-primary/40 transition-all"
              >
                إعادة التحليل
              </button>
            )}
          </div>

          {/* Product snapshot */}
          {pricingProduct && (
            <div className="bg-muted/40 rounded-xl p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-muted-foreground">السعر: </span><strong>{pricingProduct.price.toLocaleString("ar-EG")} ج.م</strong></span>
              {pricingProduct.originalPrice && <span><span className="text-muted-foreground">قبل الخصم: </span>{Number(pricingProduct.originalPrice).toLocaleString("ar-EG")} ج.م</span>}
              <span><span className="text-muted-foreground">المخزون: </span>{pricingProduct.stock} قطعة</span>
              <span><span className="text-muted-foreground">الطلبات: </span>{pricingProduct.orderCount}</span>
              {pricingProduct.categoryName && <span><span className="text-muted-foreground">الفئة: </span>{pricingProduct.categoryName}</span>}
            </div>
          )}

          {/* AI response */}
          <div className="min-h-[140px]">
            {pricingLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <p className="text-sm">جارٍ تحليل السعر...</p>
              </div>
            ) : pricingAdvice ? (
              <div className="text-sm leading-7 whitespace-pre-wrap bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                {pricingAdvice}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPricingProduct(null); setPricingAdvice(null); }}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
