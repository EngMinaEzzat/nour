import { db } from "@workspace/db";
import {
  paymobProvidersTable, paymentRecordsTable, paymentWebhooksTable,
  ordersTable, tenantsTable, tenantAuditEventsTable, orderItemsTable, customersTable, productsTable, productVariantsTable,
} from "@workspace/db";
import { eq, and, desc, lt, sql, inArray } from "drizzle-orm";
import { initPayment, isConfigured as isPlatformPaymobConfigured } from "../lib/paymob";
import crypto from "crypto";
import { decrypt } from "../lib/encryption.js";
import { logger } from "../lib/logger.js";

export const PLAN_ALLOWS_PAYMOB = ["growth", "pro"];
export const MUTABLE_PAYMENT_STATUSES = ["initiated", "pending"] as const;

export class PaymobHttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export interface PaymobTransactionObj extends Record<string, unknown> {
  id?: number | string;
  amount_cents?: number | string;
  created_at?: string;
  currency?: string;
  error_occured?: boolean | string | number;
  has_parent_transaction?: boolean | string | number;
  integration_id?: number | string;
  is_3d_secure?: boolean | string | number;
  is_auth?: boolean | string | number;
  is_capture?: boolean | string | number;
  is_refunded?: boolean | string | number;
  is_standalone_payment?: boolean | string | number;
  is_voided?: boolean | string | number;
  owner?: number | string;
  pending?: boolean | string | number;
  success?: boolean | string | number;
  order?: {
    id?: number | string;
    merchant_order_id?: string;
  };
  source_data?: {
    type?: string;
    pan?: string;
    sub_type?: string;
  };
  data?: {
    message?: string;
  };
}

export interface PaymobWebhookPayload {
  type?: string;
  transaction_id?: string | number;
  success?: boolean | string | number;
  obj?: PaymobTransactionObj;
}

export function asPaymobBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function isPaymobPaidPayload(obj: PaymobTransactionObj): boolean {
  return (
    asPaymobBoolean(obj.success) &&
    !asPaymobBoolean(obj.pending) &&
    !asPaymobBoolean(obj.error_occured) &&
    !asPaymobBoolean(obj.is_voided) &&
    !asPaymobBoolean(obj.is_refunded)
  );
}

export function isPaymobFailedPayload(obj: PaymobTransactionObj): boolean {
  if (asPaymobBoolean(obj.pending)) return false;
  return (
    !asPaymobBoolean(obj.success) ||
    asPaymobBoolean(obj.error_occured) ||
    asPaymobBoolean(obj.is_voided) ||
    asPaymobBoolean(obj.is_refunded)
  );
}

export class PaymobService {
  static async initiatePaymobPaymentForOrder(params: {
    orderId: number;
    tenantId?: number;
    trackingToken?: string;
  }) {
    const conditions = [eq(ordersTable.id, params.orderId)];
    if (params.tenantId !== undefined) {
      conditions.push(eq(ordersTable.tenantId, params.tenantId));
    }
    if (params.trackingToken) {
      conditions.push(eq(ordersTable.trackingToken, params.trackingToken));
    }

    const [order] = await db
      .select({
        id: ordersTable.id,
        tenantId: ordersTable.tenantId,
        totalAmount: ordersTable.totalAmount,
        shippingAddress: ordersTable.shippingAddress,
        customerPhone: ordersTable.customerPhone,
        customerName: customersTable.name,
        customerEmail: customersTable.email,
        paymentMethod: ordersTable.paymentMethod,
        planCode: tenantsTable.planCode,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
      .where(and(...conditions));

    if (!order) throw new PaymobHttpError(404, "Order not found");
    if (order.paymentMethod !== "paymob") {
      throw new PaymobHttpError(400, "Order is not configured for Paymob payment");
    }
    if (!PLAN_ALLOWS_PAYMOB.includes(order.planCode ?? "")) {
      throw new PaymobHttpError(402, "Paymob requires the growth plan or higher");
    }

    const [provider] = await db.select().from(paymobProvidersTable).where(
      and(eq(paymobProvidersTable.tenantId, order.tenantId), eq(paymobProvidersTable.status, "ACTIVE"))
    );
    if (!provider) throw new PaymobHttpError(422, "Paymob is not enabled for this store");

    const existing = await db
      .select()
      .from(paymentRecordsTable)
      .where(and(eq(paymentRecordsTable.tenantId, order.tenantId), eq(paymentRecordsTable.orderId, order.id), eq(paymentRecordsTable.status, "pending")))
      .limit(1);
    if (existing[0]?.iframeSrc) {
      return { paymentRecordId: existing[0].id, iframeSrc: existing[0].iframeSrc, expiresAt: existing[0].expiresAt };
    }

    const mockAllowed = provider.isMockAllowed === "true";
    const paymobConfig = { apiKey: provider.apiKey ? decrypt(provider.apiKey) : "", integrationId: provider.integrationId, iframeId: provider.iframeId };
    if (!isPlatformPaymobConfigured(paymobConfig) && (process.env.NODE_ENV === "production" || !mockAllowed)) {
      throw new PaymobHttpError(503, "Paymob live credentials are not configured");
    }

    const idempotencyKey = `paymob-init-${order.tenantId}-${order.id}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    if (!isPlatformPaymobConfigured(paymobConfig)) {
      const [record] = await db.insert(paymentRecordsTable).values({
        tenantId: order.tenantId,
        orderId: order.id,
        idempotencyKey,
        amount: String(order.totalAmount),
        status: "pending",
        expiresAt,
        iframeSrc: `https://accept.paymob.com/api/acceptance/iframes/${provider.iframeId}?payment_token=DEV_MOCK_${crypto.randomUUID()}`,
      }).onConflictDoUpdate({
        target: paymentRecordsTable.idempotencyKey,
        set: { status: "pending", expiresAt, updatedAt: new Date() },
      }).returning();

      return { paymentRecordId: record.id, iframeSrc: record.iframeSrc, expiresAt };
    }

