import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymobProvidersTable, paymentRecordsTable, paymentWebhooksTable,
  ordersTable, tenantsTable, tenantAuditEventsTable, orderItemsTable, customersTable, productsTable, productVariantsTable,
} from "@workspace/db";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { eq, and, desc, lt, sql, inArray } from "drizzle-orm";
import { initPayment, isConfigured as isPlatformPaymobConfigured } from "../lib/paymob";
import { checkoutLimiter } from "../lib/rate-limiters";
import crypto from "crypto";
import { encrypt, decrypt } from "../lib/encryption.js";
import { PaymobService, PLAN_ALLOWS_PAYMOB, PaymobHttpError, PaymobWebhookPayload } from "../services/PaymobService.js";

const router = Router();

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
      apiKey: paymobProvidersTable.apiKey,
      integrationId: paymobProvidersTable.integrationId,
      iframeId: paymobProvidersTable.iframeId,
      isMockAllowed: paymobProvidersTable.isMockAllowed,
      lastErrorAt: paymobProvidersTable.lastErrorAt,
      lastErrorMessage: paymobProvidersTable.lastErrorMessage,
      updatedAt: paymobProvidersTable.updatedAt,
    }).from(paymobProvidersTable).where(eq(paymobProvidersTable.tenantId, tenantId));
    if (!provider) return res.json({ status: "NOT_CONFIGURED" });
    const { apiKey: _apiKey, ...safeProvider } = provider;
    res.json({ ...safeProvider, hasApiKey: !!provider.apiKey });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "ÙØ´Ù„ Ø¬Ù„Ø¨ Ø­Ø§Ù„Ø© Paymob" });
  }
});

// PUT /paymob/configure
router.put("/paymob/configure", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const merchantId = req.session?.merchantId;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_PAYMOB.includes(tenant?.planCode ?? "")) {
      return res.status(402).json({ error: "Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙŠØ²Ø© ØªØªØ·Ù„Ø¨ Ø®Ø·Ø© Ø¬Ø±ÙˆØ« Ø£Ùˆ Ø¨Ø±Ùˆ" });
    }

    const { apiKey, integrationId, iframeId, hmacSecret, enabled } = req.body;
    if (!integrationId || !iframeId) {
      return res.status(400).json({ error: "integration_id Ùˆ iframe_id Ù…Ø·Ù„ÙˆØ¨Ø§Ù†" });
    }

    // Encrypt sensitive credentials before storage
    const apiKeyEncrypted = apiKey ? encrypt(apiKey) : undefined;
    const status = enabled ? "ACTIVE" : "CONFIGURED_DISABLED";

    const existing = await db
      .select({ id: paymobProvidersTable.id, apiKey: paymobProvidersTable.apiKey })
      .from(paymobProvidersTable)
      .where(eq(paymobProvidersTable.tenantId, tenantId));
    if (enabled && !apiKeyEncrypted && !existing[0]?.apiKey) {
      return res.status(400).json({ error: "apiKey is required before enabling Paymob" });
    }
    if (existing.length > 0) {
      await db.update(paymobProvidersTable).set({
        status,
        integrationId,
        iframeId,
        ...(apiKeyEncrypted ? { apiKey: apiKeyEncrypted } : {}),
        ...(hmacSecret ? { hmacSecret: encrypt(hmacSecret) } : {}),
        updatedAt: new Date(),
      }).where(eq(paymobProvidersTable.tenantId, tenantId));
    } else {
      await db.insert(paymobProvidersTable).values({
        tenantId,
        status,
        integrationId,
        iframeId,
        apiKey: apiKeyEncrypted ?? "",
        hmacSecret: hmacSecret ? encrypt(hmacSecret) : "",
      });
    }

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: merchantId,
      actorLabel: "ØªØ§Ø¬Ø±",
      eventType: "paymob_configured",
      summary: `ØªÙ… ${enabled ? "ØªÙØ¹ÙŠÙ„" : "Ø¥ÙŠÙ‚Ø§Ù"} Paymob â€” integrationId: ${integrationId}`,
    }).catch(() => {});

    res.json({ success: true, status });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "ÙØ´Ù„ ØªÙ‡ÙŠØ¦Ø© Paymob" });
  }
});

// POST /paymob/public/initiate - token-bound shopper payment initiation
router.post("/paymob/public/initiate", checkoutLimiter, async (req, res) => {
  try {
    const orderId = Number((req.body as { orderId?: number }).orderId);
    const trackingToken = typeof req.body?.trackingToken === "string" ? req.body.trackingToken.trim() : "";
    if (!Number.isInteger(orderId) || orderId <= 0 || !trackingToken) {
      return res.status(400).json({ error: "orderId and trackingToken are required" });
    }

    const result = await PaymobService.initiatePaymobPaymentForOrder({ orderId, trackingToken });
    return res.json(result);
  } catch (err) {
    req.log.error(err);
    if (err instanceof PaymobHttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to initiate Paymob payment" });
  }
});

// POST /paymob/initiate â€” initiate payment for an order
router.post("/paymob/initiate", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    {
      const orderId = Number((req.body as { orderId?: number }).orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) return res.status(400).json({ error: "orderId is required" });

      const result = await PaymobService.initiatePaymobPaymentForOrder({ orderId, tenantId });
      return res.json(result);
    }
  } catch (err) {
    req.log.error(err);
    if (err instanceof PaymobHttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: "فشل بدء عملية الدفع" });
  }
});

// POST /paymob/webhook â€” public endpoint (no auth) â€” HMAC verified
router.post("/paymob/webhook", async (req, res) => {
  try {
    const { hmac } = req.query;
    const body = req.body as PaymobWebhookPayload;
    
    const { status, response } = await PaymobService.handleWebhook({
      hmac: hmac as string | undefined,
      body,
      logger: req.log
    });
    
    return res.status(status).json(response);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// GET /paymob/payments â€” merchant payment records
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
    res.status(500).json({ error: "ÙØ´Ù„ Ø¬Ù„Ø¨ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¯ÙØ¹" });
  }
});

// GET /paymob/reconciliation â€” platform admin: stale pending + failed
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
    res.status(500).json({ error: "ÙØ´Ù„ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø©" });
  }
});

export default router;
