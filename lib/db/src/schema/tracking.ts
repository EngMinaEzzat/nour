import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const trackingSettingsTable = pgTable("tracking_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  ga4MeasurementId: text("ga4_measurement_id"),
  ga4Enabled: boolean("ga4_enabled").notNull().default(false),
  metaPixelId: text("meta_pixel_id"),
  metaEnabled: boolean("meta_enabled").notNull().default(false),
  tiktokPixelId: text("tiktok_pixel_id"),
  tiktokEnabled: boolean("tiktok_enabled").notNull().default(false),
  googleAdsConversionId: text("google_ads_conversion_id"),
  googleAdsEnabled: boolean("google_ads_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TrackingSettings = typeof trackingSettingsTable.$inferSelect;
