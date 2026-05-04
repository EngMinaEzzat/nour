import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const transferRequestStatusEnum = pgEnum("transfer_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const billingTransferRequestsTable = pgTable("billing_transfer_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull(),
  amount: integer("amount").notNull(),
  referenceNumber: text("reference_number").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  status: transferRequestStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by").references(() => merchantsTable.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BillingTransferRequest = typeof billingTransferRequestsTable.$inferSelect;
