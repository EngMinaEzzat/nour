import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymobProvidersTable, paymentRecordsTable, paymentWebhooksTable,
  ordersTable, tenantsTable, tenantAuditEventsTable, orderItemsTable, customersTable, productsTable, productVariantsTable,
} from "@workspace/db";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { eq, and, desc, lt, sql, inArray } from "drizzle-orm";
import { initPayment, isConfigured as isPlatformPaymobConfigured } from "../lib/paymob";
import crypto from "crypto";

const router = Router();

const PLAN_ALLOWS_PAYMOB = ["growth", "pro"];
const MUTABLE_PAYMENT_STATUSES = ["initiated", "pending"] as const;

function asPaymobBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isPaymobPaidPayload(obj: Record<string, unknown>): boolean {
  return (
    asPaymobBoolean(obj.success) &&
    !asPaymobBoolean(obj.pending) &&
    !asPaymobBoolean(obj.error_occured) &&
    !asPaymobBoolean(obj.is_voided) &&
    !asPaymobBoolean(obj.is_refunded)
  );
}

function isPaymobFailedPayload(obj: Record<string, unknown>): boolean {
  if (asPaymobBoolean(obj.pending)) return false;
  return (
    !asPaymobBoolean(obj.success) ||
    asPaymobBoolean(obj.error_occured) ||
    asPaymobBoolean(obj.is_voided) ||
    asPaymobBoolean(obj.is_refunded)
  );
}

// GET /paymob/status
router.get("/paymob/status", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_PAYMOB.includes(tenant?.planCode ?? "")) {
      return res.json({ status: "PLAN_DISALLOWED", planRequired: "growth" });
    }
    const [provider] = await db.select({
      id: paymobProvidersTable.id,
      status: paymobProvidersTable.status,
      integrationId: paymobProvidersTable.integrationId,
      iframeId: paymobProvidersTable.iframeId,
      isMockAllowed: paymobProvidersTable.isMockAllowed,
      lastErrorAt: paymobProvidersTable.lastErrorAt,
      lastErrorMessage: paymobProvidersTable.lastErrorMessage,
      updatedAt: paymobProvidersTable.updatedAt,
    }).from(paymobProvidersTable).where(eq(paymobProvidersTable.tenantId, tenantId));
    if (!provider) return res.json({ status: "NOT_CONFIGURED" });
    res.json({ ...provider, hasApiKey: !!provider.integrationId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب حالة Paymob" });
  }
});

// PUT /paymob/configure
router.put("/paymob/configure", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const merchantId = req.session?.merchantId;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_PAYMOB.includes(tenant?.planCode ?? "")) {
      return res.status(402).json({ error: "هذه الميزة تتطلب خطة جروث أو برو" });
    }

    const { apiKey, integrationId, iframeId, hmacSecret, enabled } = req.body;
    if (!integrationId || !iframeId) {
      return res.status(400).json({ error: "integration_id و iframe_id مطلوبان" });
    }

    // Store raw apiKey in apiKey column
    const apiKeyRaw = apiKey || undefined;
    const status = enabled ? "ACTIVE" : "CONFIGURED_DISABLED";

    const existing = await db.select({ id: paymobProvidersTable.id }).from(paymobProvidersTable).where(eq(paymobProvidersTable.tenantId, tenantId));
    if (existing.length > 0) {
      await db.update(paymobProvidersTable).set({
        status,
        integrationId,
        iframeId,
        ...(apiKeyRaw ? { apiKey: apiKeyRaw } : {}),
        ...(hmacSecret ? { hmacSecret } : {}),
        updatedAt: new Date(),
      }).where(eq(paymobProvidersTable.tenantId, tenantId));
    } else {
      await db.insert(paymobProvidersTable).values({
        tenantId,
        status,
        integrationId,
        iframeId,
        apiKey: apiKeyRaw ?? "",
        hmacSecret: hmacSecret ?? "",
      });
    }

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: merchantId,
      actorLabel: "تاجر",
      eventType: "paymob_configured",
      summary: `تم ${enabled ? "تفعيل" : "إيقاف"} Paymob — integrationId: ${integrationId}`,
    }).catch(() => {});

    res.json({ success: true, status });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تهيئة Paymob" });
  }
});

