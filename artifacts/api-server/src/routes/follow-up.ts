import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  contactAttemptsTable,
  customersTable,
  productsTable,
  orderItemsTable,
} from "@workspace/db";
import { eq, and, sql, lt, count } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

/* ─── Follow-up queue ─── */
router.get("/follow-up/queue", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;

  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const allOrders = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        customerPhone: ordersTable.customerPhone,
        shippingGovernorate: ordersTable.shippingGovernorate,
        createdAt: ordersTable.createdAt,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(ordersTable.tenantId, tenantId));

    const queueItems: {
      orderId: number;
      customerName: string | null;
      customerPhone: string | null;
      totalAmount: number;
      status: string;
      createdAt: string;
      reason: string;
      reasonCode: string;
      priority: "high" | "medium" | "low";
    }[] = [];

    for (const order of allOrders) {
      const createdAt = new Date(order.createdAt);

      if (
        (order.status === "pending" || order.status === "awaiting_confirmation") &&
        createdAt < twoHoursAgo
      ) {
        const [attemptCount] = await db
          .select({ count: count() })
          .from(contactAttemptsTable)
          .where(eq(contactAttemptsTable.orderId, order.id));

        if ((attemptCount?.count ?? 0) === 0) {
          queueItems.push({
            orderId: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            totalAmount: parseFloat(order.totalAmount as string),
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            reason: "لم يتم التواصل مع العميل بعد تأكيد الطلب",
            reasonCode: "no_contact_attempt",
            priority: createdAt < sixHoursAgo ? "high" : "medium",
          });
          continue;
        }

        const lastAttempts = await db
          .select({ method: contactAttemptsTable.method, createdAt: contactAttemptsTable.createdAt })
          .from(contactAttemptsTable)
          .where(eq(contactAttemptsTable.orderId, order.id))
          .orderBy(sql`${contactAttemptsTable.createdAt} DESC`)
          .limit(1);

        if (lastAttempts.length > 0) {
          queueItems.push({
            orderId: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            totalAmount: parseFloat(order.totalAmount as string),
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            reason: "محاولة تواصل سابقة — لم يتم التأكيد بعد",
            reasonCode: "awaiting_confirmation",
            priority: createdAt < sixHoursAgo ? "high" : "medium",
          });
        }
      }

      if (order.status === "dispatched" && createdAt < oneDayAgo) {
        queueItems.push({
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          totalAmount: parseFloat(order.totalAmount as string),
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          reason: "الطلب شُحن منذ أكثر من يوم — تأكد من وصوله",
          reasonCode: "delayed_dispatch",
          priority: "low",
        });
      }

      if ((order.status === "returned" || order.status === "cancelled") && createdAt > oneDayAgo) {
        queueItems.push({
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          totalAmount: parseFloat(order.totalAmount as string),
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          reason: order.status === "returned" ? "إرجاع يحتاج ملاحظة أو متابعة" : "إلغاء يحتاج مراجعة",
          reasonCode: order.status === "returned" ? "return_needs_note" : "cancellation_needs_review",
          priority: "medium",
        });
      }
    }

    queueItems.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    res.json({ total: queueItems.length, items: queueItems });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب قائمة المتابعة" });
  }
});

export default router;
