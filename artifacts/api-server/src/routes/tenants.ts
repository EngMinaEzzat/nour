import { Router } from "express";
import { db } from "@workspace/db";
import {
  tenantsTable, ordersTable, productsTable, orderItemsTable, merchantsTable,
  tenantSupportNotesTable, planAuditLogTable,
} from "@workspace/db";
import {
  CreateTenantBody, UpdateTenantBody, GetTenantParams,
  UpdateTenantParams, DeleteTenantParams, GetTenantStatsParams,
} from "@workspace/api-zod";
import { eq, count, sum, ilike, or, sql } from "drizzle-orm";
import { requirePlatformAdmin, requireRole } from "../middleware/require-role";
import { getPlan } from "../lib/entitlements";

const router = Router();

function serializeTenant(t: Record<string, unknown>) {
  return {
    ...t,
    createdAt: (t.createdAt as Date).toISOString(),
    subscriptionStartedAt: t.subscriptionStartedAt ? (t.subscriptionStartedAt as Date).toISOString() : null,
    trialEndsAt: t.trialEndsAt ? (t.trialEndsAt as Date).toISOString() : null,
    lastAdminLoginAt: t.lastAdminLoginAt ? (t.lastAdminLoginAt as Date).toISOString() : null,
  };
}

router.get("/tenants", requirePlatformAdmin, async (req, res) => {
  const search = req.query.search as string | undefined;
  try {
    let query = db.select().from(tenantsTable).orderBy(tenantsTable.createdAt).$dynamic();
    if (search) {
      query = query.where(or(
        ilike(tenantsTable.name, `%${search}%`),
        ilike(tenantsTable.slug, `%${search}%`),
      ));
    }
    const tenants = await query;
    res.json(tenants.map(serializeTenant));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المتاجر" });
  }
});

router.post("/tenants", requirePlatformAdmin, async (req, res) => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [tenant] = await db.insert(tenantsTable).values(parsed.data).returning();
    res.status(201).json(serializeTenant(tenant as unknown as Record<string, unknown>));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء المتجر" });
  }
});

router.get("/tenants/:id", requirePlatformAdmin, async (req, res) => {
  const parsed = GetTenantParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف غير صحيح" });
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, parsed.data.id));
    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });
    res.json(serializeTenant(tenant as unknown as Record<string, unknown>));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب بيانات المتجر" });
  }
});

router.put("/tenants/:id", requireRole("owner", "manager"), async (req, res) => {
  const paramsParsed = UpdateTenantParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "معرّف غير صحيح" });
  const bodyParsed = UpdateTenantBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.flatten() });
  if (req.merchantTenantId !== paramsParsed.data.id) {
    return res.status(403).json({ error: "لا يمكنك تعديل بيانات متجر آخر" });
  }

  const updatePayload = { ...bodyParsed.data } as Record<string, unknown>;
  delete updatePayload.planCode;
  delete updatePayload.subscriptionStatus;
  delete updatePayload.status;

  try {
    const [tenant] = await db
      .update(tenantsTable)
      .set(updatePayload)
      .where(eq(tenantsTable.id, paramsParsed.data.id))
      .returning();
    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });
    res.json(serializeTenant(tenant as unknown as Record<string, unknown>));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث بيانات المتجر" });
  }
});

router.delete("/tenants/:id", requirePlatformAdmin, async (req, res) => {
  const parsed = DeleteTenantParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف غير صحيح" });
  try {
    await db.delete(tenantsTable).where(eq(tenantsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف المتجر" });
  }
});

router.get("/tenants/:id/stats", requirePlatformAdmin, async (req, res) => {
  const parsed = GetTenantStatsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف غير صحيح" });
  const tenantId = parsed.data.id;
  try {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode, subscriptionStatus: tenantsTable.subscriptionStatus })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    const [productCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.tenantId, tenantId));
    const [orderStats] = await db
      .select({ totalOrders: count(), totalRevenue: sum(ordersTable.totalAmount) })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenantId));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [recentOrderStats] = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(sql`${ordersTable.tenantId} = ${tenantId} AND ${ordersTable.createdAt} >= ${thirtyDaysAgo}`);

    const customerRows = await db
      .selectDistinct({ customerId: ordersTable.customerId })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenantId));

    const plan = tenant ? getPlan(tenant.planCode) : null;

    res.json({
      tenantId,
      totalProducts: productCount.count,
      totalOrders: orderStats.totalOrders,
      totalRevenue: parseFloat(orderStats.totalRevenue ?? "0"),
      totalCustomers: customerRows.length,
      recentOrders: recentOrderStats.count,
      planCode: tenant?.planCode ?? "starter",
      subscriptionStatus: tenant?.subscriptionStatus ?? "trial",
      productLimit: plan?.productLimit ?? 30,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب إحصائيات المتجر" });
  }
});

