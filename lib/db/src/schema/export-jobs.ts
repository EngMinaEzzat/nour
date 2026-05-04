import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const exportTypeEnum = pgEnum("export_type", [
  "orders",
  "order_items",
  "products",
  "customers",
  "inventory_adjustments",
  "returns",
]);

export const exportStatusEnum = pgEnum("export_status", [
  "queued",
  "processing",
  "complete",
  "failed",
]);

export const exportJobsTable = pgTable("export_jobs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  requestedBy: integer("requested_by").references(() => merchantsTable.id),
  exportType: exportTypeEnum("export_type").notNull(),
  status: exportStatusEnum("status").notNull().default("queued"),
  dateFrom: timestamp("date_from"),
  dateTo: timestamp("date_to"),
  rowCount: integer("row_count"),
  downloadToken: text("download_token").unique(),
  expiresAt: timestamp("expires_at"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ExportJob = typeof exportJobsTable.$inferSelect;
