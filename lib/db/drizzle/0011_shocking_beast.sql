ALTER TABLE "customers" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "marketing_consent_source" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "marketing_consent_at" timestamp;