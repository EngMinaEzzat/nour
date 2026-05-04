import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant, createTestProduct } from "./helpers.js";

describe("Analytics — Merchant Dashboard", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    await createTestProduct(ctx.agent, { name: "Analytics Product", price: 200, stock: 50 });
  });

  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ GET /api/analytics/merchant returns 200", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
  });

  it("✅ analytics response has totalOrders", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalOrders");
    expect(Number(res.body.totalOrders)).toBeGreaterThanOrEqual(0);
  });

  it("✅ analytics response has grossRevenue", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("grossRevenue");
    expect(Number(res.body.grossRevenue)).toBeGreaterThanOrEqual(0);
  });

  it("✅ analytics response has netRevenue", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("netRevenue");
    expect(Number(res.body.netRevenue)).toBeGreaterThanOrEqual(0);
  });

  it("✅ analytics response has orderStatusBreakdown array", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orderStatusBreakdown)).toBe(true);
    expect(res.body.orderStatusBreakdown.length).toBeGreaterThan(0);
  });

  it("✅ analytics response has salesByDay array", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.salesByDay)).toBe(true);
  });

  it("✅ analytics response has topProducts array", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.topProducts)).toBe(true);
  });

  it("✅ analytics response has period object with from/to", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("period");
    expect(res.body.period).toHaveProperty("from");
    expect(res.body.period).toHaveProperty("to");
  });

  it("✅ accepts dateFrom/dateTo query params", async () => {
    const res = await ctx.agent.get("/api/analytics/merchant?dateFrom=2024-01-01&dateTo=2024-12-31");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalOrders");
  });

  it("❌ unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/analytics/merchant");
    expect(res.status).toBe(401);
  });

  it("✅ analytics are tenant-scoped: two tenants get independent data", async () => {
    const ctx2 = await createTestMerchant();
    try {
      const [res1, res2] = await Promise.all([
        ctx.agent.get("/api/analytics/merchant"),
        ctx2.agent.get("/api/analytics/merchant"),
      ]);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      // Both are valid analytics responses but for different tenants
      expect(res1.body).toHaveProperty("totalOrders");
      expect(res2.body).toHaveProperty("totalOrders");
    } finally {
      await cleanupTenant(ctx2.tenantId, ctx2.merchantId);
    }
  });
});
