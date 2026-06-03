ALTER TABLE "tenants" ADD COLUMN "store_config" jsonb;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" integer;--> statement-breakpoint



ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
