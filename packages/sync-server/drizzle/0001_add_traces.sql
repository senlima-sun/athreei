-- Add traces table for storing encrypted tool call traces from Gateway
CREATE TYPE "public"."trace_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TABLE "traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"namespace_id" uuid,
	"mcp_server_id" uuid,
	"endpoint_id" uuid,
	"tool_name" text NOT NULL,
	"request_id" uuid NOT NULL,
	"encrypted_payload" bytea NOT NULL,
	"status" "trace_status" NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_traces_account_id" ON "traces" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_traces_namespace_id" ON "traces" USING btree ("namespace_id");--> statement-breakpoint
CREATE INDEX "idx_traces_mcp_server_id" ON "traces" USING btree ("mcp_server_id");--> statement-breakpoint
CREATE INDEX "idx_traces_endpoint_id" ON "traces" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_traces_tool_name" ON "traces" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "idx_traces_status" ON "traces" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_traces_created_at" ON "traces" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_traces_request_id" ON "traces" USING btree ("request_id");
