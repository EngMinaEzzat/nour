CREATE TYPE "public"."kashier_provider_status" AS ENUM('NOT_CONFIGURED', 'CONFIGURED_DISABLED', 'ACTIVE', 'ERROR', 'PLAN_DISALLOWED');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'kashier';--> statement-breakpoint
CREATE TABLE "kashier_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"status" "kashier_provider_status" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"merchant_id" text,
	"api_key" text,
	"is_mock_allowed" text DEFAULT 'false' NOT NULL,
	"last_error_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kashier_providers_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "kashier_providers" ADD CONSTRAINT "kashier_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;