import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Inventory Alerts", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    // Create products with varying stock levels
    await createTestProduct(ctx.agent, { name: `Out of Stock ${uid()}`, price: 100, stock: 0, status: "active" });
    await createTestProduct(ctx.agent, { name: `Low Stock ${uid()}`, price: 100, stock: 2, status: "active" });
    await createTestProduct(ctx.agent, { name: `Healthy ${uid()}`, price: 100, stock: 50, status: "active" });
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ list low-stock alerts includes stats", async () => {
    const res = await ctx.agent.get("/api/inventory-alerts");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stats");
    expect(res.body).toHaveProperty("lowStock");
    expect(res.body).toHaveProperty("globalThreshold");
    expect(typeof res.body.stats.totalProducts).toBe("number");
    expect(res.body.stats.outOfStock).toBeGreaterThanOrEqual(1);
  });

  it("✅ low stock list filters correctly", async () => {
    const res = await ctx.agent.get("/api/inventory-alerts");
    expect(res.status).toBe(200);
    // All items in lowStock should have stock <= threshold
    for (const item of res.body.lowStock) {
      expect(item.stock).toBeLessThanOrEqual(item.effectiveThreshold);
    }
  });

  it("✅ update global threshold", async () => {
    const res = await ctx.agent.put("/api/inventory-alerts/settings").send({
      globalThreshold: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.globalThreshold).toBe(10);
  });

  it("✅ update per-product threshold", async () => {
    const products = await ctx.agent.get(`/api/products?tenantId=${ctx.tenantId}`);
    expect(products.status).toBe(200);
    if (products.body.length > 0) {
      const pid = products.body[0].id;
      const res = await ctx.agent.put(`/api/inventory-alerts/product/${pid}`).send({
        threshold: 15,
      });
      expect(res.status).toBe(200);
      expect(res.body.lowStockThreshold).toBe(15);
    }
  });

  it("❌ list without auth returns 401", async () => {
    const res = await request(app).get("/api/inventory-alerts");
    expect(res.status).toBe(401);
  });

  it("❌ update threshold with negative value returns 400", async () => {
    const res = await ctx.agent.put("/api/inventory-alerts/settings").send({
      globalThreshold: -5,
    });
    expect(res.status).toBe(400);
  });
});
