import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, uid, createTestMerchant, createTestProduct, cleanupTenant } from "./helpers.js";

// Customers only appear in the merchant's list once they have an order within that tenant.
// The public POST /customers creates a customer record; linking happens via order.customerId.

describe("Customers — Create (public)", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ POST /customers creates a customer and returns data", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("x-storefront-slug", ctx.slug)
      .send({
        name: `Cust ${uid()}`,
        phone: "01012345678",
        email: `cust.${uid()}@test.invalid`,
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("id");
  });

  it("✅ POST /customers with existing email returns existing record (idempotent)", async () => {
    const email = `idem.${uid()}@test.invalid`;
    const r1 = await request(app)
      .post("/api/customers")
      .set("x-storefront-slug", ctx.slug)
      .send({ name: "First", phone: "01011111111", email });
    const r2 = await request(app)
      .post("/api/customers")
      .set("x-storefront-slug", ctx.slug)
      .send({ name: "Second", phone: "01022222222", email });
    expect([200, 201]).toContain(r1.status);
    expect(r2.status).toBe(200);
    expect(r2.body.id).toBe(r1.body.id);
  });

  it("❌ POST /customers with missing name returns 400", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("x-storefront-slug", ctx.slug)
      .send({
        phone: "01012345678",
        email: `bad.${uid()}@test.invalid`,
      });
    expect(res.status).toBe(400);
  });
});

describe("Customers — Merchant CRM (order-linked)", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let customerId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();

    // Create a customer record
    const cust = await request(app).post("/api/customers").send({
      name: `CRM Customer ${uid()}`,
      phone: "01099887766",
      email: `crm.${uid()}@test.invalid`,
      tenantId: ctx.tenantId,
    });
    expect([200, 201]).toContain(cust.status);
    customerId = cust.body.id;

    // Create a product so we can place an order
    const prod = await createTestProduct(ctx.agent, {
      name: `CRM Prod ${uid()}`, price: 250, stock: 20, status: "active",
    });
    expect(prod.status).toBe(201);

    // Place an order linking customer to tenant
    const order = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerId,
      customerName: "CRM Customer",
      customerPhone: "01099887766",
      paymentMethod: "cod",
      shippingAddress: "Test Address",
      items: [{ productId: prod.body.id, quantity: 1, unitPrice: 250 }],
    });
    expect(order.status).toBe(201);
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ GET /customers returns customer who has an order in the tenant", async () => {
    const res = await ctx.agent.get("/api/customers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((c: { id: number }) => c.id);
    expect(ids).toContain(customerId);
  });

  it("✅ GET /customers/:id returns customer with COD score fields", async () => {
    const res = await ctx.agent.get(`/api/customers/${customerId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(customerId);
    expect(res.body).toHaveProperty("codTotalOrders");
    expect(res.body).toHaveProperty("codConfirmationRate");
    expect(typeof res.body.createdAt).toBe("string");
  });

  it("✅ GET /customers list includes totalOrders and totalSpent", async () => {
    const res = await ctx.agent.get("/api/customers");
    const c = res.body.find((x: { id: number }) => x.id === customerId);
    expect(c).toBeDefined();
    expect(typeof c.totalOrders).toBe("number");
    expect(typeof c.totalSpent).toBe("number");
  });

  it("❌ GET /customers without auth returns 401", async () => {
    const res = await request(app).get("/api/customers");
    expect(res.status).toBe(401);
  });

  it("❌ GET /customers/:id for a customer with no orders in tenant returns 403", async () => {
    const other = await createTestMerchant();
    // Create isolated customer not linked to any order in ctx's tenant
    const cust = await request(app).post("/api/customers").send({
      name: `Isolated ${uid()}`, phone: "01055554444", email: `iso.${uid()}@test.invalid`,
      tenantId: other.tenantId,
    });
    const res = await ctx.agent.get(`/api/customers/${cust.body.id}`);
    expect([403, 404]).toContain(res.status);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ GET /customers/:id non-existent returns 404", async () => {
    const res = await ctx.agent.get("/api/customers/999999999");
    expect(res.status).toBe(404);
  });
});
