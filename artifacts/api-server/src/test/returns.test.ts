import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct,
  createTestOrder, cleanupTenant,
} from "./helpers.js";

describe("Returns — CRUD", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let orderId: number;
  let returnId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const p = await createTestProduct(ctx.agent, {
      name: `Return Product ${uid()}`, price: 200, stock: 20, status: "active",
    });
    expect(p.status).toBe(201);
    const order = await createTestOrder(ctx.tenantId, p.body.id);
    expect(order.status).toBe(201);
    orderId = order.body.id;
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ create return request returns 201", async () => {
    const res = await ctx.agent.post("/api/returns").send({
      orderId,
      reason: "المنتج به عيب",
      note: "يرجى استبداله",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.reason).toBe("المنتج به عيب");
    expect(res.body.status).toBe("REQUESTED");
    returnId = res.body.id;
  });

  it("✅ list returns shows tenant-scoped results", async () => {
    const res = await ctx.agent.get("/api/returns");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r: { id: number }) => r.id === returnId)).toBe(true);
  });

  it("✅ get single return by ID", async () => {
    const res = await ctx.agent.get(`/api/returns/${returnId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(returnId);
    expect(res.body.orderId).toBe(orderId);
  });

  it("✅ update return status succeeds", async () => {
    const res = await ctx.agent.put(`/api/returns/${returnId}`).send({
      status: "APPROVED",
      note: "تم الموافقة",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("❌ create return without auth returns 401", async () => {
    const res = await request(app).post("/api/returns").send({
      orderId, reason: "test",
    });
    expect(res.status).toBe(401);
  });

  it("❌ create return without orderId returns 400", async () => {
    const res = await ctx.agent.post("/api/returns").send({
      reason: "missing order",
    });
    expect(res.status).toBe(400);
  });

  it("❌ create return without reason returns 400", async () => {
    const res = await ctx.agent.post("/api/returns").send({
      orderId,
    });
    expect(res.status).toBe(400);
  });

  it("❌ update return with invalid status returns 400", async () => {
    const res = await ctx.agent.put(`/api/returns/${returnId}`).send({
      status: "INVALID_STATUS",
    });
    expect(res.status).toBe(400);
  });

  it("❌ cross-tenant: tenant B can't create return for tenant A's order", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.post("/api/returns").send({
      orderId, reason: "cross-tenant test",
    });
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ cross-tenant: tenant B can't update tenant A's return", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.put(`/api/returns/${returnId}`).send({
      status: "REJECTED",
    });
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ get non-existent return returns 404", async () => {
    const res = await ctx.agent.get("/api/returns/999999999");
    expect(res.status).toBe(404);
  });
});
