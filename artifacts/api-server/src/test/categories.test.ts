import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Categories", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let categoryId: number;
  let childCategoryId: number;

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
  });

  it("✅ GET /categories when logged in scopes to session tenant", async () => {
    const res = await ctx.agent.get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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

  it("✅ creates a subcategory under a same-tenant parent", async () => {
    const res = await ctx.agent.post("/api/categories").send({
      name: `Child ${uid()}`,
      nameAr: "فئة فرعية",
      type: "fashion",
      parentId: categoryId,
    });

    expect(res.status).toBe(201);
    expect(res.body.parentId).toBe(categoryId);
    childCategoryId = res.body.id;
  });

  it("❌ rejects nesting under a subcategory", async () => {
    const res = await ctx.agent.post("/api/categories").send({
      name: `Grandchild ${uid()}`,
      nameAr: "فئة أعمق",
      type: "fashion",
      parentId: childCategoryId,
    });

    expect(res.status).toBe(400);
  });

  it("❌ rejects self-parenting", async () => {
    const res = await ctx.agent.put(`/api/categories/${categoryId}`).send({
      parentId: categoryId,
    });

    expect(res.status).toBe(400);
  });

  it("❌ rejects parent categories from another tenant", async () => {
    const other = await createTestMerchant();
    try {
      const parent = await other.agent.post("/api/categories").send({
        name: `Other parent ${uid()}`,
        nameAr: "فئة خارجية",
        type: "fashion",
      });
      expect(parent.status).toBe(201);

      const res = await ctx.agent.post("/api/categories").send({
        name: `Invalid child ${uid()}`,
        nameAr: "فئة غير صالحة",
        type: "fashion",
        parentId: parent.body.id,
      });

      expect(res.status).toBe(400);
    } finally {
      await cleanupTenant(other.tenantId, other.merchantId);
    }
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

  it("✅ deletes a tenant-owned category", async () => {
    const created = await ctx.agent.post("/api/categories").send({
      name: `Delete me ${uid()}`,
      nameAr: "للحذف",
      type: "fashion",
    });
    expect(created.status).toBe(201);

    const deleted = await ctx.agent.delete(`/api/categories/${created.body.id}`);
    expect(deleted.status).toBe(204);

    const list = await ctx.agent.get("/api/categories");
    const ids = list.body.map((c: { id: number }) => c.id);
    expect(ids).not.toContain(created.body.id);
  });
});
