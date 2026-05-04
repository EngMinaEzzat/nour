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
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("productCount", 0);
    expect(res.body.tenantId).toBe(ctx.tenantId);
    categoryId = res.body.id;
  });

  it("✅ created category appears in GET /categories list for tenant", async () => {
    const res = await ctx.agent.get("/api/categories");
    const ids = res.body.map((c: { id: number }) => c.id);
    expect(ids).toContain(categoryId);
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
