import { pgTable, text, serial, integer, numeric, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { categoriesTable } from "./categories";

export const productStatusEnum = pgEnum("product_status", ["active", "out_of_stock", "hidden"]);

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
    imageUrl: text("image_url"),
    stock: integer("stock").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    isSample: boolean("is_sample").notNull().default(false),
    status: productStatusEnum("status").notNull().default("active"),
    orderCount: integer("order_count").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // High-traffic: product listing by status per tenant
    index("idx_products_tenant_status").on(table.tenantId, table.status),
    // Homepage featured products per tenant
    index("idx_products_tenant_featured").on(table.tenantId, table.featured),
  ],
);

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  size: text("size"),
  color: text("color"),
  colorHex: text("color_hex"),
  imageUrls: text("image_urls").notNull().default("[]"),
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_product_variants_product_id").on(table.productId)
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, orderCount: true });
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
