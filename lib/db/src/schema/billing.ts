import { pgTable, text, serial, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "failed",
  "voided",
]);

export const billingInvoicesTable = pgTable("billing_invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  planCode: text("plan_code").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EGP"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  providerReference: text("provider_reference"),
  note: text("note"),
  issuedAt: timestamp("issued_at"),
  paidAt: timestamp("paid_at"),
  createdBy: integer("created_by").references(() => merchantsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BillingInvoice = typeof billingInvoicesTable.$inferSelect;
