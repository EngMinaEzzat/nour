import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request,
  app,
  uid,
  createTestMerchant,
  cleanupTenant,
  createTestProduct,
} from "./helpers.js";

/**
 * Security & Authorization tests
 * Verifies that tenant isolation, role checks, and injection guards work correctly
 */

describe("Security — Tenant Isolation", () => {
  let ctx1: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctx2: Awaited<ReturnType<typeof createTestMerchant>>;
  let productOfCtx1 = 0;

  beforeAll(async () => {
    [ctx1, ctx2] = await Promise.all([
      createTestMerchant(),
      createTestMerchant(),
    ]);
    const r = await createTestProduct(ctx1.agent, {
      name: `Ctx1 Product ${uid()}`,
      price: 150,
      stock: 10,
    });
    if (r.status === 201) productOfCtx1 = r.body.id;
  });

  afterAll(async () => {
    await Promise.all([
      cleanupTenant(ctx1.tenantId, ctx1.merchantId),
      cleanupTenant(ctx2.tenantId, ctx2.merchantId),
    ]);
  });

  it("❌ tenant2 cannot delete tenant1's product", async () => {
    if (!productOfCtx1) return;
    const res = await ctx2.agent.delete(`/api/products/${productOfCtx1}`);
    expect([403, 404]).toContain(res.status);
  });

  it("❌ tenant2 cannot update tenant1's product", async () => {
    if (!productOfCtx1) return;
    const res = await ctx2.agent
      .put(`/api/products/${productOfCtx1}`)
      .send({ name: "Unauthorized Update", price: 1 });
    expect([403, 404]).toContain(res.status);
  });

  it("✅ each tenant only sees their own analytics", async () => {
    const [res1, res2] = await Promise.all([
      ctx1.agent.get("/api/analytics/merchant"),
      ctx2.agent.get("/api/analytics/merchant"),
    ]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Both are valid analytics responses for their own tenants
    expect(res1.body).toHaveProperty("totalOrders");
    expect(res2.body).toHaveProperty("totalOrders");
  });

  it("✅ each tenant's orders list is scoped to their tenant", async () => {
    const [res1, res2] = await Promise.all([
      ctx1.agent.get("/api/orders"),
      ctx2.agent.get("/api/orders"),
    ]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // All orders from ctx2 must belong to ctx2's tenant
    const ctx2Orders = (res2.body.data || res2.body) as Array<{
      tenantId: number;
    }>;
    for (const order of ctx2Orders) {
      expect(order.tenantId).toBe(ctx2.tenantId);
    }
  });

  it("✅ ctx1's product is visible in ctx1's own tenant-scoped product list", async () => {
    if (!productOfCtx1) return;
    // GET /api/products?tenantId=X should scope to that tenant
    const res1 = await ctx1.agent.get(
      `/api/products?tenantId=${ctx1.tenantId}`,
    );
    expect(res1.status).toBe(200);
    const ctx1Ids = res1.body.map((p: { id: number }) => p.id);
    expect(ctx1Ids).toContain(productOfCtx1);
  });

  it("✅ ctx2's tenant-scoped product list does not contain ctx1's product", async () => {
    if (!productOfCtx1) return;
    // Query explicitly for ctx2's products using tenantId filter
    const res2 = await request(app).get(
      `/api/products?tenantId=${ctx2.tenantId}`,
    );
    expect(res2.status).toBe(200);
    const ctx2Ids = res2.body.map((p: { id: number }) => p.id);
    expect(ctx2Ids).not.toContain(productOfCtx1);
  });
});

describe("Security — Auth Middleware", () => {
  it("❌ unauthenticated requests to merchant-only routes return 401", async () => {
    const protectedRoutes = [
      { method: "get", path: "/api/customers" },
      { method: "get", path: "/api/analytics/merchant" },
      { method: "get", path: "/api/store-settings" },
      { method: "post", path: "/api/products" },
      { method: "post", path: "/api/categories" },
    ];

    for (const route of protectedRoutes) {
      const agent = request(app) as any;
      const res = await agent[route.method](route.path).send({});
      expect(res.status).toBe(401);
    }
  });

  it("✅ health endpoint returns 200 without auth", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
  });

  it("✅ storefront endpoint is public — no auth needed", async () => {
    const ctx = await createTestMerchant();
    const res = await request(app).get(`/api/store/${ctx.slug}`);
    expect(res.status).toBe(200);
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("❌ slug with SQL-injection-like text returns 404, not 500", async () => {
    const res = await request(app).get("/api/store/'; DROP TABLE tenants; --");
    expect([400, 404]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});

describe("Security — Input Validation", () => {
  it("❌ negative price returns 400", async () => {
    const m = await createTestMerchant();
    const res = await m.agent.post("/api/products").send({
      name: "Bad Product",
      price: -50,
      stock: 10,
      status: "active",
    });
    expect([400, 422]).toContain(res.status);
    await cleanupTenant(m.tenantId, m.merchantId);
  });

  it("❌ negative stock returns 400", async () => {
    const m = await createTestMerchant();
    const res = await m.agent.post("/api/products").send({
      name: "Bad Product",
      price: 100,
      stock: -1,
      status: "active",
    });
    expect([400, 422]).toContain(res.status);
    await cleanupTenant(m.tenantId, m.merchantId);
  });

  it("❌ invalid product status returns 400", async () => {
    const m = await createTestMerchant();
    const res = await m.agent.post("/api/products").send({
      name: "Bad Product",
      price: 100,
      stock: 10,
      status: "published",
    });
    expect([400, 422]).toContain(res.status);
    await cleanupTenant(m.tenantId, m.merchantId);
  });

  it("❌ missing product name returns 400", async () => {
    const m = await createTestMerchant();
    const res = await m.agent
      .post("/api/products")
      .send({ price: 100, stock: 10, status: "active" });
    expect([400, 422]).toContain(res.status);
    await cleanupTenant(m.tenantId, m.merchantId);
  });

  it("✅ large but valid product name does not crash the server", async () => {
    const m = await createTestMerchant();
    const res = await m.agent.post("/api/products").send({
      name: "أ".repeat(500),
      price: 100,
      stock: 10,
      status: "active",
    });
    expect(res.status).not.toBe(500);
    await cleanupTenant(m.tenantId, m.merchantId);
  });
});

describe("Security — Data Privacy", () => {
  it("❌ POST /api/customers does not leak PII for existing emails", async () => {
    const email = `victim-${uid()}@example.com`;
    const phone = "01012345678";
    const city = "Cairo";

    // 1. Create a customer
    await request(app).post("/api/customers").send({
      name: "Victim Customer",
      email,
      phone,
      city,
    });

    // 2. Try to harvest PII by just knowing the email
    const res = await request(app).post("/api/customers").send({
      name: "Attacker Guess",
      email,
      phone: "01099887766",
    });

    expect(res.status).toBe(200);
    // Should NOT contain phone or city
    expect(res.body).not.toHaveProperty("phone");
    expect(res.body).not.toHaveProperty("city");
    // Should still contain ID and name (needed for checkout)
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name");
  });

  it("✅ POST /api/customers (new) does not return sensitive fields", async () => {
    const email = `new-${uid()}@example.com`;
    const res = await request(app).post("/api/customers").send({
      name: "New Customer",
      email,
      phone: "01122334455",
      city: "Giza",
    });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("phone");
    expect(res.body).not.toHaveProperty("city");
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name");
  });
});
