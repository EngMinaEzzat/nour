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
  type: categoryTypeEnum("type").notNull(),
  imageUrl: text("image_url"),
});

export const DEFAULT_CATEGORIES = [
  { name: "Clothing", nameAr: "ملابس", type: "fashion" as const },
  { name: "Accessories", nameAr: "إكسسوارات", type: "fashion" as const },
  { name: "Cosmetics", nameAr: "مستحضرات تجميل", type: "cosmetics" as const },
  { name: "Perfumes", nameAr: "عطور", type: "cosmetics" as const },
];

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
