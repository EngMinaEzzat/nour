import { Router } from "express";
import { db } from "@workspace/db";
import {
  customersTable,
  orderItemsTable,
  ordersTable,
  privacyRequestsTable,
  tenantAuditEventsTable,
  whatsappMessageLogsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { requirePlatformAdmin, requireRole } from "../middleware/require-role";

const router = Router();

function lookupColumn(lookupBy: unknown) {
  return lookupBy === "email" ? customersTable.email : customersTable.phone;
}

async function findCustomerForTenant(params: {
  tenantId: number;
  subjectIdentifier: string;
  lookupBy: unknown;
}) {
  const [row] = await db
    .select({ customer: customersTable })
    .from(customersTable)
    .innerJoin(ordersTable, eq(ordersTable.customerId, customersTable.id))
    .where(
      and(
        eq(ordersTable.tenantId, params.tenantId),
        eq(lookupColumn(params.lookupBy), params.subjectIdentifier),
      ),
    )
    .limit(1);

  return row?.customer ?? null;
}

router.get(
  "/privacy-requests/platform",
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const data = await db
        .select()
        .from(privacyRequestsTable)
        .orderBy(desc(privacyRequestsTable.createdAt))
        .limit(100);
      res.json(data);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل جلب الطلبات" });
    }
  },
);

router.get(
  "/privacy-requests",
  requireRole("owner", "manager"),
  async (req, res) => {
    try {
      const data = await db
        .select()
        .from(privacyRequestsTable)
        .where(eq(privacyRequestsTable.tenantId, req.merchantTenantId!))
        .orderBy(desc(privacyRequestsTable.createdAt));
      res.json(data);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل جلب الطلبات" });
    }
  },
);

router.post(
  "/privacy-requests",
  requireRole("owner", "manager"),
  async (req, res) => {
    const { subjectType, subjectIdentifier, requestType } = req.body;

    if (!["merchant", "customer", "staff"].includes(subjectType)) {
      return res.status(400).json({ error: "نوع غير صالح" });
    }
    if (!["export", "delete", "restrict", "correction"].includes(requestType)) {
      return res.status(400).json({ error: "نوع الطلب غير صالح" });
    }
    if (!subjectIdentifier)
      return res.status(400).json({ error: "معرف المستخدم مطلوب" });

    try {
      const [requestRecord] = await db
        .insert(privacyRequestsTable)
        .values({
          tenantId: req.merchantTenantId!,
          subjectType,
          subjectIdentifier,
          requestType,
          requestedBy: req.session.merchantId,
          status: "pending",
        })
        .returning();

      await db
        .insert(tenantAuditEventsTable)
        .values({
          tenantId: req.merchantTenantId!,
          actorId: req.session.merchantId,
          actorLabel: "تاجر",
          eventType: "privacy_request_created",
          summary: `تم إنشاء طلب خصوصية (${requestType})`,
        })
        .catch(() => {});

      res.status(201).json(requestRecord);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل إنشاء الطلب" });
    }
  },
);

