import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const aiUsageEventsTable = pgTable(
  "ai_usage_events",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    merchantId: integer("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),
    promptType: text("prompt_type").notNull(),
    inputSummary: text("input_summary"),
    resultSummary: text("result_summary"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    estimatedCostCents: integer("estimated_cost_cents"),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_ai_usage_events_tenant_created_at").on(table.tenantId, table.createdAt),
    index("idx_ai_usage_events_tenant_prompt_type").on(table.tenantId, table.promptType),
  ],
);

export type AiUsageEvent = typeof aiUsageEventsTable.$inferSelect;
