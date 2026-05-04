import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "plan_changed",
  "subscription_changed",
  "provider_configured",
  "provider_disabled",
  "domain_requested",
  "domain_verified",
  "domain_removed",
  "payment_webhook_failed",
  "payment_succeeded",
  "payment_failed",
  "role_changed",
  "staff_invited",
  "staff_invitation_accepted",
  "staff_invitation_revoked",
  "export_requested",
  "support_note_added",
  "paymob_configured",
  "tracking_updated",
]);

export const tenantAuditEventsTable = pgTable("tenant_audit_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").references(() => merchantsTable.id),
  actorLabel: text("actor_label"),
  eventType: auditEventTypeEnum("event_type").notNull(),
  summary: text("summary").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TenantAuditEvent = typeof tenantAuditEventsTable.$inferSelect;
