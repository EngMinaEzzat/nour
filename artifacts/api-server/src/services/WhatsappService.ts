import crypto from "crypto";
import { db } from "@workspace/db";
import {
  whatsappProvidersTable,
  whatsappMessageLogsTable,
  ordersTable,
  customersTable,
  tenantsTable,
  type WhatsappMessageLog,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sendWhatsAppMessage } from "../lib/whatsapp";
import type { Logger } from "pino";

export const PLAN_ALLOWS_WHATSAPP = ["pro"];

export const TEMPLATES: Record<
  string,
  { nameAr: string; body: string; variables: string[] }
> = {
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

export class WhatsappService {
  static renderTemplate(code: string, vars: Record<string, string>): string | null {
    const tpl = TEMPLATES[code];
    if (!tpl) return null;
    let out = tpl.body;
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v ?? "");
    }
    return out.replace(/\{[a-zA-Z]+\}/g, "");
  }

  static async getProviderStatus(tenantId: number) {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!tenant) throw new Error("TENANT_NOT_FOUND");

    if (!PLAN_ALLOWS_WHATSAPP.includes(tenant.planCode)) {
      return {
        status: "PLAN_DISALLOWED",
        planCode: tenant.planCode,
        hasCredentials: false,
        isMockAllowed: false,
      };
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
      return {
        status: "NOT_CONFIGURED",
        hasCredentials: false,
        isMockAllowed: false,
      };
    }

    return {
      id: provider.id,
      status: provider.status,
      phoneNumberId: provider.phoneNumberId,
      businessAccountId: provider.businessAccountId,
      hasCredentials: !!provider.phoneNumberId,
      isMockAllowed: provider.isMockAllowed,
      updatedAt: provider.updatedAt.toISOString(),
    };
  }

  static async configureProvider(
    tenantId: number,
    data: {
      phoneNumberId?: string;
      businessAccountId?: string;
      accessToken?: string;
      webhookSecret?: string;
      status?: string;
    }
  ) {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!PLAN_ALLOWS_WHATSAPP.includes(tenant?.planCode ?? "")) {
      throw new Error("PLAN_DISALLOWED");
    }

    const [existing] = await db
      .select({ id: whatsappProvidersTable.id })
      .from(whatsappProvidersTable)
      .where(eq(whatsappProvidersTable.tenantId, tenantId));

    const updateVals: Record<string, unknown> = { updatedAt: new Date() };
    if (data.phoneNumberId !== undefined) updateVals.phoneNumberId = data.phoneNumberId;
    if (data.businessAccountId !== undefined) updateVals.businessAccountId = data.businessAccountId;
    if (data.accessToken !== undefined) updateVals.accessToken = data.accessToken;
    if (data.webhookSecret !== undefined) updateVals.webhookSecret = data.webhookSecret;
    if (data.status !== undefined) updateVals.status = data.status;

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
          phoneNumberId: data.phoneNumberId ?? null,
          businessAccountId: data.businessAccountId ?? null,
          accessToken: data.accessToken ?? null,
          webhookSecret: data.webhookSecret ?? null,
          status:
            (data.status as
              | "NOT_CONFIGURED"
              | "ACTIVE"
              | "CONFIGURED_DISABLED"
              | "ERROR"
              | "PLAN_DISALLOWED") ?? "CONFIGURED_DISABLED",
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

    return {
      ...result,
      hasCredentials: !!result.phoneNumberId,
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  static async getTemplatePreviewVariables(tenantId: number, orderId?: number) {
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

      if (!row) throw new Error("ORDER_NOT_FOUND");

      vars = {
        customerName: row.customerName ?? "العميل",
        orderRef: String(row.id),
        storeName: row.storeName ?? "متجرنا",
        total: parseFloat(row.totalAmount as string).toLocaleString("ar-EG"),
        deliveryEstimate: row.deliveryEstimateDays
          ? `${row.deliveryEstimateDays} أيام`
          : "3-5 أيام",
      };
    } else {
      const [tenant] = await db
        .select({ name: tenantsTable.name })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId));
      vars = {
        customerName: "أحمد محمد",
        orderRef: "1234",
        storeName: tenant?.name ?? "متجرنا",
        total: "350",
        deliveryEstimate: "3-5 أيام",
      };
    }

    return vars;
  }

  static async sendMessage(
    tenantId: number,
    templateCode: string,
    orderId: number,
    idempotencyKey: string
  ) {
    if (!TEMPLATES[templateCode]) throw new Error("UNKNOWN_TEMPLATE");

    const existing = await db
      .select({
        id: whatsappMessageLogsTable.id,
        status: whatsappMessageLogsTable.status,
      })
      .from(whatsappMessageLogsTable)
      .where(
        and(
          eq(whatsappMessageLogsTable.tenantId, tenantId),
          eq(whatsappMessageLogsTable.idempotencyKey, idempotencyKey)
        )
      );

    if (existing.length > 0) {
      return {
        deduplicated: true,
        logId: existing[0].id,
        status: existing[0].status,
      };
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

    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (!order.customerPhone) throw new Error("MISSING_CUSTOMER_PHONE");

    const vars: Record<string, string> = {
      customerName: order.customerName ?? "العميل",
      orderRef: String(order.id),
      storeName: order.storeName ?? "متجرنا",
      total: parseFloat(order.totalAmount as string).toLocaleString("ar-EG"),
      deliveryEstimate: order.deliveryEstimateDays
        ? `${order.deliveryEstimateDays} أيام`
        : "3-5 أيام",
    };

    const rendered = this.renderTemplate(templateCode, vars);

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
        messageType: templateCode as WhatsappMessageLog["messageType"],
        status: logStatus,
        customerPhone: order.customerPhone,
        idempotencyKey,
        renderedMessage: rendered,
        errorMessage,
        providerMessageId,
      })
      .returning();

    return {
      logId: log.id,
      status: log.status,
      isMock: isMockAllowed && !isActive,
      rendered,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
    };
  }

  static async getMessages(tenantId: number, orderId: number | null) {
    const conditions = [eq(whatsappMessageLogsTable.tenantId, tenantId)];
    if (orderId) conditions.push(eq(whatsappMessageLogsTable.orderId, orderId));

    const logs = await db
      .select()
      .from(whatsappMessageLogsTable)
      .where(and(...conditions))
      .orderBy(desc(whatsappMessageLogsTable.createdAt))
      .limit(100);

    return logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));
  }

  static async processDeliveryCallback(
    logId: number,
    status: string,
    providerMessageId?: string,
    authHeader?: string
  ) {
    const validStatuses = ["QUEUED", "SENT", "FAILED", "DELIVERED"];
    if (!validStatuses.includes(status)) {
      throw new Error("INVALID_STATUS");
    }

    const [logEntry] = await db
      .select({ tenantId: whatsappMessageLogsTable.tenantId })
      .from(whatsappMessageLogsTable)
      .where(eq(whatsappMessageLogsTable.id, logId));

    if (!logEntry) {
      throw new Error("LOG_NOT_FOUND");
    }

    const [provider] = await db
      .select({ webhookSecret: whatsappProvidersTable.webhookSecret })
      .from(whatsappProvidersTable)
      .where(eq(whatsappProvidersTable.tenantId, logEntry.tenantId));

    if (!provider || !provider.webhookSecret) {
      throw new Error("WEBHOOK_NOT_CONFIGURED");
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("UNAUTHORIZED");
    }

    const token = authHeader.split(" ")[1];
    const providedBuf = Buffer.from(token || "", "utf8");
    const secretBuf = Buffer.from(provider.webhookSecret, "utf8");

    if (providedBuf.length !== secretBuf.length || !crypto.timingSafeEqual(providedBuf, secretBuf)) {
      throw new Error("UNAUTHORIZED");
    }

    await db
      .update(whatsappMessageLogsTable)
      .set({
        status: status as "QUEUED" | "SENT" | "FAILED" | "DELIVERED",
        providerMessageId: providerMessageId ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(whatsappMessageLogsTable.id, logId), eq(whatsappMessageLogsTable.tenantId, logEntry.tenantId)));
  }
}
