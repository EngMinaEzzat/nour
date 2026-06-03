CREATE INDEX "idx_tenants_slug" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_categories_tenant_id" ON "categories" USING btree ("tenant_id");--> statement-breakpoint

CREATE INDEX "idx_product_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant_status_created_at" ON "orders" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_paymob_id" ON "orders" USING btree ("paymob_order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_bosta_id" ON "orders" USING btree ("bosta_shipment_id");
