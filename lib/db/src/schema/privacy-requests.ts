import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const privacyRequestTypeEnum = pgEnum("privacy_request_type", [
  "export",
  "delete",
  "restrict",
  "correction",
]);

export const privacyRequestStatusEnum = pgEnum("privacy_request_status", [
  "pending",
  "approved",
  "rejected",
  "completed",
  "failed",
]);

export const privacySubjectTypeEnum = pgEnum("privacy_subject_type", [
  "merchant",
  "customer",
  "staff",
]);

export const privacyRequestsTable = pgTable("privacy_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id, {
    onDelete: "cascade",
  }), // nullable for platform requests
  subjectType: privacySubjectTypeEnum("subject_type").notNull(),
  subjectIdentifier: text("subject_identifier").notNull(), // email, phone, id, etc.
  requestType: privacyRequestTypeEnum("request_type").notNull(),
  status: privacyRequestStatusEnum("status").notNull().default("pending"),
  requestedBy: integer("requested_by").references(() => merchantsTable.id), // the staff/merchant creating the request record
  reviewedBy: integer("reviewed_by").references(() => merchantsTable.id),
  resultSummary: text("result_summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PrivacyRequest = typeof privacyRequestsTable.$inferSelect;
export type InsertPrivacyRequest = typeof privacyRequestsTable.$inferInsert;
