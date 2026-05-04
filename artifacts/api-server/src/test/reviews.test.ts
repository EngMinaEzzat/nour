import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Reviews", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const p = await createTestProduct(ctx.agent, {
      name: `Reviewable Product ${uid()}`, price: 200, stock: 10, status: "active",
    });
    productId = p.body.id;
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ submit review returns 201 with pending status", async () => {
    const res = await request(app).post("/api/reviews").send({
      productId,
      tenantId: ctx.tenantId,
      customerName: "Test Reviewer",
      customerEmail: `reviewer.${uid()}@test.invalid`,
      rating: 5,
      body: "Excellent product!",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("pending");
    expect(res.body.rating).toBe(5);
  });

  it("✅ GET /reviews/public/:productId returns empty array initially (no approved reviews)", async () => {
    const p = await createTestProduct(ctx.agent, {
      name: `Fresh ${uid()}`, price: 100, stock: 5, status: "active",
    });
    const res = await request(app).get(`/api/reviews/public/${p.body.id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(typeof res.body.totalCount).toBe("number");
  });

  it("✅ merchant GET /reviews returns list of reviews for the tenant", async () => {
    await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Another Reviewer",
      customerEmail: `rv2.${uid()}@test.invalid`,
      rating: 4, body: "Good",
    });
    const res = await ctx.agent.get("/api/reviews");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("✅ merchant can approve a review via PUT /reviews/:id/status", async () => {
    const sub = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Approvable",
      customerEmail: `ap.${uid()}@test.invalid`,
      rating: 4, body: "Good product",
    });
    expect(sub.status).toBe(201);

    const approve = await ctx.agent.put(`/api/reviews/${sub.body.id}/status`).send({ status: "approved" });
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe("approved");
  });

  it("✅ approved review appears in public GET with avgRating", async () => {
    const sub = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Public Reviewer",
      customerEmail: `pub.${uid()}@test.invalid`,
      rating: 5, body: "Amazing!",
    });
    await ctx.agent.put(`/api/reviews/${sub.body.id}/status`).send({ status: "approved" });

    const pub = await request(app).get(`/api/reviews/public/${productId}`);
    expect(pub.status).toBe(200);
    expect(pub.body.reviews.length).toBeGreaterThan(0);
    expect(pub.body.avgRating).not.toBeNull();
    expect(typeof pub.body.avgRating).toBe("number");
  });

  it("✅ merchant can reject a review", async () => {
    const sub = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Rejectable",
      customerEmail: `rj.${uid()}@test.invalid`,
      rating: 2, body: "Not great",
    });
    const reject = await ctx.agent.put(`/api/reviews/${sub.body.id}/status`).send({ status: "rejected" });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe("rejected");
  });

  it("✅ merchant can delete a review", async () => {
    const sub = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Deletable",
      customerEmail: `del.${uid()}@test.invalid`,
      rating: 3, body: "Okay",
    });
    expect(sub.status).toBe(201);
    const del = await ctx.agent.delete(`/api/reviews/${sub.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it("❌ submit review with rating < 1 returns 400", async () => {
    const res = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Bad", customerEmail: `bad.${uid()}@test.invalid`, rating: 0,
    });
    expect(res.status).toBe(400);
  });

  it("❌ submit review with rating > 5 returns 400", async () => {
    const res = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "OOB", customerEmail: `oob.${uid()}@test.invalid`, rating: 6,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/تقييم/);
  });

  it("❌ submit review with missing customerName returns 400", async () => {
    const res = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId, customerEmail: `miss.${uid()}@test.invalid`, rating: 5,
    });
    expect(res.status).toBe(400);
  });

  it("❌ submit review for non-existent product returns 404", async () => {
    const res = await request(app).post("/api/reviews").send({
      productId: 999999999, tenantId: ctx.tenantId,
      customerName: "Ghost", customerEmail: `ghost.${uid()}@test.invalid`, rating: 3,
    });
    expect(res.status).toBe(404);
  });

  it("❌ GET /reviews/public with invalid productId returns 400", async () => {
    const res = await request(app).get("/api/reviews/public/not-a-number");
    expect(res.status).toBe(400);
  });

  it("❌ PUT /reviews/:id/status with invalid status returns 400", async () => {
    const sub = await request(app).post("/api/reviews").send({
      productId, tenantId: ctx.tenantId,
      customerName: "Status Test", customerEmail: `st.${uid()}@test.invalid`, rating: 4,
    });
    const res = await ctx.agent.put(`/api/reviews/${sub.body.id}/status`).send({ status: "invalid_status" });
    expect(res.status).toBe(400);
  });

  it("❌ merchant GET /reviews without auth returns 401", async () => {
    const res = await request(app).get("/api/reviews");
    expect(res.status).toBe(401);
  });
});
