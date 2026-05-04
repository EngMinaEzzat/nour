import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, uid, createTestMerchant, createTestProduct, cleanupTenant } from "./helpers.js";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── requireAuth: protected routes require a session ───────────────────────────
describe("Middleware — requireAuth", () => {
  it("❌ protected route (POST /categories) without session returns 401", async () => {
    const res = await request(app).post("/api/categories").send({ name: "Cat", nameAr: "فئة", type: "fashion" });
    expect(res.status).toBe(401);
  });

  it("❌ protected route (POST /products) without session returns 401", async () => {
    const res = await request(app).post("/api/products").send({ name: "Prod", price: 100, stock: 5 });
    expect(res.status).toBe(401);
  });

  it("❌ protected route (GET /billing/status) without session returns 401", async () => {
    const res = await request(app).get("/api/billing/status");
    expect(res.status).toBe(401);
  });

  it("✅ GET /products without auth returns 200 (public route)", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── requireRole: role-level access ───────────────────────────────────────────
describe("Middleware — requireRole", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ owner can access owner-only routes", async () => {
    const res = await ctx.agent.get("/api/billing/status");
    expect(res.status).toBe(200);
  });

  it("✅ owner can POST /billing/transfer-request", async () => {
    const res = await ctx.agent.post("/api/billing/transfer-request").send({
      planCode: "starter", referenceNumber: `ROLE-TEST-${uid()}`,
    });
    expect([201, 409]).toContain(res.status);
  });
});

// ─── Subscription Gate ─────────────────────────────────────────────────────────
// The gate is built into requireRole — all protected routes check subscription.
// We use GET /billing/status (requires owner role) to verify each state.
describe("Middleware — Subscription Gate (trial)", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ active trial merchant can access protected routes", async () => {
    const res = await ctx.agent.get("/api/billing/status");
    expect(res.status).toBe(200);
  });

  it("❌ expired trial merchant gets 402 TRIAL_EXPIRED on protected routes", async () => {
    const expiredCtx = await createTestMerchant();

    await db.update(tenantsTable).set({
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() - 86400000),
    }).where(eq(tenantsTable.id, expiredCtx.tenantId));

    const res = await expiredCtx.agent.get("/api/billing/status");
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("TRIAL_EXPIRED");
    expect(res.body).toHaveProperty("trialEndsAt");

    await cleanupTenant(expiredCtx.tenantId, expiredCtx.merchantId);
  });

  it("❌ suspended merchant gets 402 SUBSCRIPTION_SUSPENDED", async () => {
    const suspCtx = await createTestMerchant();

    await db.update(tenantsTable).set({ subscriptionStatus: "suspended" })
      .where(eq(tenantsTable.id, suspCtx.tenantId));

    const res = await suspCtx.agent.get("/api/billing/status");
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("SUBSCRIPTION_SUSPENDED");

    await cleanupTenant(suspCtx.tenantId, suspCtx.merchantId);
  });

  it("❌ past_due merchant gets 402 SUBSCRIPTION_SUSPENDED", async () => {
    const pastCtx = await createTestMerchant();

    await db.update(tenantsTable).set({ subscriptionStatus: "past_due" })
      .where(eq(tenantsTable.id, pastCtx.tenantId));

    const res = await pastCtx.agent.get("/api/billing/status");
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("SUBSCRIPTION_SUSPENDED");

    await cleanupTenant(pastCtx.tenantId, pastCtx.merchantId);
  });

  it("❌ canceled merchant gets 402 SUBSCRIPTION_CANCELED", async () => {
    const cancelCtx = await createTestMerchant();

    await db.update(tenantsTable).set({ subscriptionStatus: "canceled" })
      .where(eq(tenantsTable.id, cancelCtx.tenantId));

    const res = await cancelCtx.agent.get("/api/billing/status");
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("SUBSCRIPTION_CANCELED");

    await cleanupTenant(cancelCtx.tenantId, cancelCtx.merchantId);
  });

  it("✅ active subscription merchant has full access", async () => {
    const activeCtx = await createTestMerchant();

    await db.update(tenantsTable).set({
      subscriptionStatus: "active",
      subscriptionStartedAt: new Date(),
    }).where(eq(tenantsTable.id, activeCtx.tenantId));

    const res = await activeCtx.agent.get("/api/billing/status");
    expect(res.status).toBe(200);

    await cleanupTenant(activeCtx.tenantId, activeCtx.merchantId);
  });
});

// ─── requirePlatformAdmin ──────────────────────────────────────────────────────
describe("Middleware — requirePlatformAdmin", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("❌ regular merchant accessing /platform/stats gets 403", async () => {
    const res = await ctx.agent.get("/api/platform/stats");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/مشغل|admin/i);
  });

  it("❌ unauthenticated request to /platform/stats gets 401", async () => {
    const res = await request(app).get("/api/platform/stats");
    expect(res.status).toBe(401);
  });

  it("❌ regular merchant accessing /platform/transfer-requests gets 403", async () => {
    const res = await ctx.agent.get("/api/platform/transfer-requests");
    expect(res.status).toBe(403);
  });

  it("❌ regular merchant trying to approve a transfer request gets 403", async () => {
    const res = await ctx.agent.put("/api/platform/transfer-requests/1/approve").send({});
    expect(res.status).toBe(403);
  });
});

// ─── Tenant Isolation ──────────────────────────────────────────────────────────
describe("Middleware — Tenant Isolation", () => {
  let ctxA: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctxB: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    [ctxA, ctxB] = await Promise.all([createTestMerchant(), createTestMerchant()]);
  });
  afterAll(async () => {
    await Promise.all([
      cleanupTenant(ctxA.tenantId, ctxA.merchantId),
      cleanupTenant(ctxB.tenantId, ctxB.merchantId),
    ]);
  });

  it("✅ merchant A's products do not appear in merchant B's tenant-scoped list", async () => {
    const pA = await createTestProduct(ctxA.agent, {
      name: `TenantA Product ${uid()}`, price: 100, stock: 5, status: "active",
    });
    expect(pA.status).toBe(201);

    // Use tenantId query param — merchant B scopes to their own tenant
    const resB = await ctxB.agent.get(`/api/products?tenantId=${ctxB.tenantId}`);
    const ids = resB.body.map((p: { id: number }) => p.id);
    expect(ids).not.toContain(pA.body.id);
  });

  it("✅ merchant B can't edit merchant A's products (PUT returns 403)", async () => {
    const pA = await createTestProduct(ctxA.agent, {
      name: `IsolatedA ${uid()}`, price: 200, stock: 3, status: "active",
    });
    expect(pA.status).toBe(201);

    const res = await ctxB.agent.put(`/api/products/${pA.body.id}`).send({ price: 1 });
    expect(res.status).toBe(403);
  });

  it("✅ merchant B's customers not in merchant A's list (no shared-order link)", async () => {
    const id = uid();
    const cB = await ctxB.agent.post("/api/customers").send({
      name: `TenantB Customer ${id}`,
      phone: "01099999999",
      email: `tenantb.${id}@test.invalid`,
    });
    expect([200, 201]).toContain(cB.status);

    // Merchant A's customer list only shows customers with orders in A's tenant
    const resA = await ctxA.agent.get("/api/customers");
    const ids = resA.body.map((c: { id: number }) => c.id);
    expect(ids).not.toContain(cB.body.id);
  });
});
