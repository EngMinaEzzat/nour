import { pgTable, text, serial, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { ordersTable } from "./orders";
import { merchantsTable } from "./merchants";

export const returnStatusEnum = pgEnum("return_status", [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "RESOLVED",
]);

export const returnCasesTable = pgTable("return_cases", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  status: returnStatusEnum("status").notNull().default("REQUESTED"),
  reason: text("reason").notNull(),
  requestedItems: jsonb("requested_items"),
  note: text("note"),
  handledBy: integer("handled_by").references(() => merchantsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ReturnCase = typeof returnCasesTable.$inferSelect;
