CREATE TYPE "public"."item_type" AS ENUM('permission', 'session', 'audit_log', 'settings');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL,
	"last_seen" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"item_type" "item_type" NOT NULL,
	"encrypted_data" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sync_settings" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"sync_permissions" boolean DEFAULT true NOT NULL,
	"sync_audit_log" boolean DEFAULT true NOT NULL,
	"sync_sessions" boolean DEFAULT true NOT NULL,
	"sync_settings" boolean DEFAULT true NOT NULL,
	"audit_log_retention_days" integer DEFAULT 90 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"account_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"last_sync" timestamp with time zone,
	"sync_cursor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_state_account_id_device_id_pk" PRIMARY KEY("account_id","device_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_items" ADD CONSTRAINT "sync_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_items" ADD CONSTRAINT "sync_items_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_settings" ADD CONSTRAINT "sync_settings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_email" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_devices_account_id" ON "devices" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_sync_items_account_id" ON "sync_items" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_sync_items_device_id" ON "sync_items" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_sync_items_type" ON "sync_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "idx_sync_items_updated_at" ON "sync_items" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_sync_items_deleted_at" ON "sync_items" USING btree ("deleted_at");