ALTER TABLE "background_jobs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "background_jobs" ALTER COLUMN "status" SET DEFAULT 'queued'::text;--> statement-breakpoint
DROP TYPE "public"."job_status";--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'succeeded', 'failed');--> statement-breakpoint
ALTER TABLE "background_jobs" ALTER COLUMN "status" SET DEFAULT 'queued'::"public"."job_status";--> statement-breakpoint
ALTER TABLE "background_jobs" ALTER COLUMN "status" SET DATA TYPE "public"."job_status" USING "status"::"public"."job_status";