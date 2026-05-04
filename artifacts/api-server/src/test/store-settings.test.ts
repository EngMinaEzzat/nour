import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Store Settings — Branding", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ updates store name", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/branding")
      .send({ name: `Updated Store ${uid()}` });
    expect(res.status).toBe(200);
  });

  it("✅ updates primary and secondary color", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/branding")
      .send({ primaryColor: "#7c3aed", secondaryColor: "#f59e0b" });
    expect(res.status).toBe(200);
  });

  it("✅ updates logoUrl and coverUrl", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/branding")
      .send({
        logoUrl: "https://example.com/logo.png",
        coverUrl: "https://example.com/cover.jpg",
      });
    expect(res.status).toBe(200);
  });

  it("✅ updates description", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/branding")
      .send({ description: "متجر رائع جداً يستهدف المرأة العصرية" });
    expect(res.status).toBe(200);
  });

  it("❌ rejects store name shorter than 2 chars", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/branding")
      .send({ name: "X" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("❌ rejects store name longer than 100 chars", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/branding")
      .send({ name: "A".repeat(101) });
    expect(res.status).toBe(400);
  });

  it("❌ unauthenticated request returns 401", async () => {
    const res = await request(app)
      .put("/api/store-settings/branding")
      .send({ name: "Hacked Store" });
    expect(res.status).toBe(401);
  });

  it("✅ saved color is persisted and readable via GET", async () => {
    const color = "#" + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, "0");
    await ctx.agent.put("/api/store-settings/branding").send({ primaryColor: color });
    const res = await ctx.agent.get("/api/store-settings");
    expect(res.status).toBe(200);
    expect(res.body.primaryColor).toBe(color);
  });
});

describe("Store Settings — Social Links", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ updates social links with valid data", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/social")
      .send({
        instagram: "https://instagram.com/mystore",
        facebook: "https://facebook.com/mystore",
        tiktok: "https://tiktok.com/@mystore",
      });
    expect(res.status).toBe(200);
  });

  it("✅ accepts empty social links object", async () => {
    const res = await ctx.agent
      .put("/api/store-settings/social")
      .send({});
    expect(res.status).toBe(200);
  });

  it("❌ unauthenticated request returns 401", async () => {
    const res = await request(app)
      .put("/api/store-settings/social")
      .send({ instagram: "https://instagram.com/hack" });
    expect(res.status).toBe(401);
  });

  it("✅ social links are persisted and readable after save", async () => {
    const instaHandle = `mystore${uid()}`;
    await ctx.agent.put("/api/store-settings/social").send({
      instagram: `https://instagram.com/${instaHandle}`,
    });
    const res = await ctx.agent.get("/api/store-settings");
    expect(res.status).toBe(200);
    expect(res.body.socialLinks?.instagram).toContain(instaHandle);
  });
});

describe("Store Settings — GET settings", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ reads tenant settings with 200", async () => {
    const res = await ctx.agent.get("/api/store-settings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("slug");
    expect(res.body).toHaveProperty("name");
  });

  it("✅ response includes social links object (not string)", async () => {
    const res = await ctx.agent.get("/api/store-settings");
    expect(res.status).toBe(200);
    expect(typeof res.body.socialLinks).toBe("object");
  });

  it("❌ unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/store-settings");
    expect(res.status).toBe(401);
  });
});
