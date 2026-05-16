import { pgTable, text, serial, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const categoryTypeEnum = pgEnum("category_type", ["fashion", "cosmetics"]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references((): any => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  type: categoryTypeEnum("type").notNull(),
  imageUrl: text("image_url"),
}, (table) => [
  index("idx_categories_tenant_id").on(table.tenantId),
  index("idx_categories_parent_id").on(table.parentId)
]);

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
