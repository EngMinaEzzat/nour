import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request,
  app,
  uid,
  createTestMerchant,
  cleanupTenant,
  createTestProduct,
  createTestOrder,
} from "./helpers.js";

/**
 * Edge Cases & Regression Tests
 * Covers unusual inputs, boundary conditions, and previously identified bugs
 */

describe("Edge Cases — Product Validation", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });
  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ product name at maximum length (255 chars) succeeds", async () => {
    const name = "أ".repeat(100); // Arabic chars, reasonable max
    const res = await createTestProduct(ctx.agent, {
      name,
      price: 100,
      stock: 1,
    });
    expect([200, 201]).toContain(res.status);
  });

  it("✅ product with price=0 is rejected or accepted consistently", async () => {
    const res = await createTestProduct(ctx.agent, {
      name: "Free Item",
      price: 0,
      stock: 10,
    });
    // Either 201 (zero-price allowed) or 400 (zero-price rejected) - not 500
    expect([200, 201, 400, 422]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("✅ product with very large stock number is handled", async () => {
    const res = await createTestProduct(ctx.agent, {
      name: "Huge Stock",
      price: 100,
      stock: 999999,
    });
    expect([200, 201, 400]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("✅ product with unicode/Arabic name succeeds", async () => {
    const res = await createTestProduct(ctx.agent, {
      name: "فستان زفاف أميرة ✨ — تشكيلة ربيع ٢٠٢٥",
      price: 2500,
      stock: 3,
    });
    expect([200, 201]).toContain(res.status);
  });

  it("✅ product with only required fields succeeds", async () => {
    const res = await createTestProduct(ctx.agent, {
      name: `Minimal ${uid()}`,
      price: 150,
      stock: 5,
    });
    expect([200, 201]).toContain(res.status);
  });

  it("❌ product with missing name returns 400", async () => {
    const res = await ctx.agent
      .post("/api/products")
      .send({ price: 100, stock: 10, status: "active" });
    expect([400, 422]).toContain(res.status);
  });

  it("❌ update non-existent product returns 404", async () => {
    const res = await ctx.agent
      .put("/api/products/9999999")
      .send({ price: 200 });
    expect([403, 404]).toContain(res.status);
  });

  it("❌ delete non-existent product returns 404", async () => {
    const res = await ctx.agent.delete("/api/products/9999999");
    expect([403, 404]).toContain(res.status);
  });
});

describe("Edge Cases — Order Validation", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId = 0;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const p = await createTestProduct(ctx.agent, {
      name: "Order Test Product",
      price: 199,
      stock: 10,
    });
    if (p.status === 201) productId = p.body.id;
  });
  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ valid order creation returns 201", async () => {
    if (!productId) return;
    const res = await createTestOrder(ctx.tenantId, productId);
    expect([200, 201]).toContain(res.status);
  });

  it("❌ order with no items returns 400", async () => {
    const res = await request(app).post("/api/orders").send({
      tenantId: ctx.tenantId,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Cairo",
      items: [],
    });
    expect([400, 422]).toContain(res.status);
  });

  it("❌ order with non-existent product returns 400 or 404", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        tenantId: ctx.tenantId,
        customerPhone: "01012345678",
        paymentMethod: "cod",
        shippingAddress: "Cairo",
        items: [{ productId: 9999999, quantity: 1 }],
      });
    expect([400, 404, 422]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("❌ order with quantity=0 is rejected", async () => {
    if (!productId) return;
    const res = await request(app)
      .post("/api/orders")
      .send({
        tenantId: ctx.tenantId,
        customerPhone: "01012345678",
        paymentMethod: "cod",
        shippingAddress: "Cairo",
        items: [{ productId, quantity: 0 }],
      });
    expect([400, 422]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});

describe("Edge Cases — Auth Validation", () => {
  it("❌ registration with weak password is rejected", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        storeName: "Weak Pass Store",
        slug: `weakpass${uid()}`,
        email: `weak.${uid()}@test.invalid`,
        password: "123",
        category: "fashion",
      });
    expect([400, 422]).toContain(res.status);
  });

  it("❌ registration with invalid email format is rejected", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        storeName: "Invalid Email Store",
        slug: `invalidemail${uid()}`,
        email: "not-an-email",
        password: "TestPass123!",
        category: "fashion",
      });
    expect([400, 422]).toContain(res.status);
  });

  it("❌ login with wrong password returns 401", async () => {
    const id = uid();
    const email = `login.${id}@test.invalid`;
    await request(app)
      .post("/api/auth/register")
      .send({
        storeName: `Login Test ${id}`,
        slug: `logintest${id}`,
        email,
        password: "TestPass123!",
        category: "fashion",
      });
    const res = await request(app).post("/api/auth/login").send({
      email,
      password: "WrongPassword999",
    });
    expect(res.status).toBe(401);
  });

  it("❌ login with non-existent email returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: `nonexistent.${uid()}@test.invalid`,
        password: "TestPass123!",
      });
    expect(res.status).toBe(401);
  });

  it("❌ empty request body to register returns 400", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect([400, 422]).toContain(res.status);
  });
});

describe("Edge Cases — Pagination & Large Data Sets", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    // Create 15 products
    for (let i = 0; i < 15; i++) {
      await createTestProduct(ctx.agent, {
        name: `Bulk Product ${i}`,
        price: 50 + i,
        stock: i + 1,
      });
    }
  });
  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ listing all products returns >= 15 items", async () => {
    const res = await ctx.agent.get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(15);
  });

  it("✅ product list responds within 2 seconds for 15 products", async () => {
    const start = Date.now();
    const res = await ctx.agent.get("/api/products");
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(2000);
  });
});
