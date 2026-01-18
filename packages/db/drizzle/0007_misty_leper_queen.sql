CREATE TABLE "marketplace" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_type" text DEFAULT 'system' NOT NULL,
	"owner_id" text,
	"source_type" text DEFAULT 'internal' NOT NULL,
	"source_url" text,
	"source_repo" text,
	"source_ref" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"auto_update" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "marketplace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "plugin" (
	"id" text PRIMARY KEY NOT NULL,
	"marketplace_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"tags" text DEFAULT '[]' NOT NULL,
	"author" text,
	"homepage" text,
	"repository" text,
	"license" text,
	"icon_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"download_count" text DEFAULT '0' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_component" (
	"id" text PRIMARY KEY NOT NULL,
	"plugin_version_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_version" (
	"id" text PRIMARY KEY NOT NULL,
	"plugin_id" text NOT NULL,
	"version" text NOT NULL,
	"changelog" text,
	"manifest" text NOT NULL,
	"source_hash" text,
	"is_latest" boolean DEFAULT false NOT NULL,
	"published_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"plugin_version_id" text NOT NULL,
	"installed_by" text NOT NULL,
	"scope" text DEFAULT 'organization' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"config" text,
	"encrypted_env" text,
	"env_key_version" integer,
	"installed_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_marketplace_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"restrict_marketplaces" boolean DEFAULT false NOT NULL,
	"allowed_marketplace_ids" text DEFAULT '[]' NOT NULL,
	"restrict_plugins" boolean DEFAULT false NOT NULL,
	"allowed_plugin_ids" text DEFAULT '[]' NOT NULL,
	"default_plugin_ids" text DEFAULT '[]' NOT NULL,
	"require_approval" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plugin" ADD CONSTRAINT "plugin_marketplace_id_marketplace_id_fk" FOREIGN KEY ("marketplace_id") REFERENCES "public"."marketplace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_component" ADD CONSTRAINT "plugin_component_plugin_version_id_plugin_version_id_fk" FOREIGN KEY ("plugin_version_id") REFERENCES "public"."plugin_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_version" ADD CONSTRAINT "plugin_version_plugin_id_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_installation" ADD CONSTRAINT "plugin_installation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_installation" ADD CONSTRAINT "plugin_installation_plugin_id_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_installation" ADD CONSTRAINT "plugin_installation_plugin_version_id_plugin_version_id_fk" FOREIGN KEY ("plugin_version_id") REFERENCES "public"."plugin_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_installation" ADD CONSTRAINT "plugin_installation_installed_by_user_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_marketplace_setting" ADD CONSTRAINT "organization_marketplace_setting_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_marketplace_slug" ON "marketplace" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_marketplace_owner" ON "marketplace" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_public" ON "marketplace" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_plugin_marketplace_slug" ON "plugin" USING btree ("marketplace_id","slug");--> statement-breakpoint
CREATE INDEX "idx_plugin_marketplace" ON "plugin" USING btree ("marketplace_id");--> statement-breakpoint
CREATE INDEX "idx_plugin_category" ON "plugin" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_plugin_featured" ON "plugin" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_plugin_component_version" ON "plugin_component" USING btree ("plugin_version_id");--> statement-breakpoint
CREATE INDEX "idx_plugin_component_type" ON "plugin_component" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_plugin_version_unique" ON "plugin_version" USING btree ("plugin_id","version");--> statement-breakpoint
CREATE INDEX "idx_plugin_version_plugin" ON "plugin_version" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "idx_plugin_version_latest" ON "plugin_version" USING btree ("plugin_id","is_latest");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_plugin_installation_unique" ON "plugin_installation" USING btree ("organization_id","plugin_id","scope");--> statement-breakpoint
CREATE INDEX "idx_plugin_installation_org" ON "plugin_installation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_plugin_installation_plugin" ON "plugin_installation" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "idx_plugin_installation_status" ON "plugin_installation" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_marketplace_setting_org" ON "organization_marketplace_setting" USING btree ("organization_id");