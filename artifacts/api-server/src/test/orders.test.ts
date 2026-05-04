import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct,
  createTestOrder, createTestCustomer, cleanupTenant,
} from "./helpers.js";

describe("Orders", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;
  let orderId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const p = await createTestProduct(ctx.agent, {
      name: `Order Product ${uid()}`, price: 150, stock: 50, status: "active",
    });
    expect(p.status).toBe(201);
    productId = p.body.id;
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ create order (COD) returns 201 with order data", async () => {
    const res = await createTestOrder(ctx.tenantId, productId);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("pending");
    expect(res.body.paymentMethod).toBe("cod");
    expect(res.body.tenantId).toBe(ctx.tenantId);
    orderId = res.body.id;
  });

  it("✅ order creation includes items array and status history", async () => {
    const res = await createTestOrder(ctx.tenantId, productId);
    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.statusHistory)).toBe(true);
  });

  it("✅ create order decrements product stock", async () => {
    const before = await ctx.agent.get(`/api/products/${productId}`);
    const stockBefore = before.body.stock;

    await createTestOrder(ctx.tenantId, productId);
    const after = await ctx.agent.get(`/api/products/${productId}`);
    expect(after.body.stock).toBe(stockBefore - 1);
  });

  it("✅ list orders with tenantId returns array for that tenant", async () => {
    const res = await ctx.agent.get(`/api/orders?tenantId=${ctx.tenantId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((o: { id: number }) => o.id);
    expect(ids).toContain(orderId);
  });

  it("✅ authenticated GET /orders scopes to session tenant automatically", async () => {
    const res = await ctx.agent.get("/api/orders");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((o: { id: number }) => o.id);
    expect(ids).toContain(orderId);
  });

  it("✅ list orders — filter by status=pending returns only pending orders", async () => {
    const res = await ctx.agent.get("/api/orders?status=pending");
    expect(res.status).toBe(200);
    res.body.forEach((o: { status: string }) => {
      expect(o.status).toBe("pending");
    });
  });

  it("✅ GET /orders/:id returns full order with items and statusHistory (public route)", async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.statusHistory)).toBe(true);
  });

  it("✅ order amounts are parsed as numbers (not strings)", async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalAmount).toBe("number");
    expect(res.body.totalAmount).toBeGreaterThan(0);
    expect(typeof res.body.shippingCost).toBe("number");
  });

  it("✅ update order status pending → confirmed succeeds", async () => {
    const res = await ctx.agent.put(`/api/orders/${orderId}`).send({ status: "confirmed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmed");
  });

  it("✅ update order status confirmed → shipped succeeds", async () => {
    const res = await ctx.agent.put(`/api/orders/${orderId}`).send({ status: "shipped" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("shipped");
  });

  it("✅ update order with tracking number persists", async () => {
    const trackingNum = `TRK-${uid()}`;
    const res = await ctx.agent.put(`/api/orders/${orderId}`)
      .send({ status: "delivered", trackingNumber: trackingNum });
    expect(res.status).toBe(200);
    expect(res.body.trackingNumber).toBe(trackingNum);
  });

  it("✅ GET /orders/:id is a public route — accessible by any agent", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("✅ PUT /orders/:id enforces tenant isolation — can't update another tenant's order", async () => {
    const other = await createTestMerchant();
    const freshOrder = await createTestOrder(ctx.tenantId, productId);
    const freshOrderId = freshOrder.body.id;

    const res = await other.agent.put(`/api/orders/${freshOrderId}`).send({ status: "confirmed" });
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("✅ cancel order restores product stock", async () => {
    const before = await ctx.agent.get(`/api/products/${productId}`);
    const stockBefore = before.body.stock;

    const cancelOrder = await createTestOrder(ctx.tenantId, productId);
    expect(cancelOrder.status).toBe(201);
    const cancelId = cancelOrder.body.id;

    const afterCreate = await ctx.agent.get(`/api/products/${productId}`);
    expect(afterCreate.body.stock).toBe(stockBefore - 1);

    await ctx.agent.put(`/api/orders/${cancelId}`).send({ status: "cancelled" });
    const afterCancel = await ctx.agent.get(`/api/products/${productId}`);
    expect(afterCancel.body.stock).toBe(stockBefore);
  });

  it("❌ create order with empty items array returns 400", async () => {
    const cust = await createTestCustomer();
    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [],
    });
    expect(res.status).toBe(400);
  });

  it("❌ create order with missing customerId returns 400", async () => {
    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [{ productId, quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it("❌ create order with non-existent productId returns 400 (transaction error)", async () => {
    const cust = await createTestCustomer();
    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [{ productId: 999999999, quantity: 1 }],
    });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error).toMatch(/غير موجود/);
  });

  it("❌ update order status without auth returns 401", async () => {
    const res = await request(app).put(`/api/orders/${orderId}`).send({ status: "cancelled" });
    expect(res.status).toBe(401);
  });
});
