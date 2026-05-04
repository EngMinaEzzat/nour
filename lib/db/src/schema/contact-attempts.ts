import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { merchantsTable } from "./merchants";
import { tenantsTable } from "./tenants";

export const contactMethodEnum = pgEnum("contact_method", ["phone", "whatsapp", "email", "other"]);

export const contactAttemptsTable = pgTable("contact_attempts", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  merchantId: integer("merchant_id").notNull().references(() => merchantsTable.id),
  method: contactMethodEnum("method").notNull().default("phone"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContactAttempt = typeof contactAttemptsTable.$inferSelect;
