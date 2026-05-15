import { pgTable, text, serial, integer, numeric, boolean, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { customersTable } from "./customers";
import { productsTable, productVariantsTable } from "./products";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_confirmation",
  "confirmed",
  "dispatched",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "paymob"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed"]);

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    customerId: integer("customer_id").notNull().references(() => customersTable.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
    shippingAddress: text("shipping_address"),
    customerPhone: text("customer_phone"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    publicCode: text("public_code").notNull(),
    trackingToken: text("tracking_token").notNull(),
    paymobOrderId: text("paymob_order_id"),
    paymobTransactionId: text("paymob_transaction_id"),
    bostaShipmentId: text("bosta_shipment_id"),
    bostaShipmentStatus: text("bosta_shipment_status"),
    trackingNumber: text("tracking_number"),
    customerName: text("customer_name"),
    shippingGovernorate: text("shipping_governorate"),
    shippingCity: text("shipping_city"),
    deliveryEstimateDays: integer("delivery_estimate_days"),
    isRepeatCustomer: boolean("is_repeat_customer").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // High-traffic: order listing sorted by date per tenant
    index("idx_orders_tenant_created_at").on(table.tenantId, table.createdAt),
    // High-traffic: order filtering by status per tenant
    index("idx_orders_tenant_status").on(table.tenantId, table.status),
    uniqueIndex("idx_orders_public_code").on(table.publicCode),
  ],
);

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  variantId: integer("variant_id").references(() => productVariantsTable.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const orderStatusHistoryTable = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistoryTable.$inferSelect;
