/**
 * Session Management Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSession,
  getSession,
  touchSession,
  destroySession,
  getAllSessions,
  getSessionCount,
  cleanupIdleSessions,
  startSessionCleanup,
  stopSessionCleanup,
  configureSessionManager,
  _resetForTesting,
  _getSessionsMap,
} from "../gateway/session.js";
import type { GatewaySession } from "../types.js";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({
      tools: [
        {
          name: "test_tool",
          description: "A test tool",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    }),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({})),
}));

describe("Session Management", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  describe("createSession", () => {
    it("should create a new session with unique ID", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^sess_\d+_\w+$/);
      expect(session.endpointName).toBe("test-endpoint");
      expect(session.userId).toBe("user-123");
      expect(session.namespaceId).toBe("ns-456");
      expect(session.isActive).toBe(true);
      expect(session.connectedMcps.size).toBe(0);
      expect(session.aggregatedTools).toEqual([]);
    });

    it("should connect to active MCP servers", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [
          {
            id: "server-1",
            name: "Test Server",
            transport: "sse",
            url: "http://localhost:3000/sse",
            status: "active",
          },
        ],
      });

      expect(session.connectedMcps.size).toBe(1);
      expect(session.aggregatedTools.length).toBeGreaterThan(0);
    });

    it("should skip inactive servers", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [
          {
            id: "server-1",
            name: "Inactive Server",
            transport: "sse",
            url: "http://localhost:3000/sse",
            status: "inactive",
          },
        ],
      });

      expect(session.connectedMcps.size).toBe(0);
    });

    it("should add session to sessions map", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      expect(getSessionCount()).toBe(1);
      expect(getSession(session.id)).toBe(session);
    });
  });

  describe("getSession", () => {
    it("should return session by ID", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      const retrieved = getSession(session.id);
      expect(retrieved).toBe(session);
    });

    it("should return undefined for non-existent session", () => {
      const session = getSession("non-existent-id");
      expect(session).toBeUndefined();
    });
  });

  describe("touchSession", () => {
    it("should update lastActivity timestamp", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      const originalActivity = session.lastActivity.getTime();

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = touchSession(session.id);

      expect(result).toBe(true);
      expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity);
    });

    it("should return false for non-existent session", () => {
      const result = touchSession("non-existent-id");
      expect(result).toBe(false);
    });

    it("should return false for inactive session", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      session.isActive = false;

      const result = touchSession(session.id);
      expect(result).toBe(false);
    });
  });

  describe("destroySession", () => {
    it("should remove session from sessions map", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      expect(getSessionCount()).toBe(1);

      const result = await destroySession(session.id);

      expect(result).toBe(true);
      expect(getSessionCount()).toBe(0);
      expect(getSession(session.id)).toBeUndefined();
    });

    it("should mark session as inactive", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      });

      await destroySession(session.id);

      expect(session.isActive).toBe(false);
    });

    it("should return false for non-existent session", async () => {
      const result = await destroySession("non-existent-id");
      expect(result).toBe(false);
    });

    it("should clear connected MCPs and tools", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [
          {
            id: "server-1",
            name: "Test Server",
            transport: "sse",
            url: "http://localhost:3000/sse",
            status: "active",
          },
        ],
      });

      expect(session.connectedMcps.size).toBe(1);
      expect(session.aggregatedTools.length).toBeGreaterThan(0);

      await destroySession(session.id);

      expect(session.connectedMcps.size).toBe(0);
      expect(session.aggregatedTools.length).toBe(0);
    });
  });

  describe("getAllSessions", () => {
    it("should return all active sessions", async () => {
      await createSession({
        endpointName: "endpoint-1",
        userId: "user-1",
        namespaceId: "ns-1",
        servers: [],
      });

      await createSession({
        endpointName: "endpoint-2",
        userId: "user-2",
        namespaceId: "ns-2",
        servers: [],
      });

      const sessions = getAllSessions();
      expect(sessions.length).toBe(2);
    });

    it("should not return inactive sessions", async () => {
      const session = await createSession({
        endpointName: "endpoint-1",
        userId: "user-1",
        namespaceId: "ns-1",
        servers: [],
      });

      session.isActive = false;

      const sessions = getAllSessions();
      expect(sessions.length).toBe(0);
    });
  });

  describe("getSessionCount", () => {
    it("should return correct count", async () => {
      expect(getSessionCount()).toBe(0);

      await createSession({
        endpointName: "endpoint-1",
        userId: "user-1",
        namespaceId: "ns-1",
        servers: [],
      });

      expect(getSessionCount()).toBe(1);

      await createSession({
        endpointName: "endpoint-2",
        userId: "user-2",
        namespaceId: "ns-2",
        servers: [],
      });

      expect(getSessionCount()).toBe(2);
    });
  });

  describe("cleanupIdleSessions", () => {
    it("should cleanup sessions past idle timeout", async () => {
      // Configure short timeout
      configureSessionManager({ idleTimeout: 100 });

      const session = await createSession({
        endpointName: "endpoint-1",
        userId: "user-1",
        namespaceId: "ns-1",
        servers: [],
      });

      expect(getSessionCount()).toBe(1);

      // Simulate idle time by backdating lastActivity
      session.lastActivity = new Date(Date.now() - 200);

      const cleaned = await cleanupIdleSessions();

      expect(cleaned).toBe(1);
      expect(getSessionCount()).toBe(0);
    });

    it("should not cleanup active sessions", async () => {
      configureSessionManager({ idleTimeout: 60000 });

      await createSession({
        endpointName: "endpoint-1",
        userId: "user-1",
        namespaceId: "ns-1",
        servers: [],
      });

      expect(getSessionCount()).toBe(1);

      const cleaned = await cleanupIdleSessions();

      expect(cleaned).toBe(0);
      expect(getSessionCount()).toBe(1);
    });
  });

  describe("startSessionCleanup / stopSessionCleanup", () => {
    it("should start and stop cleanup interval", () => {
      startSessionCleanup(1000);

      // Should not throw when called again
      startSessionCleanup(1000);

      stopSessionCleanup();

      // Should not throw when called again
      stopSessionCleanup();
    });
  });

  describe("configureSessionManager", () => {
    it("should configure idle timeout", async () => {
      configureSessionManager({ idleTimeout: 50 });

      const session = await createSession({
        endpointName: "endpoint-1",
        userId: "user-1",
        namespaceId: "ns-1",
        servers: [],
      });

      session.lastActivity = new Date(Date.now() - 100);

      const cleaned = await cleanupIdleSessions();
      expect(cleaned).toBe(1);
    });

    it("should configure logger", () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      configureSessionManager({ logger: customLogger });

      // The logger should be used in subsequent operations
      // This is hard to test directly, but at least verify no errors
      expect(() => configureSessionManager({ logger: customLogger })).not.toThrow();
    });
  });
});
