import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "order_created",
  "status_changed_to_confirmed",
  "status_changed_to_dispatched",
  "status_changed_to_delivered",
  "status_changed_to_cancelled",
  "awaiting_confirmation_timeout",
  "failed_contact_attempt",
]);

export const automationActionEnum = pgEnum("automation_action", [
  "send_whatsapp",
  "mark_follow_up",
  "alert_merchant",
]);

export const automationRulesTable = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: automationTriggerEnum("trigger").notNull(),
  action: automationActionEnum("action").notNull(),
  config: jsonb("config"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  planRequired: text("plan_required").notNull().default("growth"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AutomationRule = typeof automationRulesTable.$inferSelect;
