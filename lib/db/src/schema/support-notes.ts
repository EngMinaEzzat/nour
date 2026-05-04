import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { merchantsTable } from "./merchants";

export const tenantSupportNotesTable = pgTable("tenant_support_notes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdBy: integer("created_by").notNull().references(() => merchantsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TenantSupportNote = typeof tenantSupportNotesTable.$inferSelect;
