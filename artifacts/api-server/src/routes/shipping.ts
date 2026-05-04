import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as bosta from "../lib/bosta";
import { requireAuth } from "../middleware/require-role";

const router = Router();

router.post("/shipping/bosta/create", requireAuth, async (req, res) => {
  const { orderId, customerPhone, dropOffCity } = req.body as {
    orderId?: number;
    customerPhone?: string;
    dropOffCity?: string;
  };
  if (!orderId) return res.status(400).json({ error: "orderId مطلوب" });
  if (!customerPhone) return res.status(400).json({ error: "customerPhone مطلوب" });

  if (!bosta.isConfigured()) {
    return res.json({
      configured: false,
      shipmentId: "",
      trackingNumber: "",
      message: "Bosta غير مُهيأ — أضف BOSTA_API_KEY لمتغيرات البيئة",
    });
  }

  try {
    const [row] = await db
      .select({
        id: ordersTable.id,
        totalAmount: ordersTable.totalAmount,
        shippingAddress: ordersTable.shippingAddress,
        paymentMethod: ordersTable.paymentMethod,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(ordersTable.id, orderId));

    if (!row) return res.status(404).json({ error: "الطلب غير موجود" });

    const nameParts = (row.customerName ?? "Customer User").split(" ");
    const result = await bosta.createDelivery({
      orderId: row.id,
      orderTotal: parseFloat(row.totalAmount as string),
      paymentMethod: row.paymentMethod as "cod" | "paymob",
      customerFirstName: nameParts[0] ?? "Customer",
      customerLastName: nameParts.slice(1).join(" ") || "User",
      customerPhone,
      dropOffAddress: row.shippingAddress ?? "Cairo",
      dropOffCity: dropOffCity ?? "Cairo",
    });

    await db.update(ordersTable)
      .set({
        bostaShipmentId: result.shipmentId,
        trackingNumber: result.trackingNumber,
        customerPhone,
        status: "shipped",
      })
      .where(eq(ordersTable.id, orderId));

    return res.json({ configured: true, ...result });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء إنشاء الشحنة" });
  }
});

router.get("/shipping/track/:trackingNumber", async (req, res) => {
  const { trackingNumber } = req.params;
  if (!trackingNumber) return res.status(400).json({ error: "رقم التتبع مطلوب" });

  if (!bosta.isConfigured()) {
    return res.json({
      trackingNumber,
      status: "غير مُهيأ — أضف BOSTA_API_KEY",
      timeline: [],
    });
  }

  try {
    const data = await bosta.trackDelivery(trackingNumber);
    return res.json(data);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء التتبع" });
  }
});

export default router;
