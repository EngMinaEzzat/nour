ALTER TYPE "public"."audit_event_type" ADD VALUE 'kashier_configured' BEFORE 'tracking_updated';--> statement-breakpoint
CREATE TABLE "platform_support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer,
	"name" text,
	"email" text,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_support_messages" ADD CONSTRAINT "platform_support_messages_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;