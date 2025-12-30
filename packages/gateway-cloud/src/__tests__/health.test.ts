/**
 * Health Check Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import healthRoutes from "../routes/health.js";
import {
  _resetForTesting,
  createSession,
} from "../gateway/session.js";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({})),
}));

describe("Health Check Routes", () => {
  let app: Hono;

  beforeEach(() => {
    _resetForTesting();
    app = new Hono();
    app.route("/health", healthRoutes);
  });

  afterEach(() => {
    _resetForTesting();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);

      const body = await res.json();

      expect(body.status).toBe("ok");
      expect(body.version).toBe("0.1.0");
      expect(body.activeSessions).toBe(0);
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.timestamp).toBeDefined();
    });

    it("should reflect active session count", async () => {
      // Create a session
      await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      const res = await app.request("/health");
      const body = await res.json();

      expect(body.activeSessions).toBe(1);
    });
  });

  describe("GET /health/live", () => {
    it("should return liveness status", async () => {
      const res = await app.request("/health/live");

      expect(res.status).toBe(200);

      const body = await res.json();

      expect(body.status).toBe("alive");
    });
  });

  describe("GET /health/ready", () => {
    it("should return readiness status", async () => {
      const res = await app.request("/health/ready");

      expect(res.status).toBe(200);

      const body = await res.json();

      expect(body.status).toBe("ready");
    });
  });

  describe("GET /health/status", () => {
    it("should return detailed status", async () => {
      const res = await app.request("/health/status");

      expect(res.status).toBe(200);

      const body = await res.json();

      expect(body.status).toBe("ok");
      expect(body.version).toBe("0.1.0");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.memory).toBeDefined();
      expect(body.memory.heapUsed).toBeGreaterThan(0);
      expect(body.memory.heapTotal).toBeGreaterThan(0);
      expect(body.memory.rss).toBeGreaterThan(0);
      expect(body.sessions).toBeDefined();
      expect(body.sessions.count).toBe(0);
      expect(body.sessions.details).toEqual([]);
    });

    it("should include session details", async () => {
      await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      const res = await app.request("/health/status");
      const body = await res.json();

      expect(body.sessions.count).toBe(1);
      expect(body.sessions.details.length).toBe(1);
      expect(body.sessions.details[0].endpointName).toBe("test-endpoint");
      expect(body.sessions.details[0].userId).toBe("user-123");
      expect(body.sessions.details[0].connectedServers).toBe(0);
      expect(body.sessions.details[0].toolCount).toBe(0);
    });
  });
});
