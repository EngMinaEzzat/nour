import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const merchantOnboardingTable = pgTable("merchant_onboarding", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .unique(),
  storeIdentityDone: boolean("store_identity_done").notNull().default(false),
  homepageMessageDone: boolean("homepage_message_done").notNull().default(false),
  firstProductDone: boolean("first_product_done").notNull().default(false),
  shippingSetupDone: boolean("shipping_setup_done").notNull().default(false),
  integrationsReviewDone: boolean("integrations_review_done").notNull().default(false),
  launchReviewDone: boolean("launch_review_done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MerchantOnboarding = typeof merchantOnboardingTable.$inferSelect;
