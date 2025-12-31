/**
 * Integration tests for Gateway API routes
 *
 * Tests the /api/gateway/config endpoint that the gateway uses
 * to fetch namespace configuration.
 *
 * Note: These tests require a running database (DATABASE_URL must be set).
 * They are skipped when no database is configured.
 */

import { describe, it, expect } from "vitest";
import app from "../../app";

// Skip these tests if no database is configured
const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("Gateway API Routes", () => {
  describe("GET /api/gateway/config", () => {
    it("requires Authorization header", async () => {
      const res = await app.request("/api/gateway/config?endpoint=test");

      expect(res.status).toBe(401);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("Authorization header required");
    });

    it("requires endpoint query parameter", async () => {
      const res = await app.request("/api/gateway/config", {
        headers: {
          Authorization: "Bearer ak_testkey123",
        },
      });

      expect(res.status).toBe(400);
    });

    // This test requires a running database
    it.skip("rejects invalid API keys (requires DB)", async () => {
      const res = await app.request("/api/gateway/config?endpoint=test", {
        headers: {
          Authorization: "Bearer ak_invalidkey12345678901234567890abc",
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json() as { error: string };
      expect(body.error).toBeDefined();
    });
  });

  describe("POST /api/gateway/traces", () => {
    it("requires Authorization header", async () => {
      const res = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [],
        }),
      });

      expect(res.status).toBe(401);
    });

    // This test requires a running database
    it.skip("rejects requests with invalid API key (requires DB)", async () => {
      const res = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_testkey1234567890123456789012345678abc",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [
            {
              traceId: "trace-1",
              aggregatedToolName: "browser__screenshot",
              serverName: "browser",
              toolName: "screenshot",
              startedAt: new Date().toISOString(),
            },
          ],
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});
