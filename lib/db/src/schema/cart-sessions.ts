import { pgTable, serial, integer, text, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const cartSessionsTable = pgTable(
  "cart_sessions",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    items: jsonb("items").notNull().default([]),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    itemCount: integer("item_count").notNull().default(0),
    status: text("status").notNull().default("active").$type<"active" | "abandoned" | "converted">(),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    convertedAt: timestamp("converted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Abandoned cart queries: find stale sessions per tenant sorted by activity
    index("idx_cart_sessions_tenant_last_activity").on(table.tenantId, table.lastActivityAt),
  ],
);
