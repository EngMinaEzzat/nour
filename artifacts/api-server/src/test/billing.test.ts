import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, uid, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Billing — Status & Bank Details", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ GET /billing/status returns subscription info", async () => {
    const res = await ctx.agent.get("/api/billing/status");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("subscriptionStatus", "trial");
    expect(res.body).toHaveProperty("planCode");
    expect(res.body).toHaveProperty("trialEndsAt");
    expect(res.body).toHaveProperty("monthlyPrice");
  });

  it("✅ GET /billing/bank-details returns bank info", async () => {
    const res = await ctx.agent.get("/api/billing/bank-details");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("bankName");
    expect(res.body).toHaveProperty("accountNumber");
    expect(res.body).toHaveProperty("iban");
  });

  it("✅ GET /billing/invoices returns empty array for new merchant", async () => {
    const res = await ctx.agent.get("/api/billing/invoices");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("❌ GET /billing/status without auth returns 401", async () => {
    const res = await request(app).get("/api/billing/status");
    expect(res.status).toBe(401);
  });

  it("❌ GET /billing/bank-details without auth returns 401", async () => {
    const res = await request(app).get("/api/billing/bank-details");
    expect(res.status).toBe(401);
  });

  it("❌ GET /billing/invoices without auth returns 401", async () => {
    const res = await request(app).get("/api/billing/invoices");
    expect(res.status).toBe(401);
  });
});

describe("Billing — Transfer Requests", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let transferId: number;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ submit transfer request returns 201 with pending status", async () => {
    const res = await ctx.agent.post("/api/billing/transfer-request").send({
      planCode: "starter",
      referenceNumber: `TXN-TEST-${uid()}`,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("pending");
    expect(res.body.tenantId).toBe(ctx.tenantId);
    expect(res.body.planCode).toBe("starter");
    expect(Number(res.body.amount)).toBe(299);
    transferId = res.body.id;
  });

  it("✅ GET /billing/transfer-requests returns own requests", async () => {
    const res = await ctx.agent.get("/api/billing/transfer-requests");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((r: { id: number }) => r.id);
    expect(ids).toContain(transferId);
  });

  it("✅ transfer request includes serialised dates", async () => {
    const res = await ctx.agent.get("/api/billing/transfer-requests");
    const r = res.body.find((t: { id: number }) => t.id === transferId);
    expect(r).toBeDefined();
    expect(typeof r.createdAt).toBe("string");
    expect(new Date(r.createdAt).getTime()).not.toBeNaN();
  });

  it("❌ duplicate pending transfer request returns 409", async () => {
    const res = await ctx.agent.post("/api/billing/transfer-request").send({
      planCode: "growth",
      referenceNumber: `TXN-DUP-${uid()}`,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/قيد المراجعة/);
  });

  it("❌ transfer request with invalid planCode returns 400", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.post("/api/billing/transfer-request").send({
      planCode: "enterprise",
      referenceNumber: `TXN-INV-${uid()}`,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/خطة|plan/i);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ transfer request without referenceNumber returns 400", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.post("/api/billing/transfer-request").send({ planCode: "starter" });
    expect(res.status).toBe(400);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ transfer request without auth returns 401", async () => {
    const res = await request(app).post("/api/billing/transfer-request").send({
      planCode: "starter", referenceNumber: "TXN-NOAUTH",
    });
    expect(res.status).toBe(401);
  });

  it("✅ amount is set correctly for each plan", async () => {
    const plans = [
      { code: "starter", expectedAmount: 299 },
      { code: "growth",  expectedAmount: 699 },
      { code: "pro",     expectedAmount: 1499 },
    ];
    for (const { code, expectedAmount } of plans) {
      const m = await createTestMerchant();
      const res = await m.agent.post("/api/billing/transfer-request").send({
        planCode: code, referenceNumber: `TXN-${code}-${uid()}`,
      });
      expect(res.status).toBe(201);
      expect(Number(res.body.amount)).toBe(expectedAmount);
      await cleanupTenant(m.tenantId, m.merchantId);
    }
  });
});
