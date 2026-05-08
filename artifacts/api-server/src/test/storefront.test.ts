import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Storefront — Public Store Pages", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const p = await createTestProduct(ctx.agent, {
      name: `Storefront Dress ${uid()}`, price: 450, stock: 5, status: "active",
    });
    if (p.status === 201) productId = p.body.id;
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ GET /store/:slug returns store data with products", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("slug");
    expect(res.body.slug).toBe(ctx.slug);
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
    // Should include the product we created
    if (productId) {
      const ids = res.body.products.map((p: { id: number }) => p.id);
      expect(ids).toContain(productId);
    }
  });

  it("✅ storefront products have numeric prices (not strings)", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    if (res.body.products.length > 0) {
      expect(typeof res.body.products[0].price).toBe("number");
    }
  });

  it("✅ storefront supports search query", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}?search=Storefront`);
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThanOrEqual(1);
  });

  it("❌ GET /store/nonexistent-slug returns 404", async () => {
    const res = await request(app).get("/api/store/this-slug-does-not-exist-99999");
    expect(res.status).toBe(404);
  });

  it("✅ storefront doesn't expose sensitive tenant data", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    // Should NOT expose merchant passwords, session secrets, etc.
    const storeStr = JSON.stringify(res.body);
    expect(storeStr).not.toContain("passwordHash");
    expect(storeStr).not.toContain("sessionSecret");
    expect(storeStr).not.toContain("paymobApiKey");
  });

  it("✅ storefront doesn't show inactive/hidden products", async () => {
    // Create a hidden product
    const draft = await createTestProduct(ctx.agent, {
      name: `Hidden Product ${uid()}`, price: 100, stock: 5, status: "hidden",
    });
    expect(draft.status).toBe(201);

    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    const ids = res.body.products.map((p: { id: number }) => p.id);
    expect(ids).not.toContain(draft.body.id);
  });
});
