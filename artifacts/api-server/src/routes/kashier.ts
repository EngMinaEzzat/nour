import { Router } from "express";
import { db } from "@workspace/db";
import {
  kashierProvidersTable, tenantsTable, tenantAuditEventsTable
} from "@workspace/db";
import { requireRole } from "../middleware/require-role";
import { eq } from "drizzle-orm";
import { checkoutLimiter } from "../lib/rate-limiters";
import { encrypt } from "../lib/encryption.js";
import { KashierService, PLAN_ALLOWS_KASHIER } from "../services/KashierService.js";

const router = Router();

// Helper to check if Kashier is globally enabled on the platform
const isPlatformKashierEnabled = () => {
  return process.env.KASHIER_PLATFORM_ENABLED === "true";
};

// GET /kashier/status
router.get("/kashier/status", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    if (!isPlatformKashierEnabled()) {
      return res.json({ status: "PLAN_DISALLOWED" });
    }

    const tenantId = req.merchantTenantId!;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_KASHIER.includes(tenant?.planCode ?? "")) {
      return res.json({ status: "PLAN_DISALLOWED", planRequired: "growth" });
    }

    const [provider] = await db.select({
      id: kashierProvidersTable.id,
      status: kashierProvidersTable.status,
      merchantId: kashierProvidersTable.merchantId,
      apiKey: kashierProvidersTable.apiKey,
      isMockAllowed: kashierProvidersTable.isMockAllowed,
      lastErrorAt: kashierProvidersTable.lastErrorAt,
      lastErrorMessage: kashierProvidersTable.lastErrorMessage,
      updatedAt: kashierProvidersTable.updatedAt,
    }).from(kashierProvidersTable).where(eq(kashierProvidersTable.tenantId, tenantId));

    if (!provider) return res.json({ status: "NOT_CONFIGURED" });
    const { apiKey: _apiKey, ...safeProvider } = provider;
    res.json({ ...safeProvider, hasApiKey: !!provider.apiKey });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب حالة Kashier" });
  }
});

// PUT /kashier/configure
router.put("/kashier/configure", requireRole("owner"), async (req, res) => {
  try {
    if (!isPlatformKashierEnabled()) {
      return res.status(403).json({ error: "كاشير غير مفعل على المنصة حالياً" });
    }

    const tenantId = req.merchantTenantId!;
    const merchantId = req.session?.merchantId;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_KASHIER.includes(tenant?.planCode ?? "")) {
      return res.status(402).json({ error: "هذه الميزة تتطلب خطة جروث أو برو" });
    }

    const { apiKey, merchantId: kashierMerchantId, enabled } = req.body;
    if (!kashierMerchantId) {
      return res.status(400).json({ error: "merchantId مطلوب" });
    }

    const apiKeyEncrypted = apiKey ? encrypt(apiKey) : undefined;
    const status = enabled ? "ACTIVE" : "CONFIGURED_DISABLED";

    const existing = await db
      .select({ id: kashierProvidersTable.id, apiKey: kashierProvidersTable.apiKey })
      .from(kashierProvidersTable)
      .where(eq(kashierProvidersTable.tenantId, tenantId));

    if (enabled && !apiKeyEncrypted && !existing[0]?.apiKey) {
      return res.status(400).json({ error: "apiKey is required before enabling Kashier" });
    }

    if (existing.length > 0) {
      await db.update(kashierProvidersTable).set({
        status,
        merchantId: kashierMerchantId,
        ...(apiKeyEncrypted ? { apiKey: apiKeyEncrypted } : {}),
        updatedAt: new Date(),
      }).where(eq(kashierProvidersTable.tenantId, tenantId));
    } else {
      await db.insert(kashierProvidersTable).values({
        tenantId,
        status,
        merchantId: kashierMerchantId,
        apiKey: apiKeyEncrypted ?? "",
      });
    }

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: merchantId,
      actorLabel: "تاجر",
      eventType: "kashier_configured",
      summary: `تم ${enabled ? "تفعيل" : "إيقاف"} كاشير — merchantId: ${kashierMerchantId}`,
    }).catch(() => {});

    res.json({ success: true, status });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تهيئة كاشير" });
  }
});

// POST /kashier/public/initiate
router.post("/kashier/public/initiate", checkoutLimiter, async (req, res) => {
  try {
    if (!isPlatformKashierEnabled()) {
      return res.status(400).json({ error: "الدفع عبر كاشير غير متاح حالياً" });
    }

    const orderId = Number((req.body as any).orderId);
    const trackingToken = typeof req.body?.trackingToken === "string" ? req.body.trackingToken.trim() : "";

    if (!orderId || !trackingToken) {
      return res.status(400).json({ error: "orderId and trackingToken are required" });
    }

    const protocol = req.protocol || "https";
    const host = req.get("host") || "matjareg.com";

    const result = await KashierService.initiateKashierPaymentForOrder({
      orderId,
      trackingToken,
      protocol,
      host,
      logger: req.log,
    });

    res.json(result);
  } catch (err: any) {
    req.log.error(err);
    const code = err.statusCode || 500;
    res.status(code).json({ error: err.message || "فشل بدء عملية الدفع عبر كاشير" });
  }
});

// GET /kashier/callback
router.get("/kashier/callback", async (req, res) => {
  try {
    const query = req.query as Record<string, string>;
    const paymentStatus = query.paymentStatus;
    const orderId = query.orderId;

    req.log.info({ query }, "Received Kashier GET callback redirect");

    // Call service to handle callback signature verification and database updates
    const result = await KashierService.handleWebhook({
      query,
      logger: req.log,
    });

    // Break out of the iframe and redirect the shopper to order-confirmation
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Processing Payment...</title>
        </head>
        <body>
          <script>
            try {
              window.parent.location.href = "/order-confirmation?orders=${orderId}&payment=kashier&status=${paymentStatus === "SUCCESS" ? "success" : "failed"}";
            } catch (e) {
              window.location.href = "/order-confirmation?orders=${orderId}&payment=kashier&status=${paymentStatus === "SUCCESS" ? "success" : "failed"}";
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    req.log.error(err);
    res.status(500).send("<h3>حدث خطأ أثناء معالجة عملية الدفع</h3>");
  }
});

// POST /kashier/webhook (server-to-server webhook fallback)
router.post("/kashier/webhook", async (req, res) => {
  try {
    req.log.info({ body: req.body }, "Received Kashier POST webhook");

    // Kashier webhook sends parameters in body rather than query
    // Map body to query for handleWebhook
    const body = req.body as Record<string, any>;

    const result = await KashierService.handleWebhook({
      query: body,
      logger: req.log,
    });

    res.status(result.status).json(result.response);
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

export default router;
