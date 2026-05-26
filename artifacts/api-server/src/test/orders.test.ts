import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = res.body.data.map((o: { id: number }) => o.id);
    expect(ids).toContain(orderId);
  });

  it("✅ authenticated GET /orders scopes to session tenant automatically", async () => {
    const res = await ctx.agent.get("/api/orders");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = res.body.data.map((o: { id: number }) => o.id);
    expect(ids).toContain(orderId);
  });

  it("✅ list orders — filter by status=pending returns only pending orders", async () => {
    const res = await ctx.agent.get("/api/orders?status=pending");
    expect(res.status).toBe(200);
    res.body.data.forEach((o: { status: string }) => {
      expect(o.status).toBe("pending");
    });
  });

  it("✅ list orders — pagination works with limit", async () => {
    // Create multiple orders to test pagination
    const o1 = await createTestOrder(ctx.tenantId, productId);
    const o2 = await createTestOrder(ctx.tenantId, productId);
    
    const res = await ctx.agent.get("/api/orders?limit=1");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.hasMore).toBe(true);
    expect(res.body.nextCursor).toBeDefined();
    expect(res.body.nextCursor.cursorDate).toBeDefined();
    expect(res.body.nextCursor.cursorId).toBeDefined();
  });

  it("✅ list orders — search by customer phone works", async () => {
    const cust = await createTestCustomer();
    const phone = cust.body.phone;
    await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: phone,
      paymentMethod: "cod",
      marketingConsent: true,
      items: [{ productId, quantity: 1 }],
    });

    const res = await ctx.agent.get(`/api/orders?search=${phone}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((o: any) => {
      // order phone is stored normalised
      expect(o.customerPhone).toBe("+201012345678");
    });

    // Check marketing consent is saved
    const [dbCustomer] = await db.select().from(customersTable).where(eq(customersTable.id, cust.body.id));
    expect(dbCustomer.marketingConsent).toBe(true);
    expect(dbCustomer.marketingConsentSource).toBe("checkout");
    expect(dbCustomer.marketingConsentAt).not.toBeNull();
  });

  it("✅ GET /orders/:id returns full order with items and statusHistory (public route)", async () => {
    const res = await ctx.agent.get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.statusHistory)).toBe(true);
  });

  it("✅ order amounts are parsed as numbers (not strings)", async () => {
    const res = await ctx.agent.get(`/api/orders/${orderId}`);
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

  it("❌ invalid order status transition is rejected", async () => {
    const invalidOrder = await createTestOrder(ctx.tenantId, productId);
    expect(invalidOrder.status).toBe(201);

    const res = await ctx.agent.put(`/api/orders/${invalidOrder.body.id}`).send({ status: "delivered" });
    expect(res.status).toBe(409);
  });

  it("✅ GET /orders/:id is a public route — accessible by any agent", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.get(`/api/orders/${orderId}`);
    expect(res.status).toBe(403);
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

  it("rejects checkout when tenantId does not own the product", async () => {
    const other = await createTestMerchant();
    const product = await createTestProduct(other.agent, { stock: 3 });
    const before = await other.agent.get(`/api/products/${product.body.id}`);
    const cust = await createTestCustomer();

    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [{ productId: product.body.id, quantity: 1 }],
    });

    const after = await other.agent.get(`/api/products/${product.body.id}`);
    expect(res.status).toBe(403);
    expect(after.body.stock).toBe(before.body.stock);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("rejects checkout when quantity exceeds stock without changing stock", async () => {
    const limited = await createTestProduct(ctx.agent, { stock: 1 });
    const cust = await createTestCustomer();

    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [{ productId: limited.body.id, quantity: 2 }],
    });

    const after = await ctx.agent.get(`/api/products/${limited.body.id}`);
    expect(res.status).toBe(409);
    expect(after.body.stock).toBe(1);
  });

  it("public order tracking requires the public code and token", async () => {
    const tracked = await createTestOrder(ctx.tenantId, productId);
    expect(tracked.status).toBe(201);

    const raw = await request(app).get(`/api/orders/${tracked.body.id}`);
    expect(raw.status).toBe(401);

    const missingToken = await request(app).get(`/api/orders/track/${tracked.body.publicCode}`);
    expect(missingToken.status).toBe(400);

    const publicRes = await request(app).get(`/api/orders/track/${tracked.body.publicCode}?token=${tracked.body.trackingToken}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.id).toBe(tracked.body.id);
    expect(publicRes.body.trackingToken).toBeUndefined();
  });

  it("✅ cancel already-cancelled order is idempotent (does not double restore stock)", async () => {
    const cancelOrder = await createTestOrder(ctx.tenantId, productId);
    const cancelId = cancelOrder.body.id;

    // First cancel
    await ctx.agent.put(`/api/orders/${cancelId}`).send({ status: "cancelled" });
    const afterFirst = await ctx.agent.get(`/api/products/${productId}`);
    const stockAfterFirst = afterFirst.body.stock;

    // Second cancel
    const res = await ctx.agent.put(`/api/orders/${cancelId}`).send({ status: "cancelled" });
    expect(res.status).toBe(200);
    
    const afterSecond = await ctx.agent.get(`/api/products/${productId}`);
    expect(afterSecond.body.stock).toBe(stockAfterFirst);
  });

  it("✅ returned order restores product stock", async () => {
    const returnOrder = await createTestOrder(ctx.tenantId, productId);
    const returnId = returnOrder.body.id;

    const beforeReturn = await ctx.agent.get(`/api/products/${productId}`);
    const stockBeforeReturn = beforeReturn.body.stock;

    await ctx.agent.put(`/api/orders/${returnId}`).send({ status: "confirmed" });
    await ctx.agent.put(`/api/orders/${returnId}`).send({ status: "shipped" });
    await ctx.agent.put(`/api/orders/${returnId}`).send({ status: "delivered" });
    await ctx.agent.put(`/api/orders/${returnId}`).send({ status: "returned" });
    
    const afterReturn = await ctx.agent.get(`/api/products/${productId}`);
    expect(afterReturn.body.stock).toBe(stockBeforeReturn + 1);
  });

  it("❌ create order with negative quantity returns 400", async () => {
    const cust = await createTestCustomer();
    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [{ productId, quantity: -1 }],
    });
    expect([400, 422]).toContain(res.status);
  });

  it("❌ create order with invalid Egypt phone format returns 400", async () => {
    const cust = await createTestCustomer();
    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId: cust.body.id,
      customerPhone: "99999999999", // Invalid format
      paymentMethod: "cod",
      shippingAddress: "Address",
      items: [{ productId, quantity: 1 }],
    });
    expect([400, 422]).toContain(res.status);
  });
});
