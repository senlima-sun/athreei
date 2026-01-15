CREATE TYPE "public"."rule_scope" AS ENUM('global', 'namespace', 'endpoint');--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE 'skill';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE 'rule';--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"encrypted_content" "bytea" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"scope" "rule_scope" DEFAULT 'global' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"encrypted_content" "bytea" NOT NULL,
	"tags" text[],
	"is_enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "encryption_salt" "bytea";--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rules_account_id" ON "rules" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_rules_name" ON "rules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_rules_priority" ON "rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_rules_scope" ON "rules" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_rules_is_enabled" ON "rules" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_rules_deleted_at" ON "rules" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_skills_account_id" ON "skills" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_skills_name" ON "skills" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_skills_is_enabled" ON "skills" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_skills_deleted_at" ON "skills" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_traces_account_request_unique" ON "traces" USING btree ("account_id","request_id");