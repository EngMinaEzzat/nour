import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, productsTable, customersTable,
  returnCasesTable, tenantsTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, count, sum, desc } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

/* ─── Merchant Analytics V2 ─── */
router.get("/analytics/merchant", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  try {
    const now = new Date();
    const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateTo ? new Date(dateTo) : now;
    to.setHours(23, 59, 59, 999);

    const conditions = [
      eq(ordersTable.tenantId, tenantId),
      gte(ordersTable.createdAt, from),
      lte(ordersTable.createdAt, to),
    ];

    /* ── Fetch Analytics Concurrently ── */
    const [
      [kpi],
      repeatResult,
      salesByDay,
      topProducts,
      [tenantRow],
      [returnStats]
    ] = await Promise.all([
      /* ── Order KPIs ── */
      db.select({
          totalOrders: count(),
          grossRevenue: sum(ordersTable.totalAmount),
          pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending')`,
          awaitingOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'awaiting_confirmation')`,
          confirmedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'confirmed')`,
          dispatchedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'dispatched')`,
          deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')`,
          cancelledOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled')`,
          returnedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'returned')`,
          deliveredRevenue: sql<string>`COALESCE(SUM(total_amount::numeric) filter (where ${ordersTable.status} = 'delivered'), 0)`,
        })
        .from(ordersTable)
        .where(and(...conditions)),

      /* ── Repeat customers (phone used in >1 delivered order in this tenant) ── */
      db.execute(sql`
        SELECT COUNT(DISTINCT customer_phone)::int AS repeat_count
        FROM (
          SELECT customer_phone, COUNT(*) AS cnt
          FROM orders
          WHERE tenant_id = ${tenantId}
            AND status IN ('delivered', 'confirmed', 'dispatched')
            AND customer_phone IS NOT NULL
          GROUP BY customer_phone
          HAVING COUNT(*) > 1
        ) sub
      `),

      /* ── Sales by day ── */
      db.execute(sql`
        SELECT
          TO_CHAR(created_at, 'MM/DD') AS day,
          TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
          COALESCE(SUM(total_amount::numeric) FILTER (WHERE status NOT IN ('cancelled','returned')), 0)::float AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${from}
          AND created_at <= ${to}
        GROUP BY TO_CHAR(created_at, 'MM/DD'), TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `),

      /* ── Top products ── */
      db.execute(sql`
        SELECT
          p.id,
          p.name,
          p.stock,
          p.low_stock_threshold,
          COALESCE(SUM(oi.total_price::numeric), 0)::float AS revenue,
          SUM(oi.quantity)::int AS units_sold
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.tenant_id = ${tenantId}
          AND o.created_at >= ${from}
          AND o.created_at <= ${to}
          AND o.status NOT IN ('cancelled','returned')
        GROUP BY p.id, p.name, p.stock, p.low_stock_threshold
        ORDER BY revenue DESC
        LIMIT 10
      `),

      /* ── Tenant Row (for low-stock threshold) ── */
      db.select({ lowStockThreshold: tenantsTable.lowStockThreshold })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId)),

      /* ── Return cases count in period ── */
      db.select({ total: count() })
        .from(returnCasesTable)
        .where(and(
          eq(returnCasesTable.tenantId, tenantId),
          gte(returnCasesTable.createdAt, from),
          lte(returnCasesTable.createdAt, to),
        ))
    ]);

    const totalOrders = kpi?.totalOrders ?? 0;
    const grossRev = parseFloat(kpi?.grossRevenue ?? "0");
    const deliveredRev = parseFloat(kpi?.deliveredRevenue ?? "0");
    const cancelledCount = Number(kpi?.cancelledOrders ?? 0);
    const returnedCount = Number(kpi?.returnedOrders ?? 0);

    const netRevenue = deliveredRev;
    const cancellationRate = totalOrders > 0
      ? Math.round((cancelledCount / totalOrders) * 100)
      : 0;
    const returnRate = totalOrders > 0
      ? Math.round((returnedCount / totalOrders) * 100)
      : 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(grossRev / totalOrders) : 0;

    const repeatCustomerCount = Number((repeatResult.rows[0] as { repeat_count: number })?.repeat_count ?? 0);

    const tenantThreshold = tenantRow?.lowStockThreshold ?? 5;

    /* ── Low-stock products (depends on tenantThreshold) ── */
    const lowStockProducts = await db.execute(sql`
      SELECT
        id,
        name,
        stock,
        status,
        low_stock_threshold,
        COALESCE(low_stock_threshold, ${tenantThreshold}) AS effective_threshold
      FROM products
      WHERE tenant_id = ${tenantId}
        AND status != 'hidden'
        AND stock <= COALESCE(low_stock_threshold, ${tenantThreshold})
      ORDER BY stock ASC
      LIMIT 20
    `);

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      totalOrders,
      grossRevenue: grossRev,
      netRevenue,
      avgOrderValue,
      cancellationRate,
      returnRate,
      repeatCustomerCount,
      openReturnCases: returnStats.total,
      orderStatusBreakdown: [
        { status: "pending", label: "قيد الانتظار", count: Number(kpi.pendingOrders ?? 0) },
        { status: "awaiting_confirmation", label: "ينتظر التأكيد", count: Number(kpi.awaitingOrders ?? 0) },
        { status: "confirmed", label: "مؤكد", count: Number(kpi.confirmedOrders ?? 0) },
        { status: "dispatched", label: "تم الشحن", count: Number(kpi.dispatchedOrders ?? 0) },
        { status: "delivered", label: "تم التسليم", count: Number(kpi.deliveredOrders ?? 0) },
        { status: "cancelled", label: "ملغي", count: cancelledCount },
        { status: "returned", label: "مُرجَع", count: returnedCount },
      ],
      salesByDay: salesByDay.rows,
      topProducts: topProducts.rows,
      lowStockProducts: lowStockProducts.rows,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب التحليلات" });
  }
});

/* ─── Product Insights ─── */
router.get("/analytics/products", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;

  try {
    const [tenantRow] = await db
      .select({ lowStockThreshold: tenantsTable.lowStockThreshold })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));
    const tenantThreshold = tenantRow?.lowStockThreshold ?? 5;

    const insights = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.stock,
        p.status,
        p.low_stock_threshold,
        COALESCE(p.low_stock_threshold, ${tenantThreshold}) AS effective_threshold,
        COALESCE(SUM(oi.total_price::numeric) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0)::float AS revenue,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0)::int AS units_sold,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status IN ('returned')), 0)::int AS units_returned,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('cancelled')) AS order_count,
        MAX(o.created_at) AS last_ordered_at,
        CASE
          WHEN p.stock = 0 THEN 'out_of_stock'
          WHEN p.stock <= COALESCE(p.low_stock_threshold, ${tenantThreshold}) THEN 'low_stock'
          ELSE 'ok'
        END AS stock_status
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.tenant_id = ${tenantId}
      WHERE p.tenant_id = ${tenantId}
        AND p.status != 'hidden'
      GROUP BY p.id, p.name, p.stock, p.status, p.low_stock_threshold
      ORDER BY revenue DESC, units_sold DESC
    `);

    res.json({ products: insights.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب تحليلات المنتجات" });
  }
});

/* ─── Customer list with repeat markers ─── */
router.get("/analytics/customers", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;

  try {
    const customers = await db.execute(sql`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.email,
        COUNT(o.id)::int AS order_count,
        MAX(o.created_at) AS last_order_at,
        COALESCE(SUM(o.total_amount::numeric) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0)::float AS total_spend,
        COUNT(o.id) FILTER (WHERE o.status IN ('delivered','confirmed','dispatched'))::int AS valid_order_count,
        CASE WHEN COUNT(o.id) FILTER (WHERE o.status IN ('delivered','confirmed','dispatched')) > 1
          THEN true ELSE false END AS is_repeat_customer
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.tenant_id = ${tenantId}
      WHERE c.tenant_id = ${tenantId}
      GROUP BY c.id, c.name, c.phone, c.email
      ORDER BY total_spend DESC, order_count DESC
    `);

    res.json({ customers: customers.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب بيانات العملاء" });
  }
});

export default router;
