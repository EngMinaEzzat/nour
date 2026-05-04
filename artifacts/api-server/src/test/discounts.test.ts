import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Discounts", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let codeId: number;
  const CODE = `SAVE${uid().toUpperCase()}`;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ create percentage discount returns 201", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: CODE, type: "percentage", value: 20,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.type).toBe("percentage");
    expect(res.body.value).toBe(20);
    codeId = res.body.id;
  });

  it("✅ create fixed discount returns 201", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: `FIX${uid().toUpperCase()}`, type: "fixed", value: 50, minOrderAmount: 200,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("fixed");
  });

  it("✅ create free_shipping discount returns 201", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: `SHIP${uid().toUpperCase()}`, type: "free_shipping", value: 0,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("free_shipping");
  });

  it("✅ list discounts returns array scoped to tenant", async () => {
    const res = await ctx.agent.get("/api/discounts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((d: { id: number }) => d.id);
    expect(ids).toContain(codeId);
  });

  it("✅ validate valid discount code returns discount amount", async () => {
    const res = await request(app).post("/api/discounts/validate").send({
      code: CODE, tenantId: ctx.tenantId, subtotal: 500,
    });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discountAmount).toBeGreaterThan(0);
  });

  it("✅ update discount code (deactivate) returns updated", async () => {
    const res = await ctx.agent.put(`/api/discounts/${codeId}`).send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  it("✅ deactivated code fails validation", async () => {
    const res = await request(app).post("/api/discounts/validate").send({
      code: CODE, tenantId: ctx.tenantId, subtotal: 500,
    });
    expect([404, 400]).toContain(res.status);
    expect(res.body.valid).toBe(false);
  });

  it("✅ delete discount code returns success", async () => {
    const c = await ctx.agent.post("/api/discounts").send({
      code: `DEL${uid().toUpperCase()}`, type: "fixed", value: 10,
    });
    expect(c.status).toBe(201);
    const del = await ctx.agent.delete(`/api/discounts/${c.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it("❌ duplicate code returns 409", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: CODE, type: "fixed", value: 30,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/موجود/);
  });

  it("❌ percentage > 100 returns 400", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: `BIG${uid()}`, type: "percentage", value: 150,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/نسبة|100/);
  });

  it("❌ percentage = 0 returns 400", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: `ZERO${uid()}`, type: "percentage", value: 0,
    });
    expect(res.status).toBe(400);
  });

  it("❌ invalid type returns 400", async () => {
    const res = await ctx.agent.post("/api/discounts").send({
      code: `INV${uid()}`, type: "mystery", value: 10,
    });
    expect(res.status).toBe(400);
  });

  it("❌ validate missing fields returns 400", async () => {
    const res = await request(app).post("/api/discounts/validate").send({
      code: CODE, tenantId: ctx.tenantId,
    });
    expect(res.status).toBe(400);
  });

  it("❌ validate non-existent code returns 404", async () => {
    const res = await request(app).post("/api/discounts/validate").send({
      code: "DOESNOTEXIST999", tenantId: ctx.tenantId, subtotal: 100,
    });
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
  });

  it("❌ create discount without auth returns 401", async () => {
    const res = await request(app).post("/api/discounts").send({
      code: `NOAUTH${uid()}`, type: "fixed", value: 10,
    });
    expect(res.status).toBe(401);
  });
});
