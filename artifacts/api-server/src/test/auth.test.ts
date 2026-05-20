import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, uid, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Auth — Registration", () => {
  const registrations: Array<{ tenantId: number; merchantId: number }> = [];

  afterAll(async () => {
    for (const r of registrations) await cleanupTenant(r.tenantId, r.merchantId);
  });

  it("✅ registers a new merchant and returns auth response", async () => {
    const id = uid();
    const res = await request(app).post("/api/auth/register").send({
      storeName: `Test Store ${id}`,
      slug: `teststore${id}`,
      email: `reg.${id}@nourtest.invalid`,
      password: "TestPass123!",
      category: "fashion",
      description: "Test store description",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("tenantId");
    expect(res.body).toHaveProperty("merchantId");
    expect(res.body).toHaveProperty("slug");
    expect(res.body).toHaveProperty("subscriptionStatus", "trial");
    expect(res.body).toHaveProperty("trialEndsAt");
    const trialDate = new Date(res.body.trialEndsAt);
    const daysLeft = (trialDate.getTime() - Date.now()) / 86400000;
    expect(daysLeft).toBeGreaterThan(13);
    expect(daysLeft).toBeLessThan(15);
    registrations.push({ tenantId: res.body.tenantId, merchantId: res.body.merchantId });
  });

  it("✅ slug is normalised (spaces → dashes, uppercase → lower)", async () => {
    const id = uid();
    const res = await request(app).post("/api/auth/register").send({
      storeName: `Slug Test ${id}`,
      slug: `  My Cool Slug ${id}  `,
      email: `slug.${id}@nourtest.invalid`,
      password: "TestPass123!",
      category: "fashion",
      description: "Slug normalisation test",
    });
    expect(res.status).toBe(201);
    expect(res.body.slug).toMatch(/^[a-z0-9-]+$/);
    registrations.push({ tenantId: res.body.tenantId, merchantId: res.body.merchantId });
  });

  it("❌ duplicate email returns 409", async () => {
    const id = uid();
    const body = {
      storeName: `Dup Email ${id}`,
      slug: `dupem${id}`,
      email: `duptest.${id}@nourtest.invalid`,
      password: "TestPass123!",
      category: "fashion",
      description: "Test",
    };
    const r1 = await request(app).post("/api/auth/register").send(body);
    expect(r1.status).toBe(201);
    registrations.push({ tenantId: r1.body.tenantId, merchantId: r1.body.merchantId });

    const r2 = await request(app).post("/api/auth/register").send({ ...body, slug: `dupem2${id}` });
    expect(r2.status).toBe(409);
    expect(r2.body.error).toMatch(/بريد/);
  });

  it("❌ duplicate slug returns 409", async () => {
    const id = uid();
    const slug = `dupslug${id}`;
    const r1 = await request(app).post("/api/auth/register").send({
      storeName: `Store A ${id}`, slug, email: `dsa.${id}@nourtest.invalid`,
      password: "TestPass123!", category: "fashion", phone: "01000000000", description: "Test",
    });
    expect(r1.status).toBe(201);
    registrations.push({ tenantId: r1.body.tenantId, merchantId: r1.body.merchantId });

    const r2 = await request(app).post("/api/auth/register").send({
      storeName: `Store B ${id}`, slug, email: `dsb.${id}@nourtest.invalid`,
      password: "TestPass123!", category: "fashion", phone: "01000000000", description: "Test",
    });
    expect(r2.status).toBe(409);
    expect(r2.body.error).toMatch(/رابط|slug/i);
  });

  it("❌ reserved slug (admin) returns 400", async () => {
    const id = uid();
    const res = await request(app).post("/api/auth/register").send({
      storeName: `Admin Store ${id}`, slug: "admin",
      email: `reserved.${id}@nourtest.invalid`,
      password: "TestPass123!", category: "fashion", phone: "01000000000", description: "Test",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/محجوز|reserved/i);
  });

  it("❌ missing required fields returns 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `incomplete.${uid()}@nourtest.invalid`,
    });
    expect(res.status).toBe(400);
  });

  it("❌ empty slug after normalisation returns 400", async () => {
    const id = uid();
    const res = await request(app).post("/api/auth/register").send({
      storeName: `Bad Slug ${id}`, slug: "!!!###",
      email: `badslug.${id}@nourtest.invalid`,
      password: "TestPass123!", category: "fashion", phone: "01000000000", description: "Test",
    });
    expect(res.status).toBe(400);
  });
});

describe("Auth — Login & Session", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ login with correct credentials sets session", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/login").send({ email: ctx.email, password: "TestPass123!" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tenantId", ctx.tenantId);
    expect(res.body).toHaveProperty("subscriptionStatus");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.tenantId).toBe(ctx.tenantId);
  });

  it("✅ GET /auth/me returns 401 when not logged in", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("✅ GET /auth/me returns merchant data when logged in", async () => {
    const me = await ctx.agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty("email", ctx.email);
    expect(me.body).toHaveProperty("tenantId", ctx.tenantId);
    expect(me.body).toHaveProperty("trialEndsAt");
  });

  it("✅ logout destroys session — subsequent /me returns 401", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: ctx.email, password: "TestPass123!" });
    const pre = await agent.get("/api/auth/me");
    expect(pre.status).toBe(200);

    await agent.post("/api/auth/logout");
    const post = await agent.get("/api/auth/me");
    expect(post.status).toBe(401);
  });

  it("❌ login with wrong password returns 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: ctx.email, password: "WrongPassword999",
    });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("❌ login with non-existent email returns 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: `nobody.${uid()}@nourtest.invalid`, password: "TestPass123!",
    });
    expect(res.status).toBe(401);
  });

  it("❌ login with missing fields returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ctx.email });
    expect(res.status).toBe(400);
  });
});

describe("Auth — Slug Check", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ available slug returns available: true", async () => {
    const res = await request(app).get(`/api/auth/check-slug?slug=freshslug${uid()}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it("✅ taken slug returns available: false", async () => {
    const res = await request(app).get(`/api/auth/check-slug?slug=${ctx.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it("✅ reserved slug (api) returns available: false with reason: reserved", async () => {
    const res = await request(app).get("/api/auth/check-slug?slug=api");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe("reserved");
  });

  it("❌ empty slug returns available: false with reason: invalid", async () => {
    const res = await request(app).get("/api/auth/check-slug?slug=");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe("invalid");
  });
});

describe("Auth — Password Reset", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ forgot-password returns ok: true for known email (doesn't leak existence)", async () => {
    const res = await request(app).post("/api/auth/forgot-password")
      .send({ email: ctx.email });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("✅ forgot-password returns ok: true for unknown email (privacy — no leakage)", async () => {
    const res = await request(app).post("/api/auth/forgot-password")
      .send({ email: `nobody.${uid()}@nourtest.invalid` });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("❌ forgot-password without email returns 400", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });

  it("❌ reset-password with invalid token returns 400", async () => {
    const res = await request(app).post("/api/auth/reset-password")
      .send({ token: "invalid-token-xyz", password: "NewPass456!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/صالح|منتهي/);
  });

  it("❌ reset-password with short password returns 400", async () => {
    const res = await request(app).post("/api/auth/reset-password")
      .send({ token: "sometoken", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/قصير/);
  });

  it("❌ reset-password with missing fields returns 400", async () => {
    const res = await request(app).post("/api/auth/reset-password")
      .send({ token: "tok" });
    expect(res.status).toBe(400);
  });
});
