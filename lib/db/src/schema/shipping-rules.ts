import { pgTable, text, serial, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const shippingZonesTable = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  governorate: text("governorate").notNull(),
  city: text("city"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryDays: integer("delivery_days").notNull().default(3),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shippingSettingsTable = pgTable("shipping_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  defaultShippingCost: numeric("default_shipping_cost", { precision: 10, scale: 2 }).notNull().default("50"),
  freeShippingMinSubtotal: numeric("free_shipping_min_subtotal", { precision: 10, scale: 2 }),
  freeShippingEnabled: boolean("free_shipping_enabled").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ShippingZone = typeof shippingZonesTable.$inferSelect;
export type ShippingSettings = typeof shippingSettingsTable.$inferSelect;
