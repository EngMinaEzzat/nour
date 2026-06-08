import { Router } from "express";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { WhatsappService, PLAN_ALLOWS_WHATSAPP, TEMPLATES } from "../services/WhatsappService";

const router = Router();

/* ─── Get provider status (no secrets exposed) ─── */
router.get("/whatsapp/provider", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const status = await WhatsappService.getProviderStatus(tenantId);
    res.json(status);
  } catch (err: any) {
    if (err.message === "TENANT_NOT_FOUND") {
      return res.status(404).json({ error: "المتجر غير موجود" });
    }
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب حالة واتساب" });
  }
});

/* ─── Configure provider ─── */
router.put("/whatsapp/provider", requireRole("owner"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const data = req.body as {
    phoneNumberId?: string;
    businessAccountId?: string;
    accessToken?: string;
    webhookSecret?: string;
    status?: string;
  };

  try {
    const result = await WhatsappService.configureProvider(tenantId, data);
    res.json(result);
  } catch (err: any) {
    if (err.message === "PLAN_DISALLOWED") {
      return res.status(402).json({ error: "واتساب متاح فقط في خطة برو" });
    }
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث إعدادات واتساب" });
  }
});

/* ─── List templates ─── */
router.get("/whatsapp/templates", requireRole("owner", "manager", "staff"), async (req, res) => {
  const templateList = Object.entries(TEMPLATES).map(([code, tpl]) => ({
    code,
    nameAr: tpl.nameAr,
    body: tpl.body,
    variables: tpl.variables,
  }));
  res.json(templateList);
});

/* ─── Preview a rendered template ─── */
router.post("/whatsapp/templates/preview", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { templateCode, orderId } = req.body as { templateCode?: string; orderId?: number };

  if (!templateCode) return res.status(400).json({ error: "templateCode مطلوب" });
  if (!TEMPLATES[templateCode]) return res.status(400).json({ error: "كود القالب غير معروف" });

  try {
    const vars = await WhatsappService.getTemplatePreviewVariables(tenantId, orderId);
    const rendered = WhatsappService.renderTemplate(templateCode, vars);
    
    if (!rendered) return res.status(400).json({ error: "فشل في تصيير القالب" });

    res.json({
      templateCode,
      nameAr: TEMPLATES[templateCode].nameAr,
      rendered,
      variables: vars,
    });
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ error: "الطلب غير موجود أو لا ينتمي لمتجرك" });
    }
    req.log.error(err);
    res.status(500).json({ error: "فشل معاينة القالب" });
  }
});

/* ─── Send WhatsApp message (or queue for sending) ─── */
router.post("/whatsapp/messages/send", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { templateCode, orderId, idempotencyKey } = req.body as {
    templateCode?: string;
    orderId?: number;
    idempotencyKey?: string;
  };

  if (!templateCode) return res.status(400).json({ error: "templateCode مطلوب" });
  if (!orderId) return res.status(400).json({ error: "orderId مطلوب" });
  if (!idempotencyKey) return res.status(400).json({ error: "idempotencyKey مطلوب" });
  if (!TEMPLATES[templateCode]) return res.status(400).json({ error: "كود القالب غير معروف" });

  try {
    const result = await WhatsappService.sendMessage(tenantId, templateCode, orderId, idempotencyKey);
    if (result.deduplicated) {
      return res.status(200).json(result);
    }
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === "UNKNOWN_TEMPLATE") {
      return res.status(400).json({ error: "كود القالب غير معروف" });
    }
    if (err.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ error: "الطلب غير موجود أو لا ينتمي لمتجرك" });
    }
    if (err.message === "MISSING_CUSTOMER_PHONE") {
      return res.status(400).json({ error: "لا يوجد رقم هاتف للعميل" });
    }
    req.log.error(err);
    res.status(500).json({ error: "فشل إرسال رسالة واتساب" });
  }
});

/* ─── List message logs ─── */
router.get("/whatsapp/messages", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const orderId = req.query.orderId ? Number(req.query.orderId) : null;

  try {
    const logs = await WhatsappService.getMessages(tenantId, orderId);
    res.json(logs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب سجلات الرسائل" });
  }
});

/* ─── Provider delivery callback ─── */
router.post("/whatsapp/messages/:id/callback", async (req, res) => {
  const logId = Number(req.params.id);
  if (isNaN(logId)) return res.status(400).json({ error: "معرف غير صالح" });

  const { status, providerMessageId } = req.body as {
    status?: string;
    providerMessageId?: string;
  };

  const authHeader = req.headers.authorization;

  if (!status) {
    return res.status(400).json({ error: "حالة غير صالحة" });
  }

  try {
    await WhatsappService.processDeliveryCallback(logId, status, providerMessageId, authHeader);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "حالة غير صالحة" });
    }
    if (err.message === "LOG_NOT_FOUND") {
      return res.status(404).json({ error: "سجل الرسالة غير موجود" });
    }
    if (err.message === "WEBHOOK_NOT_CONFIGURED" || err.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث حالة الرسالة" });
  }
});

export default router;
