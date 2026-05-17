ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "image_urls" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "store_config" jsonb;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_categories_id_fk') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variant_id_product_variants_id_fk') THEN
        ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
