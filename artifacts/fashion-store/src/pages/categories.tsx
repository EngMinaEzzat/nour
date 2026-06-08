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
import { useTranslation } from "react-i18next";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

type CategoryFormState = {
  name: string;
  nameAr: string;
  type: "fashion" | "cosmetics" | "clinic" | "electronics" | "bistro" | "spare_parts";
  imageUrl: string;
  parentId: number | null;
};

const EMPTY_FORM: CategoryFormState = {
  name: "",
  nameAr: "",
  type: "fashion",
  imageUrl: "",
  parentId: null,
};

function CategoryForm({
  category,
  onSaved,
  categories = [],
}: {
  category?: Category;
  onSaved: () => void;
  categories?: Category[];
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

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
      parentId: category.parentId ?? null,
    });
  }, [category]);

  const isSaving = createCategory.isPending || updateCategory.isPending;
  const canSave = form.name.trim().length > 0 && form.nameAr.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) return;
    setError(null);

    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      type: form.type as CreateCategoryBodyType,
      imageUrl: form.imageUrl.trim() || null,
      parentId: form.parentId,
    };

    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, data: payload });
      } else {
        await createCategory.mutateAsync({ data: payload });
        setForm(EMPTY_FORM);
      }

      await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      onSaved();
    } catch (err: any) {
      console.error("Failed to save category:", err);
      // Try to extract the error message from the response
      const message = err.response?.data?.error || err.message || t("categories.form.errorGeneric");
      setError(typeof message === "string" ? message : JSON.stringify(message));
    }
  }

  // Allow any category except itself and its descendants
  const getDescendants = (id: number): number[] => {
    const children = categories.filter(c => c.parentId === id).map(c => c.id);
    return [...children, ...children.flatMap(getDescendants)];
  };
  const editingDescendants = category ? getDescendants(category.id) : [];
  const availableParents = categories.filter(c => 
    !category || (c.id !== category.id && !editingDescendants.includes(c.id))
  );

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category-name-ar">{t("categories.form.nameArLabel")}</Label>
          <Input
            id="category-name-ar"
            value={form.nameAr}
            onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
            placeholder={t("categories.form.nameArPlaceholder")}
            dir={i18n.language === "ar" ? "rtl" : "auto"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category-name">{t("categories.form.nameLabel")}</Label>
          <Input
            id="category-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t("categories.form.namePlaceholder")}
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label>{t("categories.form.parentLabel")}</Label>
          <Select
            value={form.parentId?.toString() ?? "none"}
            onValueChange={(value) => setForm((current) => ({ ...current, parentId: value === "none" ? null : Number(value), imageUrl: value !== "none" ? "" : current.imageUrl }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("categories.form.parentPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("categories.form.parentNone")}</SelectItem>
              {availableParents.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{i18n.language === "ar" ? p.nameAr : p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.parentId === null && (
        <ImageUpload
          label={t("categories.form.imageLabel")}
          value={form.imageUrl}
          onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
        />
      )}

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <Button className="w-full gap-2" onClick={handleSave} disabled={!canSave}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : category ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {category ? t("categories.form.btnEdit") : t("categories.form.btnAdd")}
      </Button>
    </div>
  );
}

export default function Categories() {
  const { t, i18n } = useTranslation();
  const { data: categories, isLoading } = useListCategories();
  const { isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const rootCategories = categories?.filter((c) => !c.parentId) || [];
  const childrenMap = new Map<number, typeof categories>();
  categories?.forEach((c) => {
    if (c.parentId) {
      if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
      childrenMap.get(c.parentId)!.push(c);
    }
  });

  const orphanCategories = categories?.filter(
    (c) => c.parentId && !rootCategories.find((r) => r.id === c.parentId)
  ) || [];

  const renderCategoryCard = (cat: Category) => {
    const isRoot = !cat.parentId;
    const canEdit = isAuthenticated && (cat as Category & { tenantId?: number | null }).tenantId !== null;

    if (!isRoot) {
      return (
        <motion.div key={cat.id} variants={stagger.item} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Tags className="w-4 h-4 text-primary/60" />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {i18n.language === "ar" ? cat.nameAr : cat.name}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={t("categories.card.btnProducts")}>
              <Link href={`/products?categoryId=${cat.id}`}>
                <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </Link>
            </Button>
            {canEdit && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(cat)} title={t("categories.card.btnEdit")}>
                <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </Button>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key={cat.id} variants={stagger.item} className="h-full">
        <Card className="border-border/50 overflow-hidden hover:shadow-sm transition-shadow h-full flex flex-col">
          {(cat.imageUrl || isRoot) && (
            <div className="relative h-36 bg-muted shrink-0">
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
          )}
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{i18n.language === "ar" ? cat.nameAr : cat.name}</h2>
                {i18n.language === "ar" && (
                  <p className="text-sm text-muted-foreground truncate" dir="ltr">{cat.name}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4 flex-1">{cat.productCount} {t("categories.card.productCount")}</p>
            <div className="flex items-center gap-2 mt-auto">
              <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5">
                <Link href={`/products?categoryId=${cat.id}`}>
                  <Eye className="w-3.5 h-3.5" />
                  {t("categories.card.btnProducts")}
                </Link>
              </Button>
              {canEdit && (
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setEditing(cat)}>
                  <Edit className="w-3.5 h-3.5" />
                  {t("categories.card.btnEdit")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const CategoryAccordionNode = ({ category }: { category: Category }) => {
    const children = childrenMap.get(category.id) || [];
    const canEdit = isAuthenticated && (category as Category & { tenantId?: number | null }).tenantId !== null;
    
    return (
      <Accordion type="multiple" className="w-full mb-4" defaultValue={[category.id.toString()]}>
        <AccordionItem value={category.id.toString()} className="border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b gap-4 flex-wrap sm:flex-nowrap">
            <AccordionTrigger className="hover:no-underline py-0 flex-1 justify-start gap-4">
              <div className="flex items-center gap-4 text-left" dir={i18n.dir()}>
                {category.imageUrl ? (
                  <img src={productImageUrl(category.imageUrl)} className="w-14 h-14 rounded-lg object-cover" alt="" />
                ) : (
                  <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-lg">
                    <ImageIcon className="w-6 h-6 text-primary/40" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-foreground">{i18n.language === "ar" ? category.nameAr : category.name}</h3>
                  <div className="flex items-center gap-2 mt-1">

                    <span className="text-xs text-muted-foreground">{children.length} {t("categories.card.subcategories")} • {category.productCount} {t("categories.card.productCount")}</span>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild size="sm" variant="outline" className="gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Link href={`/products?categoryId=${category.id}`}>
                  <Eye className="w-3.5 h-3.5" />
                  {t("categories.card.btnProducts")}
                </Link>
              </Button>
              {canEdit && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); setEditing(category); }}>
                  <Edit className="w-3.5 h-3.5" />
                  {t("categories.card.btnEdit")}
                </Button>
              )}
            </div>
          </div>
          
          <AccordionContent className="p-4 bg-muted/30 border-t">
            {children.length > 0 ? (
              <div className="flex flex-col gap-2">
                {children.map((child) => {
                  const grandChildren = childrenMap.get(child.id) || [];
                  if (grandChildren.length > 0) {
                    return <CategoryAccordionNode key={child.id} category={child} />;
                  }
                  return (
                    <div key={child.id} className="w-full">
                      {renderCategoryCard(child)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground">{t("categories.card.noSubcategories")}</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <div className="container mx-auto px-4 py-10" dir={i18n.dir()}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tags className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">{t("categories.page.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("categories.page.subtitle")}</p>
        </div>

        {isAuthenticated && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t("categories.page.btnAdd")}
              </Button>
            </DialogTrigger>
            <DialogContent dir={i18n.dir()}>
              <DialogHeader>
                <DialogTitle>{t("categories.page.addTitle")}</DialogTitle>
              </DialogHeader>
              <CategoryForm categories={categories} onSaved={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {rootCategories.map((rootCat) => (
              <CategoryAccordionNode key={rootCat.id} category={rootCat} />
            ))}
          </div>

          {orphanCategories.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">{t("categories.page.orphans")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {orphanCategories.map((child) => renderCategoryCard(child))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && categories?.length === 0 && (
        <div className="text-center py-24">
          <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">{t("categories.page.empty")}</p>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent dir={i18n.dir()}>
          <DialogHeader>
            <DialogTitle>{t("categories.page.editTitle")}</DialogTitle>
          </DialogHeader>
          {editing && <CategoryForm categories={categories} category={editing} onSaved={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