/* ─── Platform admin: update plan / subscription status ─── */
router.put("/tenants/:id/plan", requirePlatformAdmin, async (req, res) => {
  const tenantId = Number(req.params.id);
  if (isNaN(tenantId)) return res.status(400).json({ error: "معرّف غير صحيح" });

  const { planCode, subscriptionStatus, note } = req.body as {
    planCode?: string; subscriptionStatus?: string; note?: string;
  };

  const validPlans = ["starter", "growth", "pro"];
  const validStatuses = ["trial", "active", "past_due", "suspended", "canceled"];

  if (planCode && !validPlans.includes(planCode)) {
    return res.status(400).json({ error: "planCode غير صالح" });
  }
  if (subscriptionStatus && !validStatuses.includes(subscriptionStatus)) {
    return res.status(400).json({ error: "subscriptionStatus غير صالح" });
  }

  try {
    const [existing] = await db
      .select({ planCode: tenantsTable.planCode, subscriptionStatus: tenantsTable.subscriptionStatus })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!existing) return res.status(404).json({ error: "المتجر غير موجود" });

    const updateData: Record<string, unknown> = {};
    if (planCode) updateData.planCode = planCode;
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;

    const [updated] = await db
      .update(tenantsTable)
      .set(updateData)
      .where(eq(tenantsTable.id, tenantId))
      .returning();

    await db.insert(planAuditLogTable).values({
      tenantId,
      fromPlan: existing.planCode,
      toPlan: planCode ?? existing.planCode,
      fromSubscriptionStatus: existing.subscriptionStatus,
      toSubscriptionStatus: subscriptionStatus ?? existing.subscriptionStatus,
      changedBy: req.session.merchantId!,
      note: note ?? null,
    });

    res.json(serializeTenant(updated as unknown as Record<string, unknown>));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث خطة المتجر" });
  }
});

/* ─── Platform admin: support notes ─── */
router.get("/tenants/:id/support-notes", requirePlatformAdmin, async (req, res) => {
  const tenantId = Number(req.params.id);
  if (isNaN(tenantId)) return res.status(400).json({ error: "معرّف غير صحيح" });

  try {
    const notes = await db
      .select({
        id: tenantSupportNotesTable.id,
        tenantId: tenantSupportNotesTable.tenantId,
        note: tenantSupportNotesTable.note,
        createdBy: tenantSupportNotesTable.createdBy,
        createdByName: merchantsTable.name,
        createdAt: tenantSupportNotesTable.createdAt,
      })
      .from(tenantSupportNotesTable)
      .leftJoin(merchantsTable, eq(tenantSupportNotesTable.createdBy, merchantsTable.id))
      .where(eq(tenantSupportNotesTable.tenantId, tenantId))
      .orderBy(tenantSupportNotesTable.createdAt);

    res.json(notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب ملاحظات الدعم" });
  }
});

router.post("/tenants/:id/support-notes", requirePlatformAdmin, async (req, res) => {
  const tenantId = Number(req.params.id);
  if (isNaN(tenantId)) return res.status(400).json({ error: "معرّف غير صحيح" });

  const { note } = req.body as { note?: string };
  if (!note || note.trim().length === 0) {
    return res.status(400).json({ error: "الملاحظة مطلوبة" });
  }

  try {
    const [created] = await db
      .insert(tenantSupportNotesTable)
      .values({ tenantId, note: note.trim(), createdBy: req.session.merchantId! })
      .returning();

    res.status(201).json({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء ملاحظة الدعم" });
  }
});

export default router;