router.post(
  "/privacy-requests/:id/execute",
  requireRole("owner", "manager"),
  async (req, res) => {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const tenantId = req.merchantTenantId!;

    try {
      const [privacyReq] = await db
        .select()
        .from(privacyRequestsTable)
        .where(
          and(
            eq(privacyRequestsTable.id, requestId),
            eq(privacyRequestsTable.tenantId, tenantId),
          ),
        );
      if (!privacyReq)
        return res.status(404).json({ error: "الطلب غير موجود" });

      if (privacyReq.requestType !== "delete") {
        return res
          .status(400)
          .json({ error: "هذا المسار يدعم طلبات الحذف فقط" });
      }
      if (privacyReq.subjectType !== "customer") {
        return res
          .status(400)
          .json({ error: "هذا المسار يدعم حذف العملاء فقط حاليا" });
      }

      const customer = await findCustomerForTenant({
        tenantId,
        subjectIdentifier: privacyReq.subjectIdentifier,
        lookupBy: req.body.lookupBy,
      });
      if (!customer) return res.status(404).json({ error: "العميل غير موجود" });

      const orders = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.tenantId, tenantId),
            eq(ordersTable.customerId, customer.id),
          ),
        );
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length === 0)
        return res.status(404).json({ error: "العميل غير موجود" });

      await db.transaction(async (tx) => {
        await tx
          .update(ordersTable)
          .set({
            customerName: "[REDACTED]",
            customerPhone: "[REDACTED]",
            shippingAddress: "[REDACTED]",
            shippingGovernorate: "[REDACTED]",
            shippingCity: "[REDACTED]",
          })
          .where(inArray(ordersTable.id, orderIds));

        await tx
          .update(whatsappMessageLogsTable)
          .set({ customerPhone: "[REDACTED]" })
          .where(
            and(
              eq(whatsappMessageLogsTable.tenantId, tenantId),
              inArray(whatsappMessageLogsTable.orderId, orderIds),
            ),
          );

        const [otherOrders] = await tx
          .select({ id: ordersTable.id })
          .from(ordersTable)
          .where(
            and(
              eq(ordersTable.customerId, customer.id),
              ne(ordersTable.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (!otherOrders) {
          const suffix = `${customer.id}-${Date.now()}`;
          await tx
            .update(customersTable)
            .set({
              name: "[REDACTED]",
              email: `redacted-${suffix}@invalid.invalid`,
              phone: `[REDACTED-${suffix}]`,
              city: "[REDACTED]",
            })
            .where(eq(customersTable.id, customer.id));
        }
      });

      const summary = `تم حجب بيانات العميل لـ ${orderIds.length} طلب.`;
      const [updatedReq] = await db
        .update(privacyRequestsTable)
        .set({
          status: "completed",
          resultSummary: summary,
          updatedAt: new Date(),
        })
        .where(and(eq(privacyRequestsTable.id, requestId), eq(privacyRequestsTable.tenantId, tenantId)))
        .returning();

      await db
        .insert(tenantAuditEventsTable)
        .values({
          tenantId,
          actorId: req.session.merchantId,
          actorLabel: "تاجر",
          eventType: "customer_pseudonymized",
          summary: "تم حجب بيانات عميل",
        })
        .catch(() => {});

      res.json(updatedReq);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل تنفيذ الطلب" });
    }
  },
);

router.get(
  "/privacy-requests/:id/export",
  requireRole("owner", "manager"),
  async (req, res) => {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const tenantId = req.merchantTenantId!;

    try {
      const [privacyReq] = await db
        .select()
        .from(privacyRequestsTable)
        .where(
          and(
            eq(privacyRequestsTable.id, requestId),
            eq(privacyRequestsTable.tenantId, tenantId),
          ),
        );
      if (!privacyReq)
        return res.status(404).json({ error: "الطلب غير موجود" });

      if (
        privacyReq.requestType !== "export" ||
        privacyReq.subjectType !== "customer"
      ) {
        return res
          .status(400)
          .json({ error: "هذا المسار لتصدير بيانات العملاء فقط" });
      }

      const customer = await findCustomerForTenant({
        tenantId,
        subjectIdentifier: privacyReq.subjectIdentifier,
        lookupBy: req.query.lookupBy,
      });
      if (!customer) return res.status(404).json({ error: "العميل غير موجود" });

      const orders = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.tenantId, tenantId),
            eq(ordersTable.customerId, customer.id),
          ),
        );
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length === 0)
        return res.status(404).json({ error: "العميل غير موجود" });

      const items = await db
        .select()
        .from(orderItemsTable)
        .where(inArray(orderItemsTable.orderId, orderIds));

      await db
        .update(privacyRequestsTable)
        .set({
          status: "completed",
          resultSummary: "تم التصدير بنجاح",
          updatedAt: new Date(),
        })
        .where(and(eq(privacyRequestsTable.id, requestId), eq(privacyRequestsTable.tenantId, tenantId)));

      await db
        .insert(tenantAuditEventsTable)
        .values({
          tenantId,
          actorId: req.session.merchantId,
          actorLabel: "تاجر",
          eventType: "customer_data_exported",
          summary: "تم تصدير بيانات عميل",
        })
        .catch(() => {});

      res.json({ subject: customer, orders, orderItems: items });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل التصدير" });
    }
  },
);

export default router;
