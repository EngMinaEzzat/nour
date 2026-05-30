import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantCategoryEnum = pgEnum("tenant_category", ["fashion", "cosmetics", "both"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "inactive", "pending"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial", "active", "past_due", "suspended", "canceled",
]);

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  category: tenantCategoryEnum("category").notNull(),
  status: tenantStatusEnum("status").notNull().default("pending"),
  city: text("city"),
  planCode: text("plan_code").notNull().default("starter"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  lastAdminLoginAt: timestamp("last_admin_login_at"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  theme: text("theme").notNull().default("classic"),
  faviconUrl: text("favicon_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  socialLinks: text("social_links"),
  footerContact: text("footer_contact"),
  customDomain: text("custom_domain"),
  customDomainVerified: boolean("custom_domain_verified").notNull().default(false),
  storeConfig: jsonb("store_config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_tenants_slug").on(table.slug)
]);

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
