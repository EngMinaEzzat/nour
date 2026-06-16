import { Router } from "express";
import { db } from "@workspace/db";
import { discountCodesTable, discountCodeUsesTable, tenantsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

function calcDiscount(type: string, value: number, subtotal: number): number {
  if (type === "percentage") return Math.min((subtotal * value) / 100, subtotal);
  if (type === "fixed") return Math.min(value, subtotal);
  if (type === "free_shipping") return 0;
  return 0;
}

// GET /discounts — merchant: list codes for logged-in tenant
router.get("/discounts", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  try {
    const codes = await db
      .select()
      .from(discountCodesTable)
      .where(eq(discountCodesTable.tenantId, tenantId))
      .orderBy(desc(discountCodesTable.createdAt));
    res.json(codes.map((c) => ({
      ...c,
      value: parseFloat(c.value as string),
      minOrderAmount: c.minOrderAmount ? parseFloat(c.minOrderAmount as string) : null,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      startsAt: c.startsAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// POST /discounts — merchant: create code
router.post("/discounts", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  const { code, type, value, minOrderAmount, maxUses, expiresAt, startsAt } = req.body;
  if (!code || !type || value === undefined) return res.status(400).json({ error: "الكود والنوع والقيمة مطلوبة" });
  if (!["percentage", "fixed", "free_shipping"].includes(type)) return res.status(400).json({ error: "نوع الخصم غير صحيح" });
  if (type === "percentage" && (value < 1 || value > 100)) return res.status(400).json({ error: "نسبة الخصم يجب أن تكون بين 1 و 100" });

  try {
    const [existing] = await db.select({ id: discountCodesTable.id })
      .from(discountCodesTable)
      .where(and(eq(discountCodesTable.tenantId, tenantId), eq(sql`UPPER(${discountCodesTable.code})`, code.toUpperCase())));
    if (existing) return res.status(409).json({ error: "كود الخصم موجود مسبقاً" });

    const [row] = await db.insert(discountCodesTable).values({
      tenantId,
      code: code.toUpperCase().trim(),
      type,
      value: String(value),
      minOrderAmount: minOrderAmount ? String(minOrderAmount) : null,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      startsAt: startsAt ? new Date(startsAt) : null,
    }).returning();
    res.status(201).json({ ...row, value: parseFloat(row.value as string) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// PUT /discounts/:id — merchant: update code
router.put("/discounts/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  const id = parseInt(String(req.params.id), 10);
  const { active, value, minOrderAmount, maxUses, expiresAt, type } = req.body;

  try {
    const [existing] = await db.select().from(discountCodesTable)
      .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "الكود غير موجود" });

    const updates: Partial<typeof discountCodesTable.$inferInsert> = {};
    if (active !== undefined) updates.active = active;
    if (value !== undefined) updates.value = String(value);
    if (minOrderAmount !== undefined) updates.minOrderAmount = minOrderAmount ? String(minOrderAmount) : null;
    if (maxUses !== undefined) updates.maxUses = maxUses ?? null;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (type !== undefined) updates.type = type;

    const [updated] = await db.update(discountCodesTable)
      .set(updates)
      .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.tenantId, tenantId)))
      .returning();
    res.json({ ...updated, value: parseFloat(updated.value as string) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// DELETE /discounts/:id — merchant: delete code
router.delete("/discounts/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  const id = parseInt(String(req.params.id), 10);
  try {
    const [existing] = await db.select({ id: discountCodesTable.id })
      .from(discountCodesTable)
      .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "الكود غير موجود" });
    await db.delete(discountCodesTable).where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.tenantId, tenantId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// POST /discounts/validate — public: validate a code for checkout
router.post("/discounts/validate", async (req, res) => {
  const { code, tenantId, subtotal } = req.body;
  if (!code || !tenantId || subtotal === undefined) return res.status(400).json({ error: "code, tenantId, subtotal مطلوبة" });

  try {
    const [row] = await db.select().from(discountCodesTable)
      .where(and(
        eq(discountCodesTable.tenantId, tenantId),
        eq(sql`UPPER(${discountCodesTable.code})`, code.toString().toUpperCase()),
        eq(discountCodesTable.active, true),
      ));

    if (!row) return res.status(404).json({ valid: false, error: "كود الخصم غير صحيح" });

    const now = new Date();
    if (row.expiresAt && row.expiresAt < now) return res.status(410).json({ valid: false, error: "انتهت صلاحية كود الخصم" });
    if (row.startsAt && row.startsAt > now) return res.status(400).json({ valid: false, error: "كود الخصم لم يبدأ بعد" });
    if (row.maxUses !== null && row.usedCount >= row.maxUses) return res.status(410).json({ valid: false, error: "تجاوز كود الخصم الحد الأقصى للاستخدام" });

    const minOrder = row.minOrderAmount ? parseFloat(row.minOrderAmount as string) : 0;
    if (subtotal < minOrder) return res.status(400).json({
      valid: false,
      error: `الحد الأدنى للطلب هو ${minOrder.toLocaleString("ar-EG")} ج.م لاستخدام هذا الكود`,
    });

    const discountValue = parseFloat(row.value as string);
    const discountAmount = calcDiscount(row.type, discountValue, subtotal);

    res.json({
      valid: true,
      codeId: row.id,
      type: row.type,
      value: discountValue,
      discountAmount,
      finalTotal: subtotal - discountAmount,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// POST /discounts/use — record discount code usage after order creation
router.post("/discounts/use", async (req, res) => {
  return res.status(410).json({ error: "Discount usage is recorded during checkout" });
});

export default router;
