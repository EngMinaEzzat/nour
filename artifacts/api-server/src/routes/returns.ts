import { Router } from "express";
import { db } from "@workspace/db";
import { returnCasesTable, ordersTable, customersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

/* ─── List return cases ─── */
router.get("/returns", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const orderId = req.query.orderId ? Number(req.query.orderId) : null;

  try {
    const conditions = [eq(returnCasesTable.tenantId, tenantId)];
    if (orderId) conditions.push(eq(returnCasesTable.orderId, orderId));

    const cases = await db
      .select({
        id: returnCasesTable.id,
        tenantId: returnCasesTable.tenantId,
        orderId: returnCasesTable.orderId,
        status: returnCasesTable.status,
        reason: returnCasesTable.reason,
        requestedItems: returnCasesTable.requestedItems,
        note: returnCasesTable.note,
        createdAt: returnCasesTable.createdAt,
        updatedAt: returnCasesTable.updatedAt,
        customerName: customersTable.name,
        customerPhone: ordersTable.customerPhone,
        orderTotal: ordersTable.totalAmount,
      })
      .from(returnCasesTable)
      .leftJoin(ordersTable, eq(returnCasesTable.orderId, ordersTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(desc(returnCasesTable.createdAt));

    res.json(cases.map((c) => ({
      ...c,
      orderTotal: c.orderTotal ? parseFloat(c.orderTotal as string) : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب طلبات الإرجاع" });
  }
});

/* ─── Get single return case ─── */
router.get("/returns/:id", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "معرف غير صالح" });

  try {
    const [rc] = await db
      .select({
        id: returnCasesTable.id,
        tenantId: returnCasesTable.tenantId,
        orderId: returnCasesTable.orderId,
        status: returnCasesTable.status,
        reason: returnCasesTable.reason,
        requestedItems: returnCasesTable.requestedItems,
        note: returnCasesTable.note,
        createdAt: returnCasesTable.createdAt,
        updatedAt: returnCasesTable.updatedAt,
        customerName: customersTable.name,
        customerPhone: ordersTable.customerPhone,
        orderTotal: ordersTable.totalAmount,
      })
      .from(returnCasesTable)
      .leftJoin(ordersTable, eq(returnCasesTable.orderId, ordersTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(and(eq(returnCasesTable.id, id), eq(returnCasesTable.tenantId, tenantId)));

    if (!rc) return res.status(404).json({ error: "طلب الإرجاع غير موجود" });

    res.json({
      ...rc,
      orderTotal: rc.orderTotal ? parseFloat(rc.orderTotal as string) : null,
      createdAt: rc.createdAt.toISOString(),
      updatedAt: rc.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب طلب الإرجاع" });
  }
});

/* ─── Create return case ─── */
router.post("/returns", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { orderId, reason, requestedItems, note } = req.body as {
    orderId?: number;
    reason?: string;
    requestedItems?: unknown;
    note?: string;
  };

  if (!orderId) return res.status(400).json({ error: "orderId مطلوب" });
  if (!reason) return res.status(400).json({ error: "السبب مطلوب" });

  try {
    const [order] = await db
      .select({ tenantId: ordersTable.tenantId })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
    if (order.tenantId !== tenantId) return res.status(403).json({ error: "لا يمكنك إنشاء طلب إرجاع لطلب لمتجر آخر" });

    const [rc] = await db
      .insert(returnCasesTable)
      .values({
        tenantId,
        orderId,
        reason: reason.trim(),
        requestedItems: requestedItems ?? null,
        note: note?.trim() ?? null,
        handledBy: req.session.merchantId ?? null,
      })
      .returning();

    res.status(201).json({
      ...rc,
      createdAt: rc.createdAt.toISOString(),
      updatedAt: rc.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء طلب الإرجاع" });
  }
});

/* ─── Update return case status / note ─── */
router.put("/returns/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "معرف غير صالح" });

  try {
    const [existing] = await db
      .select({ id: returnCasesTable.id, tenantId: returnCasesTable.tenantId })
      .from(returnCasesTable)
      .where(eq(returnCasesTable.id, id));

    if (!existing) return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "لا يمكنك تعديل طلب إرجاع لمتجر آخر" });

    const { status, note } = req.body as {
      status?: string;
      note?: string;
    };

    const validStatuses = ["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "RESOLVED"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "حالة غير صالحة" });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (note !== undefined) updateData.note = note.trim();

    const [updated] = await db
      .update(returnCasesTable)
      .set(updateData)
      .where(and(eq(returnCasesTable.id, id), eq(returnCasesTable.tenantId, tenantId)))
      .returning();

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تعديل طلب الإرجاع" });
  }
});

export default router;
