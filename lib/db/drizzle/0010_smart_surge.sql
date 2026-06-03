ALTER TABLE "tenants" ADD COLUMN "store_config" jsonb;--> statement-breakpoint
CREATE TYPE "public"."privacy_request_status" AS ENUM('pending', 'approved', 'rejected', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."privacy_request_type" AS ENUM('export', 'delete', 'restrict', 'correction');--> statement-breakpoint
CREATE TYPE "public"."privacy_subject_type" AS ENUM('merchant', 'customer', 'staff');--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"subject_type" "privacy_subject_type" NOT NULL,
	"subject_identifier" text NOT NULL,
	"request_type" "privacy_request_type" NOT NULL,
	"status" "privacy_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" integer,
	"reviewed_by" integer,
	"result_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_requested_by_merchants_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_reviewed_by_merchants_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;