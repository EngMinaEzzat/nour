import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, kashierProvidersTable, ordersTable, paymentRecordsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  createTestMerchant, createTestProduct, createTestOrder, cleanupTenant
} from "./helpers.js";

async function csrfToken(agent: Awaited<ReturnType<typeof createTestMerchant>>["agent"]): Promise<string> {
  const res = await agent.get("/api/csrf-token");
  return res.body.csrfToken;
}

describe("Kashier Payment Integration", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => {
    // Enable kashier platform-wide for tests
    process.env.KASHIER_PLATFORM_ENABLED = "true";

    ctx = await createTestMerchant();
    await db.update(tenantsTable).set({ planCode: "growth" }).where(eq(tenantsTable.id, ctx.tenantId));
    const product = await createTestProduct(ctx.agent, { stock: 5 });
    productId = product.body.id;
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("should return NOT_CONFIGURED status initially", async () => {
    const res = await ctx.agent.get("/api/kashier/status");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("NOT_CONFIGURED");
  });

  it("should configure Kashier credentials", async () => {
    const csrf = await csrfToken(ctx.agent);
    const configRes = await ctx.agent
      .put("/api/kashier/configure")
      .set("x-csrf-token", csrf)
      .send({
        merchantId: "MID-12345-67890",
        apiKey: "kashier-test-secret-key",
        enabled: true,
      });

    expect(configRes.status).toBe(200);
    expect(configRes.body.success).toBe(true);
    expect(configRes.body.status).toBe("ACTIVE");

    // Fetch status again
    const statusRes = await ctx.agent.get("/api/kashier/status");
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("ACTIVE");
    expect(statusRes.body.merchantId).toBe("MID-12345-67890");
    expect(statusRes.body.hasApiKey).toBe(true);
  });

  it("should initiate a payment session for an order", async () => {
    // Create an order
    const order = await createTestOrder(ctx.tenantId, productId, { paymentMethod: "kashier" });
    const orderId = order.body.id;
    const trackingToken = order.body.orderItems?.[0]?.trackingToken ?? "test-token";

    const csrf = await csrfToken(ctx.agent);
    const initRes = await ctx.agent
      .post("/api/kashier/public/initiate")
      .set("x-csrf-token", csrf)
      .send({
        orderId,
        trackingToken,
      });

    expect(initRes.status).toBe(200);
    expect(initRes.body.paymentRecordId).toBeDefined();
    expect(initRes.body.iframeSrc).toContain("checkout.kashier.io");
    expect(initRes.body.iframeSrc).toContain("MID-12345-67890");
  });

  it("should successfully process a redirect callback with a valid signature", async () => {
    const order = await createTestOrder(ctx.tenantId, productId, { paymentMethod: "kashier" });
    const orderId = order.body.id;

    // Create a matching initiated payment record
    await db.insert(paymentRecordsTable).values({
      tenantId: ctx.tenantId,
      orderId,
      idempotencyKey: `kashier-init-test-callback-${orderId}`,
      provider: "kashier",
      amount: "100.00",
      status: "initiated",
    });

    const apiKey = "kashier-test-secret-key";

    // Simulate query parameters returned by Kashier
    const callbackParams: Record<string, string> = {
      tenantId: String(ctx.tenantId),
      orderId: String(orderId),
      paymentStatus: "SUCCESS",
      cardBrand: "VISA",
      merchantOrderId: String(orderId),
      refId: "ref_kashier_123",
      transactionId: "tx_kashier_123",
      amount: "100.00",
      currency: "EGP",
    };

    // Calculate signature over kashier parameters sorted alphabetically
    const sortedQueryString = Object.keys(callbackParams)
      .filter(key => key !== "tenantId" && key !== "orderId")
      .sort()
      .map(key => `${key}=${callbackParams[key]}`)
      .join("&");

    const signature = crypto.createHmac("sha256", apiKey).update(sortedQueryString).digest("hex");
    callbackParams.signature = signature;

    // Send callback redirect GET request
    const callbackRes = await ctx.agent
      .get("/api/kashier/callback")
      .query(callbackParams);

    expect(callbackRes.status).toBe(200);
    expect(callbackRes.text).toContain("window.parent.location.href");
    expect(callbackRes.text).toContain("payment=kashier");
    expect(callbackRes.text).toContain("status=success");

    // Check database to verify order is confirmed and paid
    const [dbOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    expect(dbOrder.paymentStatus).toBe("paid");
    expect(dbOrder.status).toBe("confirmed");
  });
});
