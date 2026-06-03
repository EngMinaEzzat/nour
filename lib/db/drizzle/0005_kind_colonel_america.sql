ALTER TABLE "tenants" ADD COLUMN "store_config" jsonb;--> statement-breakpoint



ALTER TABLE "order_items" ADD COLUMN "variant_id" integer;--> statement-breakpoint

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;