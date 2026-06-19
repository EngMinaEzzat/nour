import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, uid, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Storefront Auth — Registration", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ successfully registers a new customer with a formatted Egypt phone number", async () => {
    const id = uid();
    const email = `customer.${id}@nourtest.invalid`;
    const res = await request(app)
      .post("/api/storefront-auth/register")
      .send({
        name: `Test Customer ${id}`,
        email,
        password: "TestPass123!",
        phone: "+20 10 1234 5678",
      });
    expect(res.status).toBe(201);
    expect(res.body.customer).toHaveProperty("id");
    expect(res.body.customer.email).toBe(email);
    expect(res.body.customer.phone).toBe("+201012345678");
  });

  it("❌ registration fails if phone number is missing", async () => {
    const id = uid();
    const res = await request(app)
      .post("/api/storefront-auth/register")
      .send({
        name: `No Phone ${id}`,
        email: `nophone.${id}@nourtest.invalid`,
        password: "TestPass123!",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("fieldErrors");
    expect(res.body.error.fieldErrors).toHaveProperty("phone");
  });

  it("❌ registration fails if phone number format is invalid", async () => {
    const id = uid();
    const res = await request(app)
      .post("/api/storefront-auth/register")
      .send({
        name: `Bad Phone ${id}`,
        email: `badphone.${id}@nourtest.invalid`,
        password: "TestPass123!",
        phone: "12345", // Invalid Egyptian phone number
      });
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toHaveProperty("phone");
  });

  it("❌ registration fails with duplicate email", async () => {
    const id = uid();
    const email = `dup.${id}@nourtest.invalid`;
    const body = {
      name: `Dup Customer`,
      email,
      password: "TestPass123!",
      phone: "01111111111",
    };

    const res1 = await request(app).post("/api/storefront-auth/register").send(body);
    expect(res1.status).toBe(201);

    const res2 = await request(app).post("/api/storefront-auth/register").send(body);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/مسجل/);
  });
});

describe("Storefront Auth — Tenant Isolation & Isolation Boundaries", () => {
  it("✅ allows registering the same email on different storefronts with different passwords", async () => {
    const tenantA = await createTestMerchant({ slug: `store-a-${uid()}` });
    const tenantB = await createTestMerchant({ slug: `store-b-${uid()}` });
    const email = `shared.${uid()}@test.invalid`;

    // 1. Register on Store A
    const resA = await request(app)
      .post("/api/storefront-auth/register")
      .set("x-storefront-slug", tenantA.slug)
      .send({
        name: "Alice Store A",
        email,
        password: "PasswordA123!",
        phone: "01011112222",
      });
    expect(resA.status).toBe(201);
    expect(resA.body.customer.tenantId).toBe(tenantA.tenantId);

    // 2. Register on Store B (same email, different password)
    const resB = await request(app)
      .post("/api/storefront-auth/register")
      .set("x-storefront-slug", tenantB.slug)
      .send({
        name: "Alice Store B",
        email,
        password: "PasswordB123!",
        phone: "01033334444",
      });
    expect(resB.status).toBe(201);
    expect(resB.body.customer.tenantId).toBe(tenantB.tenantId);
    expect(resB.body.customer.id).not.toBe(resA.body.customer.id);

    // Cleanup
    await cleanupTenant(tenantA.tenantId, tenantA.merchantId);
    await cleanupTenant(tenantB.tenantId, tenantB.merchantId);
  });

  it("❌ denies login to storefront if credentials belong to another storefront", async () => {
    const tenantA = await createTestMerchant({ slug: `store-a-${uid()}` });
    const tenantB = await createTestMerchant({ slug: `store-b-${uid()}` });
    const email = `scoped.${uid()}@test.invalid`;

    // 1. Register on Store A
    const regRes = await request(app)
      .post("/api/storefront-auth/register")
      .set("x-storefront-slug", tenantA.slug)
      .send({
        name: "Alice Store A",
        email,
        password: "PasswordA123!",
        phone: "01011112222",
      });
    expect(regRes.status).toBe(201);

    // 2. Attempt login on Store B using Store A credentials
    const loginResB = await request(app)
      .post("/api/storefront-auth/login")
      .set("x-storefront-slug", tenantB.slug)
      .send({
        email,
        password: "PasswordA123!",
      });
    expect(loginResB.status).toBe(401);

    // 3. Attempt login on Store A (should succeed)
    const loginResA = await request(app)
      .post("/api/storefront-auth/login")
      .set("x-storefront-slug", tenantA.slug)
      .send({
        email,
        password: "PasswordA123!",
      });
    expect(loginResA.status).toBe(200);

    // Cleanup
    await cleanupTenant(tenantA.tenantId, tenantA.merchantId);
    await cleanupTenant(tenantB.tenantId, tenantB.merchantId);
  });

  it("✅ prevents guest customer collision across tenants", async () => {
    const tenantA = await createTestMerchant({ slug: `store-a-${uid()}` });
    const tenantB = await createTestMerchant({ slug: `store-b-${uid()}` });
    const email = `guest.${uid()}@test.invalid`;

    // 1. Create guest customer on Store A
    const custA = await request(app)
      .post("/api/customers")
      .send({
        name: "Guest A",
        email,
        phone: "01011112222",
        tenantId: tenantA.tenantId,
      });
    expect([200, 201]).toContain(custA.status);

    // 2. Create guest customer on Store B (same email)
    const custB = await request(app)
      .post("/api/customers")
      .send({
        name: "Guest B",
        email,
        phone: "01033334444",
        tenantId: tenantB.tenantId,
      });
    expect([200, 201]).toContain(custB.status);
    expect(custB.body.id).not.toBe(custA.body.id);

    // Cleanup
    await cleanupTenant(tenantA.tenantId, tenantA.merchantId);
    await cleanupTenant(tenantB.tenantId, tenantB.merchantId);
  });
});
