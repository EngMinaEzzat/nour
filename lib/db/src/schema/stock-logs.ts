import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { productsTable } from "./products";
import { productVariantsTable } from "./products";
import { ordersTable } from "./orders";
import { merchantsTable } from "./merchants";

export const stockAdjustmentSourceEnum = pgEnum("stock_adjustment_source", [
  "manual",
  "checkout",
  "return",
  "correction",
]);

export const stockAdjustmentLogsTable = pgTable("stock_adjustment_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").references(() => productVariantsTable.id, { onDelete: "set null" }),
  oldStock: integer("old_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  delta: integer("delta").notNull(),
  source: stockAdjustmentSourceEnum("source").notNull().default("manual"),
  reason: text("reason"),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  changedBy: integer("changed_by").references(() => merchantsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StockAdjustmentLog = typeof stockAdjustmentLogsTable.$inferSelect;
