import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request,
  app,
  createTestMerchant,
  createTestProduct,
  createTestOrder,
  cleanupTenant,
  createTestCustomer,
  uid,
} from "./helpers.js";
import {
  db,
  privacyRequestsTable,
  customersTable,
  ordersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

describe("Privacy Operations", () => {
  let ctx1: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctx2: Awaited<ReturnType<typeof createTestMerchant>>;
  let customer1: any;
  let customer1Email: string;
  let customer1Phone: string;
  let productId: number;

  beforeAll(async () => {
    ctx1 = await createTestMerchant();
    ctx2 = await createTestMerchant();

    const p = await createTestProduct(ctx1.agent);
    productId = p.body.id;

    customer1Email = `customer1.${uid()}@test.invalid`;
    customer1Phone = "01012345678";

    // Create customer through order
    customer1 = await createTestCustomer({ email: customer1Email, phone: customer1Phone });
    customer1.body.email = customer1Email;
    customer1.body.phone = customer1Phone;
    await request(app)
      .post("/api/orders")
      .send({
        tenantId: ctx1.tenantId,
        customerId: customer1.body.id,
        customerPhone: customer1Phone,
        paymentMethod: "cod",
        shippingAddress: "Real Address 123",
        items: [{ productId: p.body.id, quantity: 1 }],
      });
  });

  afterAll(async () => {
    await cleanupTenant(ctx1.tenantId, ctx1.merchantId);
    await cleanupTenant(ctx2.tenantId, ctx2.merchantId);
  });

  it("✅ can create and list privacy requests", async () => {
    const res1 = await ctx1.agent.post("/api/privacy-requests").send({
      subjectType: "customer",
      subjectIdentifier: customer1.body.email,
      requestType: "delete",
    });
    expect(res1.status).toBe(201);
    expect(res1.body.status).toBe("pending");

    const res2 = await ctx1.agent.get("/api/privacy-requests");
    expect(res2.status).toBe(200);
    expect(res2.body.length).toBeGreaterThan(0);
  });

  it("❌ prevents cross-tenant execution", async () => {
    // Tenant 2 tries to execute tenant 1's request
    const [req] = await db
      .select()
      .from(privacyRequestsTable)
      .where(eq(privacyRequestsTable.tenantId, ctx1.tenantId));

    const res = await ctx2.agent.post(
      `/api/privacy-requests/${req.id}/execute`,
    );
    expect(res.status).toBe(404);
  });

  it("✅ executes pseudonymization correctly", async () => {
    const [req] = await db
      .select()
      .from(privacyRequestsTable)
      .where(eq(privacyRequestsTable.tenantId, ctx1.tenantId));

    const res = await ctx1.agent
      .post(`/api/privacy-requests/${req.id}/execute`)
      .send({ lookupBy: "email" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");

    // Verify order is redacted
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, ctx1.tenantId));
    expect(order.shippingAddress).toBe("[REDACTED]");
    expect(order.customerPhone).toBe("[REDACTED]");

    // Total should be preserved
    expect(order.totalAmount).not.toBeNull();
  });

  it("✅ can export customer data as JSON", async () => {
    const freshEmail = `export.${uid()}@test.invalid`;
    const freshPhone = "01087654321";
    const freshCustomer = await createTestCustomer({ email: freshEmail, phone: freshPhone });
    await request(app)
      .post("/api/orders")
      .send({
        tenantId: ctx1.tenantId,
        customerId: freshCustomer.body.id,
        customerPhone: freshPhone,
        paymentMethod: "cod",
        shippingAddress: "Export Address 123",
        items: [{ productId, quantity: 1 }],
      });

    const reqRes = await ctx1.agent.post("/api/privacy-requests").send({
      subjectType: "customer",
      subjectIdentifier: freshEmail,
      requestType: "export",
    });
    const requestId = reqRes.body.id;

    const exportRes = await ctx1.agent.get(
      `/api/privacy-requests/${requestId}/export?lookupBy=email`,
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.subject).toBeDefined();
    expect(exportRes.body.orders).toBeDefined();
    expect(Array.isArray(exportRes.body.orders)).toBe(true);
    expect(exportRes.body.orderItems).toBeDefined();
  });

  it("❌ blocks privacy export when the subject has no tenant-owned orders", async () => {
    const foreignRequest = await ctx2.agent.post("/api/privacy-requests").send({
      subjectType: "customer",
      subjectIdentifier: customer1.body.email,
      requestType: "export",
    });

    const exportRes = await ctx2.agent.get(
      `/api/privacy-requests/${foreignRequest.body.id}/export?lookupBy=email`,
    );
    expect(exportRes.status).toBe(404);
  });
});
