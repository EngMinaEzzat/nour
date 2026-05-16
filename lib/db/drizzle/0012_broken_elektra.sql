ALTER TYPE "public"."audit_event_type" ADD VALUE 'export_completed' BEFORE 'support_note_added';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'export_failed' BEFORE 'support_note_added';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'privacy_request_created';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'customer_pseudonymized';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'customer_data_exported';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'product_deleted';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'variant_stock_changed';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'order_status_changed';