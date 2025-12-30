-- Add unique constraint on (account_id, request_id) to prevent duplicate traces
-- This ensures idempotent trace uploads and prevents retry-induced duplications
CREATE UNIQUE INDEX "idx_traces_account_request_unique" ON "traces" USING btree ("account_id", "request_id");
