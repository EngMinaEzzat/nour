import { Router } from "express";
import { db } from "@workspace/db";
import {
  privacyRequestsTable,
  ordersTable,
  customersTable,
  tenantAuditEventsTable,
  whatsappMessageLogsTable,
  orderItemsTable,
} from "@workspace/db";
import { requirePlatformAdmin, requireRole } from "../middleware/require-role";
import { eq, and, desc, inArray } from "drizzle-orm";

const router = Router();

// Platform Admin: list all requests
router.get("/privacy-requests/platform", requirePlatformAdmin, async (req, res) => {
  try {
    const data = await db.select().from(privacyRequestsTable).orderBy(desc(privacyRequestsTable.createdAt)).limit(100);
    res.json(data);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الطلبات" });
  }
});

// Merchant: List their own privacy requests
router.get("/privacy-requests", requireRole("owner", "manager"), async (req, res) => {
  try {
    const data = await db.select().from(privacyRequestsTable)
      .where(eq(privacyRequestsTable.tenantId, req.merchantTenantId!))
      .orderBy(desc(privacyRequestsTable.createdAt));
    res.json(data);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الطلبات" });
  }
});

// Merchant: Create a new privacy request
router.post("/privacy-requests", requireRole("owner", "manager"), async (req, res) => {
  const { subjectType, subjectIdentifier, requestType } = req.body;

  if (!["merchant", "customer", "staff"].includes(subjectType)) return res.status(400).json({ error: "نوع غير صالح" });
  if (!["export", "delete", "restrict", "correction"].includes(requestType)) return res.status(400).json({ error: "نوع الطلب غير صالح" });
  if (!subjectIdentifier) return res.status(400).json({ error: "معرف المستخدم مطلوب" });

  try {
    const [requestRecord] = await db.insert(privacyRequestsTable).values({
      tenantId: req.merchantTenantId!,
      subjectType,
      subjectIdentifier,
      requestType,
      requestedBy: req.session.merchantId,
      status: "pending",
    }).returning();

    await db.insert(tenantAuditEventsTable).values({
      tenantId: req.merchantTenantId!,
      actorId: req.session.merchantId,
      actorLabel: "تاجر",
      eventType: "privacy_request_created",
      summary: `تم إنشاء طلب خصوصية (${requestType}) للمستخدم ${subjectIdentifier}`,
    }).catch(() => {});

    res.status(201).json(requestRecord);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء الطلب" });
  }
});

