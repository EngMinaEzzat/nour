import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const planAuditLogTable = pgTable("plan_audit_log", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  fromPlan: text("from_plan"),
  toPlan: text("to_plan"),
  fromSubscriptionStatus: text("from_subscription_status"),
  toSubscriptionStatus: text("to_subscription_status"),
  changedBy: integer("changed_by").notNull().references(() => merchantsTable.id),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PlanAuditLog = typeof planAuditLogTable.$inferSelect;
