import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const domainStatusEnum = pgEnum("domain_status", [
  "PENDING_DNS",
  "VERIFYING",
  "ACTIVE",
  "FAILED",
  "REMOVED",
]);

export const customDomainsTable = pgTable("custom_domains", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  domain: text("domain").notNull().unique(),
  status: domainStatusEnum("status").notNull().default("PENDING_DNS"),
  verificationToken: text("verification_token").notNull(),
  dnsTarget: text("dns_target"),
  verifiedAt: timestamp("verified_at"),
  removedAt: timestamp("removed_at"),
  requestedBy: integer("requested_by").references(() => merchantsTable.id),
  lastCheckedAt: timestamp("last_checked_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CustomDomain = typeof customDomainsTable.$inferSelect;
