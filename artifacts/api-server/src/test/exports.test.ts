import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Exports — CSV Export", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    await createTestProduct(ctx.agent, { name: `Export Prod ${uid()}`, price: 100, stock: 10 });
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ export orders returns CSV", async () => {
    const res = await ctx.agent.post("/api/exports").send({ exportType: "orders" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
  });

  it("✅ export products returns CSV", async () => {
    const res = await ctx.agent.post("/api/exports").send({ exportType: "products" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    // Should contain the product name as a substring
    expect(res.text).toContain("Export Prod");
  });

  it("✅ list export jobs returns array", async () => {
    const res = await ctx.agent.get("/api/exports");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("❌ export without auth returns 401", async () => {
    const res = await request(app).post("/api/exports").send({ exportType: "orders" });
    expect(res.status).toBe(401);
  });

  it("❌ export with invalid type returns 400", async () => {
    const res = await ctx.agent.post("/api/exports").send({ exportType: "invalid_type" });
    expect(res.status).toBe(400);
  });

  it("❌ list exports without auth returns 401", async () => {
    const res = await request(app).get("/api/exports");
    expect(res.status).toBe(401);
  });
});
