import { pgTable, text, serial, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { ordersTable } from "./orders";

export const paymobProviderStatusEnum = pgEnum("paymob_provider_status", [
  "NOT_CONFIGURED",
  "CONFIGURED_DISABLED",
  "ACTIVE",
  "ERROR",
  "PLAN_DISALLOWED",
]);

export const paymentRecordStatusEnum = pgEnum("payment_record_status", [
  "initiated",
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
]);

export const paymobProvidersTable = pgTable("paymob_providers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  status: paymobProviderStatusEnum("status").notNull().default("NOT_CONFIGURED"),
  apiKeyHash: text("api_key_hash"),
  integrationId: text("integration_id"),
  iframeId: text("iframe_id"),
  hmacSecret: text("hmac_secret"),
  isMockAllowed: text("is_mock_allowed").notNull().default("false"),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentRecordsTable = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  provider: text("provider").notNull().default("paymob"),
  providerOrderId: text("provider_order_id"),
  providerTransactionId: text("provider_transaction_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EGP"),
  status: paymentRecordStatusEnum("status").notNull().default("initiated"),
  paymentToken: text("payment_token"),
  iframeSrc: text("iframe_src"),
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentWebhooksTable = pgTable("payment_webhooks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("paymob"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  eventType: text("event_type"),
  providerTransactionId: text("provider_transaction_id"),
  success: text("success"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PaymobProvider = typeof paymobProvidersTable.$inferSelect;
export type PaymentRecord = typeof paymentRecordsTable.$inferSelect;
export type PaymentWebhook = typeof paymentWebhooksTable.$inferSelect;
