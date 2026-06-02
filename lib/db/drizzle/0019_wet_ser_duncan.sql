ALTER TYPE "public"."audit_event_type" ADD VALUE 'sample_products_seeded';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'sample_products_cleared';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;