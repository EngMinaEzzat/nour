import { pgTable, text, serial, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const categoryTypeEnum = pgEnum("category_type", ["fashion", "cosmetics"]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  image: text("image"),
  type: categoryTypeEnum("type").notNull(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
