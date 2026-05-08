import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useListCategories, useListProductVariants, useCreateProductVariant,
  useUpdateProductVariant, useDeleteProductVariant,
} from "@workspace/api-client-react";
import GuideCard from "@/components/admin/GuideCard";
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
  FileUp, FileDown, CheckCircle2, XCircle, UploadCloud,
} from "lucide-react";
import { ImageUpload, ImageUploadList } from "@/components/image-upload";

const SELECT_NONE_VALUE = "__none__";

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
  imageUrl: string; featured: boolean;
  status: "active" | "out_of_stock" | "hidden"; categoryId: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", description: "", price: "", originalPrice: "",
  imageUrl: "", featured: false, status: "active", categoryId: "",
};

type VariantRow = { id?: number; size: string; color: string; colorHex: string; stock: string; imageUrls: string[]; isNew?: boolean };

function newVariantRow(): VariantRow {
  return { size: "", color: "", colorHex: "#000000", stock: "0", imageUrls: [], isNew: true };
}

function variantStock(rows: VariantRow[]) {
  return rows.reduce((total, row) => total + (parseInt(row.stock, 10) || 0), 0);
}

function firstVariantImage(rows: VariantRow[]) {
  return rows.flatMap((row) => row.imageUrls).find(Boolean) ?? "";
}

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
      imageUrls: v.imageUrls ?? [],
      stock: String(v.stock),
    })));
    setInitialized(true);
  }

  function addRow() {
    setRows((r) => [...r, newVariantRow()]);
  }

  function updateRow(i: number, field: keyof VariantRow, value: string | string[]) {
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
      imageUrls: row.imageUrls,
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
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end bg-muted/30 rounded-xl p-2.5 border border-border/50"
          >
            {/* Size */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">المقاس</Label>
              <Select
                value={row.size || SELECT_NONE_VALUE}
                onValueChange={(v) =>
                  updateRow(i, "size", v === SELECT_NONE_VALUE ? "" : v)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE}>— بدون —</SelectItem>
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

            <div className="sm:col-span-3">
              <ImageUploadList
                label="صور المتغير"
                values={row.imageUrls}
                onChange={(urls) => updateRow(i, "imageUrls", urls)}
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

function DraftVariantManager({
  rows,
  onChange,
}: {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
}) {
  function updateRow(i: number, field: keyof VariantRow, value: string | string[]) {
    onChange(rows.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function setPresetColor(i: number, name: string, hex: string) {
    onChange(rows.map((row, idx) => idx === i ? { ...row, color: name, colorHex: hex } : row));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="w-3.5 h-3.5 text-primary" /> المتغيرات والكمية
        </Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onChange([...rows, newVariantRow()])}>
          <Plus className="w-3 h-3" /> إضافة متغير
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end bg-muted/30 rounded-xl p-2.5 border border-border/50">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">المقاس</Label>
              <Select value={row.size || SELECT_NONE_VALUE} onValueChange={(v) => updateRow(i, "size", v === SELECT_NONE_VALUE ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختاري..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE}>بدون</SelectItem>
                  {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">اللون</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input value={row.color} onChange={(e) => updateRow(i, "color", e.target.value)} placeholder="اسم اللون" className="h-8 text-xs ps-7" />
                  <div className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-border/50" style={{ backgroundColor: row.colorHex || "#000" }} />
                </div>
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
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">الكمية</Label>
              <Input type="number" min="0" value={row.stock} onChange={(e) => updateRow(i, "stock", e.target.value)} className="h-8 text-xs w-20" />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => rows.length > 1 && onChange(rows.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
            <div className="sm:col-span-4">
              <ImageUploadList label="صور المتغير" values={row.imageUrls} onChange={(urls) => updateRow(i, "imageUrls", urls)} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">إجمالي المخزون المحسوب من المتغيرات: {variantStock(rows)}</p>
    </div>
  );
}

/* ─── CSV helpers ─── */
const CSV_COLUMNS = ["name", "description", "price", "originalPrice", "imageUrl", "stock", "featured", "status"];
const CSV_TEMPLATE_HEADER = CSV_COLUMNS.join(",");
const CSV_TEMPLATE_EXAMPLE = [
  "فستان صيفي زهري,فستان قطن خفيف للصيف مناسب للخروجات,250,350,https://example.com/image.jpg,10,false,active",
  "بلوزة كاجوال,بلوزة قطن مريحة بألوان متعددة,180,,https://example.com/image2.jpg,25,true,active",
].join("\n");

function downloadCsvTemplate() {
  const blob = new Blob([`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type CsvRow = {
  name: string; description: string; price: number; originalPrice: number | null;
  imageUrl: string; stock: number; featured: boolean;
  status: "active" | "out_of_stock" | "hidden";
  _error?: string;
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (col: string) => cells[idx(col)] ?? "";
    const price = parseFloat(get("price"));
    const originalPrice = get("originalprice") ? parseFloat(get("originalprice")) : null;
    const stock = parseInt(get("stock"), 10);
    const rawStatus = get("status").toLowerCase();
    const status: CsvRow["status"] =
      rawStatus === "out_of_stock" ? "out_of_stock" : rawStatus === "hidden" ? "hidden" : "active";
    const featured = get("featured").toLowerCase() === "true" || get("featured") === "1";
    const name = get("name");
    const error = !name ? "الاسم مطلوب" : isNaN(price) || price <= 0 ? "السعر غير صالح" : undefined;
    return {
      name, description: get("description"),
      price: isNaN(price) ? 0 : price,
      originalPrice: originalPrice && !isNaN(originalPrice) ? originalPrice : null,
      imageUrl: get("imageurl") || get("image_url") || get("imageUrl"),
      stock: isNaN(stock) ? 0 : stock,
      featured, status,
      _error: error,
    };
  });
}

type ImportStatus = "idle" | "importing" | "done";
type RowResult = "pending" | "ok" | "error";

function CsvImportDialog({
  open, onClose, tenantId, onImported,
}: {
  open: boolean; onClose: () => void; tenantId?: number; onImported: () => void;
}) {
  const createProduct = useCreateProduct();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setRows([]); setStatus("idle"); setResults([]); setProgress(0);
  }

  function handleClose() {
    reset(); onClose();
  }

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCsv(text));
      setStatus("idle");
      setResults([]);
      setProgress(0);
    };
    reader.readAsText(file, "utf-8");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) loadFile(file);
  }

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  async function handleImport() {
    if (!tenantId || validRows.length === 0) return;
    setStatus("importing");
    const res: RowResult[] = Array(validRows.length).fill("pending");
    setResults([...res]);
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createProduct.mutateAsync({
          data: {
            tenantId,
            name: row.name,
            description: row.description,
            price: row.price,
            originalPrice: row.originalPrice ?? undefined,
            imageUrl: row.imageUrl || undefined,
            stock: row.stock,
            featured: row.featured,
            status: row.status,
          },
        });
        res[i] = "ok";
      } catch {
        res[i] = "error";
      }
      setResults([...res]);
      setProgress(i + 1);
    }
    setStatus("done");
    onImported();
  }

  const doneOk = results.filter((r) => r === "ok").length;
  const doneErr = results.filter((r) => r === "error").length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" style={{ direction: "rtl" }}>
        <DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileUp className="w-4 h-4 text-primary" />
            استيراد منتجات من CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 border border-border/40">
            <div>
              <p className="text-sm font-medium">نموذج CSV</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                حمّل النموذج واملأه بمنتجاتك — الأعمدة: name, description, price, originalPrice, imageUrl, stock, featured, status
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={downloadCsvTemplate}>
              <FileDown className="w-3.5 h-3.5" />
              تحميل النموذج
            </Button>
          </div>

          {/* Drop zone */}
          {rows.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-12 cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <UploadCloud className={`w-8 h-8 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              <div className="text-center">
                <p className="text-sm font-medium">اسحب ملف CSV هنا أو انقر للاختيار</p>
                <p className="text-xs text-muted-foreground mt-1">يدعم ملفات .csv فقط</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && status !== "importing" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{rows.length} صف في الملف</span>
                  {validRows.length > 0 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 me-1" /> {validRows.length} صالح
                    </Badge>
                  )}
                  {invalidRows.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-[11px]">
                      <XCircle className="w-3 h-3 me-1" /> {invalidRows.length} خطأ
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={reset}>
                  <X className="w-3 h-3" /> تغيير الملف
                </Button>
              </div>

              <div className="border border-border/40 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground w-6">#</th>
                        <th className="text-right px-3 py-2 font-medium">الاسم</th>
                        <th className="text-right px-3 py-2 font-medium">السعر</th>
                        <th className="text-right px-3 py-2 font-medium">الكمية</th>
                        <th className="text-right px-3 py-2 font-medium">الحالة</th>
                        <th className="text-right px-3 py-2 font-medium w-20">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={`border-t border-border/30 ${row._error ? "bg-red-50/50" : "hover:bg-muted/20"}`}>
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium max-w-[160px] truncate">{row.name || <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-1.5">{row.price > 0 ? `${row.price} ج.م` : <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-1.5">{row.stock}</td>
                          <td className="px-3 py-1.5">{row.status === "active" ? "نشط" : row.status === "out_of_stock" ? "نفذ" : "مخفي"}</td>
                          <td className="px-3 py-1.5">
                            {row._error
                              ? <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{row._error}</span>
                              : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import progress */}
          {status === "importing" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  جارٍ الاستيراد...
                </span>
                <span className="text-muted-foreground">{progress} / {validRows.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${validRows.length > 0 ? (progress / validRows.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Done summary */}
          {status === "done" && (
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">اكتمل الاستيراد</p>
                <p className="text-muted-foreground">
                  تم استيراد <strong className="text-foreground">{doneOk}</strong> منتج بنجاح
                  {doneErr > 0 && <span className="text-red-500"> · فشل {doneErr}</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40 shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose}>
            {status === "done" ? "إغلاق" : "إلغاء"}
          </Button>
          {status !== "done" && rows.length > 0 && validRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={status === "importing"}
              className="gap-2"
            >
              {status === "importing"
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ الاستيراد...</>
                : <><FileUp className="w-3.5 h-3.5" /> استيراد {validRows.length} منتج</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const createProductVariant = useCreateProductVariant();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [search, setSearch] = useState("");
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [variantsProductId, setVariantsProductId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [draftVariants, setDraftVariants] = useState<VariantRow[]>([newVariantRow()]);
  const [formError, setFormError] = useState<string | null>(null);
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
    setDraftVariants([newVariantRow()]);
    setFormError(null);
    setEditingId(null);
    setVariantsProductId(null);
    setDialogOpen(true);
  }

  function openEdit(p: NonNullable<typeof products>[0]) {
    setForm({
      name: p.name, description: p.description,
      price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      imageUrl: p.imageUrl ?? "",
      featured: p.featured, status: p.status,
      categoryId: p.categoryId ? String(p.categoryId) : "",
    });
    setFormError(null);
    setEditingId(p.id);
    setVariantsProductId(p.id);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;
    const rowsForCreate = draftVariants.length ? draftVariants : [newVariantRow()];
    if (!editingId && rowsForCreate.length === 0) {
      setFormError("يجب إضافة متغير واحد على الأقل للمنتج.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const representativeImage = form.imageUrl.trim() || firstVariantImage(rowsForCreate);
      const derivedStock = editingId ? undefined : variantStock(rowsForCreate);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        imageUrl: representativeImage || undefined,
        stock: derivedStock ?? 0,
        featured: form.featured,
        status: form.status,
        categoryId: form.categoryId ? parseInt(form.categoryId, 10) : undefined,
      };
      if (editingId) {
        const { stock: _stock, ...updatePayload } = payload;
        await updateProduct.mutateAsync({ id: editingId, data: updatePayload });
      } else {
        const created = await createProduct.mutateAsync({ data: { ...payload, tenantId } });
        for (const row of rowsForCreate) {
          await createVariantFromDraft(created.id, row);
        }
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

  async function createVariantFromDraft(productId: number, row: VariantRow) {
    await createProductVariant.mutateAsync({
      id: productId,
      data: {
        size: row.size || null,
        color: row.color || null,
        colorHex: row.colorHex || null,
        imageUrls: row.imageUrls,
        stock: parseInt(row.stock, 10) || 0,
      },
    });
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setCsvImportOpen(true)}>
            <FileUp className="w-4 h-4" /> استيراد CSV
          </Button>
          <Button className="gap-2 rounded-xl" onClick={openCreate}>
            <Plus className="w-4 h-4" /> منتج جديد
          </Button>
        </div>
      </motion.div>

      <GuideCard
        storageKey="products"
        title="كيف تضيف وتدير منتجاتك؟"
        description='انقر «منتج جديد» لإضافة منتج. أضف صورة وسعراً واضحاً لزيادة المبيعات. يمكنك أيضاً استيراد كميات كبيرة عبر ملف CSV.'
        steps={[
          { icon: "📸", title: "أضف صورة جذابة", desc: "الصورة هي أهم عامل في قرار الشراء — استخدم صوراً واضحة بخلفية بيضاء أو محايدة." },
          { icon: "💰", title: "سعر تنافسي", desc: "أضف السعر الأصلي مع سعر الخصم ليشعر العميل بالصفقة الجيدة." },
          { icon: "📦", title: "راقب المخزون", desc: "حدّث المخزون دائماً — المنتجات «نفذ» تضر بتجربة العميل." },
          { icon: "⭐", title: "منتجات مميزة", desc: "علّم أفضل منتجاتك كـ«مميز» لتظهر في أعلى المتجر." },
        ]}
        tips={[
          "استخدم الاستيراد عبر CSV لإضافة أكثر من 10 منتجات دفعة واحدة.",
          "اكتب وصفاً تفصيلياً يذكر المقاسات والمواد والعناية بالمنتج.",
          "أضف المنتجات إلى تصنيفات لتسهيل التنقل في المتجر.",
        ]}
        variant="guide"
      />

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
                <Label>الفئة</Label>
                <Select
                  value={form.categoryId || SELECT_NONE_VALUE}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      categoryId: v === SELECT_NONE_VALUE ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر فئة..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE_VALUE}>— بدون فئة —</SelectItem>
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

            {!variantsProductId && (
              <div className="border-t border-border/50 pt-5">
                <DraftVariantManager rows={draftVariants} onChange={setDraftVariants} />
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{formError}</p>
            )}

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

      {/* CSV Import dialog */}
      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        tenantId={tenantId}
        onImported={() => { refetch(); }}
      />

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