    const payment = await initPayment({
      orderId: order.id,
      amountEGP: parseFloat(order.totalAmount as string),
      customerName: order.customerName ?? "Customer",
      customerEmail: order.customerEmail ?? "customer@nour.eg",
      customerPhone: order.customerPhone ?? "01000000000",
      shippingAddress: order.shippingAddress ?? "Cairo, Egypt",
      apiKey: provider.apiKey!,
      integrationId: provider.integrationId!,
      iframeId: provider.iframeId!,
    });

    const [record] = await db.insert(paymentRecordsTable).values({
      tenantId: order.tenantId,
      orderId: order.id,
      idempotencyKey,
      amount: String(order.totalAmount),
      status: "pending",
      providerOrderId: String(payment.paymobOrderId),
      paymentToken: payment.paymentKey,
      iframeSrc: payment.iframeUrl,
      expiresAt,
    }).onConflictDoUpdate({
      target: paymentRecordsTable.idempotencyKey,
      set: {
        status: "pending",
        providerOrderId: String(payment.paymobOrderId),
        paymentToken: payment.paymentKey,
        iframeSrc: payment.iframeUrl,
        expiresAt,
        updatedAt: new Date(),
      },
    }).returning();

    return { paymentRecordId: record.id, iframeSrc: record.iframeSrc, expiresAt };
  }

  static async handleWebhook(params: {
    hmac?: string;
    body: PaymobWebhookPayload;
    logger?: any;
  }) {
    const { hmac, body, logger: any = logger } = params;

    const transactionId = String(body?.obj?.id ?? body?.transaction_id ?? "unknown");
    const obj = (body?.obj ?? body ?? {}) as PaymobTransactionObj;
    const isPaid = isPaymobPaidPayload(obj);
    const isFailed = isPaymobFailedPayload(obj);
    const success = String(body?.obj?.success ?? body?.success ?? "false");
    const idempotencyKey = `paymob-wh-${transactionId}`;

    const existing = await db.select().from(paymentWebhooksTable).where(eq(paymentWebhooksTable.idempotencyKey, idempotencyKey));
    if (existing.length > 0) {
      logger.info({ transactionId }, "Duplicate Paymob webhook â€” idempotent skip");
      return { status: 200, response: { received: true, duplicate: true } };
    }

    const providerOrderId = String(body?.obj?.order?.id ?? "");
    const merchantOrderId = String(body?.obj?.order?.merchant_order_id ?? "");
    const nourOrderId = Number.parseInt(merchantOrderId.replace("NOUR-", ""), 10);
    let [paymentRecord] = providerOrderId
      ? await db.select().from(paymentRecordsTable).where(eq(paymentRecordsTable.providerOrderId, providerOrderId)).limit(1)
      : [];
    if (!paymentRecord && Number.isInteger(nourOrderId)) {
      [paymentRecord] = await db.select().from(paymentRecordsTable).where(eq(paymentRecordsTable.orderId, nourOrderId)).limit(1);
    }

    if (!paymentRecord) {
      logger.warn({ transactionId, providerOrderId, merchantOrderId }, "Paymob webhook did not match a payment record");
      return { status: 404, response: { error: "Payment record not found for webhook" } };
    }

    // HMAC verification
    let tenantHmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (paymentRecord && paymentRecord.tenantId) {
      const [provider] = await db.select({ hmacSecret: paymobProvidersTable.hmacSecret })
        .from(paymobProvidersTable)
        .where(eq(paymobProvidersTable.tenantId, paymentRecord.tenantId));
      if (provider && provider.hmacSecret) {
        tenantHmacSecret = decrypt(provider.hmacSecret);
      }
    }

    if (process.env.NODE_ENV === "production" && !tenantHmacSecret) {
      return { status: 503, response: { error: "Paymob webhook HMAC secret is not configured" } };
    }

    if (tenantHmacSecret && hmac) {
      // Paymob HMAC: SHA512 of concatenated transaction fields
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

      const computed = crypto.createHmac("sha512", tenantHmacSecret).update(fields).digest("hex");
      const computedBuf = Buffer.from(computed);
      const hmacBuf = Buffer.from(String(hmac));

      if (computedBuf.length !== hmacBuf.length || !crypto.timingSafeEqual(computedBuf, hmacBuf)) {
        logger.warn({ transactionId: obj.id }, "Paymob webhook HMAC mismatch â€” rejected");
        return { status: 401, response: { error: "HMAC verification failed" } };
      }
    } else if (tenantHmacSecret && !hmac) {
      logger.warn("Paymob webhook received without HMAC â€” rejected");
      return { status: 401, response: { error: "Missing HMAC signature" } };
    }

    await db.insert(paymentWebhooksTable).values({
      tenantId: paymentRecord?.tenantId ?? null,
      provider: "paymob",
      idempotencyKey,
      eventType: body?.type ?? "transaction",
      providerTransactionId: transactionId,
      success,
      processedAt: new Date(),
    });

    if (isPaid) {
      const updated = await db.update(paymentRecordsTable).set({
        status: "paid",
        providerTransactionId: transactionId,
        paidAt: new Date(),
        updatedAt: new Date(),
      }).where(and(
        eq(paymentRecordsTable.id, paymentRecord?.id ?? -1),
        inArray(paymentRecordsTable.status, MUTABLE_PAYMENT_STATUSES as any),
      )).returning({ orderId: paymentRecordsTable.orderId, tenantId: paymentRecordsTable.tenantId });

      if (updated.length > 0 && updated[0].orderId) {
        await db.update(ordersTable).set({ paymentStatus: "paid", status: "confirmed" }).where(eq(ordersTable.id, updated[0].orderId!));
        await db.insert(tenantAuditEventsTable).values({
          tenantId: updated[0].tenantId,
          actorLabel: "Paymob Webhook",
          eventType: "payment_succeeded",
          summary: `ØªÙ… Ø§Ù„Ø¯Ù Ø¹ Ø¨Ù†Ø¬Ø§Ø­ â€” Ù…Ø¹Ø±Ù  Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø©: ${transactionId}`,
          metadata: JSON.stringify({ transactionId, orderId: updated[0].orderId }),
        }).catch(() => {});
      }
    } else if (isFailed) {
      logger.info({ hasPaymentRecord: !!paymentRecord, recordId: paymentRecord?.id }, "Processing failed webhook");
      if (paymentRecord) {
        await db.transaction(async (tx) => {
          const updatedPaymentRecords = await tx.update(paymentRecordsTable).set({
            status: "failed",
            providerTransactionId: transactionId,
            failureReason: body?.obj?.data?.message ?? "Payment failed",
            updatedAt: new Date(),
          }).where(and(
            eq(paymentRecordsTable.id, paymentRecord.id),
            inArray(paymentRecordsTable.status, MUTABLE_PAYMENT_STATUSES as any),
          )).returning();
          logger.info({ updatedPaymentRecordCount: updatedPaymentRecords.length }, "Updated payment record to failed");

          if (updatedPaymentRecords.length === 0) {
            return;
          }

          if (paymentRecord.orderId) {
            await tx.update(ordersTable).set({ paymentStatus: "failed" }).where(eq(ordersTable.id, paymentRecord.orderId));
            const items = await tx
              .select({ productId: orderItemsTable.productId, variantId: orderItemsTable.variantId, quantity: orderItemsTable.quantity })
              .from(orderItemsTable)
              .where(eq(orderItemsTable.orderId, paymentRecord.orderId));

            await Promise.all(
              items.flatMap((item) => {
                const updates: any[] = [
                  tx.update(productsTable).set({ stock: sql`${productsTable.stock} + ${item.quantity}` }).where(eq(productsTable.id, item.productId))
                ];
                if (item.variantId) {
                  updates.push(
                    tx.update(productVariantsTable).set({ stock: sql`${productVariantsTable.stock} + ${item.quantity}` }).where(and(eq(productVariantsTable.id, item.variantId), eq(productVariantsTable.productId, item.productId)))
                  );
                }
                return updates;
              })
            );
          }
        });
      }
    } else {
      logger.info({ transactionId }, "Paymob webhook is pending â€” no local state mutation");
    }

    return { status: 200, response: { received: true } };
  }
}
