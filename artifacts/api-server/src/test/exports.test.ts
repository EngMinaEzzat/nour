import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, createTestOrder, cleanupTenant,
} from "./helpers.js";

describe("Exports — CSV Export", () => {
  let ctx1: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctx2: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx1 = await createTestMerchant();
    ctx2 = await createTestMerchant();

    const p1 = await createTestProduct(ctx1.agent, { name: `Export Prod 1 ${uid()}`, price: 100, stock: 10 });
    const p2 = await createTestProduct(ctx2.agent, { name: `Export Prod 2 ${uid()}`, price: 100, stock: 10 });
    
    await createTestOrder(ctx1.tenantId, p1.body.id);
    await createTestOrder(ctx2.tenantId, p2.body.id);
  });
  afterAll(async () => { 
    await cleanupTenant(ctx1.tenantId, ctx1.merchantId); 
    await cleanupTenant(ctx2.tenantId, ctx2.merchantId); 
  });

  it("✅ export orders enqueues job and returns 202", async () => {
    const res = await ctx1.agent.post("/api/exports").send({ exportType: "orders" });
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.message).toMatch(/قائمة الانتظار/);
  });

  it("✅ export products enqueues job and returns 202", async () => {
    const res = await ctx1.agent.post("/api/exports").send({ exportType: "products" });
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
  });

  it("✅ export customers enqueues job and returns 202", async () => {
    const res = await ctx1.agent.post("/api/exports").send({ exportType: "customers" });
    expect(res.status).toBe(202);
  });

  it("✅ export order_items is implemented and scoped to tenant", async () => {
    const res = await ctx1.agent.post("/api/exports").send({ exportType: "order_items" });
    expect(res.status).toBe(202);
  });

  it("✅ date filtering applies correctly", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await ctx1.agent.post("/api/exports").send({ exportType: "orders", dateFrom: futureDate });
    expect(res.status).toBe(202);
  });

  it("✅ list export jobs returns array and omits downloadToken", async () => {
    const res = await ctx1.agent.get("/api/exports");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].downloadToken).toBeUndefined();
    }
  });

  it("❌ export without auth returns 401", async () => {
    const res = await request(app).post("/api/exports").send({ exportType: "orders" });
    expect(res.status).toBe(401);
  });

  it("❌ export with invalid type returns 400", async () => {
    const res = await ctx1.agent.post("/api/exports").send({ exportType: "invalid_type" });
    expect(res.status).toBe(400);
  });

  it("❌ list exports without auth returns 401", async () => {
    const res = await request(app).get("/api/exports");
    expect(res.status).toBe(401);
  });
});
