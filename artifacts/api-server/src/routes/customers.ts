import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, ordersTable } from "@workspace/db";
import { CreateCustomerBody, GetCustomerParams } from "@workspace/api-zod";
import { eq, count, sum, inArray, and, sql } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";
import { checkoutLimiter } from "../lib/rate-limiters.js";

const router = Router();

const CONFIRMED_STATUSES = ["confirmed", "dispatched", "shipped", "delivered"];
const FAILED_STATUSES = ["cancelled", "returned"];

async function getCodScore(customerId: number, tenantId: number) {
  const [stats] = await db
    .select({
      totalCod: count(),
      confirmedCount: sql<number>`count(*) filter (where ${ordersTable.status} in ('confirmed', 'dispatched', 'shipped', 'delivered'))`,
      failedCount: sql<number>`count(*) filter (where ${ordersTable.status} in ('cancelled', 'returned'))`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.customerId, customerId),
        eq(ordersTable.tenantId, tenantId),
        eq(ordersTable.paymentMethod, "cod"),
      ),
    );

  const confirmedCount = Number(stats?.confirmedCount || 0);
  const failedCount = Number(stats?.failedCount || 0);
  const totalCod = Number(stats?.totalCod || 0);

  const resolved = confirmedCount + failedCount;
  const confirmationRate =
    resolved > 0 ? Math.round((confirmedCount / resolved) * 100) : null;

  return {
    codTotalOrders: totalCod,
    codConfirmedOrders: confirmedCount,
    codCancelledOrders: failedCount,
    codConfirmationRate: confirmationRate,
  };
}

// GET /customers — tenant-scoped: only returns customers who have orders in this tenant
router.get(
  "/customers",
  requireRole("owner", "manager", "staff", "order_operator"),
  async (req, res) => {
    const tenantId = req.merchantTenantId!;
    try {
      const tenantOrders = await db
        .select({ customerId: ordersTable.customerId })
        .from(ordersTable)
        .where(eq(ordersTable.tenantId, tenantId));

      const customerIds = [
        ...new Set(
          tenantOrders
            .map((o) => o.customerId)
            .filter((id): id is number => id !== null),
        ),
      ];

      if (customerIds.length === 0) return res.json([]);

      const customers = await db
        .select()
        .from(customersTable)
        .where(inArray(customersTable.id, customerIds))
        .orderBy(customersTable.createdAt);

      // ⚡ Bolt Optimization: Replace Promise.all loop mapping with batched inArray and JS Map to fix N+1 issue
      const orderStatsList = await db
        .select({
          customerId: ordersTable.customerId,
          totalOrders: count(),
          totalSpent: sum(ordersTable.totalAmount),
          totalCod: sql<number>`count(*) filter (where ${ordersTable.paymentMethod} = 'cod')`,
          confirmedCount: sql<number>`count(*) filter (where ${ordersTable.paymentMethod} = 'cod' and ${ordersTable.status} in ('confirmed', 'dispatched', 'shipped', 'delivered'))`,
          failedCount: sql<number>`count(*) filter (where ${ordersTable.paymentMethod} = 'cod' and ${ordersTable.status} in ('cancelled', 'returned'))`,
        })
        .from(ordersTable)
        .where(
          and(
            inArray(ordersTable.customerId, customerIds),
            eq(ordersTable.tenantId, tenantId),
          ),
        )
        .groupBy(ordersTable.customerId);

      const statsMap = new Map(
        orderStatsList.map((stat) => {
          const confirmedCount = Number(stat.confirmedCount || 0);
          const failedCount = Number(stat.failedCount || 0);
          const totalCod = Number(stat.totalCod || 0);

          const resolved = confirmedCount + failedCount;
          const confirmationRate =
            resolved > 0 ? Math.round((confirmedCount / resolved) * 100) : null;

          return [
            stat.customerId,
            {
              totalOrders: Number(stat.totalOrders || 0),
              totalSpent: parseFloat(stat.totalSpent || "0"),
              codTotalOrders: totalCod,
              codConfirmedOrders: confirmedCount,
              codCancelledOrders: failedCount,
              codConfirmationRate: confirmationRate,
            },
          ];
        }),
      );

      const result = customers.map((c) => {
        const stats = statsMap.get(c.id) || {
          totalOrders: 0,
          totalSpent: 0,
          codTotalOrders: 0,
          codConfirmedOrders: 0,
          codCancelledOrders: 0,
          codConfirmationRate: null,
        };

        return {
          ...c,
          ...stats,
          createdAt: c.createdAt.toISOString(),
        };
      });
      res.json(result);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل جلب العملاء" });
    }
  },
);

// POST /customers — public (called by storefront during checkout)
router.post("/customers", checkoutLimiter, async (req, res) => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const existing = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.email, parsed.data.email));
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
router.get(
  "/customers/:id",
  requireRole("owner", "manager", "staff", "order_operator"),
  async (req, res) => {
    const tenantId = req.merchantTenantId!;
    const parsed = GetCustomerParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success)
      return res.status(400).json({ error: "معرّف غير صحيح" });
    try {
      const [customer] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, parsed.data.id));
      if (!customer) return res.status(404).json({ error: "العميل غير موجود" });

      const [tenantOrder] = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.customerId, parsed.data.id),
            eq(ordersTable.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!tenantOrder) return res.status(403).json({ error: "غير مصرح" });

      const [stats] = await db
        .select({
          totalOrders: count(),
          totalSpent: sum(ordersTable.totalAmount),
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.customerId, parsed.data.id),
            eq(ordersTable.tenantId, tenantId),
          ),
        );

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
  },
);

export default router;
