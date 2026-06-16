import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, orderStatusHistoryTable,
  tenantsTable, customersTable, productsTable, contactAttemptsTable,
  automationRulesTable, cartSessionsTable, productVariantsTable,
  discountCodesTable, discountCodeUsesTable, shippingSettingsTable, shippingZonesTable,
} from "@workspace/db";
import { eq, and, sql, desc, inArray, count, ilike, or, isNull, exists } from "drizzle-orm";
import crypto from "crypto";
import { getPlan, isAtLimit } from "../lib/entitlements.js";
import { isValidEgyptianPhone, normaliseEgyptianPhone, PHONE_ERROR_AR } from "../lib/egypt.js";

// Error class for Checkout Service
export class CheckoutHttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
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

export const RESTOCK_STATUSES = new Set<OrderStatus>(["cancelled", "returned"]);

export class OrderService {
  static createPublicOrderCode(): string {
    return `NO-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  }

  static createTrackingToken(): string {
    return crypto.randomBytes(24).toString("hex");
  }

  static checkoutItemKey(productId: number, variantId?: number | null) {
    return `${productId}:${variantId ?? "none"}`;
  }

  static combineCheckoutItems(items: Array<{ productId: number; variantId?: number | null; quantity: number }>) {
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
      const key = OrderService.checkoutItemKey(item.productId, item.variantId);
      const existing = combined.get(key);
      combined.set(key, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: (existing?.quantity ?? 0) + item.quantity,
      });
    }
    return [...combined.values()];
  }

  static assertAllowedOrderTransition(params: {
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

  static calculateDiscountAmount(type: string, value: number, subtotal: number): number {
    if (type === "percentage") return Math.min((subtotal * value) / 100, subtotal);
    if (type === "fixed") return Math.min(value, subtotal);
    return 0;
  }

  static normalizeDiscountCode(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const code = value.trim().toUpperCase();
    return code.length > 0 ? code : null;
  }

  static async fetchOrderWithItems(orderId: number) {
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

  static async createOrder(data: any, log: any) {
    // Ported creation logic 
    const {
      customerId, marketingConsent, customerPhone: rawPhone, items,
      tenantId: requestTenantId, cartSessionId, sessionId, storefrontSlug,
      discountCode: rawDiscountCode, shippingGovernorate, shippingCity, paymentMethod = "cod"
    } = data;

    if (rawPhone && !isValidEgyptianPhone(rawPhone)) {
      throw new CheckoutHttpError(400, PHONE_ERROR_AR);
    }
    const normalisedPhone = rawPhone ? normaliseEgyptianPhone(rawPhone) : null;

    let orderTenantId = requestTenantId;
    let checkoutItems: Array<{ productId: number; variantId?: number | null; quantity: number }>;
    checkoutItems = OrderService.combineCheckoutItems(items);
    if (checkoutItems.length === 0) {
      throw new CheckoutHttpError(400, "لا يمكن إنشاء طلب بدون منتجات");
    }

    const productIds = checkoutItems.map((item) => item.productId);
    const productTenants = await db
      .select({ id: productsTable.id, tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    if (productTenants.length !== productIds.length) {
      throw new CheckoutHttpError(400, "واحد أو أكثر من المنتجات غير موجود");
    }

    const tenantIds = new Set(productTenants.map((product) => product.tenantId));
    if (tenantIds.size !== 1) {
      throw new CheckoutHttpError(400, "يجب أن يحتوي الطلب الواحد على منتجات من متجر واحد فقط");
    }

    const serverTenantId = productTenants[0].tenantId;
    if (orderTenantId && orderTenantId !== serverTenantId) {
      throw new CheckoutHttpError(403, "لا يمكن إنشاء طلب لمنتجات متجر آخر");
    }
    orderTenantId = serverTenantId;

    if (storefrontSlug) {
      const [tenantFromSlug] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, storefrontSlug));
      if (!tenantFromSlug || tenantFromSlug.id !== orderTenantId) {
        throw new CheckoutHttpError(403, "رابط المتجر لا يطابق منتجات الطلب");
      }
    }

    const finalCartSessionId = cartSessionId || sessionId;
    if (finalCartSessionId) {
      const [cartSession] = await db
        .select({ id: cartSessionsTable.id })
        .from(cartSessionsTable)
        .where(
          and(
            eq(cartSessionsTable.sessionId, finalCartSessionId),
            eq(cartSessionsTable.tenantId, orderTenantId),
            eq(cartSessionsTable.status, "active"),
          ),
        );
      if (!cartSession && storefrontSlug) {
        throw new CheckoutHttpError(403, "جلسة السلة لا تطابق هذا المتجر");
      }
    }

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
          throw new CheckoutHttpError(429, `وصل المتجر إلى الحد الأقصى من الطلبات الشهرية (${plan.monthlyOrderLimit} طلب). يرجى التواصل مع صاحب المتجر.`);
        }
      }
    }

    const discountCode = OrderService.normalizeDiscountCode(rawDiscountCode);

    const createdOrder = await db.transaction(async (tx) => {
      let subtotal = 0;

      const [customer] = await tx
        .select({ id: customersTable.id, name: customersTable.name })
        .from(customersTable)
        .where(eq(customersTable.id, customerId));
      if (!customer) throw new CheckoutHttpError(400, "بيانات العميل غير موجودة");

      if (marketingConsent !== undefined) {
        await tx.update(customersTable).set({
          marketingConsent: marketingConsent,
          marketingConsentSource: "checkout",
          marketingConsentAt: new Date(),
        }).where(eq(customersTable.id, customerId));
      }

      const productIdsToFetch = Array.from(new Set(checkoutItems.map(i => i.productId)));
      const variantIdsToFetch = Array.from(new Set(checkoutItems.filter(i => i.variantId).map(i => i.variantId!)));

      const [productsData, variantsData, variantCountsData] = await Promise.all([
        productIdsToFetch.length > 0
          ? tx.select().from(productsTable).where(and(inArray(productsTable.id, productIdsToFetch), eq(productsTable.tenantId, orderTenantId)))
          : Promise.resolve([]),
        variantIdsToFetch.length > 0
          ? tx.select().from(productVariantsTable).where(inArray(productVariantsTable.id, variantIdsToFetch))
          : Promise.resolve([]),
        productIdsToFetch.length > 0
          ? tx.select({ productId: productVariantsTable.productId, variantCount: count() }).from(productVariantsTable).where(inArray(productVariantsTable.productId, productIdsToFetch)).groupBy(productVariantsTable.productId)
          : Promise.resolve([])
      ]);

      const productsMap = new Map(productsData.map(p => [p.id, p]));
      const variantsMap = new Map(variantsData.map(v => [v.id, v]));
      const variantCountsMap = new Map(variantCountsData.map(v => [v.productId, Number(v.variantCount)]));

      const itemsWithPrices = checkoutItems.map((item) => {
        const product = productsMap.get(item.productId);
        if (!product) throw new Error(`منتج #${item.productId} غير موجود`);
        if (product.status !== "active") throw new Error(`منتج "${product.name}" غير متاح للبيع حالياً`);

        let availableStock = product.stock ?? 0;
        if (item.variantId) {
          const variant = variantsMap.get(item.variantId);
          if (!variant || variant.productId !== item.productId) {
             throw new CheckoutHttpError(400, `المتغير المحدد للمنتج "${product.name}" غير موجود`);
          }
          availableStock = variant.stock ?? 0;
        }

        if (!item.variantId) {
          const variantCount = variantCountsMap.get(item.productId) ?? 0;
          if (variantCount > 0) {
            throw new CheckoutHttpError(400, `يجب اختيار مقاس/لون للمنتج "${product.name}"`);
          }
        }

        if (availableStock < item.quantity)
          throw new CheckoutHttpError(409, `الكمية المطلوبة من "${product.name}" تتجاوز المخزون المتاح (${availableStock} متبقٍ)`);

        const unitPrice = parseFloat(product.price as string);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        return { ...item, unitPrice, totalPrice };
      });

      let appliedDiscount = 0;
      let appliedDiscountCodeId: null | number = null;
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
        if (discount.startsAt && discount.startsAt > now) throw new CheckoutHttpError(400, "Discount code has not started yet");
        if (discount.expiresAt && discount.expiresAt < now) throw new CheckoutHttpError(410, "Discount code has expired");
        if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) throw new CheckoutHttpError(410, "Discount code usage limit reached");

        const minOrder = discount.minOrderAmount ? parseFloat(discount.minOrderAmount as string) : 0;
        if (subtotal < minOrder) throw new CheckoutHttpError(400, `Minimum order amount for this discount is ${minOrder}`);

        appliedDiscount = OrderService.calculateDiscountAmount(discount.type, parseFloat(discount.value as string), subtotal);
        appliedDiscountCodeId = discount.id;
      }

      let shippingCost = 0;
      if (shippingGovernorate) {
        const [settings] = await tx.select().from(shippingSettingsTable).where(eq(shippingSettingsTable.tenantId, orderTenantId));

        if (settings?.freeShippingEnabled && settings.freeShippingMinSubtotal) {
          const threshold = parseFloat(settings.freeShippingMinSubtotal as string);
          if (subtotal >= threshold) shippingCost = 0;
        }

        if (shippingCost === 0 && !(settings?.freeShippingEnabled && settings.freeShippingMinSubtotal && subtotal >= parseFloat(settings.freeShippingMinSubtotal as string))) {
          const zones = await tx.select().from(shippingZonesTable).where(and(eq(shippingZonesTable.tenantId, orderTenantId), eq(shippingZonesTable.isEnabled, true)));

          let matchedZone = null;
          if (shippingCity) {
            matchedZone = zones.find((z) => z.governorate.toLowerCase() === shippingGovernorate.toLowerCase() && z.city?.toLowerCase() === shippingCity.toLowerCase());
          }
          if (!matchedZone) {
            matchedZone = zones.find((z) => z.governorate.toLowerCase() === shippingGovernorate.toLowerCase() && !z.city);
          }
          if (!matchedZone && settings && !settings.isEnabled) {
            throw new CheckoutHttpError(422, "Shipping is not available for this area");
          }
          shippingCost = matchedZone ? parseFloat(matchedZone.shippingCost as string) : settings ? parseFloat(settings.defaultShippingCost as string) : 50;
        }
      }

      const orderTotal = Math.max(0, subtotal - appliedDiscount) + shippingCost;

      const [order] = await tx
        .insert(ordersTable)
        .values({
          tenantId: orderTenantId,
          customerId,
          customerName: customer.name,
          shippingAddress: data.shippingAddress?.trim() || null,
          customerPhone: normalisedPhone,
          paymentMethod,
          totalAmount: String(orderTotal),
          shippingCost: String(shippingCost),
          status: "pending",
          paymentStatus: "pending",
          publicCode: OrderService.createPublicOrderCode(),
          trackingToken: OrderService.createTrackingToken(),
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

        if (!claimed) throw new CheckoutHttpError(409, "Discount code could not be applied");

        await tx.insert(discountCodeUsesTable).values({
          discountCodeId: appliedDiscountCodeId,
          orderId: order.id,
          customerId,
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

      await Promise.all(
        itemsWithPrices.map(async (item) => {
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
        })
      );

      await tx.insert(orderStatusHistoryTable).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending",
        note: "تم إنشاء الطلب",
      });

      if (finalCartSessionId) {
        await tx
          .update(cartSessionsTable)
          .set({ status: "converted", convertedAt: new Date(), lastActivityAt: new Date() })
          .where(and(eq(cartSessionsTable.sessionId, finalCartSessionId), eq(cartSessionsTable.tenantId, orderTenantId)));
      }

      return order;
    });
    
    return { createdOrder, orderTenantId };
  }
}
