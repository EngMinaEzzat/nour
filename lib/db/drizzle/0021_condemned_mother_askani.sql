ALTER TYPE "public"."tenant_category" ADD VALUE 'clinic';--> statement-breakpoint
ALTER TYPE "public"."tenant_category" ADD VALUE 'electronics';--> statement-breakpoint
ALTER TYPE "public"."tenant_category" ADD VALUE 'bistro';--> statement-breakpoint
ALTER TYPE "public"."tenant_category" ADD VALUE 'spare_parts';--> statement-breakpoint
ALTER TYPE "public"."category_type" ADD VALUE 'clinic';--> statement-breakpoint
ALTER TYPE "public"."category_type" ADD VALUE 'electronics';--> statement-breakpoint
ALTER TYPE "public"."category_type" ADD VALUE 'bistro';--> statement-breakpoint
ALTER TYPE "public"."category_type" ADD VALUE 'spare_parts';--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_email_unique";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tenant_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_tenant_email" ON "customers" USING btree ("tenant_id","email");