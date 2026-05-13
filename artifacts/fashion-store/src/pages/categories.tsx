import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Category,
  CreateCategoryBodyType,
  getListCategoriesQueryKey,
  useCreateCategory,
  useListCategories,
  useUpdateCategory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/image-upload";
import { useAuth } from "@/hooks/use-auth";
import { productImageUrl } from "@/lib/image-url";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Eye, ImageIcon, Loader2, Plus, Tags } from "lucide-react";

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { duration: 0.25 } } },
};

const TYPE_LABELS: Record<string, string> = {
  fashion: "أزياء",
  cosmetics: "تجميل",
};

type CategoryFormState = {
  name: string;
  nameAr: string;
  type: "fashion" | "cosmetics";
  imageUrl: string;
};

const EMPTY_FORM: CategoryFormState = {
  name: "",
  nameAr: "",
  type: "fashion",
  imageUrl: "",
};

function CategoryForm({
  category,
  onSaved,
}: {
  category?: Category;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!category) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      name: category.name,
      nameAr: category.nameAr,
      type: category.type,
      imageUrl: category.imageUrl ?? "",
    });
  }, [category]);

  const isSaving = createCategory.isPending || updateCategory.isPending;
  const canSave = form.name.trim().length > 0 && form.nameAr.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) return;

    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      type: form.type as CreateCategoryBodyType,
      imageUrl: form.imageUrl.trim() || null,
    };

    if (category) {
      await updateCategory.mutateAsync({ id: category.id, data: payload });
    } else {
      await createCategory.mutateAsync({ data: payload });
      setForm(EMPTY_FORM);
    }

    await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    onSaved();
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category-name-ar">الاسم العربي</Label>
          <Input
            id="category-name-ar"
            value={form.nameAr}
            onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
            placeholder="فساتين"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category-name">الاسم الداخلي</Label>
          <Input
            id="category-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Dresses"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>النوع</Label>
        <Select
          value={form.type}
          onValueChange={(value) => setForm((current) => ({ ...current, type: value as CategoryFormState["type"] }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fashion">أزياء</SelectItem>
            <SelectItem value="cosmetics">تجميل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ImageUpload
        label="صورة الفئة"
        value={form.imageUrl}
        onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
      />

      <Button className="w-full gap-2" onClick={handleSave} disabled={!canSave}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : category ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {category ? "حفظ التعديلات" : "إضافة الفئة"}
      </Button>
    </div>
  );
}

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();
  const { isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div className="container mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tags className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">الفئات</h1>
          </div>
          <p className="text-muted-foreground">إدارة فئات المنتجات التي تظهر في المتجر</p>
        </div>

        {isAuthenticated && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة فئة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة فئة جديدة</DialogTitle>
              </DialogHeader>
              <CategoryForm onSaved={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {isLoading
          ? Array(6).fill(0).map((_, i) => (
            <motion.div key={i} variants={stagger.item}>
              <Skeleton className="h-72 w-full rounded-xl" />
            </motion.div>
          ))
          : categories?.map((cat) => {
            const canEdit = isAuthenticated && (cat as Category & { tenantId?: number | null }).tenantId !== null;
            return (
              <motion.div key={cat.id} variants={stagger.item}>
                <Card className="border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="relative h-36 bg-muted">
                    {cat.imageUrl ? (
                      <img
                        src={productImageUrl(cat.imageUrl)}
                        alt={cat.nameAr}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/10">
                        <ImageIcon className="w-10 h-10 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground truncate">{cat.nameAr}</h2>
                        <p className="text-sm text-muted-foreground truncate" dir="ltr">{cat.name}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {TYPE_LABELS[cat.type] ?? cat.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{cat.productCount} منتج</p>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5">
                        <Link href={`/products?categoryId=${cat.id}`}>
                          <Eye className="w-3.5 h-3.5" />
                          المنتجات
                        </Link>
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(cat)}>
                          <Edit className="w-3.5 h-3.5" />
                          تعديل
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
      </motion.div>

      {!isLoading && categories?.length === 0 && (
        <div className="text-center py-24">
          <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">لا توجد فئات بعد</p>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الفئة</DialogTitle>
          </DialogHeader>
          {editing && <CategoryForm category={editing} onSaved={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
