import { Router } from "express";
import { isValidEgyptianPhone, PHONE_ERROR_AR, normaliseEgyptianPhone } from "../lib/egypt";
import { getPlan, isAtLimit } from "../lib/entitlements";
import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, orderStatusHistoryTable,
  tenantsTable, customersTable, productsTable, contactAttemptsTable,
  automationRulesTable,
} from "@workspace/db";
import { checkoutLimiter } from "../lib/rate-limiters";
import {
  CreateOrderBody,
  UpdateOrderBody,
  GetOrderParams,
  UpdateOrderParams,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";
import { buildOrderConfirmationMessage, buildDispatchedMessage, buildCancelledMessage, buildDeliveryFollowUpMessage, buildReturnExchangeMessage, buildShippingUpdateMessage, buildWhatsAppLink } from "../lib/whatsapp.js";

const router = Router();

async function fetchOrderWithItems(orderId: number) {
  const [order] = await db
    .select({
      id: ordersTable.id,
      tenantId: ordersTable.tenantId,
      tenantName: tenantsTable.name,
      customerId: ordersTable.customerId,
      customerName: customersTable.name,
      status: ordersTable.status,
      totalAmount: ordersTable.totalAmount,
      shippingCost: ordersTable.shippingCost,
      shippingAddress: ordersTable.shippingAddress,
      customerPhone: ordersTable.customerPhone,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      paymobOrderId: ordersTable.paymobOrderId,
      paymobTransactionId: ordersTable.paymobTransactionId,
      bostaShipmentId: ordersTable.bostaShipmentId,
      trackingNumber: ordersTable.trackingNumber,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(eq(ordersTable.id, orderId));

  if (!order) return null;

  const items = await db
    .select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      totalPrice: orderItemsTable.totalPrice,
    })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  const statusHistory = await db
    .select()
    .from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, orderId))
    .orderBy(orderStatusHistoryTable.createdAt);

  return {
    ...order,
    totalAmount: parseFloat(order.totalAmount as string),
    shippingCost: parseFloat((order.shippingCost ?? "0") as string),
    createdAt: order.createdAt.toISOString(),
    items: items.map((item) => ({
      ...item,
      unitPrice: parseFloat(item.unitPrice as string),
      totalPrice: parseFloat(item.totalPrice as string),
    })),
    statusHistory: statusHistory.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

/* ─── Fire automation rules for a given status change ─── */
async function fireAutomationRules(params: {
  tenantId: number;
  orderId: number;
  newStatus: string;
  customerName: string;
  customerPhone: string | null;
  storeName: string;
  totalAmount: number;
  trackingNumber?: string | null;
  log: { warn: (obj: object, msg: string) => void; info: (obj: object, msg: string) => void };
}) {
  const triggerKey = `status_changed_to_${params.newStatus}`;
  try {
    const rules = await db
      .select()
      .from(automationRulesTable)
      .where(
        and(
          eq(automationRulesTable.tenantId, params.tenantId),
          eq(automationRulesTable.trigger, triggerKey as typeof automationRulesTable.$inferSelect["trigger"]),
          eq(automationRulesTable.isEnabled, true),
        )
      );

    for (const rule of rules) {
      if (rule.action === "send_whatsapp" && params.customerPhone) {
        let message = "";
        switch (params.newStatus) {
          case "confirmed":
            message = buildOrderConfirmationMessage({
              customerName: params.customerName,
              orderId: params.orderId,
              storeName: params.storeName,
              totalAmount: params.totalAmount,
              items: [],
              trackingNumber: params.trackingNumber ?? undefined,
            });
            break;
          case "dispatched":
            message = buildDispatchedMessage({
              customerName: params.customerName,
              orderId: params.orderId,
              storeName: params.storeName,
              trackingNumber: params.trackingNumber ?? undefined,
            });
            break;
          case "cancelled":
            message = buildCancelledMessage({
              customerName: params.customerName,
              orderId: params.orderId,
              storeName: params.storeName,
            });
            break;
          case "delivered":
            message = buildDeliveryFollowUpMessage({
              customerName: params.customerName,
              orderId: params.orderId,
              storeName: params.storeName,
            });
            break;
          case "returned":
            message = buildReturnExchangeMessage({
              customerName: params.customerName,
              orderId: params.orderId,
              storeName: params.storeName,
            });
            break;
          default:
            message = buildShippingUpdateMessage({
              customerName: params.customerName,
              orderId: params.orderId,
              storeName: params.storeName,
              trackingNumber: params.trackingNumber ?? undefined,
              statusAr: params.newStatus,
            });
        }

        if (message) {
          const link = buildWhatsAppLink(params.customerPhone, message);
          params.log.info(
            { ruleId: rule.id, orderId: params.orderId, action: rule.action },
            `Automation: WhatsApp link generated for order ${params.orderId} — ${link.substring(0, 60)}...`
          );
        }
      }
    }
  } catch (err) {
    params.log.warn({ err, trigger: triggerKey }, "Automation rule execution failed — non-fatal");
  }
}

router.get("/orders", async (req, res) => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { tenantId: queryTenantId, status } = parsed.data;
  const search = req.query.search as string | undefined;

  // Tenant isolation: authenticated merchant sessions are always scoped to their tenant
  const sessionTenantId = req.merchantTenantId ?? null;
  const effectiveTenantId = sessionTenantId ?? queryTenantId;

  const conditions = [];
  if (effectiveTenantId) conditions.push(eq(ordersTable.tenantId, effectiveTenantId));
  if (status) conditions.push(sql`${ordersTable.status} = ${status}`);

  try {
    const query = db
      .select({
        id: ordersTable.id,
        tenantId: ordersTable.tenantId,
        tenantName: tenantsTable.name,
        customerId: ordersTable.customerId,
        customerName: customersTable.name,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        shippingCost: ordersTable.shippingCost,
        shippingAddress: ordersTable.shippingAddress,
        customerPhone: ordersTable.customerPhone,
        paymentMethod: ordersTable.paymentMethod,
        paymentStatus: ordersTable.paymentStatus,
        trackingNumber: ordersTable.trackingNumber,
        bostaShipmentId: ordersTable.bostaShipmentId,
        paymobOrderId: ordersTable.paymobOrderId,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(ordersTable.createdAt));

    const orderRows = await query;

    let filtered = orderRows;
    if (search) {
      const lower = search.toLowerCase();
      filtered = orderRows.filter((o) =>
        String(o.id).includes(lower) ||
        (o.customerName ?? "").toLowerCase().includes(lower) ||
        (o.customerPhone ?? "").includes(lower)
      );
    }

    const result = await Promise.all(
      filtered.map(async (order) => {
        const items = await db
          .select({
            id: orderItemsTable.id,
            productId: orderItemsTable.productId,
            productName: productsTable.name,
            quantity: orderItemsTable.quantity,
            unitPrice: orderItemsTable.unitPrice,
            totalPrice: orderItemsTable.totalPrice,
          })
          .from(orderItemsTable)
          .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
          .where(eq(orderItemsTable.orderId, order.id));
        return {
          ...order,
          totalAmount: parseFloat(order.totalAmount as string),
          shippingCost: parseFloat((order.shippingCost ?? "0") as string),
          createdAt: order.createdAt.toISOString(),
          items: items.map((item) => ({
            ...item,
            unitPrice: parseFloat(item.unitPrice as string),
            totalPrice: parseFloat(item.totalPrice as string),
          })),
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الطلبات" });
  }
});

/* ─── Atomic order creation: immediate decrement (COD) or stock reservation (Paymob) ─── */
// Strategy:
//   COD    → stock is decremented immediately; restored on cancel/return
//   Paymob → stock reservation: decremented optimistically and released automatically
//            by the Paymob webhook handler if the payment ultimately fails or expires.
//            This prevents overselling during the payment window while keeping the
//            reservation transparent to the shopper.
router.post("/orders", checkoutLimiter, async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // ── Sprint 5: Egyptian phone validation ────────────────────────────────────
  const rawPhone = (parsed.data as { customerPhone?: string }).customerPhone;
  if (rawPhone && !isValidEgyptianPhone(rawPhone)) {
    return res.status(400).json({ error: PHONE_ERROR_AR });
  }
  const normalisedPhone = rawPhone ? normaliseEgyptianPhone(rawPhone) : null;

  // ── Sprint 6: Monthly order limit enforcement ──────────────────────────────
  const orderTenantId = parsed.data.tenantId;
  if (orderTenantId) {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode, subscriptionStatus: tenantsTable.subscriptionStatus })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, orderTenantId));

    if (tenant && tenant.subscriptionStatus === "active") {
      const plan = getPlan(tenant.planCode);
      if (plan.monthlyOrderLimit !== -1) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [{ cnt }] = await db
          .select({ cnt: sql<number>`count(*)::int` })
          .from(ordersTable)
          .where(and(eq(ordersTable.tenantId, orderTenantId), sql`${ordersTable.createdAt} >= ${startOfMonth}`));
        if (isAtLimit(cnt, plan.monthlyOrderLimit)) {
          return res.status(429).json({ error: `وصل المتجر إلى الحد الأقصى من الطلبات الشهرية (${plan.monthlyOrderLimit} طلب). يرجى التواصل مع صاحب المتجر.` });
        }
      }
    }
  }

  const paymentMethod = ((parsed.data as { paymentMethod?: string }).paymentMethod ?? "cod") as "cod" | "paymob";
  const isPaymobReservation = paymentMethod === "paymob";

  try {
    const createdOrder = await db.transaction(async (tx) => {
      let subtotal = 0;

      const itemsWithPrices = await Promise.all(
        parsed.data.items.map(async (item) => {
          const [product] = await tx
            .select()
            .from(productsTable)
            .where(eq(productsTable.id, item.productId));

          if (!product) throw new Error(`منتج #${item.productId} غير موجود`);
          if (product.status !== "active")
            throw new Error(`منتج "${product.name}" غير متاح للبيع حالياً`);
          if ((product.stock ?? 0) < item.quantity)
            throw new Error(
              `الكمية المطلوبة من "${product.name}" تتجاوز المخزون المتاح (${product.stock ?? 0} متبقٍ)`
            );

          const unitPrice = parseFloat(product.price as string);
          const totalPrice = unitPrice * item.quantity;
          subtotal += totalPrice;
          return { ...item, unitPrice, totalPrice };
        })
      );

      const [order] = await tx
        .insert(ordersTable)
        .values({
          tenantId: parsed.data.tenantId,
          customerId: parsed.data.customerId,
          shippingAddress: parsed.data.shippingAddress ?? null,
          customerPhone: normalisedPhone,
          paymentMethod,
          totalAmount: String(subtotal),
          shippingCost: "0",
          // Paymob orders start as pending_payment until webhook confirms; COD starts as pending
          status: "pending",
          paymentStatus: isPaymobReservation ? "pending" : "pending",
        })
        .returning();

      await tx.insert(orderItemsTable).values(
        itemsWithPrices.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.totalPrice),
        }))
      );

      // Stock reservation / decrement:
      // For both COD and Paymob we decrement stock atomically inside the transaction.
      // Paymob webhook will release the reservation if payment fails (see paymob.ts).
      // COD cancellation restores stock via the status-change handler below.
      await Promise.all(
        itemsWithPrices.map((item) =>
          tx
            .update(productsTable)
            .set({
              stock: sql`${productsTable.stock} - ${item.quantity}`,
              orderCount: sql`${productsTable.orderCount} + ${item.quantity}`,
            })
            .where(
              and(
                eq(productsTable.id, item.productId),
                sql`${productsTable.stock} >= ${item.quantity}`
              )
            )
        )
      );

      await tx.insert(orderStatusHistoryTable).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending",
        note: "تم إنشاء الطلب",
      });

      return order;
    });

    const fullOrder = await fetchOrderWithItems(createdOrder.id);
    res.status(201).json(fullOrder);
  } catch (err) {
    req.log.error(err);
    const msg = err instanceof Error ? err.message : "فشل إنشاء الطلب";
    res.status(400).json({ error: msg });
  }
});

