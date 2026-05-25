import { Router } from "express";
import { db } from "@workspace/db";
import {
  whatsappProvidersTable,
  whatsappMessageLogsTable,
  ordersTable,
  customersTable,
  tenantsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { sendWhatsAppMessage } from "../lib/whatsapp";

const router = Router();

const PLAN_ALLOWS_WHATSAPP = ["pro"];

const TEMPLATES: Record<string, { nameAr: string; body: string; variables: string[] }> = {
  order_confirmation_request: {
    nameAr: "طلب تأكيد الطلب",
    body: "مرحباً {customerName}، نود تأكيد طلبكم رقم #{orderRef} من متجر {storeName} بقيمة {total} ج.م. هل تودون تأكيد الطلب؟",
    variables: ["customerName", "orderRef", "storeName", "total"],
  },
  order_confirmed: {
    nameAr: "تأكيد الطلب",
    body: "مرحباً {customerName}، تم تأكيد طلبكم رقم #{orderRef} من {storeName} بنجاح. سيتم الشحن قريباً.",
    variables: ["customerName", "orderRef", "storeName"],
  },
  order_dispatched: {
    nameAr: "إشعار الشحن",
    body: "مرحباً {customerName}، تم شحن طلبكم رقم #{orderRef} من {storeName}. الوقت المتوقع للتسليم: {deliveryEstimate}.",
    variables: ["customerName", "orderRef", "storeName", "deliveryEstimate"],
  },
  delivery_followup: {
    nameAr: "متابعة التسليم",
    body: "مرحباً {customerName}، نتمنى أن يكون طلبكم رقم #{orderRef} من {storeName} قد وصل بسلامة. كيف كانت تجربتكم؟",
    variables: ["customerName", "orderRef", "storeName"],
  },
  cancellation_notice: {
    nameAr: "إشعار الإلغاء",
    body: "عزيزنا {customerName}، نعتذر عن إلغاء طلبكم رقم #{orderRef} من {storeName}. للاستفسار يرجى التواصل معنا.",
    variables: ["customerName", "orderRef", "storeName"],
  },
  return_exchange_followup: {
    nameAr: "متابعة الإرجاع / الاستبدال",
    body: "مرحباً {customerName}، تم استلام طلب الإرجاع/الاستبدال لطلبكم رقم #{orderRef} من {storeName}. سنتواصل معكم خلال 24 ساعة.",
    variables: ["customerName", "orderRef", "storeName"],
  },
};

function renderTemplate(code: string, vars: Record<string, string>): string | null {
  const tpl = TEMPLATES[code];
  if (!tpl) return null;
  let out = tpl.body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v ?? "");
  }
  return out.replace(/\{[a-zA-Z]+\}/g, "");
}

/* ─── Get provider status (no secrets exposed) ─── */
router.get("/whatsapp/provider", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    if (!PLAN_ALLOWS_WHATSAPP.includes(tenant.planCode)) {
      return res.json({
        status: "PLAN_DISALLOWED",
        planCode: tenant.planCode,
        hasCredentials: false,
        isMockAllowed: false,
      });
    }

    const [provider] = await db
      .select({
        id: whatsappProvidersTable.id,
        status: whatsappProvidersTable.status,
        phoneNumberId: whatsappProvidersTable.phoneNumberId,
        businessAccountId: whatsappProvidersTable.businessAccountId,
        isMockAllowed: whatsappProvidersTable.isMockAllowed,
        updatedAt: whatsappProvidersTable.updatedAt,
      })
      .from(whatsappProvidersTable)
      .where(eq(whatsappProvidersTable.tenantId, tenantId));

    if (!provider) {
      return res.json({
        status: "NOT_CONFIGURED",
        hasCredentials: false,
        isMockAllowed: false,
      });
    }

    res.json({
      id: provider.id,
      status: provider.status,
      phoneNumberId: provider.phoneNumberId,
      businessAccountId: provider.businessAccountId,
      hasCredentials: !!provider.phoneNumberId,
      isMockAllowed: provider.isMockAllowed,
      updatedAt: provider.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب حالة واتساب" });
  }
});