// POST /paymob/initiate — initiate payment for an order
router.post("/paymob/initiate", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const { orderId } = req.body as { orderId?: number };
    const amount = 1;
    if (!orderId || !amount) return res.status(400).json({ error: "orderId و amount مطلوبان" });

    const [provider] = await db.select().from(paymobProvidersTable).where(
      and(eq(paymobProvidersTable.tenantId, tenantId), eq(paymobProvidersTable.status, "ACTIVE"))
    );
    if (!provider) return res.status(422).json({ error: "Paymob غير مفعّل لهذا المتجر" });

    const [order] = await db
      .select({
        id: ordersTable.id,
        totalAmount: ordersTable.totalAmount,
        shippingAddress: ordersTable.shippingAddress,
        customerPhone: ordersTable.customerPhone,
        customerName: customersTable.name,
        customerEmail: customersTable.email,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(and(eq(ordersTable.id, Number(orderId)), eq(ordersTable.tenantId, tenantId)));
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

    const existing = await db
      .select()
      .from(paymentRecordsTable)
      .where(and(eq(paymentRecordsTable.tenantId, tenantId), eq(paymentRecordsTable.orderId, order.id), eq(paymentRecordsTable.status, "pending")))
      .limit(1);
    if (existing[0]?.iframeSrc) {
      return res.json({ paymentRecordId: existing[0].id, iframeSrc: existing[0].iframeSrc, expiresAt: existing[0].expiresAt });
    }

    const mockAllowed = provider.isMockAllowed === "true";
    const paymobConfig = { apiKey: provider.apiKey, integrationId: provider.integrationId, iframeId: provider.iframeId };
    if (!isPlatformPaymobConfigured(paymobConfig) && (process.env.NODE_ENV === "production" || !mockAllowed)) {
      return res.status(503).json({ error: "Paymob live credentials are not configured" });
    }

    const idempotencyKey = `paymob-init-${tenantId}-${order.id}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    if (!isPlatformPaymobConfigured(paymobConfig)) {
      const [record] = await db.insert(paymentRecordsTable).values({
        tenantId,
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

      return res.json({ paymentRecordId: record.id, iframeSrc: record.iframeSrc, expiresAt });
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
      tenantId,
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

    res.json({ paymentRecordId: record.id, iframeSrc: record.iframeSrc, expiresAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل بدء عملية الدفع" });
  }
});

// POST /paymob/webhook — public endpoint (no auth) — HMAC verified
router.post("/paymob/webhook", async (req, res) => {
  try {
    const { hmac } = req.query;
    const body = req.body;

    const transactionId = String(body?.obj?.id ?? body?.transaction_id ?? "unknown");
    const obj = (body?.obj ?? body ?? {}) as Record<string, unknown>;
    const isPaid = isPaymobPaidPayload(obj);
    const isFailed = isPaymobFailedPayload(obj);
    const success = String(body?.obj?.success ?? body?.success ?? "false");
    const idempotencyKey = `paymob-wh-${transactionId}`;

    const existing = await db.select().from(paymentWebhooksTable).where(eq(paymentWebhooksTable.idempotencyKey, idempotencyKey));
    if (existing.length > 0) {
      req.log.info({ transactionId }, "Duplicate Paymob webhook — idempotent skip");
      return res.json({ received: true, duplicate: true });
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

    // HMAC verification
    let tenantHmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (paymentRecord && paymentRecord.tenantId) {
      const [provider] = await db.select({ hmacSecret: paymobProvidersTable.hmacSecret })
        .from(paymobProvidersTable)
        .where(eq(paymobProvidersTable.tenantId, paymentRecord.tenantId));
      if (provider && provider.hmacSecret) {
        tenantHmacSecret = provider.hmacSecret;
      }
    }

    if (process.env.NODE_ENV === "production" && !tenantHmacSecret) {
      return res.status(503).json({ error: "Paymob webhook HMAC secret is not configured" });
    }

    if (tenantHmacSecret && hmac) {
      // Paymob HMAC: SHA512 of concatenated transaction fields
      const fields = [
        String(obj.amount_cents ?? ""),
        String(obj.created_at ?? ""),
        String(obj.currency ?? ""),
        String(obj.error_occured ?? ""),
        String(obj.has_parent_transaction ?? ""),
        String((body?.obj as any)?.id ?? ""),
        String(obj.integration_id ?? ""),
        String(obj.is_3d_secure ?? ""),
        String(obj.is_auth ?? ""),
        String(obj.is_capture ?? ""),
        String(obj.is_refunded ?? ""),
        String(obj.is_standalone_payment ?? ""),
        String(obj.is_voided ?? ""),
        String((obj as any).order?.id ?? ""),
        String(obj.owner ?? ""),
        String(obj.pending ?? ""),
        String((body?.obj?.source_data as any)?.pan ?? ""),
        String((body?.obj?.source_data as any)?.sub_type ?? ""),
        String((body?.obj?.source_data as any)?.type ?? ""),
        String(obj.success ?? ""),
      ].join("");

      const computed = crypto.createHmac("sha512", tenantHmacSecret).update(fields).digest("hex");
      const computedBuf = Buffer.from(computed);
      const hmacBuf = Buffer.from(String(hmac));

      if (computedBuf.length !== hmacBuf.length || !crypto.timingSafeEqual(computedBuf, hmacBuf)) {
        req.log.warn({ transactionId: (obj as any).id }, "Paymob webhook HMAC mismatch — rejected");
        return res.status(401).json({ error: "HMAC verification failed" });
      }
    } else if (tenantHmacSecret && !hmac) {
      req.log.warn("Paymob webhook received without HMAC — rejected");
      return res.status(401).json({ error: "Missing HMAC signature" });
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
        inArray(paymentRecordsTable.status, MUTABLE_PAYMENT_STATUSES),
      )).returning({ orderId: paymentRecordsTable.orderId, tenantId: paymentRecordsTable.tenantId });

      if (updated.length > 0 && updated[0].orderId) {
        await db.update(ordersTable).set({ paymentStatus: "paid", status: "confirmed" }).where(eq(ordersTable.id, updated[0].orderId!));
        await db.insert(tenantAuditEventsTable).values({
          tenantId: updated[0].tenantId,
          actorLabel: "Paymob Webhook",
          eventType: "payment_succeeded",
          summary: `تم الدفع بنجاح — معرف المعاملة: ${transactionId}`,
          metadata: JSON.stringify({ transactionId, orderId: updated[0].orderId }),
        }).catch(() => {});
      }
    } else if (isFailed) {
      req.log.info({ hasPaymentRecord: !!paymentRecord, recordId: paymentRecord?.id }, "Processing failed webhook");
      if (paymentRecord) {
        await db.transaction(async (tx) => {
          const updatedPaymentRecords = await tx.update(paymentRecordsTable).set({
            status: "failed",
            providerTransactionId: transactionId,
            failureReason: body?.obj?.data?.message ?? "Payment failed",
            updatedAt: new Date(),
          }).where(and(
            eq(paymentRecordsTable.id, paymentRecord.id),
            inArray(paymentRecordsTable.status, MUTABLE_PAYMENT_STATUSES),
          )).returning();
          req.log.info({ updatedPaymentRecordCount: updatedPaymentRecords.length }, "Updated payment record to failed");

          if (updatedPaymentRecords.length === 0) {
            return;
          }

          if (paymentRecord.orderId) {
            await tx.update(ordersTable).set({ paymentStatus: "failed" }).where(eq(ordersTable.id, paymentRecord.orderId));
            const items = await tx
              .select({ productId: orderItemsTable.productId, variantId: orderItemsTable.variantId, quantity: orderItemsTable.quantity })
              .from(orderItemsTable)
              .where(eq(orderItemsTable.orderId, paymentRecord.orderId));
            for (const item of items) {
              await tx
                .update(productsTable)
                .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
                .where(eq(productsTable.id, item.productId));
              if (item.variantId) {
                await tx
                  .update(productVariantsTable)
                  .set({ stock: sql`${productVariantsTable.stock} + ${item.quantity}` })
                  .where(and(eq(productVariantsTable.id, item.variantId), eq(productVariantsTable.productId, item.productId)));
              }
            }
          }
        });
      }
    } else {
      req.log.info({ transactionId }, "Paymob webhook is pending — no local state mutation");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// GET /paymob/payments — merchant payment records
router.get("/paymob/payments", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const records = await db.select().from(paymentRecordsTable)
      .where(eq(paymentRecordsTable.tenantId, tenantId))
      .orderBy(desc(paymentRecordsTable.createdAt))
      .limit(100);
    res.json(records.map((r) => ({ ...r, paymentToken: undefined, iframeSrc: undefined })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب سجلات الدفع" });
  }
});

// GET /paymob/reconciliation — platform admin: stale pending + failed
router.get("/paymob/reconciliation", requirePlatformAdmin, async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await db.select().from(paymentRecordsTable)
      .where(and(eq(paymentRecordsTable.status, "pending"), lt(paymentRecordsTable.createdAt, thirtyMinutesAgo)))
      .orderBy(desc(paymentRecordsTable.createdAt))
      .limit(50);
    const failed = await db.select().from(paymentRecordsTable)
      .where(eq(paymentRecordsTable.status, "failed"))
      .orderBy(desc(paymentRecordsTable.createdAt))
      .limit(50);
    res.json({ stalePending: stale.length, failedCount: failed.length, stale, failed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل المطابقة" });
  }
});

export default router;
