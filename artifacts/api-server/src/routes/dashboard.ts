import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, productsTable, ordersTable, customersTable, orderItemsTable } from "@workspace/db";
import { count, sum, eq, sql, and, gte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [tenantStats] = await db
      .select({ total: count(), active: sql<number>`count(*) filter (where ${tenantsTable.status} = 'active')` })
      .from(tenantsTable);

    const [productStats] = await db.select({ total: count() }).from(productsTable);
    const [customerStats] = await db.select({ total: count() }).from(customersTable);

    const [orderStats] = await db
      .select({
        total: count(),
        totalRevenue: sum(ordersTable.totalAmount),
        pending: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending')`,
      })
      .from(ordersTable);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyStats] = await db
      .select({
        ordersThisMonth: count(),
        revenueThisMonth: sum(ordersTable.totalAmount),
      })
      .from(ordersTable)
      .where(sql`${ordersTable.createdAt} >= ${startOfMonth}`);

    const fashionCount = await db.select({ c: count() }).from(tenantsTable).where(eq(tenantsTable.category, "fashion"));
    const cosmeticsCount = await db.select({ c: count() }).from(tenantsTable).where(eq(tenantsTable.category, "cosmetics"));
    const bothCount = await db.select({ c: count() }).from(tenantsTable).where(eq(tenantsTable.category, "both"));

    res.json({
      totalTenants: tenantStats.total,
      activeTenants: Number(tenantStats.active),
      totalProducts: productStats.total,
      totalOrders: orderStats.total,
      totalRevenue: parseFloat(orderStats.totalRevenue ?? "0"),
      totalCustomers: customerStats.total,
      pendingOrders: Number(orderStats.pending),
      ordersThisMonth: monthlyStats.ordersThisMonth,
      revenueThisMonth: parseFloat(monthlyStats.revenueThisMonth ?? "0"),
      categoryBreakdown: [
        { category: "fashion", count: fashionCount[0].c },
        { category: "cosmetics", count: cosmeticsCount[0].c },
        { category: "both", count: bothCount[0].c },
      ],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب ملخص لوحة التحكم" });
  }
});

router.get("/dashboard/activity", async (req, res) => {
  try {
    const recentOrders = await db
      .select({
        id: ordersTable.id,
        tenantName: tenantsTable.name,
        amount: ordersTable.totalAmount,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
      .orderBy(sql`${ordersTable.createdAt} DESC`)
      .limit(5);

    const recentTenants = await db
      .select({ id: tenantsTable.id, name: tenantsTable.name, createdAt: tenantsTable.createdAt })
      .from(tenantsTable)
      .orderBy(sql`${tenantsTable.createdAt} DESC`)
      .limit(3);

    const activity = [
      ...recentOrders.map((order, i) => ({
        id: i + 1,
        type: order.status === "shipped" ? "order_shipped" as const : order.status === "delivered" ? "order_delivered" as const : "new_order" as const,
        message: `New order placed at ${order.tenantName ?? "a store"}`,
        tenantName: order.tenantName ?? null,
        amount: parseFloat(order.amount as string),
        createdAt: order.createdAt.toISOString(),
      })),
      ...recentTenants.map((tenant, i) => ({
        id: recentOrders.length + i + 1,
        type: "new_tenant" as const,
        message: `${tenant.name} joined the marketplace`,
        tenantName: tenant.name,
        amount: null,
        createdAt: tenant.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(activity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب نشاط لوحة التحكم" });
  }
});

/* ─── Merchant-specific analytics ─── */
router.get("/dashboard/merchant-analytics", async (req, res) => {
  const tenantId = parseInt(req.query.tenantId as string, 10);
  if (!tenantId || isNaN(tenantId)) return res.status(400).json({ error: "tenantId مطلوب" });

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    /* KPIs */
    const [kpi] = await db
      .select({
        totalRevenue: sum(ordersTable.totalAmount),
        totalOrders: count(),
        pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending')`,
        confirmedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'confirmed')`,
        shippedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'shipped')`,
        deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')`,
        cancelledOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled')`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenantId));

    const [monthKpi] = await db
      .select({
        revenueThisMonth: sum(ordersTable.totalAmount),
        ordersThisMonth: count(),
      })
      .from(ordersTable)
      .where(and(eq(ordersTable.tenantId, tenantId), gte(ordersTable.createdAt, startOfMonth)));

    const [customerCount] = await db
      .select({ total: count() })
      .from(customersTable)
      .where(eq(customersTable.tenantId, tenantId));

    /* Sales by day — last 30 days */
    const salesByDay = await db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'MM/DD') AS day,
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(total_amount::numeric), 0)::float AS revenue,
        COUNT(*)::int AS orders
      FROM orders
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${thirtyDaysAgo}
        AND status != 'cancelled'
      GROUP BY TO_CHAR(created_at, 'MM/DD'), TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);

    /* Top 5 products by revenue */
    const topProducts = await db.execute(sql`
      SELECT
        p.name,
        COALESCE(SUM(oi.total_price::numeric), 0)::float AS revenue,
        SUM(oi.quantity)::int AS quantity
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.tenant_id = ${tenantId}
        AND o.status != 'cancelled'
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    /* Recent orders */
    const recentOrders = await db
      .select({
        id: ordersTable.id,
        totalAmount: ordersTable.totalAmount,
        status: ordersTable.status,
        paymentMethod: ordersTable.paymentMethod,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenantId))
      .orderBy(sql`${ordersTable.createdAt} DESC`)
      .limit(5);

    const totalRev = parseFloat(kpi.totalRevenue ?? "0");
    const totalOrd = kpi.totalOrders ?? 0;

    res.json({
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      avgOrderValue: totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0,
      totalCustomers: customerCount.total,
      pendingOrders: Number(kpi.pendingOrders),
      revenueThisMonth: parseFloat(monthKpi.revenueThisMonth ?? "0"),
      ordersThisMonth: monthKpi.ordersThisMonth,
      orderStatusBreakdown: [
        { status: "pending", label: "قيد الانتظار", count: Number(kpi.pendingOrders) },
        { status: "confirmed", label: "مؤكد", count: Number(kpi.confirmedOrders) },
        { status: "shipped", label: "تم الشحن", count: Number(kpi.shippedOrders) },
        { status: "delivered", label: "تم التسليم", count: Number(kpi.deliveredOrders) },
        { status: "cancelled", label: "ملغي", count: Number(kpi.cancelledOrders) },
      ],
      salesByDay: salesByDay.rows,
      topProducts: topProducts.rows,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        totalAmount: parseFloat(o.totalAmount as string),
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب إحصائيات التاجر" });
  }
});

export default router;
