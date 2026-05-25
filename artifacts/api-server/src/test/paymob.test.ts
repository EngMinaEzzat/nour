import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, paymobProvidersTable, ordersTable, paymentRecordsTable, paymentWebhooksTable, productsTable, productVariantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  createTestMerchant, createTestProduct, createTestOrder, cleanupTenant, createTestProductWithVariant
} from "./helpers.js";

async function csrfToken(agent: Awaited<ReturnType<typeof createTestMerchant>>["agent"]): Promise<string> {
  const res = await agent.get("/api/csrf-token");
  return res.body.csrfToken;
}

function paymobHmac(payload: { obj: Record<string, any> }, secret: string): string {
  const obj = payload.obj;
  const fields = [
    String(obj.amount_cents ?? ""),
    String(obj.created_at ?? ""),
    String(obj.currency ?? ""),
    String(obj.error_occured ?? ""),
    String(obj.has_parent_transaction ?? ""),
    String(obj.id ?? ""),
    String(obj.integration_id ?? ""),
    String(obj.is_3d_secure ?? ""),
    String(obj.is_auth ?? ""),
    String(obj.is_capture ?? ""),
    String(obj.is_refunded ?? ""),
    String(obj.is_standalone_payment ?? ""),
    String(obj.is_voided ?? ""),
    String(obj.order?.id ?? ""),
    String(obj.owner ?? ""),
    String(obj.pending ?? ""),
    String(obj.source_data?.pan ?? ""),
    String(obj.source_data?.sub_type ?? ""),
    String(obj.source_data?.type ?? ""),
    String(obj.success ?? ""),
  ].join("");
  return crypto.createHmac("sha512", secret).update(fields).digest("hex");
}

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
      integrationId: null,
      iframeId: "456",
      apiKey: null,
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
      const token = await csrfToken(ctx.agent);
      const res = await ctx.agent.post("/api/paymob/initiate").set("x-csrf-token", token).send({ orderId: order.body.id });
      expect(res.status).toBe(503);
    } finally {
      process.env.NODE_ENV = previous.nodeEnv;
      if (previous.apiKey) process.env.PAYMOB_API_KEY = previous.apiKey;
      if (previous.integrationId) process.env.PAYMOB_INTEGRATION_ID = previous.integrationId;
      if (previous.iframeId) process.env.PAYMOB_IFRAME_ID = previous.iframeId;

      await db.delete(paymobProvidersTable).where(eq(paymobProvidersTable.tenantId, ctx.tenantId));
    }
  });

  describe("Webhook Production Reachability and HMAC", () => {
    let previousEnv: string | undefined;
    let previousSecret: string | undefined;

    beforeAll(() => {
      previousEnv = process.env.NODE_ENV;
      previousSecret = process.env.PAYMOB_HMAC_SECRET;
    });

    afterAll(() => {
      process.env.NODE_ENV = previousEnv;
      if (previousSecret !== undefined) {
        process.env.PAYMOB_HMAC_SECRET = previousSecret;
      } else {
        delete process.env.PAYMOB_HMAC_SECRET;
      }
    });

    it("returns 503 if HMAC secret is missing in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.PAYMOB_HMAC_SECRET;
      const res = await ctx.agent.post("/api/paymob/webhook").send({});
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("Paymob webhook HMAC secret is not configured");
    });

    it("returns 401 if HMAC signature is missing when secret is configured", async () => {
      process.env.NODE_ENV = "production";
      process.env.PAYMOB_HMAC_SECRET = "test-secret";
      // This proves it bypassed CSRF, because missing CSRF token would return 403 Invalid CSRF token
      const res = await ctx.agent.post("/api/paymob/webhook").send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing HMAC signature");
    });

    it("returns 401 if HMAC signature is invalid", async () => {
      process.env.NODE_ENV = "production";
      process.env.PAYMOB_HMAC_SECRET = "test-secret";
      const res = await ctx.agent.post("/api/paymob/webhook?hmac=invalidhash").send({
        obj: { id: 12345 }
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("HMAC verification failed");
    });

    it("accepts valid HMAC signature and processes webhook", async () => {
      process.env.NODE_ENV = "production";
      process.env.PAYMOB_HMAC_SECRET = "test-secret";
      const transactionId = 200000 + Math.floor(Math.random() * 100000);
      const providerOrderId = 300000 + Math.floor(Math.random() * 100000);
      
      const payload = {
        obj: {
          id: transactionId,
          success: true,
          order: { id: providerOrderId, merchant_order_id: "NOUR-999" }
        }
      };

      const validHmac = paymobHmac(payload, "test-secret");

      const res = await ctx.agent.post(`/api/paymob/webhook?hmac=${validHmac}`).send(payload);
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });

  describe("Webhook Idempotency and State Changes", () => {
    let orderId: number;
    let paymentRecordId: number;

    beforeAll(async () => {
      const order = await createTestOrder(ctx.tenantId, productId, { paymentMethod: "paymob" });
      orderId = order.body.id;

      const [record] = await db.insert(paymentRecordsTable).values({
        tenantId: ctx.tenantId,
        orderId,
        idempotencyKey: `paymob-init-${ctx.tenantId}-${orderId}`,
        amount: "100",
        status: "pending",
        providerOrderId: "paymob_order_123",
        paymentToken: "tok_123",
        iframeSrc: "https://iframe",
        expiresAt: new Date(Date.now() + 100000)
      }).returning();
      
      paymentRecordId = record.id;
    });

    it("processes successful payment webhook and updates order status to confirmed", async () => {
      const payload = {
        obj: {
          id: 99991,
          success: true,
          order: { id: "paymob_order_123", merchant_order_id: `NOUR-${orderId}` }
        }
      };

      const res = await ctx.agent.post("/api/paymob/webhook").send(payload);
      expect(res.status).toBe(200);

      // Verify payment record
      const [record] = await db.select().from(paymentRecordsTable).where(eq(paymentRecordsTable.id, paymentRecordId));
      expect(record.status).toBe("paid");

      // Verify order
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      expect(order.paymentStatus).toBe("paid");
      expect(order.status).toBe("confirmed"); // Moves from pending to confirmed
    });

    it("ignores duplicate successful webhook (idempotency)", async () => {
      const payload = {
        obj: {
          id: 99991, // same transaction id
          success: true,
          order: { id: "paymob_order_123", merchant_order_id: `NOUR-${orderId}` }
        }
      };

      const res = await ctx.agent.post("/api/paymob/webhook").send(payload);
      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(true);

      const hooks = await db.select().from(paymentWebhooksTable).where(eq(paymentWebhooksTable.idempotencyKey, "paymob-wh-99991"));
      expect(hooks.length).toBe(1); // Should only have one record
    });

    it("restores stock correctly on failed payment webhook with variants", async () => {
      // Create a product with a variant
      const pv = await createTestProductWithVariant(ctx.agent, { productStock: 10, variantStock: 5 });
      
      // Order with quantity 2
      const order = await createTestOrder(ctx.tenantId, pv.product.body.id, { 
        paymentMethod: "paymob", 
        items: [{ productId: pv.product.body.id, variantId: pv.variant.body.id, quantity: 2 }]
      });
      const failOrderId = order.body.id;

      // The order creation deducts stock.
      // So product stock should be 10 - 2 = 8.
      // Variant stock should be 5 - 2 = 3.

      const transactionId = 100000 + Math.floor(Math.random() * 10000);
      const providerOrderId = `paymob_order_failed_${transactionId}`;

      const [record] = await db.insert(paymentRecordsTable).values({
        tenantId: ctx.tenantId,
        orderId: failOrderId,
        idempotencyKey: `paymob-init-${ctx.tenantId}-${failOrderId}`,
        amount: "100",
        status: "pending",
        providerOrderId,
        expiresAt: new Date(Date.now() + 100000)
      }).returning();

      const payload = {
        obj: {
          id: transactionId,
          success: false,
          order: { id: providerOrderId, merchant_order_id: `NOUR-${failOrderId}` }
        }
      };

      const res = await ctx.agent.post("/api/paymob/webhook").send(payload);
      expect(res.status).toBe(200);

      // Verify payment record is failed
      const [failedRecord] = await db.select().from(paymentRecordsTable).where(eq(paymentRecordsTable.id, record.id));
      expect(failedRecord.status).toBe("failed");

      // Verify order paymentStatus
      const [failOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, failOrderId));
      expect(failOrder.paymentStatus).toBe("failed");

      // Verify stock restored
      const [prod] = await db.select().from(productsTable).where(eq(productsTable.id, pv.product.body.id));
      expect(prod.stock).toBe(5); // 3 + 2 = 5

      const [vr] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, pv.variant.body.id));
      expect(vr.stock).toBe(5); // 3 + 2 = 5

      const secondPayload = {
        obj: {
          id: transactionId + 1,
          success: false,
          order: { id: providerOrderId, merchant_order_id: `NOUR-${failOrderId}` }
        }
      };

      const duplicateFailure = await ctx.agent.post("/api/paymob/webhook").send(secondPayload);
      expect(duplicateFailure.status).toBe(200);

      const [prodAfterDuplicate] = await db.select().from(productsTable).where(eq(productsTable.id, pv.product.body.id));
      expect(prodAfterDuplicate.stock).toBe(5);

      const [variantAfterDuplicate] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, pv.variant.body.id));
      expect(variantAfterDuplicate.stock).toBe(5);
    });

    it.each([
      ["error_occured", { error_occured: true }],
      ["is_voided", { is_voided: true }],
      ["is_refunded", { is_refunded: true }],
    ])("does not confirm payment when Paymob success is true but %s is set", async (_name, flags) => {
      const order = await createTestOrder(ctx.tenantId, productId, { paymentMethod: "paymob" });
      const guardedOrderId = order.body.id;
      const transactionId = 300000 + Math.floor(Math.random() * 100000);
      const providerOrderId = `paymob_order_guard_${transactionId}`;

      await db.insert(paymentRecordsTable).values({
        tenantId: ctx.tenantId,
        orderId: guardedOrderId,
        idempotencyKey: `paymob-init-${ctx.tenantId}-${guardedOrderId}`,
        amount: "100",
        status: "pending",
        providerOrderId,
        expiresAt: new Date(Date.now() + 100000)
      });

      const res = await ctx.agent.post("/api/paymob/webhook").send({
        obj: {
          id: transactionId,
          success: true,
          pending: false,
          ...flags,
          order: { id: providerOrderId, merchant_order_id: `NOUR-${guardedOrderId}` }
        }
      });

      expect(res.status).toBe(200);
      const [guardedOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, guardedOrderId));
      expect(guardedOrder.paymentStatus).not.toBe("paid");
      expect(guardedOrder.status).not.toBe("confirmed");
    });

    it("leaves pending Paymob webhook state unchanged", async () => {
      const order = await createTestOrder(ctx.tenantId, productId, { paymentMethod: "paymob" });
      const pendingOrderId = order.body.id;
      const transactionId = 400000 + Math.floor(Math.random() * 100000);
      const providerOrderId = `paymob_order_pending_${transactionId}`;

      const [record] = await db.insert(paymentRecordsTable).values({
        tenantId: ctx.tenantId,
        orderId: pendingOrderId,
        idempotencyKey: `paymob-init-${ctx.tenantId}-${pendingOrderId}`,
        amount: "100",
        status: "pending",
        providerOrderId,
        expiresAt: new Date(Date.now() + 100000)
      }).returning();

      const res = await ctx.agent.post("/api/paymob/webhook").send({
        obj: {
          id: transactionId,
          success: true,
          pending: true,
          order: { id: providerOrderId, merchant_order_id: `NOUR-${pendingOrderId}` }
        }
      });

      expect(res.status).toBe(200);
      const [pendingRecord] = await db.select().from(paymentRecordsTable).where(eq(paymentRecordsTable.id, record.id));
      expect(pendingRecord.status).toBe("pending");

      const [pendingOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, pendingOrderId));
      expect(pendingOrder.paymentStatus).toBe("pending");
      expect(pendingOrder.status).not.toBe("confirmed");
    });
  });

});