// Platform/Merchant: Execute Pseudonymization for Customer
router.post("/privacy-requests/:id/execute", requireRole("owner", "manager"), async (req, res) => {
  const requestId = Number(req.params.id);
  const tenantId = req.merchantTenantId!;

  try {
    const [privacyReq] = await db.select().from(privacyRequestsTable).where(and(eq(privacyRequestsTable.id, requestId), eq(privacyRequestsTable.tenantId, tenantId)));
    if (!privacyReq) return res.status(404).json({ error: "الطلب غير موجود" });

    if (privacyReq.requestType !== "delete") {
      return res.status(400).json({ error: "هذا المسار يدعم طلبات الحذف فقط" });
    }
    if (privacyReq.subjectType !== "customer") {
      return res.status(400).json({ error: "هذا المسار يدعم حذف العملاء فقط حاليا" });
    }

    // 1. Find customer by email or phone. Customers table is global, but we only pseudonymize tenant-owned data
    const customers = await db.select().from(customersTable).where(
      req.body.lookupBy === "email" ? eq(customersTable.email, privacyReq.subjectIdentifier) : eq(customersTable.phone, privacyReq.subjectIdentifier)
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }
    const customer = customers[0];

    // 2. Anonymize Orders for this tenant only
    const orders = await db.select().from(ordersTable).where(and(eq(ordersTable.tenantId, tenantId), eq(ordersTable.customerId, customer.id)));
    const orderIds = orders.map(o => o.id);

    if (orderIds.length > 0) {
      await db.update(ordersTable).set({
        customerName: "[REDACTED]",
        customerPhone: "[REDACTED]",
        shippingAddress: "[REDACTED]",
        shippingGovernorate: "[REDACTED]",
        shippingCity: "[REDACTED]",
      }).where(inArray(ordersTable.id, orderIds));

      // 3. Anonymize WhatsApp messages
      await db.update(whatsappMessageLogsTable).set({
        customerPhone: "[REDACTED]",
      }).where(and(eq(whatsappMessageLogsTable.tenantId, tenantId), inArray(whatsappMessageLogsTable.orderId, orderIds)));
    }

    // Check if customer has orders in other tenants
    const [otherOrders] = await db.select({ id: ordersTable.id }).from(ordersTable).where(and(eq(ordersTable.customerId, customer.id), sql`${ordersTable.tenantId} != ${tenantId}`)).limit(1);

    let summary = `تم حجب بيانات العميل لـ ${orderIds.length} طلب. `;
    if (!otherOrders) {
      // Safe to pseudonymize the global customer row
      await db.update(customersTable).set({
        name: "[REDACTED]",
        email: `redacted-${Date.now()}@invalid.invalid`,
        phone: `[REDACTED-${Date.now()}]`,
        city: "[REDACTED]",
      }).where(eq(customersTable.id, customer.id));
      summary += "تم مسح سجل العميل الرئيسي لعدم وجود طلبات أخرى.";
    } else {
      summary += "تم الاحتفاظ بسجل العميل الرئيسي لارتباطه بمتاجر أخرى.";
    }

    const [updatedReq] = await db.update(privacyRequestsTable).set({
      status: "completed",
      resultSummary: summary,
      updatedAt: new Date(),
    }).where(eq(privacyRequestsTable.id, requestId)).returning();

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session.merchantId,
      actorLabel: "تاجر",
      eventType: "customer_pseudonymized",
      summary: `تم حجب بيانات العميل ${privacyReq.subjectIdentifier}`,
    }).catch(() => {});

    res.json(updatedReq);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تنفيذ الطلب" });
  }
});

// Merchant: Export Customer Data (DSAR)
router.get("/privacy-requests/:id/export", requireRole("owner", "manager"), async (req, res) => {
  const requestId = Number(req.params.id);
  const tenantId = req.merchantTenantId!;

  try {
    const [privacyReq] = await db.select().from(privacyRequestsTable).where(and(eq(privacyRequestsTable.id, requestId), eq(privacyRequestsTable.tenantId, tenantId)));
    if (!privacyReq) return res.status(404).json({ error: "الطلب غير موجود" });

    if (privacyReq.requestType !== "export" || privacyReq.subjectType !== "customer") {
      return res.status(400).json({ error: "هذا المسار لتصدير بيانات العملاء فقط" });
    }

    const customers = await db.select().from(customersTable).where(
      req.query.lookupBy === "email" ? eq(customersTable.email, privacyReq.subjectIdentifier) : eq(customersTable.phone, privacyReq.subjectIdentifier)
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }
    const customer = customers[0];

    const orders = await db.select().from(ordersTable).where(and(eq(ordersTable.tenantId, tenantId), eq(ordersTable.customerId, customer.id)));
    const orderIds = orders.map(o => o.id);
    
    let items: any[] = [];
    if (orderIds.length > 0) {
      items = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds));
    }

    await db.update(privacyRequestsTable).set({
      status: "completed",
      resultSummary: "تم التصدير بنجاح",
      updatedAt: new Date(),
    }).where(eq(privacyRequestsTable.id, requestId));

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session.merchantId,
      actorLabel: "تاجر",
      eventType: "customer_data_exported",
      summary: `تم تصدير بيانات العميل ${privacyReq.subjectIdentifier}`,
    }).catch(() => {});

    // For compliance exports, JSON is typically standard as it allows hierarchical data
    res.json({
      subject: customer,
      orders,
      orderItems: items,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل التصدير" });
  }
});

function sql(strings: TemplateStringsArray, ...values: any[]) {
  const { sql: sqlOriginal } = require("drizzle-orm");
  return sqlOriginal(strings, ...values);
}

export default router;