/* ─── Configure provider ─── */
router.put("/whatsapp/provider", requireRole("owner"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { phoneNumberId, businessAccountId, accessToken, webhookSecret, status } = req.body as {
    phoneNumberId?: string;
    businessAccountId?: string;
    accessToken?: string;
    webhookSecret?: string;
    status?: string;
  };

  try {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!PLAN_ALLOWS_WHATSAPP.includes(tenant?.planCode ?? "")) {
      return res.status(402).json({ error: "واتساب متاح فقط في خطة برو" });
    }

    const [existing] = await db
      .select({ id: whatsappProvidersTable.id })
      .from(whatsappProvidersTable)
      .where(eq(whatsappProvidersTable.tenantId, tenantId));

    const updateVals: Record<string, unknown> = { updatedAt: new Date() };
    if (phoneNumberId !== undefined) updateVals.phoneNumberId = phoneNumberId;
    if (businessAccountId !== undefined) updateVals.businessAccountId = businessAccountId;
    if (accessToken !== undefined) updateVals.accessToken = accessToken;
    if (webhookSecret !== undefined) updateVals.webhookSecret = webhookSecret;
    if (status !== undefined) updateVals.status = status;

    let result;
    if (existing) {
      [result] = await db
        .update(whatsappProvidersTable)
        .set(updateVals)
        .where(eq(whatsappProvidersTable.tenantId, tenantId))
        .returning({
          id: whatsappProvidersTable.id,
          status: whatsappProvidersTable.status,
          phoneNumberId: whatsappProvidersTable.phoneNumberId,
          businessAccountId: whatsappProvidersTable.businessAccountId,
          isMockAllowed: whatsappProvidersTable.isMockAllowed,
          updatedAt: whatsappProvidersTable.updatedAt,
        });
    } else {
      [result] = await db
        .insert(whatsappProvidersTable)
        .values({
          tenantId,
          phoneNumberId: phoneNumberId ?? null,
          businessAccountId: businessAccountId ?? null,
          accessToken: accessToken ?? null,
          webhookSecret: webhookSecret ?? null,
          status: (status as "NOT_CONFIGURED" | "ACTIVE" | "CONFIGURED_DISABLED" | "ERROR" | "PLAN_DISALLOWED") ?? "CONFIGURED_DISABLED",
        })
        .returning({
          id: whatsappProvidersTable.id,
          status: whatsappProvidersTable.status,
          phoneNumberId: whatsappProvidersTable.phoneNumberId,
          businessAccountId: whatsappProvidersTable.businessAccountId,
          isMockAllowed: whatsappProvidersTable.isMockAllowed,
          updatedAt: whatsappProvidersTable.updatedAt,
        });
    }

    res.json({
      ...result,
      hasCredentials: !!result.phoneNumberId,
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (err) {
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
    let vars: Record<string, string> = {};

    if (orderId) {
      const [row] = await db
        .select({
          id: ordersTable.id,
          tenantId: ordersTable.tenantId,
          totalAmount: ordersTable.totalAmount,
          deliveryEstimateDays: ordersTable.deliveryEstimateDays,
          customerName: customersTable.name,
          storeName: tenantsTable.name,
        })
        .from(ordersTable)
        .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
        .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenantId)));

      if (!row) return res.status(404).json({ error: "الطلب غير موجود أو لا ينتمي لمتجرك" });

      vars = {
        customerName: row.customerName ?? "العميل",
        orderRef: String(row.id),
        storeName: row.storeName ?? "متجرنا",
        total: parseFloat(row.totalAmount as string).toLocaleString("ar-EG"),
        deliveryEstimate: row.deliveryEstimateDays ? `${row.deliveryEstimateDays} أيام` : "3-5 أيام",
      };
    } else {
      const [tenant] = await db.select({ name: tenantsTable.name }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
      vars = {
        customerName: "أحمد محمد",
        orderRef: "1234",
        storeName: tenant?.name ?? "متجرنا",
        total: "350",
        deliveryEstimate: "3-5 أيام",
      };
    }

    const rendered = renderTemplate(templateCode, vars);
    if (!rendered) return res.status(400).json({ error: "فشل في تصيير القالب" });

    res.json({
      templateCode,
      nameAr: TEMPLATES[templateCode].nameAr,
      rendered,
      variables: vars,
    });
  } catch (err) {
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
    const existing = await db
      .select({ id: whatsappMessageLogsTable.id, status: whatsappMessageLogsTable.status })
      .from(whatsappMessageLogsTable)
      .where(and(
        eq(whatsappMessageLogsTable.tenantId, tenantId),
        eq(whatsappMessageLogsTable.idempotencyKey, idempotencyKey),
      ));

    if (existing.length > 0) {
      return res.status(200).json({ deduplicated: true, logId: existing[0].id, status: existing[0].status });
    }

    const [order] = await db
      .select({
        id: ordersTable.id,
        tenantId: ordersTable.tenantId,
        customerPhone: ordersTable.customerPhone,
        totalAmount: ordersTable.totalAmount,
        deliveryEstimateDays: ordersTable.deliveryEstimateDays,
        customerName: customersTable.name,
        storeName: tenantsTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenantId)));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود أو لا ينتمي لمتجرك" });
    if (!order.customerPhone) return res.status(400).json({ error: "لا يوجد رقم هاتف للعميل" });

    const vars: Record<string, string> = {
      customerName: order.customerName ?? "العميل",
      orderRef: String(order.id),
      storeName: order.storeName ?? "متجرنا",
      total: parseFloat(order.totalAmount as string).toLocaleString("ar-EG"),
      deliveryEstimate: order.deliveryEstimateDays ? `${order.deliveryEstimateDays} أيام` : "3-5 أيام",
    };

    const rendered = renderTemplate(templateCode, vars);

    const [provider] = await db
      .select({
        status: whatsappProvidersTable.status,
        isMockAllowed: whatsappProvidersTable.isMockAllowed,
        phoneNumberId: whatsappProvidersTable.phoneNumberId,
        accessToken: whatsappProvidersTable.accessToken,
      })
      .from(whatsappProvidersTable)
      .where(eq(whatsappProvidersTable.tenantId, tenantId));

    const isActive = provider?.status === "ACTIVE";
    const isProd = process.env.NODE_ENV === "production";
    const isMockAllowed = !isProd && (provider?.isMockAllowed ?? false);

    let logStatus: "QUEUED" | "SENT" | "FAILED" = "QUEUED";
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;

    if (!isActive && !isMockAllowed) {
      logStatus = "FAILED";
      errorMessage = "مزود واتساب غير نشط. يرجى تفعيل المزود أولاً.";
    } else if (isMockAllowed && !isActive) {
      logStatus = "SENT";
    } else if (isActive && provider?.accessToken && provider?.phoneNumberId) {
      const result = await sendWhatsAppMessage({
        accessToken: provider.accessToken,
        phoneNumberId: provider.phoneNumberId,
        toPhone: order.customerPhone,
        templateName: templateCode,
        components: [
          {
            type: "body",
            parameters: TEMPLATES[templateCode].variables.map((v) => ({
              type: "text",
              text: vars[v] ?? "",
            })),
          },
        ],
      });

      if (result.success) {
        logStatus = "SENT";
        providerMessageId = result.messageId ?? null;
      } else {
        logStatus = "FAILED";
        errorMessage = result.error ?? "فشل الإرسال عبر API";
      }
    }

    const [log] = await db
      .insert(whatsappMessageLogsTable)
      .values({
        tenantId,
        orderId,
        messageType: templateCode as any,
        status: logStatus,
        customerPhone: order.customerPhone,
        idempotencyKey,
        renderedMessage: rendered,
        errorMessage,
        providerMessageId,
      })
      .returning();

    res.status(201).json({
      logId: log.id,
      status: log.status,
      isMock: isMockAllowed && !isActive,
      rendered,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إرسال رسالة واتساب" });
  }
});

/* ─── List message logs ─── */
router.get("/whatsapp/messages", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const orderId = req.query.orderId ? Number(req.query.orderId) : null;

  try {
    const conditions = [eq(whatsappMessageLogsTable.tenantId, tenantId)];
    if (orderId) conditions.push(eq(whatsappMessageLogsTable.orderId, orderId));

    const logs = await db
      .select()
      .from(whatsappMessageLogsTable)
      .where(and(...conditions))
      .orderBy(desc(whatsappMessageLogsTable.createdAt))
      .limit(100);

    res.json(logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })));
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

  const validStatuses = ["QUEUED", "SENT", "FAILED", "DELIVERED"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "حالة غير صالحة" });
  }

  try {
    const [logEntry] = await db
      .select({ tenantId: whatsappMessageLogsTable.tenantId })
      .from(whatsappMessageLogsTable)
      .where(eq(whatsappMessageLogsTable.id, logId));

    if (!logEntry) {
      return res.status(404).json({ error: "سجل الرسالة غير موجود" });
    }

    const [provider] = await db
      .select({ webhookSecret: whatsappProvidersTable.webhookSecret })
      .from(whatsappProvidersTable)
      .where(eq(whatsappProvidersTable.tenantId, logEntry.tenantId));

    if (!provider || !provider.webhookSecret) {
       return res.status(401).json({ error: "Webhook secret is not configured" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== provider.webhookSecret) {
       return res.status(401).json({ error: "Unauthorized" });
    }

    await db
      .update(whatsappMessageLogsTable)
      .set({
        status: status as "QUEUED" | "SENT" | "FAILED" | "DELIVERED",
        providerMessageId: providerMessageId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(whatsappMessageLogsTable.id, logId));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث حالة الرسالة" });
  }
});

export default router;
