import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("Domains — Custom Domain Management", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ get domain status (starter plan — disallowed)", async () => {
    const res = await ctx.agent.get("/api/domains/status");
    expect(res.status).toBe(200);
    expect(res.body.planDisallowed).toBe(true);
    expect(res.body.planRequired).toBe("pro");
  });

  it("❌ request domain on starter plan returns 402", async () => {
    const res = await ctx.agent.post("/api/domains/request").send({
      domain: "mystore.com",
    });
    expect(res.status).toBe(402);
  });

  it("❌ get domain status without auth returns 401", async () => {
    const res = await request(app).get("/api/domains/status");
    expect(res.status).toBe(401);
  });

  it("❌ request domain without auth returns 401", async () => {
    const res = await request(app).post("/api/domains/request").send({
      domain: "test.com",
    });
    expect(res.status).toBe(401);
  });
});

describe("Domains — Pro Plan", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    // Upgrade to pro plan
    await db.update(tenantsTable).set({ planCode: "pro" }).where(eq(tenantsTable.id, ctx.tenantId));
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ request domain on pro plan returns 201", async () => {
    const domain = `store-${uid()}.com`;
    const res = await ctx.agent.post("/api/domains/request").send({ domain });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("dnsInstructions");
    expect(res.body.status).toBe("PENDING_DNS");
    expect(res.body.domain).toBe(domain);
  });

  it("❌ request duplicate domain returns 409", async () => {
    const res = await ctx.agent.post("/api/domains/request").send({
      domain: "another.com",
    });
    expect(res.status).toBe(409);
  });

  it("❌ request domain with invalid format returns 400", async () => {
    // First remove existing domain
    await ctx.agent.delete("/api/domains/remove");
    const res = await ctx.agent.post("/api/domains/request").send({
      domain: "not a valid domain!!!",
    });
    expect(res.status).toBe(400);
  });

  it("✅ remove domain returns success", async () => {
    // Request a new domain first
    await ctx.agent.post("/api/domains/request").send({ domain: `rem-${uid()}.com` });
    const res = await ctx.agent.delete("/api/domains/remove");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
