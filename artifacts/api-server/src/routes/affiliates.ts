import { Router } from "express";
import { db } from "@workspace/db";
import {
  affiliatesTable,
  discountCodesTable,
  discountCodeUsesTable,
  ordersTable,
} from "@workspace/db";
import { eq, and, desc, sum, count, inArray } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

// GET /affiliates — list with computed stats
router.get("/affiliates", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });

  try {
    const affiliates = await db
      .select()
      .from(affiliatesTable)
      .where(eq(affiliatesTable.tenantId, tenantId))
      .orderBy(desc(affiliatesTable.createdAt));

    // ⚡ Bolt Optimization: Use batched queries with inArray and JS Maps to prevent N+1 queries
    const discountCodeIds = affiliates
      .map((a) => a.discountCodeId)
      .filter((id): id is number => id !== null);

    const uniqueDiscountCodeIds = Array.from(new Set(discountCodeIds));

    const discountCodesMap = new Map();
    const statsMap = new Map();

    if (uniqueDiscountCodeIds.length > 0) {
      const [codes, stats] = await Promise.all([
        db
          .select({
            id: discountCodesTable.id,
            code: discountCodesTable.code,
            usedCount: discountCodesTable.usedCount,
          })
          .from(discountCodesTable)
          .where(inArray(discountCodesTable.id, uniqueDiscountCodeIds)),

        db
          .select({
            discountCodeId: discountCodeUsesTable.discountCodeId,
            revenue: sum(ordersTable.totalAmount),
            discount: sum(discountCodeUsesTable.appliedDiscount),
          })
          .from(discountCodeUsesTable)
          .leftJoin(
            ordersTable,
            eq(discountCodeUsesTable.orderId, ordersTable.id),
          )
          .where(
            inArray(
              discountCodeUsesTable.discountCodeId,
              uniqueDiscountCodeIds,
            ),
          )
          .groupBy(discountCodeUsesTable.discountCodeId),
      ]);

      codes.forEach((c) => discountCodesMap.set(c.id, c));
      stats.forEach((s) => statsMap.set(s.discountCodeId, s));
    }

    const enriched = affiliates.map((a) => {
      let promoCode: string | null = null;
      let uses = 0;
      let totalRevenue = 0;
      let totalDiscount = 0;

      if (a.discountCodeId) {
        const dc = discountCodesMap.get(a.discountCodeId);
        if (dc) {
          promoCode = dc.code;
          uses = dc.usedCount;

          const st = statsMap.get(a.discountCodeId);
          if (st) {
            totalRevenue = parseFloat(st.revenue ?? "0");
            totalDiscount = parseFloat(st.discount ?? "0");
          }
        }
      }

      const commissionValue = parseFloat(a.commissionValue as string);
      const commissionDue =
        a.commissionType === "percent"
          ? (totalRevenue * commissionValue) / 100
          : uses * commissionValue;

      return {
        ...a,
        commissionValue,
        promoCode,
        uses,
        totalRevenue,
        totalDiscount,
        commissionDue,
        createdAt: a.createdAt.toISOString(),
      };
    });

    res.json({ affiliates: enriched });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// POST /affiliates — create affiliate + auto-create promo code
router.post(
  "/affiliates",
  requireRole("owner", "manager"),
  async (req, res) => {
    const tenantId = req.merchantTenantId;
    if (!tenantId) return res.status(401).json({ error: "غير مصرح" });

    const {
      name,
      handle,
      platform,
      promoCode,
      discountType,
      discountValue,
      commissionType,
      commissionValue,
      notes,
    } = req.body;

    if (
      !name ||
      !handle ||
      !platform ||
      !promoCode ||
      !discountType ||
      discountValue === undefined ||
      !commissionType ||
      commissionValue === undefined
    ) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }
    if (!["instagram", "tiktok", "youtube", "other"].includes(platform)) {
      return res.status(400).json({ error: "المنصة غير صحيحة" });
    }
    if (!["percent", "flat"].includes(commissionType)) {
      return res.status(400).json({ error: "نوع العمولة غير صحيح" });
    }

    try {
      // Check promo code uniqueness
      const [existing] = await db
        .select({ id: discountCodesTable.id })
        .from(discountCodesTable)
        .where(
          and(
            eq(discountCodesTable.tenantId, tenantId),
            eq(discountCodesTable.code, promoCode.toUpperCase().trim()),
          ),
        );
      if (existing)
        return res
          .status(409)
          .json({ error: "كود الخصم هذا مستخدم بالفعل، اختر كوداً مختلفاً" });

      // Create discount code
      const [dc] = await db
        .insert(discountCodesTable)
        .values({
          tenantId,
          code: promoCode.toUpperCase().trim(),
          type: discountType,
          value: String(discountValue),
          active: true,
        })
        .returning();

      // Create affiliate linked to the discount code
      const [affiliate] = await db
        .insert(affiliatesTable)
        .values({
          tenantId,
          name,
          handle: handle.trim(),
          platform,
          discountCodeId: dc.id,
          commissionType,
          commissionValue: String(commissionValue),
          notes: notes ?? null,
          active: true,
        })
        .returning();

      res.status(201).json({
        ...affiliate,
        commissionValue: parseFloat(affiliate.commissionValue as string),
        promoCode: dc.code,
        uses: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        commissionDue: 0,
        createdAt: affiliate.createdAt.toISOString(),
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "خطأ في السيرفر" });
    }
  },
);

// PUT /affiliates/:id — update active / commission / notes
router.put(
  "/affiliates/:id",
  requireRole("owner", "manager"),
  async (req, res) => {
    const tenantId = req.merchantTenantId;
    if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
    const id = parseInt(String(req.params.id), 10);

    try {
      const [existing] = await db
        .select()
        .from(affiliatesTable)
        .where(
          and(
            eq(affiliatesTable.id, id),
            eq(affiliatesTable.tenantId, tenantId),
          ),
        );
      if (!existing) return res.status(404).json({ error: "المؤثر غير موجود" });

      const updates: Partial<typeof affiliatesTable.$inferInsert> = {};
      if (req.body.active !== undefined) updates.active = req.body.active;
      if (req.body.commissionValue !== undefined)
        updates.commissionValue = String(req.body.commissionValue);
      if (req.body.commissionType !== undefined)
        updates.commissionType = req.body.commissionType;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;

      const [updated] = await db
        .update(affiliatesTable)
        .set(updates)
        .where(eq(affiliatesTable.id, id))
        .returning();

      res.json({
        ...updated,
        commissionValue: parseFloat(updated.commissionValue as string),
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "خطأ في السيرفر" });
    }
  },
);

// DELETE /affiliates/:id
router.delete(
  "/affiliates/:id",
  requireRole("owner", "manager"),
  async (req, res) => {
    const tenantId = req.merchantTenantId;
    if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
    const id = parseInt(String(req.params.id), 10);

    try {
      const [existing] = await db
        .select()
        .from(affiliatesTable)
        .where(
          and(
            eq(affiliatesTable.id, id),
            eq(affiliatesTable.tenantId, tenantId),
          ),
        );
      if (!existing) return res.status(404).json({ error: "المؤثر غير موجود" });
      await db.delete(affiliatesTable).where(eq(affiliatesTable.id, id));
      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "خطأ في السيرفر" });
    }
  },
);

export default router;
