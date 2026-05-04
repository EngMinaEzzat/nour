import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { discountCodesTable } from "./discount-codes";

export const affiliatesTable = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull().$type<"instagram" | "tiktok" | "youtube" | "other">(),
  discountCodeId: integer("discount_code_id").references(() => discountCodesTable.id, { onDelete: "set null" }),
  commissionType: text("commission_type").notNull().$type<"percent" | "flat">(),
  commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Affiliate = typeof affiliatesTable.$inferSelect;
export type InsertAffiliate = typeof affiliatesTable.$inferInsert;
