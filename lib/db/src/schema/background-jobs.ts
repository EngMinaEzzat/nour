import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "processing",
  "succeeded",
  "failed",
]);

export const backgroundJobsTable = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id, {
    onDelete: "cascade",
  }),
  jobType: text("job_type").notNull(),
  status: jobStatusEnum("status").notNull().default("queued"),
  payload: jsonb("payload").notNull().default({}),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  runAt: timestamp("run_at").notNull().defaultNow(),
  lockedAt: timestamp("locked_at"),
  lockedBy: text("locked_by"),
  lastError: text("last_error"),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BackgroundJob = typeof backgroundJobsTable.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobsTable.$inferInsert;
