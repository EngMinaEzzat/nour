ALTER TABLE "orders" DROP CONSTRAINT "orders_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_records" DROP CONSTRAINT "payment_records_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_records" DROP CONSTRAINT "payment_records_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_webhooks" DROP CONSTRAINT "payment_webhooks_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhooks" ADD CONSTRAINT "payment_webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;