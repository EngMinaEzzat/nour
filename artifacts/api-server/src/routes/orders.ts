import { Router } from "express";
import crypto from "crypto";
import { isValidEgyptianPhone, PHONE_ERROR_AR, normaliseEgyptianPhone } from "../lib/egypt";

/** Escape SQL ILIKE wildcard characters to prevent pattern injection */
function escapeIlike(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

import { getPlan, isAtLimit } from "../lib/entitlements";
import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, orderStatusHistoryTable,
  tenantsTable, customersTable, productsTable, contactAttemptsTable,
  automationRulesTable, cartSessionsTable, productVariantsTable,
  discountCodesTable, discountCodeUsesTable, shippingSettingsTable, shippingZonesTable,
} from "@workspace/db";
import { checkoutLimiter } from "../lib/rate-limiters";
import {
  CreateOrderBody,
  UpdateOrderBody,
  GetOrderParams,
  UpdateOrderParams,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { eq, and, sql, desc, inArray, count, ilike, or, isNull, exists } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";
import { OrderService, CheckoutHttpError, RESTOCK_STATUSES } from "../services/OrderService.js";
import { buildOrderConfirmationMessage, buildDispatchedMessage, buildCancelledMessage, buildDeliveryFollowUpMessage, buildReturnExchangeMessage, buildShippingUpdateMessage, buildWhatsAppLink } from "../lib/whatsapp.js";
import { cache } from "../lib/cache.js";

const router = Router();


function createPublicOrderCode(): string {
  return `NO-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

function createTrackingToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function checkoutItemKey(productId: number, variantId?: number | null) {
  return `${productId}:${variantId ?? "none"}`;
}

function combineCheckoutItems(items: Array<{ productId: number; variantId?: number | null; quantity: number }>) {
  const combined = new Map<string, { productId: number; variantId?: number | null; quantity: number }>();
  for (const item of items) {
    if (!Number.isInteger(item.productId) || item.productId <= 0) {
      throw new CheckoutHttpError(400, "معرّف المنتج غير صحيح");
    }
    if (item.variantId != null && (!Number.isInteger(item.variantId) || item.variantId <= 0)) {
      throw new CheckoutHttpError(400, "معرّف المتغير غير صحيح");
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new CheckoutHttpError(400, "كمية المنتج يجب أن تكون رقمًا موجبًا");
    }
    const key = checkoutItemKey(item.productId, item.variantId);
    const existing = combined.get(key);
    combined.set(key, {
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: (existing?.quantity ?? 0) + item.quantity,
    });
  }
  return [...combined.values()];
}

type OrderStatus = typeof ordersTable.$inferSelect["status"];

const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["awaiting_confirmation", "confirmed", "cancelled"],
  awaiting_confirmation: ["confirmed", "cancelled"],
  confirmed: ["dispatched", "shipped", "cancelled"],
  dispatched: ["delivered", "returned"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};


function assertAllowedOrderTransition(params: {
  from: OrderStatus;
  to: OrderStatus;
  paymentMethod: "cod" | "paymob";
  paymentStatus: "pending" | "paid" | "failed";
  nextPaymentStatus?: "pending" | "paid" | "failed";
}) {
  if (params.from === params.to) return;

  if (!ALLOWED_ORDER_TRANSITIONS[params.from].includes(params.to)) {
    throw new CheckoutHttpError(409, `Invalid order status transition: ${params.from} -> ${params.to}`);
  }

  const effectivePaymentStatus = params.nextPaymentStatus ?? params.paymentStatus;
  if (
    params.paymentMethod === "paymob" &&
    ["confirmed", "dispatched", "shipped", "delivered"].includes(params.to) &&
    effectivePaymentStatus !== "paid"
  ) {
    throw new CheckoutHttpError(409, "Paymob orders must be paid before fulfillment status changes");
  }
}

function calculateDiscountAmount(type: string, value: number, subtotal: number): number {
  if (type === "percentage") return Math.min((subtotal * value) / 100, subtotal);
  if (type === "fixed") return Math.min(value, subtotal);
  return 0;
}

function normalizeDiscountCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return code.length > 0 ? code : null;
}

async function fetchOrderWithItems(orderId: number) {
  return OrderService.fetchOrderWithItems(orderId);
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
  const triggerByStatus: Partial<Record<string, typeof automationRulesTable.$inferSelect["trigger"]>> = {
    confirmed: "status_changed_to_confirmed",
    dispatched: "status_changed_to_dispatched",
    delivered: "status_changed_to_delivered",
    cancelled: "status_changed_to_cancelled",
  };
  const triggerKey = triggerByStatus[params.newStatus];
  if (!triggerKey) return;

  try {
    const rules = await db
      .select()
      .from(automationRulesTable)
      .where(
        and(
          eq(automationRulesTable.tenantId, params.tenantId),
          eq(automationRulesTable.trigger, triggerKey),
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

router.get("/orders", requireRole("owner", "manager", "staff"), async (req, res) => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const status = parsed.data.status as any;
  const search = (req.query.search as string | undefined)?.trim();
  const limitCount = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const cursorDate = req.query.cursorDate ? new Date(String(req.query.cursorDate)) : null;
  const cursorId = req.query.cursorId ? Number(req.query.cursorId) : null;

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  const city = parsed.data.city?.trim();
  const hasFailedContact = parsed.data.hasFailedContact === true;

  const effectiveTenantId = req.merchantTenantId!;

  const conditions = [eq(ordersTable.tenantId, effectiveTenantId)];
  if (status) conditions.push(eq(ordersTable.status, status));

  if (startDate) conditions.push(sql`${ordersTable.createdAt} >= ${startDate}`);
  if (endDate) conditions.push(sql`${ordersTable.createdAt} <= ${endDate}`);
  if (city) conditions.push(ilike(ordersTable.shippingAddress, `%${escapeIlike(city)}%`));
  if (hasFailedContact) {
    conditions.push(exists(
      db.select({ id: contactAttemptsTable.id })
        .from(contactAttemptsTable)
        .where(eq(contactAttemptsTable.orderId, ordersTable.id))
    ));
  }

  if (search) {
    const isNumber = /^\d+$/.test(search) && search.length <= 9;
    const searchConditions = [];
    if (isNumber) searchConditions.push(eq(ordersTable.id, Number(search)));
    searchConditions.push(ilike(customersTable.name, `%${escapeIlike(search)}%`));
    searchConditions.push(ilike(ordersTable.customerPhone, `%${escapeIlike(search)}%`));
    searchConditions.push(ilike(ordersTable.publicCode, `%${escapeIlike(search)}%`));
    searchConditions.push(ilike(ordersTable.trackingNumber, `%${escapeIlike(search)}%`));

    conditions.push(or(...searchConditions)!);
  }

  if (cursorDate && cursorId) {
    conditions.push(
      or(
        sql`${ordersTable.createdAt} < ${cursorDate}`,
        and(eq(ordersTable.createdAt, cursorDate), sql`${ordersTable.id} < ${cursorId}`)
      )!
    );
  }

  try {
    const orderRows = await db
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
      .where(and(...conditions))
      .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
      .limit(limitCount + 1);

    const hasMore = orderRows.length > limitCount;
    const results = hasMore ? orderRows.slice(0, limitCount) : orderRows;

    let itemsMap = new Map<number, any[]>();
    if (results.length > 0) {
      const orderIds = results.map(o => o.id);
      const allItems = await db
        .select({
          id: orderItemsTable.id,
          orderId: orderItemsTable.orderId,
          productId: orderItemsTable.productId,
          productName: productsTable.name,
          quantity: orderItemsTable.quantity,
          unitPrice: orderItemsTable.unitPrice,
          totalPrice: orderItemsTable.totalPrice,
        })
        .from(orderItemsTable)
        .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
        .where(inArray(orderItemsTable.orderId, orderIds));

      for (const item of allItems) {
        const arr = itemsMap.get(item.orderId!) ?? [];
        arr.push({
          ...item,
          unitPrice: parseFloat(item.unitPrice as string),
          totalPrice: parseFloat(item.totalPrice as string),
        });
        itemsMap.set(item.orderId!, arr);
      }
    }

    const jsonResults = results.map(order => ({
      ...order,
      totalAmount: parseFloat(order.totalAmount as string),
      shippingCost: parseFloat((order.shippingCost ?? "0") as string),
      createdAt: order.createdAt.toISOString(),
      items: itemsMap.get(order.id) ?? [],
    }));

    res.json({
      data: jsonResults,
      hasMore,
      nextCursor: hasMore ? {
        cursorDate: jsonResults[jsonResults.length - 1].createdAt,
        cursorId: jsonResults[jsonResults.length - 1].id
      } : null
    });
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

  if (req.session.customerId && parsed.data.customerId !== req.session.customerId) {
    return res.status(403).json({ error: "لا يمكنك إنشاء طلب لعميل آخر" });
  }

  try {
    const { createdOrder, orderTenantId } = await OrderService.createOrder({
      ...parsed.data,
      tenantId: req.merchantTenantId || parsed.data.tenantId
    }, req.log);
    const fullOrder = await fetchOrderWithItems(createdOrder.id);
    await cache.invalidateTenant(orderTenantId);
    res.status(201).json(fullOrder);
  } catch (err) {
    req.log.error(err);
    const msg = err instanceof Error ? err.message : "فشل إنشاء الطلب";
    const statusCode = err instanceof CheckoutHttpError ? err.statusCode : 400;
    res.status(statusCode).json({ error: msg });
  }
});

router.get("/orders/track/:publicCode", async (req, res) => {
  const publicCode = req.params.publicCode?.trim();
  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!publicCode || !token) {
    return res.status(400).json({ error: "كود التتبع والرمز مطلوبان" });
  }

  try {
    const [orderRef] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(eq(ordersTable.publicCode, publicCode), eq(ordersTable.trackingToken, token)));

    if (!orderRef) return res.status(404).json({ error: "الطلب غير موجود" });

    const order = await fetchOrderWithItems(orderRef.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

    const { trackingToken: _trackingToken, customerId: _customerId, ...publicOrder } = order;
    res.json(publicOrder);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب بيانات التتبع" });
  }
});

router.get("/orders/:id", requireRole("owner", "manager", "staff"), async (req, res) => {
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف الطلب غير صحيح" });
  try {
    const order = await fetchOrderWithItems(parsed.data.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

    // Merchant order detail is tenant-scoped. Public tracking uses /orders/track/:publicCode.
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
        paymentMethod: ordersTable.paymentMethod,
        paymentStatus: ordersTable.paymentStatus,
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
    assertAllowedOrderTransition({
      from: existing.status,
      to: newStatus,
      paymentMethod: existing.paymentMethod,
      paymentStatus: existing.paymentStatus,
      nextPaymentStatus: bodyParsed.data.paymentStatus,
    });

    const transition = await db.transaction(async (tx) => {
      if (newStatus === existing.status) {
        await tx
          .update(ordersTable)
          .set(bodyParsed.data)
          .where(and(eq(ordersTable.id, paramsParsed.data.id), eq(ordersTable.tenantId, existing.tenantId)));
        return null;
      }

      const [updated] = await tx
        .update(ordersTable)
        .set(bodyParsed.data)
        .where(
          and(
            eq(ordersTable.id, paramsParsed.data.id),
            eq(ordersTable.tenantId, existing.tenantId),
            eq(ordersTable.status, existing.status),
          ),
        )
        .returning({ id: ordersTable.id });

      if (!updated) {
        throw new CheckoutHttpError(409, "Order status changed while updating; reload and try again");
      }

      if (RESTOCK_STATUSES.has(newStatus) && !RESTOCK_STATUSES.has(existing.status)) {
        const items = await tx
          .select({ productId: orderItemsTable.productId, variantId: orderItemsTable.variantId, quantity: orderItemsTable.quantity })
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, paramsParsed.data.id));

        await Promise.all(items.map(async (item) => {
          const updates: Promise<any>[] = [
            tx.update(productsTable)
              .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
              .where(and(eq(productsTable.id, item.productId), eq(productsTable.tenantId, existing.tenantId)))
          ];
          if (item.variantId) {
            updates.push(tx.update(productVariantsTable)
              .set({ stock: sql`${productVariantsTable.stock} + ${item.quantity}` })
              .where(and(eq(productVariantsTable.id, item.variantId), eq(productVariantsTable.productId, item.productId))));
          }
          return Promise.all(updates);
        }));
      }

      await tx.insert(orderStatusHistoryTable).values({
        orderId: existing.id,
        fromStatus: existing.status,
        toStatus: newStatus,
        note: null,
      });

      return { fromStatus: existing.status, toStatus: newStatus };
    });

    if (transition) {
      // Fire automation rules for this status change (non-blocking, outside transaction)
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
    await cache.invalidateTenant(existing.tenantId);
    res.json(order);
  } catch (err) {
    req.log.error(err);
    const statusCode = err instanceof CheckoutHttpError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : "فشل تحديث الطلب";
    res.status(statusCode).json({ error: message });
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
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, req.merchantTenantId!)));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

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
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, req.merchantTenantId!)));

    if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

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