router.get("/orders/:id", async (req, res) => {
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف الطلب غير صحيح" });
  try {
    const order = await fetchOrderWithItems(parsed.data.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

    // If the caller is an authenticated merchant, enforce tenant isolation.
    // Unauthenticated callers (storefront customers viewing their own order confirmation) are
    // allowed through — they know their order ID from the checkout response.
    const sessionTenantId = req.merchantTenantId;
    if (sessionTenantId && order.tenantId !== sessionTenantId) {
      return res.status(403).json({ error: "ليس لديك صلاحية لعرض هذا الطلب" });
    }

    res.json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الطلب" });
  }
});

/* ─── Status update — session-tenant scoped ─── */
router.put("/orders/:id", requireRole("owner", "manager", "staff"), async (req, res) => {
  const paramsParsed = UpdateOrderParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "معرّف الطلب غير صحيح" });
  const bodyParsed = UpdateOrderBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.flatten() });

  try {
    const [existing] = await db
      .select({
        id: ordersTable.id,
        tenantId: ordersTable.tenantId,
        status: ordersTable.status,
        customerName: customersTable.name,
        customerPhone: ordersTable.customerPhone,
        totalAmount: ordersTable.totalAmount,
        trackingNumber: ordersTable.trackingNumber,
        tenantName: tenantsTable.name,
      })
      .from(ordersTable)
      .leftJoin(tenantsTable, eq(ordersTable.tenantId, tenantsTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(ordersTable.id, paramsParsed.data.id));

    if (!existing) return res.status(404).json({ error: "الطلب غير موجود" });
    if (existing.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك تعديل طلبات متجر آخر" });
    }

    const newStatus = bodyParsed.data.status;

    // Stock restoration: when order cancelled or returned, give stock back
    if (
      newStatus &&
      newStatus !== existing.status &&
      (newStatus === "cancelled" || newStatus === "returned")
    ) {
      const items = await db
        .select({ productId: orderItemsTable.productId, quantity: orderItemsTable.quantity })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, paramsParsed.data.id));

      await Promise.all(
        items.map((item) =>
          db
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
            .where(eq(productsTable.id, item.productId))
        )
      );
    }

    await db
      .update(ordersTable)
      .set(bodyParsed.data)
      .where(eq(ordersTable.id, paramsParsed.data.id));

    if (newStatus && newStatus !== existing.status) {
      await db.insert(orderStatusHistoryTable).values({
        orderId: existing.id,
        fromStatus: existing.status,
        toStatus: newStatus,
        note: null,
      });

      // Fire automation rules for this status change (non-blocking)
      fireAutomationRules({
        tenantId: existing.tenantId!,
        orderId: existing.id,
        newStatus,
        customerName: existing.customerName ?? "عميل",
        customerPhone: existing.customerPhone ?? null,
        storeName: existing.tenantName ?? "المتجر",
        totalAmount: parseFloat(existing.totalAmount as string),
        trackingNumber: bodyParsed.data.trackingNumber ?? existing.trackingNumber,
        log: req.log,
      }).catch((err) => req.log.warn({ err }, "Automation fire failed silently"));
    }

    const order = await fetchOrderWithItems(paramsParsed.data.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
    res.json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث الطلب" });
  }
});

