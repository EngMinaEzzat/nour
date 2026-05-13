import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Categories", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let categoryId: number;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ GET /categories — public, returns array (all categories when no tenant param)", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("✅ GET /categories?tenantId scopes to tenant + global categories", async () => {
    const res = await request(app).get(`/api/categories?tenantId=${ctx.tenantId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    res.body.forEach((c: { productCount: unknown }) => {
      expect(c).toHaveProperty("productCount");
    });
  });

  it("✅ GET /categories when logged in scopes to session tenant", async () => {
    const res = await ctx.agent.get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });

  it("✅ create category returns 201 with productCount: 0", async () => {
    const res = await ctx.agent.post("/api/categories").send({
      name: `Category ${uid()}`,
      nameAr: "فئة اختبار",
      type: "fashion",
      imageUrl: "/api/uploads/category-test.jpg",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("productCount", 0);
    expect(res.body).toHaveProperty("imageUrl", "/api/uploads/category-test.jpg");
    expect(res.body.tenantId).toBe(ctx.tenantId);
    categoryId = res.body.id;
  });

  it("✅ update category edits names and image", async () => {
    const res = await ctx.agent.put(`/api/categories/${categoryId}`).send({
      name: "Updated category",
      nameAr: "فئة محدثة",
      type: "cosmetics",
      imageUrl: "/api/uploads/category-updated.jpg",
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated category");
    expect(res.body.nameAr).toBe("فئة محدثة");
    expect(res.body.type).toBe("cosmetics");
    expect(res.body.imageUrl).toBe("/api/uploads/category-updated.jpg");
  });

  it("✅ created category appears in GET /categories list for tenant", async () => {
    const res = await ctx.agent.get("/api/categories");
    const ids = res.body.map((c: { id: number }) => c.id);
    expect(ids).toContain(categoryId);
  });

  it("✅ storefront categories are synced with category admin data", async () => {
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);

    const category = res.body.categories.find((c: { id: number }) => c.id === categoryId);
    expect(category).toMatchObject({
      id: categoryId,
      name: "Updated category",
      nameAr: "فئة محدثة",
      type: "cosmetics",
      imageUrl: "/api/uploads/category-updated.jpg",
      productCount: 0,
    });
  });

  it("❌ merchant cannot edit another tenant's category", async () => {
    const other = await createTestMerchant();
    try {
      const res = await other.agent.put(`/api/categories/${categoryId}`).send({ name: "Hijack" });
      expect(res.status).toBe(404);
    } finally {
      await cleanupTenant(other.tenantId, other.merchantId);
    }
  });

  it("❌ create category without auth returns 401", async () => {
    const res = await request(app).post("/api/categories").send({
      name: "No Auth Cat", nameAr: "بدون مصادقة", type: "fashion",
    });
    expect(res.status).toBe(401);
  });

  it("❌ create category with missing name returns 400", async () => {
    const res = await ctx.agent.post("/api/categories").send({ type: "fashion" });
    expect(res.status).toBe(400);
  });

  it("✅ GET /categories includes categories with productCount field", async () => {
    const res = await ctx.agent.get("/api/categories");
    expect(res.status).toBe(200);
    res.body.forEach((c: { productCount: unknown }) => {
      expect(typeof c.productCount).toBe("number");
    });
  });
});
