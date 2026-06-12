import { Router } from "express";
import { db } from "@workspace/db";
import { stockAdjustmentLogsTable, productsTable, productVariantsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

/* ─── List stock adjustments for a tenant ─── */
router.get("/stock/adjustments", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const productId = req.query.productId ? Number(req.query.productId) : null;

  try {
    const conditions = [eq(stockAdjustmentLogsTable.tenantId, tenantId)];
    if (productId) conditions.push(eq(stockAdjustmentLogsTable.productId, productId));

    const logs = await db
      .select({
        id: stockAdjustmentLogsTable.id,
        tenantId: stockAdjustmentLogsTable.tenantId,
        productId: stockAdjustmentLogsTable.productId,
        variantId: stockAdjustmentLogsTable.variantId,
        oldStock: stockAdjustmentLogsTable.oldStock,
        newStock: stockAdjustmentLogsTable.newStock,
        delta: stockAdjustmentLogsTable.delta,
        source: stockAdjustmentLogsTable.source,
        reason: stockAdjustmentLogsTable.reason,
        orderId: stockAdjustmentLogsTable.orderId,
        createdAt: stockAdjustmentLogsTable.createdAt,
        productName: productsTable.name,
      })
      .from(stockAdjustmentLogsTable)
      .leftJoin(productsTable, eq(stockAdjustmentLogsTable.productId, productsTable.id))
      .where(and(...conditions))
      .orderBy(desc(stockAdjustmentLogsTable.createdAt))
      .limit(200);

    res.json(logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب سجلات المخزون" });
  }
});

/* ─── Manual stock adjustment ─── */
router.post("/stock/adjustments", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { productId, variantId, newStock, reason } = req.body as {
    productId?: number;
    variantId?: number;
    newStock?: number;
    reason?: string;
  };

  if (!productId) return res.status(400).json({ error: "productId مطلوب" });
  if (newStock === undefined || newStock === null) return res.status(400).json({ error: "newStock مطلوب" });
  if (newStock < 0) return res.status(400).json({ error: "المخزون لا يمكن أن يكون سالباً" });

  try {
    const [product] = await db
      .select({ id: productsTable.id, tenantId: productsTable.tenantId, stock: productsTable.stock, lowStockThreshold: productsTable.lowStockThreshold })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));

    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });

    const oldStock = variantId ? 0 : (product.stock ?? 0);

    let variantOldStock = oldStock;
    if (variantId) {
      const [variant] = await db
        .select({ stock: productVariantsTable.stock })
        .from(productVariantsTable)
        .where(and(
          eq(productVariantsTable.id, variantId),
          eq(productVariantsTable.productId, productId),
        ));
      if (!variant) return res.status(404).json({ error: "المتغير غير موجود" });
      variantOldStock = variant.stock;
    }

    const actualOldStock = variantId ? variantOldStock : product.stock;
    const delta = newStock - actualOldStock;

    await db.transaction(async (tx) => {
      if (variantId) {
        await tx
          .update(productVariantsTable)
          .set({ stock: newStock })
          .where(and(
            eq(productVariantsTable.id, variantId),
            eq(productVariantsTable.productId, productId)
          ));
      } else {
        await tx
          .update(productsTable)
          .set({
            stock: newStock,
            status: newStock === 0 ? "out_of_stock" : "active",
          })
          .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
      }

      await tx.insert(stockAdjustmentLogsTable).values({
        tenantId,
        productId,
        variantId: variantId ?? null,
        oldStock: actualOldStock,
        newStock,
        delta,
        source: "manual",
        reason: reason?.trim() ?? null,
        changedBy: req.session.merchantId ?? null,
      });
    });

    const [updated] = await db
      .select({ stock: productsTable.stock, status: productsTable.status })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));

    res.status(201).json({
      productId,
      variantId: variantId ?? null,
      oldStock: actualOldStock,
      newStock,
      delta,
      currentStock: updated.stock,
      currentStatus: updated.status,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تعديل المخزون" });
  }
});

export default router;
