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

  it("✅ successfully registers a new customer with a valid phone number", async () => {
    const id = uid();
    const email = `customer.${id}@nourtest.invalid`;
    const res = await request(app)
      .post("/api/storefront-auth/register")
      .send({
        name: `Test Customer ${id}`,
        email,
        password: "TestPass123!",
        phone: "01012345678",
      });
    expect(res.status).toBe(201);
    expect(res.body.customer).toHaveProperty("id");
    expect(res.body.customer.email).toBe(email);
    expect(res.body.customer.phone).toBe("01012345678");
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
