import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  if (process.env.NODE_ENV !== "test" && process.env.MATJAREG_TEST_DATABASE_OK !== "true") {
    console.error("Only for test db");
    process.exit(1);
  }

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'succeeded', 'failed', 'dead');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "background_jobs" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "job_type" text NOT NULL,
      "status" "public"."job_status" DEFAULT 'queued' NOT NULL,
      "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "attempts" integer DEFAULT 0 NOT NULL,
      "max_attempts" integer DEFAULT 3 NOT NULL,
      "run_at" timestamp DEFAULT now() NOT NULL,
      "locked_at" timestamp,
      "locked_by" text,
      "last_error" text,
      "idempotency_key" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "background_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
    );

    DO $$ BEGIN
      ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."privacy_request_status" AS ENUM('pending', 'approved', 'rejected', 'completed', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."privacy_request_type" AS ENUM('export', 'delete', 'restrict', 'correction');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."privacy_subject_type" AS ENUM('merchant', 'customer', 'staff');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "privacy_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "subject_type" "public"."privacy_subject_type" NOT NULL,
      "subject_identifier" text NOT NULL,
      "request_type" "public"."privacy_request_type" NOT NULL,
      "status" "public"."privacy_request_status" DEFAULT 'pending' NOT NULL,
      "requested_by" integer,
      "reviewed_by" integer,
      "result_summary" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_requested_by_merchants_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_reviewed_by_merchants_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "customers" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;
      ALTER TABLE "customers" ADD COLUMN "marketing_consent_source" text;
      ALTER TABLE "customers" ADD COLUMN "marketing_consent_at" timestamp;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'export_completed';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'export_failed';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'privacy_request_created';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'customer_pseudonymized';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'customer_data_exported';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'product_deleted';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'variant_stock_changed';
      ALTER TYPE "public"."audit_event_type" ADD VALUE 'order_status_changed';
    EXCEPTION
      WHEN duplicate_object THEN null;
      WHEN duplicate_function THEN null;
      WHEN invalid_parameter_value THEN null;
    END $$;
  `);

  // also the new indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "idx_tenants_slug" ON "tenants" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "idx_categories_tenant_id" ON "categories" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "idx_categories_parent_id" ON "categories" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "idx_product_variants_product_id" ON "product_variants" USING btree ("product_id");
    CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" USING btree ("order_id");
    CREATE INDEX IF NOT EXISTS "idx_orders_tenant_status" ON "orders" USING btree ("tenant_id","status");
    CREATE INDEX IF NOT EXISTS "idx_orders_tenant_status_created_at" ON "orders" USING btree ("tenant_id","status","created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_orders_public_code" ON "orders" USING btree ("public_code");
    CREATE INDEX IF NOT EXISTS "idx_orders_paymob_id" ON "orders" USING btree ("paymob_order_id");
    CREATE INDEX IF NOT EXISTS "idx_orders_bosta_id" ON "orders" USING btree ("bosta_shipment_id");
  `);
  console.log("Applied DDL manually");
}

main().catch(console.error);
