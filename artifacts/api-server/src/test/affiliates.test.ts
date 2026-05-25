import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, uid, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Affiliates", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let affiliateId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("❌ GET /affiliates without auth returns 401", async () => {
    const res = await request(app).get("/api/affiliates");
    expect(res.status).toBe(401);
  });

  it("✅ GET /affiliates returns empty array initially", async () => {
    const res = await ctx.agent.get("/api/affiliates");
    expect(res.status).toBe(200);
    expect(res.body.affiliates).toEqual([]);
  });

  it("❌ POST /affiliates with missing fields returns 400", async () => {
    const res = await ctx.agent.post("/api/affiliates").send({
      name: "Test",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("جميع الحقول مطلوبة");
  });

  it("❌ POST /affiliates with invalid platform returns 400", async () => {
    const res = await ctx.agent.post("/api/affiliates").send({
      name: "Test",
      handle: "test",
      platform: "invalid",
      promoCode: "TEST1",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 10,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("المنصة غير صحيحة");
  });

  it("✅ POST /affiliates creates affiliate and discount code successfully", async () => {
    const res = await ctx.agent.post("/api/affiliates").send({
      name: "Test Affiliate",
      handle: "test_affiliate",
      platform: "instagram",
      promoCode: `PROMO_${uid()}`,
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 15,
      notes: "First affiliate",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Test Affiliate");
    expect(res.body.platform).toBe("instagram");
    expect(res.body.commissionValue).toBe(15);
    expect(res.body.promoCode).toMatch(/^PROMO_/);
    expect(res.body.uses).toBe(0);

    affiliateId = res.body.id;
  });

  it("❌ POST /affiliates with duplicate promo code returns 409", async () => {
    const code = `DUP_${uid()}`;

    await ctx.agent.post("/api/affiliates").send({
      name: "Affiliate 1",
      handle: "aff1",
      platform: "youtube",
      promoCode: code,
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 15,
    });

    const res = await ctx.agent.post("/api/affiliates").send({
      name: "Affiliate 2",
      handle: "aff2",
      platform: "tiktok",
      promoCode: code,
      discountType: "flat",
      discountValue: 50,
      commissionType: "flat",
      commissionValue: 20,
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("كود الخصم هذا مستخدم بالفعل، اختر كوداً مختلفاً");
  });

  it("✅ PUT /affiliates/:id updates active and commission", async () => {
    const res = await ctx.agent.put(`/api/affiliates/${affiliateId}`).send({
      active: false,
      commissionValue: 25,
      notes: "Updated note",
    });

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(res.body.commissionValue).toBe(25);
    expect(res.body.notes).toBe("Updated note");
  });

  it("✅ GET /affiliates lists the affiliate with stats", async () => {
    const res = await ctx.agent.get("/api/affiliates");
    expect(res.status).toBe(200);

    const affiliate = res.body.affiliates.find((a: any) => a.id === affiliateId);
    expect(affiliate).toBeDefined();
    expect(affiliate.active).toBe(false);
    expect(affiliate.commissionValue).toBe(25);
    expect(affiliate).toHaveProperty("totalRevenue");
    expect(affiliate).toHaveProperty("totalDiscount");
    expect(affiliate).toHaveProperty("commissionDue");
  });

  it("❌ PUT /affiliates/:id for non-existent affiliate returns 404", async () => {
    const res = await ctx.agent.put("/api/affiliates/999999").send({
      active: true,
    });
    expect(res.status).toBe(404);
  });

  it("❌ DELETE /affiliates/:id for non-existent affiliate returns 404", async () => {
    const res = await ctx.agent.delete("/api/affiliates/999999");
    expect(res.status).toBe(404);
  });

  it("✅ DELETE /affiliates/:id deletes the affiliate successfully", async () => {
    const res = await ctx.agent.delete(`/api/affiliates/${affiliateId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await ctx.agent.get("/api/affiliates");
    const found = getRes.body.affiliates.find((a: any) => a.id === affiliateId);
    expect(found).toBeUndefined();
  });
});
