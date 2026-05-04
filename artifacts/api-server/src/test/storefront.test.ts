import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Storefront — Public API", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;
  let uniqueName: string;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    uniqueName = `Storefront Product ${uid()}`;
    const p = await createTestProduct(ctx.agent, {
      name: uniqueName, price: 199, stock: 5, status: "active",
    });
    productId = p.body.id;
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ GET /store/:slug returns 200 with store metadata", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(ctx.slug);
    expect(res.body.id).toBe(ctx.tenantId);
    expect(res.body.name).toBe(ctx.storeName);
  });

  it("✅ response includes products array", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it("✅ response includes the product we created", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    const ids = res.body.products.map((p: { id: number }) => p.id);
    expect(ids).toContain(productId);
  });

  it("✅ response includes categories array and totalProducts count", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(typeof res.body.totalProducts).toBe("number");
  });

  it("✅ search query filters products by name", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}?search=${encodeURIComponent(uniqueName)}`);
    expect(res.status).toBe(200);
    expect(res.body.products.some((p: { name: string }) => p.name === uniqueName)).toBe(true);
  });

  it("✅ search with no match returns empty products array", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}?search=ZZZNOMATCH999ZZZNOURTEST`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(0);
  });

  it("✅ product prices are numbers (not strings)", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    res.body.products.forEach((p: { price: unknown }) => {
      expect(typeof p.price).toBe("number");
    });
  });

  it("✅ store endpoint is public — no auth required", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
  });

  it("✅ products are tenant-scoped (other tenant's products absent)", async () => {
    const other = await createTestMerchant();
    await createTestProduct(other.agent, { name: `OtherStore ${uid()}`, price: 500 });

    const res = await request(app).get(`/api/store/${ctx.slug}`);
    const allProductIds = res.body.products.map((p: { id: number }) => p.id);

    const otherProducts = await other.agent.get(`/api/products?tenantId=${other.tenantId}`);
    const otherIds = otherProducts.body.map((p: { id: number }) => p.id);

    otherIds.forEach((id: number) => {
      expect(allProductIds).not.toContain(id);
    });

    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ non-existent slug returns 404", async () => {
    const res = await request(app).get("/api/store/this-store-does-not-exist-xyz999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
