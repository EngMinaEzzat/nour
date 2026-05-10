import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, ordersTable } from "@workspace/db";
import { CreateCustomerBody, GetCustomerParams } from "@workspace/api-zod";
import { eq, count, sum, inArray, and, sql } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

const CONFIRMED_STATUSES = ["confirmed", "dispatched", "shipped", "delivered"];
const FAILED_STATUSES = ["cancelled", "returned"];

async function getCodScore(customerId: number, tenantId: number) {
  const [confirmed] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.customerId, customerId),
        eq(ordersTable.tenantId, tenantId),
        eq(ordersTable.paymentMethod, "cod"),
        sql`${ordersTable.status}::text = ANY(ARRAY[${sql.raw(CONFIRMED_STATUSES.map((s) => `'${s}'`).join(","))}]::text[])`
      )
    );
  const [failed] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.customerId, customerId),
        eq(ordersTable.tenantId, tenantId),
        eq(ordersTable.paymentMethod, "cod"),
        sql`${ordersTable.status}::text = ANY(ARRAY[${sql.raw(FAILED_STATUSES.map((s) => `'${s}'`).join(","))}]::text[])`
      )
    );
  const [total] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.customerId, customerId),
        eq(ordersTable.tenantId, tenantId),
        eq(ordersTable.paymentMethod, "cod")
      )
    );

  const confirmedCount = confirmed.count;
  const failedCount = failed.count;
  const totalCod = total.count;
  const resolved = confirmedCount + failedCount;
  const confirmationRate = resolved > 0 ? Math.round((confirmedCount / resolved) * 100) : null;

  return {
    codTotalOrders: totalCod,
    codConfirmedOrders: confirmedCount,
    codCancelledOrders: failedCount,
    codConfirmationRate: confirmationRate,
  };
}

// GET /customers — tenant-scoped: only returns customers who have orders in this tenant
router.get("/customers", requireRole("owner", "manager", "staff", "order_operator"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const tenantOrders = await db
      .select({ customerId: ordersTable.customerId })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenantId));

    const customerIds = [...new Set(tenantOrders.map((o) => o.customerId).filter((id): id is number => id !== null))];

    if (customerIds.length === 0) return res.json([]);

    const customers = await db
      .select()
      .from(customersTable)
      .where(inArray(customersTable.id, customerIds))
      .orderBy(customersTable.createdAt);

    const result = await Promise.all(
      customers.map(async (c) => {
        const [stats] = await db
          .select({ totalOrders: count(), totalSpent: sum(ordersTable.totalAmount) })
          .from(ordersTable)
          .where(and(eq(ordersTable.customerId, c.id), eq(ordersTable.tenantId, tenantId)));

        const codScore = await getCodScore(c.id, tenantId);

        return {
          ...c,
          totalOrders: stats.totalOrders,
          totalSpent: parseFloat(stats.totalSpent ?? "0"),
          createdAt: c.createdAt.toISOString(),
          ...codScore,
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب العملاء" });
  }
});

// POST /customers — public (called by storefront during checkout)
router.post("/customers", async (req, res) => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const existing = await db.select().from(customersTable).where(eq(customersTable.email, parsed.data.email));
    if (existing.length > 0) {
      const c = existing[0];
      // SECURITY: Return only id and name to prevent PII harvesting via email-based lookup.
      // The buyer context only needs the ID for the subsequent order creation.
      return res.status(200).json({
        id: c.id,
        name: c.name,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: c.createdAt.toISOString(),
      });
    }
    const [customer] = await db.insert(customersTable).values(parsed.data).returning();
    // SECURITY: Return only id and name to be consistent with the existing customer path.
    res.status(201).json({
      id: customer.id,
      name: customer.name,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: customer.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء العميل" });
  }
});

// GET /customers/:id — only accessible if this customer has orders in the merchant's tenant
router.get("/customers/:id", requireRole("owner", "manager", "staff", "order_operator"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const parsed = GetCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف غير صحيح" });
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, parsed.data.id));
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });

    const [tenantOrder] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(eq(ordersTable.customerId, parsed.data.id), eq(ordersTable.tenantId, tenantId)))
      .limit(1);

    if (!tenantOrder) return res.status(403).json({ error: "غير مصرح" });

    const [stats] = await db
      .select({ totalOrders: count(), totalSpent: sum(ordersTable.totalAmount) })
      .from(ordersTable)
      .where(and(eq(ordersTable.customerId, parsed.data.id), eq(ordersTable.tenantId, tenantId)));

    const codScore = await getCodScore(parsed.data.id, tenantId);

    res.json({
      ...customer,
      totalOrders: stats.totalOrders,
      totalSpent: parseFloat(stats.totalSpent ?? "0"),
      createdAt: customer.createdAt.toISOString(),
      ...codScore,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب بيانات العميل" });
  }
});

export default router;
