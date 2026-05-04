import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const fbModerationStatusEnum = pgEnum("fb_moderation_status", [
  "pending",
  "replied",
  "ignored",
  "flagged",
]);

export const facebookConnectionsTable = pgTable("facebook_connections", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  pageId: text("page_id").notNull(),
  pageName: text("page_name"),
  pageAccessToken: text("page_access_token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const facebookModerationLogTable = pgTable("facebook_moderation_log", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().unique(),
  itemType: text("item_type").notNull(),
  authorName: text("author_name"),
  authorId: text("author_id"),
  content: text("content"),
  postContext: text("post_context"),
  aiDraft: text("ai_draft"),
  status: fbModerationStatusEnum("status").notNull().default("pending"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FacebookConnection = typeof facebookConnectionsTable.$inferSelect;
export type FacebookModerationLog = typeof facebookModerationLogTable.$inferSelect;
