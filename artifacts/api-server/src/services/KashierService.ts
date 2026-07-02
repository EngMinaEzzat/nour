import { db } from "@workspace/db";
import {
  kashierProvidersTable, paymentRecordsTable, paymentWebhooksTable,
  ordersTable, tenantsTable, tenantAuditEventsTable
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import { decrypt } from "../lib/encryption.js";
import { logger } from "../lib/logger.js";

export const PLAN_ALLOWS_KASHIER = ["growth", "pro"];
export const MUTABLE_PAYMENT_STATUSES = ["initiated", "pending"] as const;

export class KashierHttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export class KashierService {
  /**
   * Initiates a Kashier payment for a shopper's order, returning the redirect/iframe URL.
   */
  static async initiateKashierPaymentForOrder(params: {
    orderId: number;
    trackingToken: string;
    protocol: string;
    host: string;
    logger?: any;
  }) {
    const { orderId, trackingToken, protocol, host, logger: log = logger } = params;

    // 1. Fetch order details
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) {
      throw new KashierHttpError(404, "الطلب غير موجود");
    }

    const tenantId = order.tenantId;

    // 2. Verify plan
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_KASHIER.includes(tenant?.planCode ?? "")) {
      throw new KashierHttpError(402, "هذه الميزة تتطلب ترقية خطة الاشتراك");
    }

    // 3. Fetch Kashier provider config
    const [provider] = await db.select().from(kashierProvidersTable).where(eq(kashierProvidersTable.tenantId, tenantId)).limit(1);
    if (!provider || provider.status !== "ACTIVE" || !provider.merchantId || !provider.apiKey) {
      throw new KashierHttpError(400, "بوابة الدفع كاشير غير مفعلة لهذا المتجر");
    }

    const merchantId = provider.merchantId;
    const apiKeyDecrypted = decrypt(provider.apiKey);

    const amount = String(order.totalAmount);
    const currency = "EGP";
    const mode = provider.isMockAllowed === "true" || process.env.NODE_ENV !== "production" ? "test" : "live";

    // 4. Create Payment Record (for idempotency and transaction tracking)
    const idempotencyKey = `kashier-init-${order.id}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const [paymentRecord] = await db.insert(paymentRecordsTable).values({
      tenantId,
      orderId,
      idempotencyKey,
      provider: "kashier",
      amount: String(order.totalAmount),
      currency,
      status: "initiated",
      expiresAt,
    }).returning();

    // 5. Generate signature/hash for Checkout redirect URL
    // Format: /?payment=${merchantId}.${orderId}.${amount}.${currency}
    const signaturePath = `/?payment=${merchantId}.${order.id}.${amount}.${currency}`;
    const hash = crypto.createHmac("sha256", apiKeyDecrypted).update(signaturePath).digest("hex");

    // Construct merchantRedirect callback URL
    const merchantRedirect = `${protocol}://${host}/api/kashier/callback?tenantId=${tenantId}&orderId=${order.id}`;

    // Construct Hosted Payment Page / iFrame URL
    // Base URL is https://checkout.kashier.io
    const iframeSrc = `https://checkout.kashier.io/?merchantId=${merchantId}&orderId=${order.id}&amount=${amount}&currency=${currency}&hash=${hash}&merchantRedirect=${encodeURIComponent(merchantRedirect)}&mode=${mode}&allowedMethods=card`;

    // 6. Save iframeSrc in payment record
    await db.update(paymentRecordsTable).set({
      iframeSrc,
      updatedAt: new Date(),
    }).where(eq(paymentRecordsTable.id, paymentRecord.id));

    log.info({ orderId: order.id, tenantId }, "Successfully initiated Kashier payment URL");

    return {
      paymentRecordId: paymentRecord.id,
      iframeSrc,
      expiresAt,
    };
  }

  /**
   * Processes webhook or callback redirect and updates the payment/order status.
   */
  static async handleWebhook(params: {
    query: Record<string, any>;
    logger?: any;
  }) {
    const { query, logger: log = logger } = params;

    const paymentStatus = query.paymentStatus; // SUCCESS or FAILED
    const merchantOrderId = String(query.merchantOrderId || query.orderId || "");
    const transactionId = String(query.transactionId || query.refId || "unknown");
    const signature = query.signature;
    const tenantIdStr = query.tenantId;

    if (!merchantOrderId || !paymentStatus || !signature || !tenantIdStr) {
      log.warn({ query }, "Kashier callback validation failed due to missing required fields");
      return { status: 400, response: { error: "Missing required callback fields" } };
    }

    const tenantId = Number.parseInt(tenantIdStr, 10);
    const orderId = Number.parseInt(merchantOrderId, 10);

    const idempotencyKey = `kashier-wh-${transactionId}`;

    // Webhook idempotency check
    const existing = await db.select().from(paymentWebhooksTable).where(eq(paymentWebhooksTable.idempotencyKey, idempotencyKey));
    if (existing.length > 0) {
      log.info({ transactionId }, "Duplicate Kashier webhook — idempotent skip");
      return { status: 200, response: { received: true, duplicate: true } };
    }

    // Fetch provider settings to verify the signature
    const [provider] = await db.select().from(kashierProvidersTable).where(eq(kashierProvidersTable.tenantId, tenantId)).limit(1);
    if (!provider || !provider.apiKey) {
      log.warn({ tenantId }, "Kashier provider configuration not found for webhook");
      return { status: 404, response: { error: "Provider configuration not found" } };
    }

    const apiKeyDecrypted = decrypt(provider.apiKey);

    // Verify signature
    // 1. Sort all parameters (except signature, tenantId, orderId) alphabetically by key.
    // 2. Join as query string format: key=value
    const sortedQueryString = Object.keys(query)
      .filter(key => key !== "signature" && key !== "tenantId" && key !== "orderId")
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join("&");

    const computed = crypto.createHmac("sha256", apiKeyDecrypted).update(sortedQueryString).digest("hex");
    const computedBuf = Buffer.from(computed);
    const signatureBuf = Buffer.from(String(signature));

    if (computedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(computedBuf, signatureBuf)) {
      log.warn({ transactionId, computed, signature }, "Kashier webhook signature mismatch");
      return { status: 401, response: { error: "Signature verification failed" } };
    }

    // Insert to webhooks table to prevent duplicate processing
    await db.insert(paymentWebhooksTable).values({
      tenantId,
      provider: "kashier",
      idempotencyKey,
      eventType: "transaction",
      providerTransactionId: transactionId,
      success: paymentStatus === "SUCCESS" ? "true" : "false",
      processedAt: new Date(),
    });

    const isPaid = paymentStatus === "SUCCESS";

    // Update payment record and order
    const [paymentRecord] = await db.select().from(paymentRecordsTable)
      .where(and(
        eq(paymentRecordsTable.orderId, orderId),
        eq(paymentRecordsTable.provider, "kashier")
      ))
      .orderBy(paymentRecordsTable.id)
      .limit(1);

    if (isPaid) {
      const updated = await db.update(paymentRecordsTable).set({
        status: "paid",
        providerTransactionId: transactionId,
        paidAt: new Date(),
        updatedAt: new Date(),
      }).where(and(
        eq(paymentRecordsTable.id, paymentRecord?.id ?? -1),
        inArray(paymentRecordsTable.status, MUTABLE_PAYMENT_STATUSES as any)
      )).returning();

      if (updated.length > 0) {
        await db.update(ordersTable).set({
          paymentStatus: "paid",
          status: "confirmed"
        }).where(eq(ordersTable.id, orderId));

        await db.insert(tenantAuditEventsTable).values({
          tenantId,
          actorLabel: "Kashier Webhook",
          eventType: "payment_succeeded",
          summary: `تم الدفع بنجاح عبر كاشير — معاملة: ${transactionId}`,
          metadata: JSON.stringify({ transactionId, orderId }),
        }).catch(() => {});
      }
    } else {
      await db.update(paymentRecordsTable).set({
        status: "failed",
        failureReason: query.errormessage || "Payment failed",
        updatedAt: new Date(),
      }).where(and(
        eq(paymentRecordsTable.id, paymentRecord?.id ?? -1),
        inArray(paymentRecordsTable.status, MUTABLE_PAYMENT_STATUSES as any)
      ));

      await db.update(ordersTable).set({
        paymentStatus: "failed"
      }).where(eq(ordersTable.id, orderId));

      await db.insert(tenantAuditEventsTable).values({
        tenantId,
        actorLabel: "Kashier Webhook",
        eventType: "payment_failed",
        summary: `فشل الدفع عبر كاشير — السبب: ${query.errormessage || "غير معروف"}`,
        metadata: JSON.stringify({ transactionId, orderId, error: query.errormessage }),
      }).catch(() => {});
    }

    return { status: 200, response: { received: true } };
  }
}
