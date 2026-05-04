import { pgTable, text, serial, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { ordersTable } from "./orders";

export const whatsappProviderStatusEnum = pgEnum("whatsapp_provider_status", [
  "NOT_CONFIGURED",
  "CONFIGURED_DISABLED",
  "ACTIVE",
  "ERROR",
  "PLAN_DISALLOWED",
]);

export const whatsappMessageTypeEnum = pgEnum("whatsapp_message_type", [
  "order_confirmation_request",
  "order_confirmed",
  "order_dispatched",
  "delivery_followup",
  "cancellation_notice",
  "return_exchange_followup",
]);

export const whatsappMessageStatusEnum = pgEnum("whatsapp_message_status", [
  "QUEUED",
  "SENT",
  "FAILED",
  "DELIVERED",
]);

export const whatsappProvidersTable = pgTable("whatsapp_providers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  status: whatsappProviderStatusEnum("status").notNull().default("NOT_CONFIGURED"),
  phoneNumberId: text("phone_number_id"),
  businessAccountId: text("business_account_id"),
  accessToken: text("access_token"),
  webhookSecret: text("webhook_secret"),
  isMockAllowed: boolean("is_mock_allowed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whatsappMessageLogsTable = pgTable("whatsapp_message_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  messageType: whatsappMessageTypeEnum("message_type").notNull(),
  status: whatsappMessageStatusEnum("status").notNull().default("QUEUED"),
  customerPhone: text("customer_phone").notNull(),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  idempotencyKey: text("idempotency_key").notNull(),
  renderedMessage: text("rendered_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WhatsappProvider = typeof whatsappProvidersTable.$inferSelect;
export type WhatsappMessageLog = typeof whatsappMessageLogsTable.$inferSelect;
