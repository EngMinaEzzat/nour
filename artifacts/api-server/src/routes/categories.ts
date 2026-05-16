import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable, merchantsTable } from "@workspace/db";
import { CreateCategoryBody, UpdateCategoryBody } from "@workspace/api-zod";
import { count, eq, or, isNull, and } from "drizzle-orm";
import { requireAuth } from "../middleware/require-role";
import { cache } from "../lib/cache.js";

const router = Router();

async function validateParentCategory(params: {
  tenantId: number;
  parentId: number | null | undefined;
  categoryId?: number;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { tenantId, parentId, categoryId } = params;
  if (parentId == null) return { ok: true };

  if (categoryId !== undefined && parentId === categoryId) {
    return { ok: false, status: 400, error: "Category cannot be its own parent" };
  }

  let currentParentId: number | null = parentId;
  const seen = new Set<number>();

  while (currentParentId != null) {
    if (seen.has(currentParentId)) {
      return { ok: false, status: 400, error: "Category parent chain contains a cycle" };
    }
    seen.add(currentParentId);

    const [parent] = await db
      .select({
        id: categoriesTable.id,
        tenantId: categoriesTable.tenantId,
        parentId: categoriesTable.parentId,
      })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, currentParentId));

    if (!parent) {
      return { ok: false, status: 400, error: "Parent category does not exist" };
    }

    if (parent.tenantId !== null && parent.tenantId !== tenantId) {
      return { ok: false, status: 400, error: "Parent category belongs to another tenant" };
    }

    if (parent.parentId !== null) {
      return { ok: false, status: 400, error: "Parent category must be a top-level category" };
    }

    if (categoryId !== undefined && parent.id === categoryId) {
      return { ok: false, status: 400, error: "Category cannot be nested under itself" };
    }

    currentParentId = parent.parentId;
  }

  return { ok: true };
}

router.get("/categories", async (req, res) => {
  try {
    const tenantIdParam = req.query.tenantId ? Number(req.query.tenantId) : null;
    const sessionMerchantId = req.session.merchantId;

    let tenantId: number | null = tenantIdParam;

    if (!tenantId && sessionMerchantId) {
      const [merchant] = await db
        .select({ tenantId: merchantsTable.tenantId })
        .from(merchantsTable)
        .where(eq(merchantsTable.id, sessionMerchantId));
      tenantId = merchant?.tenantId ?? null;
    }

    const categories = tenantId
      ? await db
          .select()
          .from(categoriesTable)
          .where(
            or(
              eq(categoriesTable.tenantId, tenantId),
              isNull(categoriesTable.tenantId)
            )
          )
          .orderBy(categoriesTable.name)
      : await db.select().from(categoriesTable).orderBy(categoriesTable.name);

    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const conditions = [eq(productsTable.categoryId, cat.id)];
        if (tenantId) conditions.push(eq(productsTable.tenantId, tenantId));
        const [{ total }] = await db
          .select({ total: count() })
          .from(productsTable)
          .where(and(...conditions));
        return { ...cat, productCount: total };
      })
    );
    res.json(withCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الفئات" });
  }
});

router.post("/categories", requireAuth, async (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));
    if (!merchant) return res.status(401).json({ error: "غير مصرح" });

    const parentValidation = await validateParentCategory({
      tenantId: merchant.tenantId,
      parentId: parsed.data.parentId,
    });
    if (!parentValidation.ok) {
      return res.status(parentValidation.status).json({ error: parentValidation.error });
    }

    const [category] = await db
      .insert(categoriesTable)
      .values({ ...parsed.data, tenantId: merchant.tenantId })
      .returning();
    
    await cache.invalidateTenant(merchant.tenantId);
    res.status(201).json({ ...category, productCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء الفئة" });
  }
});

router.put("/categories/:id", requireAuth, async (req, res) => {
  const categoryId = Number(req.params.id);
  if (Number.isNaN(categoryId)) return res.status(400).json({ error: "معرّف الفئة غير صحيح" });

  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));
    if (!merchant) return res.status(401).json({ error: "غير مصرح" });

    const updateData: Partial<typeof categoriesTable.$inferInsert> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.nameAr !== undefined) updateData.nameAr = parsed.data.nameAr;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.parentId !== undefined) updateData.parentId = parsed.data.parentId;
    if ("imageUrl" in req.body) updateData.imageUrl = parsed.data.imageUrl ?? null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "لا توجد تغييرات للحفظ" });
    }

    if (parsed.data.parentId !== undefined) {
      const parentValidation = await validateParentCategory({
        tenantId: merchant.tenantId,
        parentId: parsed.data.parentId,
        categoryId,
      });
      if (!parentValidation.ok) {
        return res.status(parentValidation.status).json({ error: parentValidation.error });
      }
    }

    const [category] = await db
      .update(categoriesTable)
      .set(updateData)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.tenantId, merchant.tenantId)))
      .returning();

    if (!category) return res.status(404).json({ error: "الفئة غير موجودة أو لا يمكن تعديلها" });

    const [{ total }] = await db
      .select({ total: count() })
      .from(productsTable)
      .where(and(eq(productsTable.categoryId, category.id), eq(productsTable.tenantId, merchant.tenantId)));

    await cache.invalidateTenant(merchant.tenantId);
    res.json({ ...category, productCount: total });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث الفئة" });
  }
});

router.delete("/categories/:id", requireAuth, async (req, res) => {
  const categoryId = Number(req.params.id);
  if (Number.isNaN(categoryId)) return res.status(400).json({ error: "Invalid category id" });

  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));
    if (!merchant) return res.status(401).json({ error: "Unauthorized" });

    const [deleted] = await db
      .delete(categoriesTable)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.tenantId, merchant.tenantId)))
      .returning({ id: categoriesTable.id });

    if (!deleted) return res.status(404).json({ error: "Category not found or cannot be deleted" });

    await cache.invalidateTenant(merchant.tenantId);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
