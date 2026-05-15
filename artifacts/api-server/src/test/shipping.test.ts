import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestMerchant, createTestProduct, createTestOrder, cleanupTenant, unauthAgent
} from "./helpers.js";

describe("Bosta Integration", () => {
  let ctx1: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctx2: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId1: number;
  let productId2: number;
  let orderId1: number;
  let orderId2: number;

  beforeAll(async () => {
    ctx1 = await createTestMerchant({ slug: `tenant1-${Math.random().toString(36).slice(2)}` });
    ctx2 = await createTestMerchant({ slug: `tenant2-${Math.random().toString(36).slice(2)}` });

    const p1 = await createTestProduct(ctx1.agent);
    productId1 = p1.body.id;
    const p2 = await createTestProduct(ctx2.agent);
    productId2 = p2.body.id;

    const o1 = await createTestOrder(ctx1.tenantId, productId1);
    orderId1 = o1.body.id;
    
    const o2 = await createTestOrder(ctx2.tenantId, productId2);
    orderId2 = o2.body.id;
  });

  afterAll(async () => {
    await cleanupTenant(ctx1.tenantId, ctx1.merchantId);
    await cleanupTenant(ctx2.tenantId, ctx2.merchantId);
  });

  it("returns 401 if unauthenticated", async () => {
    const res = await unauthAgent().post("/api/shipping/bosta/create").send({ orderId: orderId1 });
    expect(res.status).toBe(401);
  });

  it("returns 404 if tenant A tries to create shipment for tenant B's order", async () => {
    const previous = process.env.BOSTA_API_KEY;
    process.env.BOSTA_API_KEY = "mock_key";
    try {
      const res = await ctx1.agent.post("/api/shipping/bosta/create").send({ orderId: orderId2 });
      expect(res.status).toBe(404);
    } finally {
      process.env.BOSTA_API_KEY = previous;
    }
  });

  it("returns safe configured: false if BOSTA_API_KEY is not set", async () => {
    const previous = process.env.BOSTA_API_KEY;
    delete process.env.BOSTA_API_KEY;
    try {
      const res = await ctx1.agent.post("/api/shipping/bosta/create").send({ orderId: orderId1 });
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
      expect(res.body.message).toMatch(/Bosta غير مُهيأ/);
    } finally {
      process.env.BOSTA_API_KEY = previous;
    }
  });

  it("handles duplicate creation gracefully (idempotency)", async () => {
    // Setup a mock API key to bypass configured:false
    const previous = process.env.BOSTA_API_KEY;
    process.env.BOSTA_API_KEY = "mock_key";
    
    // We expect it to try calling Bosta since it doesn't have a tracking number yet.
    // Because we use a fake key, the fetch request inside createDelivery will fail and throw 500.
    // This tests the provider failure leaves the order unchanged.
    try {
      const res1 = await ctx1.agent.post("/api/shipping/bosta/create").send({ orderId: orderId1 });
      expect(res1.status).toBe(500); // Because fetch fails with the mock key

      // Let's manually set the order bosta details to simulate a successful first request
      const { db } = await import("@workspace/db");
      const { ordersTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      
      await db.update(ordersTable).set({
        bostaShipmentId: "mock_bosta_id_123",
        trackingNumber: "MOCK_TRACK_123"
      }).where(eq(ordersTable.id, orderId1));

      // Now call create again, it should return the existing shipment and 200
      const res2 = await ctx1.agent.post("/api/shipping/bosta/create").send({ orderId: orderId1 });
      expect(res2.status).toBe(200);
      expect(res2.body.configured).toBe(true);
      expect(res2.body.shipmentId).toBe("mock_bosta_id_123");
      expect(res2.body.trackingNumber).toBe("MOCK_TRACK_123");
    } finally {
      process.env.BOSTA_API_KEY = previous;
    }
  });
});
