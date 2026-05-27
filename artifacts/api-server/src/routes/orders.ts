import { Router } from "express";
import crypto from "crypto";
import { isValidEgyptianPhone, PHONE_ERROR_AR, normaliseEgyptianPhone } from "../lib/egypt";
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
import { buildOrderConfirmationMessage, buildDispatchedMessage, buildCancelledMessage, buildDeliveryFollowUpMessage, buildReturnExchangeMessage, buildShippingUpdateMessage, buildWhatsAppLink } from "../lib/whatsapp.js";

const router = Router();

class CheckoutHttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

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

const RESTOCK_STATUSES = new Set<OrderStatus>(["cancelled", "returned"]);

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
  const [order] = await db
    .select({
      id: ordersTable.id,
      tenantId: ordersTable.tenantId,
      tenantName: tenantsTable.name,
      tenantSlug: tenantsTable.slug,
      customerId: ordersTable.customerId,
      customerName: customersTable.name,
      status: ordersTable.status,
      totalAmount: ordersTable.totalAmount,
      shippingCost: ordersTable.shippingCost,
      shippingAddress: ordersTable.shippingAddress,
      customerPhone: ordersTable.customerPhone,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      publicCode: ordersTable.publicCode,
      trackingToken: ordersTable.trackingToken,
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
      variantId: orderItemsTable.variantId,
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
  if (city) conditions.push(ilike(ordersTable.shippingAddress, `%${city}%`));
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
    searchConditions.push(ilike(customersTable.name, `%${search}%`));
    searchConditions.push(ilike(ordersTable.customerPhone, `%${search}%`));
    searchConditions.push(ilike(ordersTable.publicCode, `%${search}%`));
    searchConditions.push(ilike(ordersTable.trackingNumber, `%${search}%`));
    
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

  // ── Sprint 5: Egyptian phone validation ────────────────────────────────────
  const rawPhone = (parsed.data as { customerPhone?: string }).customerPhone;
  if (rawPhone && !isValidEgyptianPhone(rawPhone)) {
    return res.status(400).json({ error: PHONE_ERROR_AR });
  }
  const normalisedPhone = rawPhone ? normaliseEgyptianPhone(rawPhone) : null;

  const rawBody = req.body as {
    tenantId?: number;
    cartSessionId?: string;
    sessionId?: string;
    storefrontSlug?: string;
    discountCode?: unknown;
    shippingGovernorate?: unknown;
    shippingCity?: unknown;
  };
  const cartSessionId =
    typeof rawBody.cartSessionId === "string" && rawBody.cartSessionId.trim()
      ? rawBody.cartSessionId.trim()
      : typeof rawBody.sessionId === "string" && rawBody.sessionId.trim()
        ? rawBody.sessionId.trim()
        : null;
  const storefrontSlug =
    typeof rawBody.storefrontSlug === "string" && rawBody.storefrontSlug.trim()
      ? rawBody.storefrontSlug.trim()
      : null;
  const discountCode = normalizeDiscountCode(rawBody.discountCode);
  const shippingGovernorate =
    typeof rawBody.shippingGovernorate === "string" && rawBody.shippingGovernorate.trim()
      ? rawBody.shippingGovernorate.trim()
      : null;
  const shippingCity =
    typeof rawBody.shippingCity === "string" && rawBody.shippingCity.trim()
      ? rawBody.shippingCity.trim()
      : null;

  // ── Sprint 6: Monthly order limit enforcement ──────────────────────────────
  let orderTenantId = parsed.data.tenantId;
  let checkoutItems: Array<{ productId: number; variantId?: number | null; quantity: number }>;
  try {
    checkoutItems = combineCheckoutItems(parsed.data.items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "بيانات المنتجات غير صحيحة";
    return res.status(err instanceof CheckoutHttpError ? err.statusCode : 400).json({ error: msg });
  }
  if (checkoutItems.length === 0) {
    return res.status(400).json({ error: "لا يمكن إنشاء طلب بدون منتجات" });
  }

  try {
    const productIds = checkoutItems.map((item) => item.productId);
    const productTenants = await db
      .select({ id: productsTable.id, tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    if (productTenants.length !== productIds.length) {
      return res.status(400).json({ error: "واحد أو أكثر من المنتجات غير موجود" });
    }

    const tenantIds = new Set(productTenants.map((product) => product.tenantId));
    if (tenantIds.size !== 1) {
      return res.status(400).json({ error: "يجب أن يحتوي الطلب الواحد على منتجات من متجر واحد فقط" });
    }

    const serverTenantId = productTenants[0].tenantId;
    if (orderTenantId !== serverTenantId) {
      return res.status(403).json({ error: "لا يمكن إنشاء طلب لمنتجات متجر آخر" });
    }
    orderTenantId = serverTenantId;

    if (storefrontSlug) {
      const [tenantFromSlug] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, storefrontSlug));
      if (!tenantFromSlug || tenantFromSlug.id !== orderTenantId) {
        return res.status(403).json({ error: "رابط المتجر لا يطابق منتجات الطلب" });
      }
    }

    if (cartSessionId) {
      const [cartSession] = await db
        .select({ id: cartSessionsTable.id })
        .from(cartSessionsTable)
        .where(
          and(
            eq(cartSessionsTable.sessionId, cartSessionId),
            eq(cartSessionsTable.tenantId, orderTenantId),
            eq(cartSessionsTable.status, "active"),
          ),
        );
      if (!cartSession && storefrontSlug) {
        return res.status(403).json({ error: "جلسة السلة لا تطابق هذا المتجر" });
      }
    }
  } catch (err) {
    req.log.error(err);
    const msg = err instanceof Error ? err.message : "فشل التحقق من الطلب";
    return res.status(err instanceof CheckoutHttpError ? err.statusCode : 400).json({ error: msg });
  }
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

  try {
    const createdOrder = await db.transaction(async (tx) => {
      let subtotal = 0;

      const [customer] = await tx
        .select({ id: customersTable.id, name: customersTable.name })
        .from(customersTable)
        .where(eq(customersTable.id, parsed.data.customerId));
      if (!customer) throw new CheckoutHttpError(400, "بيانات العميل غير موجودة");

      // Update marketing consent if provided
      if (parsed.data.marketingConsent !== undefined) {
        await tx.update(customersTable).set({
          marketingConsent: parsed.data.marketingConsent,
          marketingConsentSource: "checkout",
          marketingConsentAt: new Date(),
        }).where(eq(customersTable.id, parsed.data.customerId));
      }

      const itemsWithPrices = await Promise.all(
        checkoutItems.map(async (item) => {
          const [product] = await tx
            .select()
            .from(productsTable)
            .where(and(eq(productsTable.id, item.productId), eq(productsTable.tenantId, orderTenantId)));

          if (!product) throw new Error(`منتج #${item.productId} غير موجود`);
          if (product.status !== "active")
            throw new Error(`منتج "${product.name}" غير متاح للبيع حالياً`);

          let availableStock = product.stock ?? 0;
          if (item.variantId) {
            const [variant] = await tx
              .select()
              .from(productVariantsTable)
              .where(and(eq(productVariantsTable.id, item.variantId), eq(productVariantsTable.productId, item.productId)));
            if (!variant) throw new CheckoutHttpError(400, `المتغير المحدد للمنتج "${product.name}" غير موجود`);
            availableStock = variant.stock ?? 0;
          }

          if (!item.variantId) {
            const [{ variantCount }] = await tx
              .select({ variantCount: count() })
              .from(productVariantsTable)
              .where(eq(productVariantsTable.productId, item.productId));
            if (variantCount > 0) {
              throw new CheckoutHttpError(400, `ÙŠØ¬Ø¨ Ø§Ø®ØªÙŠØ§Ø± Ù…Ù‚Ø§Ø³/Ù„ÙˆÙ† Ù„Ù„Ù…Ù†ØªØ¬ "${product.name}"`);
            }
          }

          if (availableStock < item.quantity)
            throw new CheckoutHttpError(409,
              `الكمية المطلوبة من "${product.name}" تتجاوز المخزون المتاح (${availableStock} متبقٍ)`
            );

          const unitPrice = parseFloat(product.price as string);
          const totalPrice = unitPrice * item.quantity;
          subtotal += totalPrice;
          return { ...item, unitPrice, totalPrice };
        })
      );

      let appliedDiscount = 0;
      let appliedDiscountCodeId: number | null = null;
      if (discountCode) {
        const [discount] = await tx
          .select()
          .from(discountCodesTable)
          .where(
            and(
              eq(discountCodesTable.tenantId, orderTenantId),
              eq(sql`UPPER(${discountCodesTable.code})`, discountCode),
              eq(discountCodesTable.active, true),
            ),
          );

        if (!discount) throw new CheckoutHttpError(404, "Discount code is invalid");

        const now = new Date();
        if (discount.startsAt && discount.startsAt > now) {
          throw new CheckoutHttpError(400, "Discount code has not started yet");
        }
        if (discount.expiresAt && discount.expiresAt < now) {
          throw new CheckoutHttpError(410, "Discount code has expired");
        }
        if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
          throw new CheckoutHttpError(410, "Discount code usage limit reached");
        }

        const minOrder = discount.minOrderAmount ? parseFloat(discount.minOrderAmount as string) : 0;
        if (subtotal < minOrder) {
          throw new CheckoutHttpError(400, `Minimum order amount for this discount is ${minOrder}`);
        }

        appliedDiscount = calculateDiscountAmount(
          discount.type,
          parseFloat(discount.value as string),
          subtotal,
        );
        appliedDiscountCodeId = discount.id;
      }

      let shippingCost = 0;
      if (shippingGovernorate) {
        const [settings] = await tx
          .select()
          .from(shippingSettingsTable)
          .where(eq(shippingSettingsTable.tenantId, orderTenantId));

        if (settings?.freeShippingEnabled && settings.freeShippingMinSubtotal) {
          const threshold = parseFloat(settings.freeShippingMinSubtotal as string);
          if (subtotal >= threshold) {
            shippingCost = 0;
          }
        }

        if (shippingCost === 0 && !(settings?.freeShippingEnabled && settings.freeShippingMinSubtotal && subtotal >= parseFloat(settings.freeShippingMinSubtotal as string))) {
          const zones = await tx
            .select()
            .from(shippingZonesTable)
            .where(and(
              eq(shippingZonesTable.tenantId, orderTenantId),
              eq(shippingZonesTable.isEnabled, true),
            ));

          let matchedZone = null;
          if (shippingCity) {
            matchedZone = zones.find(
              (z) =>
                z.governorate.toLowerCase() === shippingGovernorate.toLowerCase() &&
                z.city?.toLowerCase() === shippingCity.toLowerCase()
            );
          }
          if (!matchedZone) {
            matchedZone = zones.find(
              (z) =>
                z.governorate.toLowerCase() === shippingGovernorate.toLowerCase() && !z.city
            );
          }
          if (!matchedZone && settings && !settings.isEnabled) {
            throw new CheckoutHttpError(422, "Shipping is not available for this area");
          }
          shippingCost = matchedZone
            ? parseFloat(matchedZone.shippingCost as string)
            : settings
              ? parseFloat(settings.defaultShippingCost as string)
              : 50;
        }
      }

      const orderTotal = Math.max(0, subtotal - appliedDiscount) + shippingCost;

      const [order] = await tx
        .insert(ordersTable)
        .values({
          tenantId: orderTenantId,
          customerId: parsed.data.customerId,
          customerName: customer.name,
          shippingAddress: parsed.data.shippingAddress?.trim() || null,
          customerPhone: normalisedPhone,
          paymentMethod,
          totalAmount: String(orderTotal),
          shippingCost: String(shippingCost),
          // Paymob orders start as pending_payment until webhook confirms; COD starts as pending
          status: "pending",
          paymentStatus: "pending",
          publicCode: createPublicOrderCode(),
          trackingToken: createTrackingToken(),
        })
        .returning();

      if (appliedDiscountCodeId) {
        const now = new Date();
        const [claimed] = await tx
          .update(discountCodesTable)
          .set({ usedCount: sql`${discountCodesTable.usedCount} + 1` })
          .where(
            and(
              eq(discountCodesTable.id, appliedDiscountCodeId),
              eq(discountCodesTable.tenantId, orderTenantId),
              eq(discountCodesTable.active, true),
              or(isNull(discountCodesTable.startsAt), sql`${discountCodesTable.startsAt} <= ${now}`)!,
              or(isNull(discountCodesTable.expiresAt), sql`${discountCodesTable.expiresAt} > ${now}`)!,
              or(isNull(discountCodesTable.maxUses), sql`${discountCodesTable.usedCount} < ${discountCodesTable.maxUses}`)!,
            ),
          )
          .returning({ id: discountCodesTable.id });

        if (!claimed) {
          throw new CheckoutHttpError(409, "Discount code could not be applied");
        }

        await tx.insert(discountCodeUsesTable).values({
          discountCodeId: appliedDiscountCodeId,
          orderId: order.id,
          customerId: parsed.data.customerId,
          appliedDiscount: String(appliedDiscount),
        });
      }

      await tx.insert(orderItemsTable).values(
        itemsWithPrices.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.totalPrice),
        }))
      );

      // Stock reservation / decrement:
      // For both COD and Paymob we decrement stock atomically inside the transaction.
      // Paymob webhook will release the reservation if payment fails (see paymob.ts).
      // COD cancellation restores stock via the status-change handler below.
      for (const item of itemsWithPrices) {
        const decremented = item.variantId
          ? await tx
              .update(productVariantsTable)
              .set({ stock: sql`${productVariantsTable.stock} - ${item.quantity}` })
              .where(
                and(
                  eq(productVariantsTable.id, item.variantId),
                  eq(productVariantsTable.productId, item.productId),
                  sql`${productVariantsTable.stock} >= ${item.quantity}`
                )
              )
              .returning({ id: productVariantsTable.id })
          : await tx
              .update(productsTable)
              .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
              .where(
                and(
                  eq(productsTable.id, item.productId),
                  eq(productsTable.tenantId, orderTenantId),
                  sql`${productsTable.stock} >= ${item.quantity}`
                )
              )
              .returning({ id: productsTable.id });

        if (decremented.length === 0) {
          throw new CheckoutHttpError(409, `الكمية المطلوبة من المنتج #${item.productId} تتجاوز المخزون المتاح`);
        }

        const productSummaryUpdate = item.variantId
          ? {
              stock: sql`${productsTable.stock} - ${item.quantity}`,
              orderCount: sql`${productsTable.orderCount} + ${item.quantity}`,
            }
          : { orderCount: sql`${productsTable.orderCount} + ${item.quantity}` };

        await tx
          .update(productsTable)
          .set(productSummaryUpdate)
          .where(and(eq(productsTable.id, item.productId), eq(productsTable.tenantId, orderTenantId)));
      }

      await tx.insert(orderStatusHistoryTable).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending",
        note: "تم إنشاء الطلب",
      });

      if (cartSessionId) {
        await tx
          .update(cartSessionsTable)
          .set({ status: "converted", convertedAt: new Date(), lastActivityAt: new Date() })
          .where(and(eq(cartSessionsTable.sessionId, cartSessionId), eq(cartSessionsTable.tenantId, orderTenantId)));
      }

      return order;
    });

    const fullOrder = await fetchOrderWithItems(createdOrder.id);
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

        for (const item of items) {
          await tx
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
            .where(and(eq(productsTable.id, item.productId), eq(productsTable.tenantId, existing.tenantId)));

          if (item.variantId) {
            await tx
              .update(productVariantsTable)
              .set({ stock: sql`${productVariantsTable.stock} + ${item.quantity}` })
              .where(and(eq(productVariantsTable.id, item.variantId), eq(productVariantsTable.productId, item.productId)));
          }
        }
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
