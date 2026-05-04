import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { tenantsTable } from "./tenants";

export const productReviewsTable = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  rating: integer("rating").notNull(),
  body: text("body"),
  status: text("status").notNull().default("pending").$type<"pending" | "approved" | "rejected">(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
