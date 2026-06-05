import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@workspace/db";
import { merchantsTable, billingTransferRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createTestMerchant, cleanupTenant, TestCtx } from "./helpers.js";

describe("Platform Routes", () => {
  let regularCtx: TestCtx;
  let adminCtx: TestCtx;
  let approveRequestId: number;
  let rejectRequestId: number;

  beforeAll(async () => {
    regularCtx = await createTestMerchant();
    adminCtx = await createTestMerchant();

    // Elevate adminCtx to platform admin
    await db
      .update(merchantsTable)
      .set({ isPlatformAdmin: true })
      .where(eq(merchantsTable.id, adminCtx.merchantId));

    // Create dummy transfer requests for the regular tenant
    const [req1] = await db.insert(billingTransferRequestsTable).values({
      tenantId: regularCtx.tenantId,
      planCode: "pro",
      amount: 1000,
      referenceNumber: "ref-approve-123",
    }).returning({ id: billingTransferRequestsTable.id });
    approveRequestId = req1.id;

    const [req2] = await db.insert(billingTransferRequestsTable).values({
      tenantId: regularCtx.tenantId,
      planCode: "pro",
      amount: 1000,
      referenceNumber: "ref-reject-123",
    }).returning({ id: billingTransferRequestsTable.id });
    rejectRequestId = req2.id;
  });

  afterAll(async () => {
    // Delete the dummy requests (since we clean up tenant, they might cascade, but just in case)
    if (approveRequestId) {
      await db.delete(billingTransferRequestsTable).where(eq(billingTransferRequestsTable.id, approveRequestId));
    }
    if (rejectRequestId) {
      await db.delete(billingTransferRequestsTable).where(eq(billingTransferRequestsTable.id, rejectRequestId));
    }
    await cleanupTenant(regularCtx.tenantId, regularCtx.merchantId);
    await cleanupTenant(adminCtx.tenantId, adminCtx.merchantId);
  });

  // 1. GET /api/platform/stats
  it("should block non-platform admins from accessing stats", async () => {
    const res = await regularCtx.agent.get("/api/platform/stats");
    expect(res.status).toBe(403);
  });

  it("should return platform stats for platform admin", async () => {
    const res = await adminCtx.agent.get("/api/platform/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalTenants");
    expect(res.body).toHaveProperty("activeTenants");
    expect(res.body).toHaveProperty("trialTenants");
    expect(res.body).toHaveProperty("suspendedTenants");
    expect(res.body).toHaveProperty("tenantsWithNoProducts");
    expect(res.body).toHaveProperty("tenantsWithNoOrders");
    expect(res.body).toHaveProperty("tenantsNearProductLimit");
    expect(res.body).toHaveProperty("planBreakdown");
    expect(res.body).toHaveProperty("onboardingCompletion");

    expect(Array.isArray(res.body.planBreakdown)).toBe(true);
    expect(res.body.onboardingCompletion).toHaveProperty("complete");
    expect(res.body.onboardingCompletion).toHaveProperty("partial");
    expect(res.body.onboardingCompletion).toHaveProperty("notStarted");
  });

  // 2. GET /api/platform/provider-health
  it("should return provider health for platform admin", async () => {
    const res = await adminCtx.agent.get("/api/platform/provider-health");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // 3. PUT /api/platform/provider-health/:tenantId/disable
  it("should disable provider for a tenant", async () => {
    const res = await adminCtx.agent.put(`/api/platform/provider-health/${regularCtx.tenantId}/disable`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  // 4. GET /api/platform/health-scores
  it("should return tenant health scores", async () => {
    const res = await adminCtx.agent.get("/api/platform/health-scores");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("tenantId");
      expect(res.body[0]).toHaveProperty("score");
      expect(res.body[0]).toHaveProperty("healthLabel");
    }
  });

  // 5. GET /api/platform/merchants
  it("should return merchants list", async () => {
    const res = await adminCtx.agent.get("/api/platform/merchants");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // 6. PUT /api/platform/merchants/:tenantId/status
  it("should suspend and reactivate a merchant", async () => {
    // Suspend
    let res = await adminCtx.agent.put(`/api/platform/merchants/${regularCtx.tenantId}/status`).send({ action: "suspend" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subscriptionStatus).toBe("suspended");

    // Reactivate
    res = await adminCtx.agent.put(`/api/platform/merchants/${regularCtx.tenantId}/status`).send({ action: "activate" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subscriptionStatus).toBe("active");
  });

  // 7. GET /api/platform/transfer-requests
  it("should list transfer requests", async () => {
    const res = await adminCtx.agent.get("/api/platform/transfer-requests");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // We should find our dummy requests in the list
    const foundApprove = res.body.find((r: any) => r.id === approveRequestId);
    const foundReject = res.body.find((r: any) => r.id === rejectRequestId);
    expect(foundApprove).toBeDefined();
    expect(foundReject).toBeDefined();
  });

  // 8. PUT /api/platform/transfer-requests/:id/approve
  it("should approve transfer request", async () => {
    const res = await adminCtx.agent.put(`/api/platform/transfer-requests/${approveRequestId}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("periodStart");
    expect(res.body).toHaveProperty("periodEnd");
  });

  // 9. PUT /api/platform/transfer-requests/:id/reject
  it("should reject transfer request", async () => {
    const res = await adminCtx.agent.put(`/api/platform/transfer-requests/${rejectRequestId}/reject`).send({ note: "Missing info" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
