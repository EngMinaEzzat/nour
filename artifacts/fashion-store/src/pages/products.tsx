import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useListCategories, useListProductVariants, useCreateProductVariant,
  useUpdateProductVariant, useDeleteProductVariant,
  type ProductVariant,
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package, Plus, Pencil, Trash2, Search, Star, Eye, EyeOff,
  AlertCircle, Layers, X, Check, Palette, AlertTriangle, Sparkles, Loader2,
  FileUp, FileDown, CheckCircle2, XCircle, UploadCloud, MoreHorizontal, Filter, LayoutGrid, List,
} from "lucide-react";
import { ImageUpload, ImageUploadList } from "@/components/image-upload";
import { normalizeStoredImageUrl, productImageUrl } from "@/lib/image-url";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/ui-format";
import { AdminIconButton } from "@/components/admin/admin-icon-button";
import { AdminPageHeader, AdminToolbar } from "@/components/admin/admin-page";
import { AdminTable, AdminTableCell, AdminTableRow } from "@/components/admin/admin-table";
import { StateBlock } from "@/components/admin/state-block";
import { StatusBadge } from "@/components/admin/status-badge";

const SELECT_NONE_VALUE = "__none__";

const SIZES = ["xs", "s", "m", "l", "xl", "xxl", "free", "one"];
const PRESET_COLORS = [
  { key: "black", hex: "#1a1a1a" },
  { key: "white", hex: "#ffffff" },
  { key: "red", hex: "#ef4444" },
  { key: "pink", hex: "#ec4899" },
  { key: "purple", hex: "#8b5cf6" },
  { key: "blue", hex: "#3b82f6" },
  { key: "green", hex: "#22c55e" },
  { key: "beige", hex: "#d4a574" },
  { key: "navy", hex: "#1e3a5f" },
  { key: "gray", hex: "#6b7280" },
  { key: "gold", hex: "#f59e0b" },
  { key: "brown", hex: "#92400e" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  out_of_stock: "bg-red-100 text-red-700 border-red-200",
  hidden: "bg-gray-100 text-gray-700 border-gray-200",
};

type ProductForm = {
  name: string; description: string; price: string; originalPrice: string;
  stock: string; imageUrl: string; featured: boolean;
  status: "active" | "out_of_stock" | "hidden"; categoryId: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", description: "", price: "", originalPrice: "", stock: "0",
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
  return rows.flatMap((row) => row.imageUrls.map(normalizeStoredImageUrl)).find(Boolean) ?? "";
}

function variantToRow(variant: ProductVariant): VariantRow {
  return {
    id: variant.id,
    size: variant.size ?? "",
    color: variant.color ?? "",
    colorHex: variant.colorHex ?? "#000000",
    imageUrls: (variant.imageUrls ?? []).map(normalizeStoredImageUrl),
    stock: String(variant.stock),
  };
}

/* ─── Variant Manager sub-component ─── */
function VariantManager({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const { data: variants, refetch } = useListProductVariants(productId);
  const createVariant = useCreateProductVariant();
  const updateVariant = useUpdateProductVariant();
  const deleteVariant = useDeleteProductVariant();

  const [rows, setRows] = useState<VariantRow[]>([]);
  const [savingRow, setSavingRow] = useState<number | null>(null);

  useEffect(() => {
    setRows(variants?.map(variantToRow) ?? []);
    if (variants && variants.length > 0) {
      // notify parent if needed, but here we just manage rows
    }
  }, [productId, variants]);

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
    setSavingRow(i);
    const payload = {
      size: row.size || null,
      color: row.color || null,
      colorHex: row.colorHex || null,
      imageUrls: row.imageUrls.map(normalizeStoredImageUrl),
      stock: parseInt(row.stock, 10) || 0,
    };
    try {
      const saved = row.id
        ? await updateVariant.mutateAsync({ id: productId, variantId: row.id, data: payload })
        : await createVariant.mutateAsync({ id: productId, data: payload });
      setRows((current) => current.map((existing, idx) => idx === i ? variantToRow(saved) : existing));
      await refetch();
    } finally {
      setSavingRow(null);
    }
  }

  async function removeRow(i: number) {
    const row = rows[i];
    if (!row) return;
    if (row.id) {
      await deleteVariant.mutateAsync({ id: productId, variantId: row.id });
      setRows((r) => r.filter((_, idx) => idx !== i));
      await refetch();
    } else {
      setRows((r) => r.filter((_, idx) => idx !== i));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="w-3.5 h-3.5 text-primary" /> {t("products.variants.title")}
        </Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addRow}>
          <Plus className="w-3 h-3" /> {t("products.variants.addBtn")}
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-xl">
          {t("products.variants.empty")}
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <motion.div
            key={row.id ?? `new-${i}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] gap-2 items-end bg-muted/30 rounded-xl p-2.5 border border-border/50"
          >
            {/* Size */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("products.variants.size")}</Label>
              <Select
                value={row.size || SELECT_NONE_VALUE}
                onValueChange={(v) =>
                  updateRow(i, "size", v === SELECT_NONE_VALUE ? "" : v)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختاري..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE}>{t("products.variants.sizeNone")}</SelectItem>
                  {SIZES.map((s) => <SelectItem key={s} value={s}>{t(`products.sizes.${s}`) || s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("products.variants.color")}</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input
                    value={row.color}
                    onChange={(e) => updateRow(i, "color", e.target.value)}
                    placeholder={t("products.variants.colorPlaceholder")}
                    className="h-8 text-xs ps-7"
                  />
                  <div
                    className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-border/50 cursor-pointer"
                    style={{ backgroundColor: row.colorHex || "#000" }}
                  />
                </div>
                <div className="relative">
                  <Select onValueChange={(v) => {
                    const preset = PRESET_COLORS.find((c) => c.key === v);
                    if (preset) setPresetColor(i, t(`products.colors.${preset.key}`), preset.hex);
                  }}>
                    <SelectTrigger className="h-8 w-8 p-0 border-border/50">
                      <Palette className="w-3 h-3 mx-auto text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_COLORS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                            {t(`products.colors.${c.key}`)}
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
              <Label className="text-[10px] text-muted-foreground">{t("products.variants.stock")}</Label>
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
              disabled={savingRow !== null}
              title={t("products.variants.btnSave")}
            >
              {savingRow === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </Button>

            {/* Delete */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 mt-5 text-destructive hover:bg-destructive/10"
              onClick={() => removeRow(i)}
              disabled={savingRow !== null}
              title={t("products.variants.btnDelete")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>

            <div className="sm:col-span-5">
              <ImageUploadList
                label={t("products.variants.images")}
                values={row.imageUrls}
                onChange={(urls) => updateRow(i, "imageUrls", urls)}
              />
            </div>
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
  const { t } = useTranslation();
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
          <Layers className="w-3.5 h-3.5 text-primary" /> {t("products.variants.draftTitle")}
        </Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onChange([...rows, newVariantRow()])}>
          <Plus className="w-3 h-3" /> {t("products.variants.addBtn")}
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end bg-muted/30 rounded-xl p-2.5 border border-border/50">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("products.variants.size")}</Label>
              <Select value={row.size || SELECT_NONE_VALUE} onValueChange={(v) => updateRow(i, "size", v === SELECT_NONE_VALUE ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختاري..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE}>{t("products.variants.sizeNone")}</SelectItem>
                  {SIZES.map((s) => <SelectItem key={s} value={s}>{t(`products.sizes.${s}`) || s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("products.variants.color")}</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input value={row.color} onChange={(e) => updateRow(i, "color", e.target.value)} placeholder={t("products.variants.colorPlaceholder")} className="h-8 text-xs ps-7" />
                  <div className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-border/50" style={{ backgroundColor: row.colorHex || "#000" }} />
                </div>
                <Select onValueChange={(v) => {
                  const preset = PRESET_COLORS.find((c) => c.key === v);
                  if (preset) setPresetColor(i, t(`products.colors.${preset.key}`), preset.hex);
                }}>
                  <SelectTrigger className="h-8 w-8 p-0 border-border/50">
                    <Palette className="w-3 h-3 mx-auto text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_COLORS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                          {t(`products.colors.${c.key}`)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("products.variants.stock")}</Label>
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
              <ImageUploadList label={t("products.variants.images")} values={row.imageUrls} onChange={(urls) => updateRow(i, "imageUrls", urls)} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("products.variants.draftStockMsg")} {variantStock(rows)}</p>
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

function parseCsv(text: string, t: any): CsvRow[] {
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
    const error = !name ? t("products.csv.errors.nameReq", "الاسم مطلوب") : isNaN(price) || price <= 0 ? t("products.csv.errors.priceInv", "السعر غير صالح") : undefined;
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
  const { t, i18n } = useTranslation();
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
      setRows(parseCsv(text, t));
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" dir={i18n.dir()}>
        <DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileUp className="w-4 h-4 text-primary" />
            {t("products.csv.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 border border-border/40">
            <div>
              <p className="text-sm font-medium">{t("products.csv.templateTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("products.csv.templateDesc")}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={downloadCsvTemplate}>
              <FileDown className="w-3.5 h-3.5" />
              {t("products.csv.btnDownload")}
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
                <p className="text-sm font-medium">{t("products.csv.dropzoneTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("products.csv.dropzoneDesc")}</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && status !== "importing" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{rows.length} {t("products.csv.fileRows")}</span>
                  {validRows.length > 0 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 me-1" /> {validRows.length} {t("products.csv.valid")}
                    </Badge>
                  )}
                  {invalidRows.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-[11px]">
                      <XCircle className="w-3 h-3 me-1" /> {invalidRows.length} {t("products.csv.invalid")}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={reset}>
                  <X className="w-3 h-3" /> {t("products.csv.btnChangeFile")}
                </Button>
              </div>

              <div className="border border-border/40 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium text-muted-foreground w-6">{t("products.csv.colNum")}</th>
                        <th className="text-start px-3 py-2 font-medium">{t("products.csv.colName")}</th>
                        <th className="text-start px-3 py-2 font-medium">{t("products.csv.colPrice")}</th>
                        <th className="text-start px-3 py-2 font-medium">{t("products.csv.colStock")}</th>
                        <th className="text-start px-3 py-2 font-medium">{t("products.csv.colStatus")}</th>
                        <th className="text-start px-3 py-2 font-medium w-20">{t("products.csv.colNote")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={`border-t border-border/30 ${row._error ? "bg-red-50/50" : "hover:bg-muted/20"}`}>
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium max-w-[160px] truncate">{row.name || <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-1.5">{row.price > 0 ? `${row.price} ${i18n.language === "ar" ? "ج.م" : "EGP"}` : <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-1.5">{row.stock}</td>
                          <td className="px-3 py-1.5">{t(`products.status.${row.status}`) || row.status}</td>
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
                  {t("products.csv.importing")}
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
                <p className="font-semibold mb-1">{t("products.csv.doneTitle")}</p>
                <p className="text-muted-foreground">
                  {t("products.csv.doneMsg", { count: doneOk }).split("{{count}}").map((part, i) => (
                    i === 1 ? <strong key={i} className="text-foreground">{doneOk}</strong> : part
                  ))}
                  {doneErr > 0 && <span className="text-red-500">{t("products.csv.doneFail", { count: doneErr })}</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40 shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose}>
            {status === "done" ? t("products.csv.btnClose") : t("products.csv.btnCancel")}
          </Button>
          {status !== "done" && rows.length > 0 && validRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={status === "importing"}
              className="gap-2"
            >
              {status === "importing"
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("products.csv.importing")}</>
                : <><FileUp className="w-3.5 h-3.5" /> {t("products.csv.btnImport", { count: validRows.length })}</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Products Page ─── */
export default function Products() {
  const { t, i18n } = useTranslation();
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
  const [filterLowStock, setFilterLowStock] = useState(() => new URLSearchParams(window.location.search).get("filter") === "low-stock");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("newest");
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [variantsProductId, setVariantsProductId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [draftVariants, setDraftVariants] = useState<VariantRow[]>([newVariantRow()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);

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

  const filtered = products?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLowStock && p.stock > 5) return false;
    if (statusFilter === "active" && p.status !== "active") return false;
    if (statusFilter === "hidden" && p.status !== "hidden") return false;
    if (statusFilter === "out_of_stock" && p.stock > 0 && p.status !== "out_of_stock") return false;
    if (statusFilter === "missing_image" && p.imageUrl) return false;
    if (statusFilter === "no_category" && p.categoryName) return false;
    if (statusFilter === "has_variants" && !p.hasVariants) return false;
    return true;
  }).sort((a, b) => {
    if (sortMode === "stock") return (a.stock ?? 0) - (b.stock ?? 0);
    if (sortMode === "price") return Number(a.price ?? 0) - Number(b.price ?? 0);
    if (sortMode === "bestsellers") return (b.orderCount ?? 0) - (a.orderCount ?? 0);
    return b.id - a.id;
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setDraftVariants([newVariantRow()]);
    setHasVariants(false);
    setFormError(null);
    setEditingId(null);
    setVariantsProductId(null);
    setDialogOpen(true);
  }

  function openEdit(p: NonNullable<typeof products>[0]) {
    setForm({
      name: p.name, description: p.description,
      price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      stock: String(p.stock),
      imageUrl: normalizeStoredImageUrl(p.imageUrl),
      featured: p.featured, status: p.status,
      categoryId: p.categoryId ? String(p.categoryId) : "",
    });
    // Let hasVariants trigger after fetching if variants exist, or just rely on variant length.
    // For simplicity, we assume they have variants if their stock doesn't perfectly match product stock, 
    // or we'll let VariantManager handle it. Actually, just set it true for now and hide if 0 in effect.
    setHasVariants(p.hasVariants || false); 
    setFormError(null);
    setEditingId(p.id);
    setVariantsProductId(p.id);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;
    const rowsForCreate = draftVariants.length ? draftVariants : [newVariantRow()];
    if (!editingId && rowsForCreate.length === 0) {
      setFormError(t("products.form.saveError"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const representativeImage = normalizeStoredImageUrl(form.imageUrl) || (hasVariants ? firstVariantImage(rowsForCreate) : "");
      const derivedStock = hasVariants ? (editingId ? undefined : variantStock(rowsForCreate)) : parseInt(form.stock, 10);
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
        await updateProduct.mutateAsync({ id: editingId, data: hasVariants ? updatePayload : payload });
      } else {
        const created = await createProduct.mutateAsync({ data: { ...payload, tenantId } });
        if (hasVariants) {
          for (const row of rowsForCreate) {
            await createVariantFromDraft(created.id, row);
          }
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
        imageUrls: row.imageUrls.map(normalizeStoredImageUrl),
        stock: parseInt(row.stock, 10) || 0,
      },
    });
  }

  return (
    <div className="container mx-auto px-4 py-10" dir={i18n.dir()}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <AdminPageHeader
          icon={<Package className="h-5 w-5" />}
          title={t("products.title")}
          description={t("products.subtitle")}
          actions={
            <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="gap-2 h-10 rounded-xl shadow-sm px-3">
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">مزيد من الإجراءات</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setFilterLowStock(!filterLowStock)}>
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                {filterLowStock ? "عرض كل المنتجات" : "تصفية المخزون المنخفض"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCsvImportOpen(true)}>
                <FileUp className="w-4 h-4 me-2 text-muted-foreground" />
                {t("products.btnImport")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openCreate} className="gap-2 h-10 rounded-xl shadow-sm">
            <Plus className="w-4 h-4" />
            {t("products.btnAdd")}
          </Button>
            </>
          }
        />
      </motion.div>

      <GuideCard
        storageKey="products"
        title={t("products.guide.title")}
        description={t("products.guide.description")}
        steps={[
          { icon: "📸", title: t("products.guide.step1.title"), desc: t("products.guide.step1.desc") },
          { icon: "💰", title: t("products.guide.step2.title"), desc: t("products.guide.step2.desc") },
          { icon: "📦", title: t("products.guide.step3.title"), desc: t("products.guide.step3.desc") },
          { icon: "⭐", title: t("products.guide.step4.title"), desc: t("products.guide.step4.desc") },
        ]}
        tips={[
          t("products.guide.tip1"),
          t("products.guide.tip2"),
          t("products.guide.tip3"),
        ]}
        variant="guide"
      />

      {/* Stats summary */}
      {!isLoading && products && (
        <div className="flex gap-4 mb-6 text-sm text-muted-foreground flex-wrap">
          <span>{products.length} {t("products.columns.name")} إجمالي</span>
          <span className="text-green-600">{products.filter((p) => p.status === "active").length} {t("products.status.active")}</span>
          <span className="text-red-500">{products.filter((p) => p.status === "out_of_stock").length} {t("products.status.out_of_stock")}</span>
          <span className="text-gray-500">{products.filter((p) => p.featured).length} {t("products.form.featured").split("(")[0]}</span>
        </div>
      )}

      {!isLoading && products && (
        <AdminToolbar className="mb-6">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("products.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-lg bg-background ps-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={viewMode === "grid" ? "default" : "outline"} className="h-9 rounded-lg gap-1.5" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="w-3.5 h-3.5" /> {t("products.view.grid", "Grid")}
            </Button>
            <Button size="sm" variant={viewMode === "table" ? "default" : "outline"} className="h-9 rounded-lg gap-1.5" onClick={() => setViewMode("table")}>
              <List className="w-3.5 h-3.5" /> {t("products.view.table", "Table")}
            </Button>
            <Button size="sm" variant={filterLowStock ? "default" : "outline"} className="h-9 rounded-lg" onClick={() => setFilterLowStock(!filterLowStock)}>
              {t("products.filters.lowStock", "Low stock")}
            </Button>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label={t("products.filters.status", "Product filter")}>
              <option value="all">{t("products.filters.all", "All products")}</option>
              <option value="active">{t("products.status.active")}</option>
              <option value="hidden">{t("products.status.hidden")}</option>
              <option value="out_of_stock">{t("products.status.out_of_stock")}</option>
              <option value="missing_image">{t("products.filters.missingImage", "Missing image")}</option>
              <option value="no_category">{t("products.filters.noCategory", "No category")}</option>
              <option value="has_variants">{t("products.filters.hasVariants", "له متغيرات")}</option>
            </select>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label={t("products.sort.label", "Sort products")}>
              <option value="newest">{t("products.sort.newest", "Newest")}</option>
              <option value="stock">{t("products.sort.stock", "Stock low-high")}</option>
              <option value="price">{t("products.sort.price", "Price")}</option>
              <option value="bestsellers">{t("products.sort.bestsellers", "Best sellers")}</option>
            </select>
          </div>
        </AdminToolbar>
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
        <StateBlock
          icon={<Package className="h-6 w-6" />}
          title={search ? t("products.emptySearch") : t("products.emptyState.title")}
          actionLabel={!search ? t("products.btnAdd") : undefined}
          onAction={!search ? openCreate : undefined}
        />
      ) : viewMode === "table" ? (
        <AdminTable
          headers={[
            t("products.columns.name"),
            t("products.form.category"),
            t("products.form.price"),
            t("products.columns.stock"),
            t("products.columns.status"),
            <span className="sr-only">{t("products.columns.actions", "Actions")}</span>,
          ]}
        >
              {filtered?.map((p) => {
                return (
                  <AdminTableRow key={p.id}>
                    <AdminTableCell>
                      <div className="flex items-center gap-3">
                        <img src={productImageUrl(p.imageUrl, "/product-fashion.png")} alt={p.name} className="h-12 w-10 rounded-lg object-cover bg-muted" />
                        <div>
                          <p className="font-semibold text-foreground line-clamp-1">{p.name}</p>
                          {!p.imageUrl && <p className="text-xs text-amber-700">{t("products.filters.missingImage", "Missing image")}</p>}
                        </div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className="text-muted-foreground">{p.categoryName || t("products.filters.noCategory", "No category")}</AdminTableCell>
                    <AdminTableCell className="font-semibold text-primary">{formatCurrency(p.price, i18n.language)}</AdminTableCell>
                    <AdminTableCell>
                      <span className={p.stock <= 5 ? "text-amber-700 font-semibold" : "text-foreground"}>{p.stock}</span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <StatusBadge status={p.status} label={t(`products.status.${p.status}`) || p.status} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex justify-end gap-2">
                        <AdminIconButton label={t("products.actions.edit", "Edit")} icon={<Pencil className="w-3.5 h-3.5" />} variant="outline" onClick={() => openEdit(p)} />
                        <AdminIconButton label={t("products.pricing.btn")} icon={<Sparkles className="w-3.5 h-3.5" />} variant="outline" className="text-amber-700 border-amber-300" onClick={() => openPricingAdvisor(p)} />
                        <AdminIconButton label={t("products.actions.delete", "Delete")} icon={<Trash2 className="w-3.5 h-3.5" />} variant="destructive" onClick={() => setDeleteId(p.id)} />
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
        </AdminTable>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {filtered?.map((p) => {
            const statusInfo = STATUS_COLORS[p.status] || STATUS_COLORS.active;
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
                      src={productImageUrl(p.imageUrl, "/product-fashion.png")}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    <div className="absolute top-2 start-2 flex gap-1.5 flex-wrap">
                      <Badge className={`text-[10px] border px-2 py-0.5 ${statusInfo}`}>
                        {t(`products.status.${p.status}`) || p.status}
                      </Badge>
                      {p.featured && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 px-2 py-0.5">
                          <Star className="w-2.5 h-2.5 me-0.5 fill-amber-500 text-amber-500" /> {t("products.form.featured").split("(")[0]}
                        </Badge>
                      )}
                      {discount > 0 && (
                        <Badge className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5">
                          -{discount}%
                        </Badge>
                      )}
                    </div>
                    {/* Quick actions overlay */}
                    <div className="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 shadow-lg text-xs"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="w-3 h-3" /> {t("products.form.btnSave").replace("جارٍ ", "")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 shadow-lg text-xs bg-white/90 hover:bg-amber-50 border-amber-300 text-amber-700"
                        onClick={(e) => { e.stopPropagation(); openPricingAdvisor(p); }}
                        title={t("products.pricing.btn")}
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
                        <span className="text-primary font-bold">{formatCurrency(p.price, i18n.language)}</span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-xs text-muted-foreground line-through ms-1.5">
                            {Number(p.originalPrice).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.stock === 0 ? (
                          <span className="text-[10px] font-medium text-red-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> {t("products.status.out_of_stock")}
                          </span>
                        ) : p.stock <= 5 ? (
                          <span className="text-[10px] font-medium text-orange-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> {p.stock}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.stock}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{t("products.variants.stock")}</span>
                      </div>
                    </div>
                    {p.categoryName && (
                      <p className="text-[10px] text-muted-foreground mt-1">{p.categoryName}</p>
                    )}
                    <div className="mt-3 flex gap-2 md:hidden">
                      <Button size="sm" variant="outline" className="h-9 flex-1 gap-1.5" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" /> {t("products.actions.edit", "Edit")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 text-amber-700 border-amber-300" onClick={() => openPricingAdvisor(p)} aria-label={t("products.pricing.btn")}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" className="h-9" onClick={() => setDeleteId(p.id)} aria-label={t("products.actions.delete", "Delete")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
              {editingId ? t("products.form.editTitle") : t("products.form.addTitle")}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t("products.tabs.details", "التفاصيل")}</TabsTrigger>
              <TabsTrigger value="variants">{t("products.tabs.variants", "الأسعار والمخزون")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>{t("products.form.name")} *</Label>
                  <Input value={form.name} onChange={field("name")} placeholder={t("products.form.namePlaceholder")} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>{t("products.form.description")} *</Label>
                  <Textarea value={form.description} onChange={field("description")} placeholder={t("products.form.descriptionPlaceholder")} rows={3} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("products.form.category").split(" ")[0]}</Label>
                  <Select
                    value={form.categoryId || SELECT_NONE_VALUE}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        categoryId: v === SELECT_NONE_VALUE ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="اختاري..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE_VALUE}>{t("products.form.noCategory")}</SelectItem>
                      {categories?.filter(c => !c.parentId).map((parent) => (
                        <div key={parent.id}>
                          <SelectItem value={String(parent.id)} className="font-semibold">
                            {i18n.language === "en" ? parent.name : parent.nameAr}
                          </SelectItem>
                          {categories
                            ?.filter((child) => child.parentId === parent.id)
                            .map((child) => (
                              <SelectItem key={child.id} value={String(child.id)} className="ps-6 text-sm">
                                — {i18n.language === "en" ? child.name : child.nameAr}
                              </SelectItem>
                            ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("products.form.status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProductForm["status"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("products.status.active")}</SelectItem>
                      <SelectItem value="out_of_stock">{t("products.status.out_of_stock")}</SelectItem>
                      <SelectItem value="hidden">{t("products.status.hidden")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload
                    label={t("products.form.image")}
                    value={form.imageUrl}
                    onChange={(url) => setForm((f) => ({ ...f, imageUrl: normalizeStoredImageUrl(url) }))}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between border border-border/50 rounded-xl px-4 py-3">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" /> {t("products.form.featured").split("(")[0]}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("products.form.featured").split("(")[1]?.replace(")", "")}</p>
                  </div>
                  <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{formError}</p>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("products.form.btnCancel")}</Button>
                <Button onClick={handleSave} disabled={saving || !form.name || !form.price}>
                  {saving ? t("products.form.btnSaving") : t("products.form.btnSave")}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="variants" className="space-y-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <div className="space-y-1.5">
                  <Label>{t("products.form.price")} *</Label>
                  <Input type="number" value={form.price} onChange={field("price")} placeholder={t("products.form.pricePlaceholder")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("products.form.originalPrice")}</Label>
                  <Input type="number" value={form.originalPrice} onChange={field("originalPrice")} placeholder={t("products.form.originalPricePlaceholder")} />
                </div>
                {!hasVariants && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t("products.columns.stock")}</Label>
                    <Input type="number" value={form.stock} onChange={field("stock")} placeholder="0" min="0" />
                  </div>
                )}
              </div>

              {!variantsProductId && (
                <div className="border-t border-border/50 pt-5">
                  {hasVariants ? (
                    <DraftVariantManager rows={draftVariants} onChange={setDraftVariants} />
                  ) : (
                    <Button type="button" variant="outline" className="w-full gap-2 border-dashed border-2 py-6 text-muted-foreground hover:text-foreground" onClick={() => setHasVariants(true)}>
                      <Plus className="w-4 h-4" /> {t("products.variants.addBtn")}
                    </Button>
                  )}
                </div>
              )}

              {variantsProductId && hasVariants && (
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
              {variantsProductId && !hasVariants && (
                <div className="border-t border-border/50 pt-5">
                  <Button type="button" variant="outline" className="w-full gap-2 border-dashed border-2 py-6 text-muted-foreground hover:text-foreground" onClick={() => setHasVariants(true)}>
                    <Plus className="w-4 h-4" /> {t("products.variants.addBtn")}
                  </Button>
                </div>
              )}

              {formError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 mt-4">{formError}</p>
              )}

              <DialogFooter className="gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("products.form.btnCancel")}</Button>
                <Button onClick={handleSave} disabled={saving || !form.name || !form.price}>
                  {saving ? t("products.form.btnSaving") : t("products.form.btnSave")}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm ─── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir={i18n.dir()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> {t("products.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("products.delete.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("products.delete.btnCancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              {t("products.delete.btnConfirm").replace("نعم، ", "")}
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
        <DialogContent className="max-w-lg" dir={i18n.dir()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t("products.pricing.title")}
              {pricingProduct && (
                <span className="text-muted-foreground font-normal text-sm">— {pricingProduct.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Model selector */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{i18n.language === "en" ? "Model:" : "النموذج:"}</span>
            {(["claude", "gemini"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setPricingModel(m);
                  if (pricingProduct) fetchPricingAdvice(pricingProduct, m);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all ${pricingModel === m ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40"}`}
              >
                {m === "claude" ? t("products.pricing.claude").split(" ")[1] : t("products.pricing.gemini").split(" ")[1]}
              </button>
            ))}
            {pricingProduct && !pricingLoading && (
              <button
                onClick={() => fetchPricingAdvice(pricingProduct, pricingModel)}
                className="ms-auto px-2.5 py-1 rounded-lg border border-border hover:border-primary/40 transition-all"
              >
                {i18n.language === "ar" ? "إعادة التحليل" : "Re-Analyze"}
              </button>
            )}
          </div>

          {/* Product snapshot */}
          {pricingProduct && (
            <div className="bg-muted/40 rounded-xl p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-muted-foreground">{t("products.columns.price")}: </span><strong>{pricingProduct.price.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</strong></span>
              {pricingProduct.originalPrice && <span><span className="text-muted-foreground">{t("products.form.originalPrice").split(" ")[0]}: </span>{Number(pricingProduct.originalPrice).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {i18n.language === "ar" ? "ج.م" : "EGP"}</span>}
              <span><span className="text-muted-foreground">{t("products.columns.stock")}: </span>{pricingProduct.stock} {i18n.language === "ar" ? "قطعة" : "pcs"}</span>
              <span><span className="text-muted-foreground">{i18n.language === "ar" ? "الطلبات" : "Orders"}: </span>{pricingProduct.orderCount}</span>
              {pricingProduct.categoryName && <span><span className="text-muted-foreground">{t("products.form.category").split(" ")[0]}: </span>{pricingProduct.categoryName}</span>}
            </div>
          )}

          {/* AI response */}
          <div className="min-h-[140px]">
            {pricingLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <p className="text-sm">{t("products.pricing.loading")}</p>
              </div>
            ) : pricingAdvice ? (
              <div className="text-sm leading-7 whitespace-pre-wrap bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                {pricingAdvice}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPricingProduct(null); setPricingAdvice(null); }}>
              {t("products.csv.btnClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
