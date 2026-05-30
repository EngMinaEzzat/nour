import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Products — CRUD", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ create product returns 201 with product data", async () => {
    const res = await createTestProduct(ctx.agent, { name: `Dress ${uid()}`, price: 299, stock: 20 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.price).toBe(299);
    expect(res.body.tenantId).toBe(ctx.tenantId);
    productId = res.body.id;
  });

  it("✅ list products with tenantId query returns tenant-scoped products", async () => {
    const res = await ctx.agent.get(`/api/products?tenantId=${ctx.tenantId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((p: { id: number }) => p.id);
    expect(ids).toContain(productId);
  });

  it("✅ authenticated GET /products scopes to session tenant automatically", async () => {
    const res = await ctx.agent.get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((p: { id: number }) => p.id);
    expect(ids).toContain(productId);
  });

  it("✅ get product by ID returns correct data", async () => {
    const res = await ctx.agent.get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(productId);
    expect(res.body.tenantId).toBe(ctx.tenantId);
  });

  it("✅ get product by ID is a public route (no auth needed)", async () => {
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(productId);
  });

  it("✅ update product changes price and stock", async () => {
    const res = await ctx.agent.put(`/api/products/${productId}`)
      .send({ price: 399, stock: 5, status: "active" });
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(399);
    expect(res.body.stock).toBe(5);
  });

  it("✅ delete product returns 204 No Content", async () => {
    const res = await createTestProduct(ctx.agent, { name: `Del ${uid()}`, price: 50 });
    expect(res.status).toBe(201);
    const delRes = await ctx.agent.delete(`/api/products/${res.body.id}`);
    expect(delRes.status).toBe(204);
  });

  it("✅ deleted product returns 404 on subsequent GET", async () => {
    const p = await createTestProduct(ctx.agent, { name: `Ghost ${uid()}`, price: 75 });
    expect(p.status).toBe(201);
    await ctx.agent.delete(`/api/products/${p.body.id}`);
    const res = await ctx.agent.get(`/api/products/${p.body.id}`);
    expect(res.status).toBe(404);
  });

  it("✅ product price is a number (not string) in response", async () => {
    const res = await ctx.agent.get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.price).toBe("number");
  });

  it("❌ create product without auth returns 401", async () => {
    const res = await request(app).post("/api/products").send({
      name: "Unauth Product", price: 100, stock: 5, status: "active",
    });
    expect(res.status).toBe(401);
  });

  it("❌ create product with missing name returns 400", async () => {
    const res = await ctx.agent.post("/api/products").send({ price: 100, stock: 5 });
    expect(res.status).toBe(400);
  });

  it("❌ get non-existent product returns 404", async () => {
    const res = await ctx.agent.get("/api/products/999999999");
    expect(res.status).toBe(404);
  });

  it("❌ update product from another tenant returns 403", async () => {
    const other = await createTestMerchant();
    const p = await createTestProduct(other.agent, { name: `Other ${uid()}`, price: 200 });
    expect(p.status).toBe(201);

    const res = await ctx.agent.put(`/api/products/${p.body.id}`).send({ price: 999 });
    expect(res.status).toBe(403);

    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ delete product from another tenant returns 403", async () => {
    const other = await createTestMerchant();
    const p = await createTestProduct(other.agent, { name: `OtherDel ${uid()}`, price: 100 });
    expect(p.status).toBe(201);

    const res = await ctx.agent.delete(`/api/products/${p.body.id}`);
    expect(res.status).toBe(403);

    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("✅ seed sample products and clear them", async () => {
    // Seed
    const seedRes = await ctx.agent.post("/api/products/seed-samples").send();
    expect(seedRes.status).toBe(201);
    expect(seedRes.body.success).toBe(true);

    // List products and verify some have isSample === true
    const listRes = await ctx.agent.get("/api/products");
    expect(listRes.status).toBe(200);
    const samples = listRes.body.filter((p: { isSample: boolean }) => p.isSample);
    expect(samples.length).toBe(5);

    // Clear sample products
    const clearRes = await ctx.agent.delete("/api/products/clear-samples").send();
    expect(clearRes.status).toBe(204);

    // List products and verify 0 sample products left
    const listAfterRes = await ctx.agent.get("/api/products");
    expect(listAfterRes.status).toBe(200);
    const samplesAfter = listAfterRes.body.filter((p: { isSample: boolean }) => p.isSample);
    expect(samplesAfter.length).toBe(0);
  });
});

describe("Products — Public Featured / Trending", () => {
  it("✅ GET /products/featured returns array (public, no auth)", async () => {
    const res = await request(app).get("/api/products/featured");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("✅ GET /products/trending returns array (public, no auth)", async () => {
    const res = await request(app).get("/api/products/trending");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
