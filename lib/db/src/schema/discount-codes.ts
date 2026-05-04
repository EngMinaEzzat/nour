import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { ordersTable } from "./orders";
import { customersTable } from "./customers";

export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type").notNull().$type<"percentage" | "fixed" | "free_shipping">(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const discountCodeUsesTable = pgTable("discount_code_uses", {
  id: serial("id").primaryKey(),
  discountCodeId: integer("discount_code_id").notNull().references(() => discountCodesTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customersTable.id),
  appliedDiscount: numeric("applied_discount", { precision: 10, scale: 2 }).notNull(),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
});
