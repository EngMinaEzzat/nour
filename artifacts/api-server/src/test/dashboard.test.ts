import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, createTestProduct, createTestOrder, cleanupTenant } from "./helpers.js";

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

describe("Dashboard — Summary and Activity", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const prodRes = await createTestProduct(ctx.agent, { name: "Dashboard Test Product", price: 200, stock: 50 });
    productId = prodRes.body.id;
    await createTestOrder(ctx.tenantId, productId);
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  describe("GET /api/dashboard/summary", () => {
    it("should return a 200 status and global summary metrics", async () => {
      const res = await ctx.agent.get("/api/dashboard/summary");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalTenants");
      expect(res.body).toHaveProperty("activeTenants");
      expect(res.body).toHaveProperty("totalProducts");
      expect(res.body).toHaveProperty("totalOrders");
      expect(res.body).toHaveProperty("totalRevenue");
      expect(res.body).toHaveProperty("totalCustomers");
      expect(res.body).toHaveProperty("pendingOrders");
      expect(res.body).toHaveProperty("ordersThisMonth");
      expect(res.body).toHaveProperty("revenueThisMonth");
      expect(res.body).toHaveProperty("categoryBreakdown");
      expect(Array.isArray(res.body.categoryBreakdown)).toBe(true);
    });
  });

  describe("GET /api/dashboard/activity", () => {
    it("should return a 200 status and an array of activities", async () => {
      const res = await ctx.agent.get("/api/dashboard/activity");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const activity = res.body[0];
        expect(activity).toHaveProperty("id");
        expect(activity).toHaveProperty("type");
        expect(activity).toHaveProperty("message");
        expect(activity).toHaveProperty("tenantName");
        expect(activity).toHaveProperty("amount");
        expect(activity).toHaveProperty("createdAt");
      }
    });
  });
});