/* ─── Contact Attempts ─── */
router.get("/orders/:id/contact-attempts", requireRole("owner", "manager", "staff"), async (req, res) => {
  const orderId = Number(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "معرّف الطلب غير صحيح" });

  try {
    const [order] = await db
      .select({ tenantId: ordersTable.tenantId })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
    if (order.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك الوصول لهذا الطلب" });
    }

    const attempts = await db
      .select()
      .from(contactAttemptsTable)
      .where(eq(contactAttemptsTable.orderId, orderId))
      .orderBy(desc(contactAttemptsTable.createdAt));

    res.json(attempts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب محاولات التواصل" });
  }
});

router.post("/orders/:id/contact-attempts", requireRole("owner", "manager", "staff"), async (req, res) => {
  const orderId = Number(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "معرّف الطلب غير صحيح" });

  const { method, note } = req.body as { method?: string; note?: string };
  const validMethods = ["phone", "whatsapp", "email", "other"];
  if (!method || !validMethods.includes(method)) {
    return res.status(400).json({ error: "method يجب أن يكون: phone, whatsapp, email, أو other" });
  }

  try {
    const [order] = await db
      .select({ tenantId: ordersTable.tenantId })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
    if (order.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك الوصول لهذا الطلب" });
    }

    const [attempt] = await db
      .insert(contactAttemptsTable)
      .values({
        orderId,
        tenantId: req.merchantTenantId!,
        merchantId: req.session.merchantId!,
        method: method as "phone" | "whatsapp" | "email" | "other",
        note: note?.trim() ?? null,
      })
      .returning();

    res.status(201).json({ ...attempt, createdAt: attempt.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تسجيل محاولة التواصل" });
  }
});

export default router;
