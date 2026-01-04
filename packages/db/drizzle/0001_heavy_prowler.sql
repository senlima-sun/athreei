ALTER TABLE "mcp_tool" ADD COLUMN "customDescription" text;--> statement-breakpoint
ALTER TABLE "mcp_tool" ADD COLUMN "customPrompt" text;--> statement-breakpoint
ALTER TABLE "mcp_tool" ADD COLUMN "isEnabled" text DEFAULT 'true' NOT NULL;