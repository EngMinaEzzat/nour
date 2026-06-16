import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, productVariantsTable, tenantsTable } from "@workspace/db";
import { eq, and, lte, sql, ne, asc } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

/* ─── GET /api/inventory-alerts — list low-stock products ─── */
router.get("/inventory-alerts", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;

  try {
    const [tenant] = await db
      .select({ globalThreshold: tenantsTable.lowStockThreshold })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    const globalThreshold = tenant?.globalThreshold ?? 5;

    // All non-hidden products with effective threshold
    const allProducts = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        status: productsTable.status,
        lowStockThreshold: productsTable.lowStockThreshold,
        price: productsTable.price,
      })
      .from(productsTable)
      .where(and(eq(productsTable.tenantId, tenantId), ne(productsTable.status, "hidden")))
      .orderBy(asc(productsTable.stock));

    const lowStock = allProducts
      .map((p) => ({
        ...p,
        price: parseFloat(p.price),
        effectiveThreshold: p.lowStockThreshold ?? globalThreshold,
      }))
      .filter((p) => p.stock <= p.effectiveThreshold);

    // Stats over all products
    const totalProducts = allProducts.length;
    const outOfStock = allProducts.filter((p) => p.stock === 0).length;
    const critical = allProducts.filter((p) => p.stock > 0 && p.stock <= 3).length;
    const lowStockCount = lowStock.filter((p) => p.stock > 0).length;

    res.json({
      globalThreshold,
      stats: { totalProducts, outOfStock, critical, lowStockCount },
      lowStock,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

/* ─── PUT /api/inventory-alerts/settings — update global threshold ─── */
router.put("/inventory-alerts/settings", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { globalThreshold } = req.body as { globalThreshold?: number };

  if (globalThreshold === undefined || isNaN(Number(globalThreshold)) || Number(globalThreshold) < 0) {
    return res.status(400).json({ error: "الحد الأدنى يجب أن يكون رقماً موجباً" });
  }

  try {
    await db
      .update(tenantsTable)
      .set({ lowStockThreshold: Number(globalThreshold) })
      .where(eq(tenantsTable.id, tenantId));

    res.json({ ok: true, globalThreshold: Number(globalThreshold) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل الحفظ" });
  }
});

/* ─── PUT /api/inventory-alerts/product/:id — update per-product threshold ─── */
router.put("/inventory-alerts/product/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const productId = parseInt(String(req.params.id), 10);
  if (isNaN(productId)) return res.status(400).json({ error: "معرّف المنتج غير صالح" });
  const { threshold } = req.body as { threshold?: number | null };

  try {
    const [updated] = await db
      .update(productsTable)
      .set({ lowStockThreshold: threshold === null ? null : Number(threshold) })
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)))
      .returning({ id: productsTable.id, lowStockThreshold: productsTable.lowStockThreshold });

    if (!updated) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json({ ok: true, lowStockThreshold: updated.lowStockThreshold });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل الحفظ" });
  }
});

/* ─── POST /api/inventory-alerts/notify — generate WhatsApp summary ─── */
router.post("/inventory-alerts/notify", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { phone } = req.body as { phone?: string };

  if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب" });

  try {
    const [tenant] = await db
      .select({ name: tenantsTable.name, globalThreshold: tenantsTable.lowStockThreshold })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    const products = await db
      .select({ name: productsTable.name, stock: productsTable.stock, lowStockThreshold: productsTable.lowStockThreshold })
      .from(productsTable)
      .where(and(eq(productsTable.tenantId, tenantId), ne(productsTable.status, "hidden")))
      .orderBy(asc(productsTable.stock));

    const globalThreshold = tenant?.globalThreshold ?? 5;
    const lowStock = products
      .map((p) => ({ ...p, effectiveThreshold: p.lowStockThreshold ?? globalThreshold }))
      .filter((p) => p.stock <= p.effectiveThreshold);

    if (lowStock.length === 0) {
      return res.status(400).json({ error: "لا توجد منتجات منخفضة المخزون حالياً" });
    }

    const storeName = tenant?.name ?? "متجرك";
    const date = new Date().toLocaleDateString("ar-EG");
    const lines = lowStock
      .map((p) => `• ${p.name} — ${p.stock === 0 ? "⚠️ نفذ المخزون" : `${p.stock} قطعة متبقية`}`)
      .join("\n");

    const message = [
      `🛍️ تنبيه مخزون — ${storeName}`,
      `📅 ${date}`,
      "",
      "المنتجات التي تحتاج لإعادة تخزين:",
      "",
      lines,
      "",
      `إجمالي المنتجات: ${lowStock.length} منتج`
    ].join("\n");

    const cleanPhone = phone.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

    res.json({ waUrl, message, count: lowStock.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

export default router;
