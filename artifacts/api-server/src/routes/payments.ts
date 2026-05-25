import { Router } from "express";
import { db, paymobProvidersTable, ordersTable, customersTable, tenantsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import * as paymob from "../lib/paymob";
import * as whatsapp from "../lib/whatsapp";
import { requireRole } from "../middleware/require-role";
import crypto from "crypto";

const router = Router();

router.post("/payments/paymob/init", requireRole("owner", "manager", "staff"), async (req, res) => {
  const { orderId } = req.body as { orderId?: number };
  if (!orderId) return res.status(400).json({ error: "orderId Ù…Ø·Ù„ÙˆØ¨" });

  try {
    const tenantId = req.merchantTenantId!;
    const [row] = await db
      .select({
        id: ordersTable.id,
        tenantId: ordersTable.tenantId,
        totalAmount: ordersTable.totalAmount,
        shippingAddress: ordersTable.shippingAddress,
        customerPhone: ordersTable.customerPhone,
        customerName: customersTable.name,
        customerEmail: customersTable.email,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenantId)));

    if (!row) return res.status(404).json({ error: "Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" });

    const [provider] = await db.select({ apiKey: paymobProvidersTable.apiKey, integrationId: paymobProvidersTable.integrationId, iframeId: paymobProvidersTable.iframeId }).from(paymobProvidersTable).where(eq(paymobProvidersTable.tenantId, row.tenantId));
    if (!provider || !provider.apiKey || !provider.integrationId || !provider.iframeId) {
      return res.status(503).json({ error: "Paymob ØºÙŠØ± Ù…ÙÙ‡ÙŠØ£ Ù„Ù„Ù…ØªØ¬Ø±" });
    }
    const result = await paymob.initPayment({
      orderId: row.id,
      amountEGP: parseFloat(row.totalAmount as string),
      customerName: row.customerName ?? "Customer",
      customerEmail: row.customerEmail ?? "customer@nour.eg",
      customerPhone: row.customerPhone ?? "01000000000",
      shippingAddress: row.shippingAddress ?? "Cairo, Egypt",
      apiKey: provider.apiKey,
      integrationId: provider.integrationId,
      iframeId: provider.iframeId,
    });

    await db.update(ordersTable)
      .set({ paymobOrderId: String(result.paymobOrderId) })
      .where(eq(ordersTable.id, orderId));

    return res.json({ configured: true, ...result });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªÙ‡ÙŠØ¦Ø© Ø§Ù„Ø¯ÙØ¹" });
  }
});

router.post("/payments/paymob/webhook", async (req, res) => {
  try {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET ?? "";
    if (process.env.NODE_ENV === "production" && !hmacSecret) {
      return res.status(503).json({ error: "Paymob webhook HMAC secret is not configured" });
    }
    if (hmacSecret) {
      const receivedHmac = req.query.hmac as string;
      const payload = req.body as paymob.PaymobWebhookPayload;
      const obj = payload.obj;
      const values = [
        obj.amount_cents, obj.error_occured, obj.id,
        obj.is_refunded, obj.is_voided, obj.order?.id,
        obj.success,
      ].join("");
      const expected = crypto.createHmac("sha512", hmacSecret).update(values).digest("hex");
      if (receivedHmac !== expected) {
        return res.status(401).json({ error: "HMAC mismatch" });
      }
    }

    const payload = req.body as paymob.PaymobWebhookPayload;
    if (payload.type !== "TRANSACTION") return res.json({ ok: true });

    const obj = payload.obj;
    const merchantOrderId = obj.order?.merchant_order_id ?? "";
    const nourOrderId = parseInt(merchantOrderId.replace("NOUR-", ""), 10);
    if (isNaN(nourOrderId)) return res.json({ ok: true });

    const paymentStatus = obj.success && !obj.is_voided && !obj.is_refunded && !obj.error_occured
      ? "paid" as const
      : "failed" as const;

    await db.update(ordersTable)
      .set({
        paymentStatus,
        paymobTransactionId: String(obj.id),
        status: paymentStatus === "paid" ? "confirmed" : "pending",
      })
      .where(eq(ordersTable.id, nourOrderId));

    if (paymentStatus === "paid") {
      const [order] = await db
        .select({
          id: ordersTable.id,
          customerPhone: ordersTable.customerPhone,
          totalAmount: ordersTable.totalAmount,
          customerName: customersTable.name,
          storeName: tenantsTable.name,
        })
        .from(ordersTable)
        .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
        .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
        .where(eq(ordersTable.id, nourOrderId));

      if (order?.customerPhone && whatsapp.isConfigured()) {
        await whatsapp.sendWhatsAppMessage({
          toPhone: order.customerPhone,
          templateName: "order_confirmation",
          customerName: order.customerName ?? "Ø¹Ù…ÙŠÙ„Ù†Ø§",
          orderId: order.id,
          storeName: order.storeName ?? "Ù†ÙˆØ±",
          totalAmount: parseFloat(order.totalAmount as string),
        });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Webhook error" });
  }
});

export default router;
