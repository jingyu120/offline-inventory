CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "check_in_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"rep_id" text NOT NULL,
	"check_in_time" bigint NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"product_name" text NOT NULL,
	"street_price" double precision NOT NULL,
	"photo_url" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "currency_exchange_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"currency" text NOT NULL,
	"rate_to_kyat" double precision NOT NULL,
	"pushed_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_quotas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_visits" integer DEFAULT 0 NOT NULL,
	"target_phone" integer DEFAULT 0 NOT NULL,
	"target_viber" integer DEFAULT 0 NOT NULL,
	"effective_from" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" double precision NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"response_body" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction_items" (
	"id" text PRIMARY KEY NOT NULL,
	"interaction_log_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_at_sale" double precision NOT NULL,
	"interest_level" text,
	"unit_price" double precision,
	"selected_currency" text DEFAULT 'MMK' NOT NULL,
	"selected_unit" text DEFAULT 'PCS' NOT NULL,
	"stock_condition" text DEFAULT 'GOOD' NOT NULL,
	"pending_allocation_count" integer DEFAULT 0 NOT NULL,
	"fulfillment_status" text DEFAULT 'PENDING_FULFILLMENT' NOT NULL,
	"compliance_status" text DEFAULT 'APPROVED' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "interaction_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"rep_id" text NOT NULL,
	"project_id" text,
	"type" text NOT NULL,
	"commercial_status" text NOT NULL,
	"notes" text NOT NULL,
	"next_follow_up_date" bigint,
	"viber_screenshot_url" text,
	"created_at_local" bigint NOT NULL,
	"synced_at_server" bigint,
	"is_offline_entry" boolean DEFAULT false NOT NULL,
	"device_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint,
	"ai_verification_status" text,
	"ai_verification_notes" text
);
--> statement-breakpoint
CREATE TABLE "item_stocks" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"pending_allocation_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"unit_price" double precision NOT NULL,
	"category" text NOT NULL,
	"brand_id" text,
	"thickness" text,
	"weight" text,
	"unit_type" text DEFAULT 'PCS' NOT NULL,
	"conversion_factor" double precision DEFAULT 1 NOT NULL,
	"color" text,
	"material_sub_type" text,
	"hardware_finish" text,
	"is_in_deficit" boolean DEFAULT false NOT NULL,
	"base_wholesale_price" double precision,
	"base_currency" text,
	"volume_discount_brackets" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "pending_inventory_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"item_id" text,
	"location_id" text NOT NULL,
	"quantity_delta" integer,
	"sku" text,
	"name" text,
	"unit_price" double precision,
	"category" text,
	"submitted_by" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planned_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"rep_id" text NOT NULL,
	"date" text NOT NULL,
	"shop_ids" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"rep_id" text NOT NULL,
	"points_added" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"predicted_ltv" double precision DEFAULT 0 NOT NULL,
	"churn_risk" double precision DEFAULT 0 NOT NULL,
	"stockout_risk" double precision DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_book_items" (
	"id" text PRIMARY KEY NOT NULL,
	"price_book_id" text NOT NULL,
	"item_id" text NOT NULL,
	"price" double precision NOT NULL,
	"currency" text DEFAULT 'MMK' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_books" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "recommended_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"confidence" double precision DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"division" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "rep_kpis" (
	"id" text PRIMARY KEY NOT NULL,
	"rep_id" text NOT NULL,
	"date" text NOT NULL,
	"sales_volume" double precision DEFAULT 0 NOT NULL,
	"sales_target" double precision DEFAULT 0 NOT NULL,
	"visits_count" integer DEFAULT 0 NOT NULL,
	"visits_target" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "rep_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"rep_id" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"badges" text DEFAULT '[]' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"region_id" text NOT NULL,
	"assigned_rep_id" text,
	"lifetime_value" double precision DEFAULT 0 NOT NULL,
	"sentiment_trend" text DEFAULT 'STABLE' NOT NULL,
	"price_book_id" text,
	"price_tier" text DEFAULT 'Retailer' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"location_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "stock_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "sync_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"records_pulled" integer DEFAULT 0 NOT NULL,
	"records_pushed" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"synced_at_server" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'sales' NOT NULL,
	"region_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "brands_name_idx" ON "brands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "check_in_logs_shop_id_idx" ON "check_in_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "check_in_logs_rep_id_idx" ON "check_in_logs" USING btree ("rep_id");--> statement-breakpoint
CREATE INDEX "contacts_shop_id_idx" ON "contacts" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "daily_quotas_user_id_idx" ON "daily_quotas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interaction_items_log_id_idx" ON "interaction_items" USING btree ("interaction_log_id");--> statement-breakpoint
CREATE INDEX "interaction_items_item_id_idx" ON "interaction_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "interaction_logs_shop_id_idx" ON "interaction_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "interaction_logs_rep_id_idx" ON "interaction_logs" USING btree ("rep_id");--> statement-breakpoint
CREATE INDEX "item_stocks_item_id_idx" ON "item_stocks" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "items_sku_idx" ON "items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "planned_routes_rep_id_idx" ON "planned_routes" USING btree ("rep_id");--> statement-breakpoint
CREATE INDEX "points_logs_rep_id_idx" ON "points_logs" USING btree ("rep_id");--> statement-breakpoint
CREATE INDEX "prediction_logs_shop_id_idx" ON "prediction_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "price_book_items_book_id_idx" ON "price_book_items" USING btree ("price_book_id");--> statement-breakpoint
CREATE INDEX "price_book_items_item_id_idx" ON "price_book_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "price_books_region_id_idx" ON "price_books" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "projects_name_idx" ON "projects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "recommended_orders_shop_id_idx" ON "recommended_orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "recommended_orders_item_id_idx" ON "recommended_orders" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "regions_name_idx" ON "regions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rep_kpis_rep_id_idx" ON "rep_kpis" USING btree ("rep_id");--> statement-breakpoint
CREATE INDEX "rep_scores_rep_id_idx" ON "rep_scores" USING btree ("rep_id");--> statement-breakpoint
CREATE INDEX "shops_name_idx" ON "shops" USING btree ("name");--> statement-breakpoint
CREATE INDEX "shops_region_id_idx" ON "shops" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "shops_assigned_rep_id_idx" ON "shops" USING btree ("assigned_rep_id");--> statement-breakpoint
CREATE INDEX "stock_balances_item_id_idx" ON "stock_balances" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "stock_balances_location_id_idx" ON "stock_balances" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "stock_locations_name_idx" ON "stock_locations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");