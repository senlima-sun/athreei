CREATE TABLE "cli_auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"callback_port" integer NOT NULL,
	"user_id" text,
	"organization_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cli_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"name" text,
	"last_used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "cli_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DROP TABLE "oauth_session" CASCADE;--> statement-breakpoint
DROP TABLE "oauth_token" CASCADE;--> statement-breakpoint
ALTER TABLE "cli_auth_session" ADD CONSTRAINT "cli_auth_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cli_token" ADD CONSTRAINT "cli_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cli_token" ADD CONSTRAINT "cli_token_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;