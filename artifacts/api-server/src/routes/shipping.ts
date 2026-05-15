import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, customersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import * as bosta from "../lib/bosta";
import { requireRole } from "../middleware/require-role";

const router = Router();

router.post("/shipping/bosta/create", requireRole("owner", "manager", "staff"), async (req, res) => {
  const { orderId, dropOffCity, customerPhone: overridePhone } = req.body as {
    orderId?: number;
    dropOffCity?: string;
    customerPhone?: string;
  };
  const tenantId = req.merchantTenantId!;
  if (!orderId) return res.status(400).json({ error: "orderId مطلوب" });

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
        customerPhone: ordersTable.customerPhone,
        bostaShipmentId: ordersTable.bostaShipmentId,
        bostaShipmentStatus: ordersTable.bostaShipmentStatus,
        trackingNumber: ordersTable.trackingNumber,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenantId)));

    if (!row) return res.status(404).json({ error: "الطلب غير موجود" });

    // Idempotency check: if order already has a shipment, return it
    if (row.bostaShipmentId && row.trackingNumber) {
      return res.json({
        configured: true,
        shipmentId: row.bostaShipmentId,
        trackingNumber: row.trackingNumber,
      });
    }
    if (row.bostaShipmentStatus === "creating") {
      return res.status(409).json({ error: "جاري إنشاء الشحنة بالفعل، حاول مرة أخرى بعد لحظات" });
    }

    const phoneToUse = overridePhone || row.customerPhone;
    if (!phoneToUse) return res.status(400).json({ error: "customerPhone مطلوب" });

    const [claim] = await db
      .update(ordersTable)
      .set({ bostaShipmentStatus: "creating" })
      .where(and(
        eq(ordersTable.id, orderId),
        eq(ordersTable.tenantId, tenantId),
        isNull(ordersTable.bostaShipmentId),
        isNull(ordersTable.trackingNumber),
        isNull(ordersTable.bostaShipmentStatus),
      ))
      .returning({
        id: ordersTable.id,
      });

    if (!claim) {
      const [latest] = await db
        .select({
          bostaShipmentId: ordersTable.bostaShipmentId,
          bostaShipmentStatus: ordersTable.bostaShipmentStatus,
          trackingNumber: ordersTable.trackingNumber,
        })
        .from(ordersTable)
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenantId)));

      if (latest?.bostaShipmentId && latest.trackingNumber) {
        return res.json({
          configured: true,
          shipmentId: latest.bostaShipmentId,
          trackingNumber: latest.trackingNumber,
        });
      }

      return res.status(409).json({ error: "جاري إنشاء الشحنة بالفعل، حاول مرة أخرى بعد لحظات" });
    }

    const nameParts = (row.customerName ?? "Customer User").split(" ");
    let result: Awaited<ReturnType<typeof bosta.createDelivery>>;
    try {
      result = await bosta.createDelivery({
        orderId: row.id,
        orderTotal: parseFloat(row.totalAmount as string),
        paymentMethod: row.paymentMethod as "cod" | "paymob",
        customerFirstName: nameParts[0] ?? "Customer",
        customerLastName: nameParts.slice(1).join(" ") || "User",
        customerPhone: phoneToUse,
        dropOffAddress: row.shippingAddress ?? "Cairo",
        dropOffCity: dropOffCity ?? "Cairo",
      });
    } catch (err) {
      await db.update(ordersTable)
        .set({ bostaShipmentStatus: null })
        .where(and(
          eq(ordersTable.id, orderId),
          eq(ordersTable.tenantId, tenantId),
          eq(ordersTable.bostaShipmentStatus, "creating"),
        ))
        .catch(() => {});
      throw err;
    }

    const persisted = await db.update(ordersTable)
      .set({
        bostaShipmentId: result.shipmentId,
        trackingNumber: result.trackingNumber,
        bostaShipmentStatus: "created",
        customerPhone: phoneToUse,
        status: "shipped",
      })
      .where(and(
        eq(ordersTable.id, orderId),
        eq(ordersTable.tenantId, tenantId),
        eq(ordersTable.bostaShipmentStatus, "creating"),
      ))
      .returning({ id: ordersTable.id });

    if (persisted.length === 0) {
      req.log.error({
        event: "bosta_persist_failure_after_provider_success",
        orderId,
        tenantId,
        bostaShipmentId: result.shipmentId,
        trackingNumber: result.trackingNumber,
      }, "Bosta shipment was created but local order update was not persisted");
      return res.status(500).json({ error: "حدث خطأ أثناء حفظ بيانات الشحنة" });
    }

    req.log.info({
      event: "bosta_create_success",
      orderId,
      tenantId,
      bostaShipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber,
    }, "Successfully created Bosta shipment");

    return res.json({ configured: true, ...result });
  } catch (err) {
    req.log.error({
      event: "bosta_create_failure",
      orderId,
      tenantId,
      err: err instanceof Error ? err.message : String(err),
    }, "Failed to create Bosta shipment");
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
