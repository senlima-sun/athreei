CREATE TABLE "namespace_hook" (
	"id" text PRIMARY KEY NOT NULL,
	"namespaceId" text NOT NULL,
	"event" text NOT NULL,
	"toolNamePattern" text,
	"handler" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"sourcePluginId" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonatedBy" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banReason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banExpires" timestamp;--> statement-breakpoint
ALTER TABLE "namespace_hook" ADD CONSTRAINT "namespace_hook_namespaceId_namespace_id_fk" FOREIGN KEY ("namespaceId") REFERENCES "public"."namespace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "namespace_hook_namespace_idx" ON "namespace_hook" USING btree ("namespaceId");--> statement-breakpoint
CREATE INDEX "namespace_hook_event_idx" ON "namespace_hook" USING btree ("event");