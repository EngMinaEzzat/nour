import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable, merchantsTable } from "@workspace/db";
import { CreateCategoryBody } from "@workspace/api-zod";
import { count, eq, or, isNull, and } from "drizzle-orm";
import { requireAuth } from "../middleware/require-role";

const router = Router();

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

    const [category] = await db
      .insert(categoriesTable)
      .values({ ...parsed.data, tenantId: merchant.tenantId })
      .returning();
    res.status(201).json({ ...category, productCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء الفئة" });
  }
});

export default router;
