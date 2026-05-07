import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, paymobProvidersTable } from "@workspace/db";
import {
  createTestMerchant, createTestProduct, createTestOrder, cleanupTenant,
} from "./helpers.js";

describe("Paymob production safety", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const product = await createTestProduct(ctx.agent, { stock: 5 });
    productId = product.body.id;
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("rejects mock payment execution in production", async () => {
    await db.insert(paymobProvidersTable).values({
      tenantId: ctx.tenantId,
      status: "ACTIVE",
      integrationId: "123",
      iframeId: "456",
      apiKeyHash: "hash",
      hmacSecret: "secret",
      isMockAllowed: "true",
    });

    const order = await createTestOrder(ctx.tenantId, productId, { paymentMethod: "paymob" });
    expect(order.status).toBe(201);

    const previous = {
      nodeEnv: process.env.NODE_ENV,
      apiKey: process.env.PAYMOB_API_KEY,
      integrationId: process.env.PAYMOB_INTEGRATION_ID,
      iframeId: process.env.PAYMOB_IFRAME_ID,
    };

    process.env.NODE_ENV = "production";
    delete process.env.PAYMOB_API_KEY;
    delete process.env.PAYMOB_INTEGRATION_ID;
    delete process.env.PAYMOB_IFRAME_ID;

    try {
      const res = await ctx.agent.post("/api/paymob/initiate").send({ orderId: order.body.id });
      expect(res.status).toBe(503);
    } finally {
      process.env.NODE_ENV = previous.nodeEnv;
      if (previous.apiKey) process.env.PAYMOB_API_KEY = previous.apiKey;
      if (previous.integrationId) process.env.PAYMOB_INTEGRATION_ID = previous.integrationId;
      if (previous.iframeId) process.env.PAYMOB_IFRAME_ID = previous.iframeId;
    }
  });
});
