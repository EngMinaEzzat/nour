import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, createTestProduct, createTestOrder, cleanupTenant } from "./helpers.js";

describe("Dashboard Routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const prodRes = await createTestProduct(ctx.agent, { name: "Dashboard Test Product", price: 200, stock: 50 });
    productId = prodRes.body.id;
    await createTestOrder(ctx.tenantId, productId);
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTenant(ctx.tenantId, ctx.merchantId);
    }
  });

  describe("GET /api/dashboard/summary", () => {
    it("should return a 200 status and global summary metrics", async () => {
      // Endpoint is authenticated using admin agent usually, but since auth middleware isn't explicit in the route, we'll try with test merchant's agent or app
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

  describe("GET /api/dashboard/merchant-analytics", () => {
    it("should return a 200 status and specific merchant metrics when tenantId is provided", async () => {
      const res = await ctx.agent.get(`/api/dashboard/merchant-analytics?tenantId=${ctx.tenantId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalRevenue");
      expect(res.body).toHaveProperty("totalOrders");
      expect(res.body).toHaveProperty("avgOrderValue");
      expect(res.body).toHaveProperty("totalCustomers");
      expect(res.body).toHaveProperty("pendingOrders");
      expect(res.body).toHaveProperty("revenueThisMonth");
      expect(res.body).toHaveProperty("ordersThisMonth");
      expect(res.body).toHaveProperty("orderStatusBreakdown");
      expect(Array.isArray(res.body.orderStatusBreakdown)).toBe(true);
      expect(res.body).toHaveProperty("salesByDay");
      expect(Array.isArray(res.body.salesByDay)).toBe(true);
      expect(res.body).toHaveProperty("topProducts");
      expect(Array.isArray(res.body.topProducts)).toBe(true);
      expect(res.body).toHaveProperty("recentOrders");
      expect(Array.isArray(res.body.recentOrders)).toBe(true);
    });

    it("should return a 400 status when tenantId is missing", async () => {
      const res = await ctx.agent.get("/api/dashboard/merchant-analytics");
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "tenantId مطلوب");
    });
  });
});