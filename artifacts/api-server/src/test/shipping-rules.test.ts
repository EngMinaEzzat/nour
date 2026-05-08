import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Shipping Rules — Zones CRUD", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let zoneId: number;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ create shipping zone returns 201", async () => {
    const res = await ctx.agent.post("/api/shipping/zones").send({
      governorate: "القاهرة",
      city: "مدينة نصر",
      shippingCost: 35,
      deliveryDays: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.governorate).toBe("القاهرة");
    expect(res.body.shippingCost).toBe(35);
    expect(res.body.deliveryDays).toBe(2);
    zoneId = res.body.id;
  });

  it("✅ list zones returns only tenant's zones", async () => {
    const res = await ctx.agent.get("/api/shipping/zones");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((z: { id: number }) => z.id === zoneId)).toBe(true);
  });

  it("✅ update zone changes cost and delivery days", async () => {
    const res = await ctx.agent.put(`/api/shipping/zones/${zoneId}`).send({
      shippingCost: 50,
      deliveryDays: 4,
    });
    expect(res.status).toBe(200);
    expect(res.body.shippingCost).toBe(50);
    expect(res.body.deliveryDays).toBe(4);
  });

  it("✅ delete zone returns success", async () => {
    // Create a zone specifically for deletion
    const create = await ctx.agent.post("/api/shipping/zones").send({
      governorate: "الإسكندرية", shippingCost: 60,
    });
    expect(create.status).toBe(201);
    const res = await ctx.agent.delete(`/api/shipping/zones/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("❌ create zone without auth returns 401", async () => {
    const res = await request(app).post("/api/shipping/zones").send({
      governorate: "القاهرة", shippingCost: 30,
    });
    expect(res.status).toBe(401);
  });

  it("❌ create zone without governorate returns 400", async () => {
    const res = await ctx.agent.post("/api/shipping/zones").send({
      shippingCost: 30,
    });
    expect(res.status).toBe(400);
  });

  it("❌ update zone from another tenant returns 403", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.put(`/api/shipping/zones/${zoneId}`).send({
      shippingCost: 999,
    });
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ delete zone from another tenant returns 403", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.delete(`/api/shipping/zones/${zoneId}`);
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });
});

describe("Shipping Rules — Calculate", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    // Create a zone for Cairo
    await ctx.agent.post("/api/shipping/zones").send({
      governorate: "القاهرة", shippingCost: 40, deliveryDays: 2,
    });
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ calculate returns zone-matched cost", async () => {
    const res = await request(app).post("/api/shipping/calculate").send({
      tenantId: ctx.tenantId, governorate: "القاهرة",
    });
    expect(res.status).toBe(200);
    expect(res.body.shippingCost).toBe(40);
    expect(res.body.appliedRule).toBe("zone_rule");
  });

  it("✅ calculate returns default when no zone match", async () => {
    const res = await request(app).post("/api/shipping/calculate").send({
      tenantId: ctx.tenantId, governorate: "أسوان",
    });
    expect(res.status).toBe(200);
    expect(res.body.appliedRule).toBe("default");
  });

  it("❌ calculate without tenantId returns 400", async () => {
    const res = await request(app).post("/api/shipping/calculate").send({
      governorate: "القاهرة",
    });
    expect(res.status).toBe(400);
  });

  it("❌ calculate without governorate returns 400", async () => {
    const res = await request(app).post("/api/shipping/calculate").send({
      tenantId: ctx.tenantId,
    });
    expect(res.status).toBe(400);
  });
});

describe("Shipping Rules — Settings", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ get settings returns defaults when not configured", async () => {
    const res = await ctx.agent.get("/api/shipping/settings");
    expect(res.status).toBe(200);
    expect(res.body.defaultShippingCost).toBe(50);
  });

  it("✅ upsert settings creates/updates", async () => {
    const res = await ctx.agent.put("/api/shipping/settings").send({
      defaultShippingCost: 75,
      freeShippingEnabled: true,
      freeShippingMinSubtotal: 500,
    });
    expect(res.status).toBe(200);
    expect(res.body.defaultShippingCost).toBe(75);
    expect(res.body.freeShippingEnabled).toBe(true);
  });

  it("✅ free shipping threshold applies on calculate", async () => {
    const res = await request(app).post("/api/shipping/calculate").send({
      tenantId: ctx.tenantId, governorate: "القاهرة", subtotal: 600,
    });
    expect(res.status).toBe(200);
    expect(res.body.isFreeShipping).toBe(true);
    expect(res.body.shippingCost).toBe(0);
  });

  it("❌ get settings without auth returns 401", async () => {
    const res = await request(app).get("/api/shipping/settings");
    expect(res.status).toBe(401);
  });
});
