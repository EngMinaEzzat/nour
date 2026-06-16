import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, customersTable, tenantsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as whatsapp from "../lib/whatsapp";
import { requireRole } from "../middleware/require-role";

const router = Router();

router.post("/notifications/whatsapp", requireRole("owner", "manager", "staff"), async (req, res) => {
  const { orderId, customerPhone } = req.body as { orderId?: number; customerPhone?: string };
  if (!orderId) return res.status(400).json({ error: "orderId مطلوب" });
  if (!customerPhone) return res.status(400).json({ error: "customerPhone مطلوب" });

  const tenantId = req.merchantTenantId!;

  try {
    const [order] = await db
      .select({
        id: ordersTable.id,
        totalAmount: ordersTable.totalAmount,
        trackingNumber: ordersTable.trackingNumber,
        customerName: customersTable.name,
        storeName: tenantsTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenantId)));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

    const items = await db
      .select({ name: productsTable.name, quantity: orderItemsTable.quantity })
      .from(orderItemsTable)
      .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .where(eq(orderItemsTable.orderId, orderId));

    const message = whatsapp.buildOrderConfirmationMessage({
      customerName: order.customerName ?? "عزيزنا",
      orderId: order.id,
      storeName: order.storeName ?? "نور",
      totalAmount: parseFloat(order.totalAmount as string),
      items: items.map((i) => ({ name: i.name ?? "منتج", quantity: i.quantity })),
      trackingNumber: order.trackingNumber ?? undefined,
    });

    const waLink = whatsapp.buildWhatsAppLink(customerPhone, message);

    if (whatsapp.isConfigured()) {
      const result = await whatsapp.sendWhatsAppMessage({
        toPhone: customerPhone,
        templateName: "order_confirmation",
        customerName: order.customerName ?? "عزيزنا",
        orderId: order.id,
        storeName: order.storeName ?? "نور",
        totalAmount: parseFloat(order.totalAmount as string),
      });
      return res.json({
        configured: true,
        success: result.success,
        messageId: result.messageId ?? null,
        whatsappLink: waLink,
      });
    }

    return res.json({
      configured: false,
      success: false,
      messageId: null,
      whatsappLink: waLink,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
