import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Dashboard API", () => {
  describe("GET /api/dashboard/merchant-analytics", () => {
    it("rejects request with missing tenantId", async () => {
      const res = await request(app).get("/api/dashboard/merchant-analytics");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("tenantId مطلوب");
    });

    it("rejects request with invalid tenantId", async () => {
      const res = await request(app).get("/api/dashboard/merchant-analytics?tenantId=invalid");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("tenantId مطلوب");
    });
  });
});

describe("Dashboard — Merchant Analytics", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ GET /api/dashboard/merchant-analytics with no orders returns 200 and zero values", async () => {
    const res = await ctx.agent.get(`/api/dashboard/merchant-analytics?tenantId=${ctx.tenantId}`);
    expect(res.status).toBe(200);

    expect(res.body.totalRevenue).toBe(0);
    expect(res.body.totalOrders).toBe(0);
    expect(res.body.avgOrderValue).toBe(0);
    expect(Number(res.body.totalCustomers)).toBe(0);
    expect(res.body.pendingOrders).toBe(0);
    expect(res.body.revenueThisMonth).toBe(0);
    expect(Number(res.body.ordersThisMonth)).toBe(0);

    expect(res.body.orderStatusBreakdown).toEqual([
      { status: "pending", label: "قيد الانتظار", count: 0 },
      { status: "confirmed", label: "مؤكد", count: 0 },
      { status: "shipped", label: "تم الشحن", count: 0 },
      { status: "delivered", label: "تم التسليم", count: 0 },
      { status: "cancelled", label: "ملغي", count: 0 },
    ]);

    expect(res.body.salesByDay).toEqual([]);
    expect(res.body.topProducts).toEqual([]);
    expect(res.body.recentOrders).toEqual([]);
  });
});
