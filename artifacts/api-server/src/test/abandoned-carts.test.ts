import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Abandoned Carts — Cart Sync & Recovery", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  const sessionId = `test-session-${Date.now()}`;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ sync cart session (public, no auth needed)", async () => {
    const res = await request(app).post("/api/cart/sync").send({
      sessionId,
      tenantId: ctx.tenantId,
      items: [{ id: 1, name: "Test", qty: 2 }],
      totalAmount: 300,
      itemCount: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("✅ save cart contact info (public)", async () => {
    const res = await request(app).post("/api/cart/contact").send({
      sessionId,
      tenantId: ctx.tenantId,
      customerName: "أحمد",
      customerPhone: "01012345678",
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("✅ convert cart session (public)", async () => {
    const res = await request(app).post("/api/cart/convert").send({
      sessionId,
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("✅ list abandoned carts (authenticated)", async () => {
    // Sync a new non-converted cart for the listing
    const newSid = `cart-${uid()}`;
    await request(app).post("/api/cart/sync").send({
      sessionId: newSid,
      tenantId: ctx.tenantId,
      items: [{ id: 1, name: "Test" }],
      totalAmount: 100,
      itemCount: 1,
    });

    const res = await ctx.agent.get("/api/abandoned-carts");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("carts");
    expect(res.body).toHaveProperty("stats");
    expect(Array.isArray(res.body.carts)).toBe(true);
  });

  it("✅ delete abandoned cart", async () => {
    // Create a cart to delete
    const sid = `del-${uid()}`;
    await request(app).post("/api/cart/sync").send({
      sessionId: sid,
      tenantId: ctx.tenantId,
      items: [],
      totalAmount: 0,
      itemCount: 0,
    });
    const list = await ctx.agent.get("/api/abandoned-carts");
    const cart = list.body.carts.find((c: { sessionId: string }) => c.sessionId === sid);
    if (cart) {
      const res = await ctx.agent.delete(`/api/abandoned-carts/${cart.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it("❌ list abandoned carts without auth returns 401", async () => {
    const res = await request(app).get("/api/abandoned-carts");
    expect(res.status).toBe(401);
  });

  it("❌ sync without sessionId returns 400", async () => {
    const res = await request(app).post("/api/cart/sync").send({
      tenantId: ctx.tenantId,
    });
    expect(res.status).toBe(400);
  });

  it("❌ remind nonexistent cart returns 404", async () => {
    const res = await ctx.agent.post("/api/abandoned-carts/999999/remind");
    expect(res.status).toBe(404);
  });
});
