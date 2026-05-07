CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'suspended', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."tenant_category" AS ENUM('fashion', 'cosmetics', 'both');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('fashion', 'cosmetics');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'out_of_stock', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'awaiting_confirmation', 'confirmed', 'dispatched', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cod', 'paymob');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."merchant_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."contact_method" AS ENUM('phone', 'whatsapp', 'email', 'other');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_status" AS ENUM('QUEUED', 'SENT', 'FAILED', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_type" AS ENUM('order_confirmation_request', 'order_confirmed', 'order_dispatched', 'delivery_followup', 'cancellation_notice', 'return_exchange_followup');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_provider_status" AS ENUM('NOT_CONFIGURED', 'CONFIGURED_DISABLED', 'ACTIVE', 'ERROR', 'PLAN_DISALLOWED');--> statement-breakpoint
CREATE TYPE "public"."automation_action" AS ENUM('send_whatsapp', 'mark_follow_up', 'alert_merchant');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger" AS ENUM('order_created', 'status_changed_to_confirmed', 'status_changed_to_dispatched', 'status_changed_to_delivered', 'status_changed_to_cancelled', 'awaiting_confirmation_timeout', 'failed_contact_attempt');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."stock_adjustment_source" AS ENUM('manual', 'checkout', 'return', 'correction');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('initiated', 'pending', 'paid', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."paymob_provider_status" AS ENUM('NOT_CONFIGURED', 'CONFIGURED_DISABLED', 'ACTIVE', 'ERROR', 'PLAN_DISALLOWED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'failed', 'voided');--> statement-breakpoint
CREATE TYPE "public"."domain_status" AS ENUM('PENDING_DNS', 'VERIFYING', 'ACTIVE', 'FAILED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('queued', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."export_type" AS ENUM('orders', 'order_items', 'products', 'customers', 'inventory_adjustments', 'returns');--> statement-breakpoint
CREATE TYPE "public"."audit_event_type" AS ENUM('plan_changed', 'subscription_changed', 'provider_configured', 'provider_disabled', 'domain_requested', 'domain_verified', 'domain_removed', 'payment_webhook_failed', 'payment_succeeded', 'payment_failed', 'role_changed', 'staff_invited', 'staff_invitation_accepted', 'staff_invitation_revoked', 'export_requested', 'support_note_added', 'paymob_configured', 'tracking_updated');--> statement-breakpoint
CREATE TYPE "public"."fb_moderation_status" AS ENUM('pending', 'replied', 'ignored', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."transfer_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"logo_url" text,
	"cover_url" text,
	"primary_color" text,
	"secondary_color" text,
	"category" "tenant_category" NOT NULL,
	"status" "tenant_status" DEFAULT 'pending' NOT NULL,
	"city" text,
	"plan_code" text DEFAULT 'starter' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"subscription_started_at" timestamp,
	"trial_ends_at" timestamp,
	"last_admin_login_at" timestamp,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"theme" text DEFAULT 'classic' NOT NULL,
	"favicon_url" text,
	"seo_title" text,
	"seo_description" text,
	"social_links" text,
	"footer_contact" text,
	"custom_domain" text,
	"custom_domain_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"type" "category_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"size" text,
	"color" text,
	"color_hex" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"category_id" integer,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"original_price" numeric(10, 2),
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"city" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shipping_address" text,
	"customer_phone" text,
	"payment_method" "payment_method" DEFAULT 'cod' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"public_code" text NOT NULL,
	"tracking_token" text NOT NULL,
	"paymob_order_id" text,
	"paymob_transaction_id" text,
	"bosta_shipment_id" text,
	"tracking_number" text,
	"customer_name" text,
	"shipping_governorate" text,
	"shipping_city" text,
	"delivery_estimate_days" integer,
	"is_repeat_customer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"tenant_id" integer NOT NULL,
	"role" "merchant_role" DEFAULT 'owner' NOT NULL,
	"name" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "merchant_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"store_identity_done" boolean DEFAULT false NOT NULL,
	"homepage_message_done" boolean DEFAULT false NOT NULL,
	"first_product_done" boolean DEFAULT false NOT NULL,
	"shipping_setup_done" boolean DEFAULT false NOT NULL,
	"integrations_review_done" boolean DEFAULT false NOT NULL,
	"launch_review_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_onboarding_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "contact_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"method" "contact_method" DEFAULT 'phone' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_support_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"note" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"from_plan" text,
	"to_plan" text,
	"from_subscription_status" text,
	"to_subscription_status" text,
	"changed_by" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"default_shipping_cost" numeric(10, 2) DEFAULT '50' NOT NULL,
	"free_shipping_min_subtotal" numeric(10, 2),
	"free_shipping_enabled" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"governorate" text NOT NULL,
	"city" text,
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"delivery_days" integer DEFAULT 3 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_message_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"order_id" integer,
	"message_type" "whatsapp_message_type" NOT NULL,
	"status" "whatsapp_message_status" DEFAULT 'QUEUED' NOT NULL,
	"customer_phone" text NOT NULL,
	"provider_message_id" text,
	"error_message" text,
	"idempotency_key" text NOT NULL,
	"rendered_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"status" "whatsapp_provider_status" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"phone_number_id" text,
	"business_account_id" text,
	"access_token" text,
	"webhook_secret" text,
	"is_mock_allowed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_providers_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"trigger" "automation_trigger" NOT NULL,
	"action" "automation_action" NOT NULL,
	"config" jsonb,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"plan_required" text DEFAULT 'growth' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"status" "return_status" DEFAULT 'REQUESTED' NOT NULL,
	"reason" text NOT NULL,
	"requested_items" jsonb,
	"note" text,
	"handled_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"old_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"delta" integer NOT NULL,
	"source" "stock_adjustment_source" DEFAULT 'manual' NOT NULL,
	"reason" text,
	"order_id" integer,
	"changed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"order_id" integer,
	"idempotency_key" text NOT NULL,
	"provider" text DEFAULT 'paymob' NOT NULL,
	"provider_order_id" text,
	"provider_transaction_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"status" "payment_record_status" DEFAULT 'initiated' NOT NULL,
	"payment_token" text,
	"iframe_src" text,
	"failure_reason" text,
	"paid_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payment_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"provider" text DEFAULT 'paymob' NOT NULL,
	"idempotency_key" text NOT NULL,
	"event_type" text,
	"provider_transaction_id" text,
	"success" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhooks_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "paymob_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"status" "paymob_provider_status" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"api_key_hash" text,
	"integration_id" text,
	"iframe_id" text,
	"hmac_secret" text,
	"is_mock_allowed" text DEFAULT 'false' NOT NULL,
	"last_error_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paymob_providers_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"plan_code" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"provider_reference" text,
	"note" text,
	"issued_at" timestamp,
	"paid_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"domain" text NOT NULL,
	"status" "domain_status" DEFAULT 'PENDING_DNS' NOT NULL,
	"verification_token" text NOT NULL,
	"dns_target" text,
	"verified_at" timestamp,
	"removed_at" timestamp,
	"requested_by" integer,
	"last_checked_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_tenant_id_unique" UNIQUE("tenant_id"),
	CONSTRAINT "custom_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "tracking_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"ga4_measurement_id" text,
	"ga4_enabled" boolean DEFAULT false NOT NULL,
	"meta_pixel_id" text,
	"meta_enabled" boolean DEFAULT false NOT NULL,
	"tiktok_pixel_id" text,
	"tiktok_enabled" boolean DEFAULT false NOT NULL,
	"google_ads_conversion_id" text,
	"google_ads_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "staff_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"invited_email" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"token" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by" integer,
	"accepted_by" integer,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"requested_by" integer,
	"export_type" "export_type" NOT NULL,
	"status" "export_status" DEFAULT 'queued' NOT NULL,
	"date_from" timestamp,
	"date_to" timestamp,
	"row_count" integer,
	"download_token" text,
	"expires_at" timestamp,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "export_jobs_download_token_unique" UNIQUE("download_token")
);
--> statement-breakpoint
CREATE TABLE "tenant_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"actor_id" integer,
	"actor_label" text,
	"event_type" "audit_event_type" NOT NULL,
	"summary" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_code_uses" (
	"id" serial PRIMARY KEY NOT NULL,
	"discount_code_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"customer_id" integer,
	"applied_discount" numeric(10, 2) NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"min_order_amount" numeric(10, 2),
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"platform" text NOT NULL,
	"discount_code_id" integer,
	"commission_type" text NOT NULL,
	"commission_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"tenant_id" integer NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facebook_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"page_id" text NOT NULL,
	"page_name" text,
	"page_access_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "facebook_connections_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "facebook_moderation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"item_id" text NOT NULL,
	"item_type" text NOT NULL,
	"author_name" text,
	"author_id" text,
	"content" text,
	"post_context" text,
	"ai_draft" text,
	"status" "fb_moderation_status" DEFAULT 'pending' NOT NULL,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "facebook_moderation_log_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "billing_transfer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"plan_code" text NOT NULL,
	"amount" integer NOT NULL,
	"reference_number" text NOT NULL,
	"receipt_image_url" text,
	"status" "transfer_request_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_onboarding" ADD CONSTRAINT "merchant_onboarding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_support_notes" ADD CONSTRAINT "tenant_support_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_support_notes" ADD CONSTRAINT "tenant_support_notes_created_by_merchants_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_audit_log" ADD CONSTRAINT "plan_audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_audit_log" ADD CONSTRAINT "plan_audit_log_changed_by_merchants_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_settings" ADD CONSTRAINT "shipping_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_providers" ADD CONSTRAINT "whatsapp_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_cases" ADD CONSTRAINT "return_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_cases" ADD CONSTRAINT "return_cases_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_cases" ADD CONSTRAINT "return_cases_handled_by_merchants_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_changed_by_merchants_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhooks" ADD CONSTRAINT "payment_webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paymob_providers" ADD CONSTRAINT "paymob_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_created_by_merchants_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_requested_by_merchants_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_settings" ADD CONSTRAINT "tracking_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_merchants_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_accepted_by_merchants_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_merchants_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_audit_events" ADD CONSTRAINT "tenant_audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_audit_events" ADD CONSTRAINT "tenant_audit_events_actor_id_merchants_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_uses" ADD CONSTRAINT "discount_code_uses_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_uses" ADD CONSTRAINT "discount_code_uses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_uses" ADD CONSTRAINT "discount_code_uses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_sessions" ADD CONSTRAINT "cart_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facebook_connections" ADD CONSTRAINT "facebook_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facebook_moderation_log" ADD CONSTRAINT "facebook_moderation_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_transfer_requests" ADD CONSTRAINT "billing_transfer_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_transfer_requests" ADD CONSTRAINT "billing_transfer_requests_reviewed_by_merchants_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_products_tenant_status" ON "products" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_products_tenant_featured" ON "products" USING btree ("tenant_id","featured");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant_created_at" ON "orders" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant_status" ON "orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_public_code" ON "orders" USING btree ("public_code");--> statement-breakpoint
CREATE INDEX "idx_cart_sessions_tenant_last_activity" ON "cart_sessions" USING btree ("tenant_id","last_activity_at");