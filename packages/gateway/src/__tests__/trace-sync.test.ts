/**
 * Tests for Trace Sync Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TraceSyncClient, createTraceSyncClient } from "../trace-sync";
import type { ToolCallTrace, NamespaceConfig } from "../types";

// Generate a valid 32-byte test key
function generateTestKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

// Helper to create a mock trace
function createMockTrace(options: Partial<ToolCallTrace> = {}): ToolCallTrace {
  return {
    traceId: options.traceId || crypto.randomUUID(),
    requestId: options.requestId || crypto.randomUUID(),
    aggregatedToolName: options.aggregatedToolName || "browser__screenshot",
    serverName: options.serverName || "browser",
    toolName: options.toolName || "screenshot",
    arguments: options.arguments || { url: "https://example.com" },
    startedAt: options.startedAt || new Date(),
    endedAt: options.endedAt || new Date(),
    durationMs: options.durationMs || 100,
    result: options.result || { success: true },
    error: options.error,
    status: options.status || "success",
  };
}

// Mock namespace config
function createMockNamespaceConfig(): NamespaceConfig {
  return {
    namespaceId: "ns-123",
    namespaceName: "Test Namespace",
    namespaceSlug: "test-namespace",
    endpointId: "ep-456",
    endpointName: "Test Endpoint",
    organizationId: "org-789",
    servers: [
      {
        id: "srv-001",
        name: "browser",
        transport: "stdio",
        command: "browser-mcp",
        status: "active",
      },
    ],
    configVersion: "v1",
  };
}

describe("TraceSyncClient", () => {
  let client: TraceSyncClient;
  let testKey: Uint8Array;

  beforeEach(() => {
    testKey = generateTestKey();
    client = new TraceSyncClient({
      platformUrl: "https://api.test.com",
      apiKey: "test-api-key",
      encryptionKey: testKey,
      encryptionKeyVersion: 1,
      batchSize: 5,
      flushInterval: 1000,
    });
  });

  afterEach(() => {
    client.stopPeriodicFlush();
    client.clear();
  });

  describe("encryption", () => {
    it("reports encryption enabled when key is set", () => {
      expect(client.isEncryptionEnabled()).toBe(true);
    });

    it("reports encryption disabled when key is not set", () => {
      const noKeyClient = new TraceSyncClient({
        platformUrl: "https://api.test.com",
        apiKey: "test-api-key",
      });
      expect(noKeyClient.isEncryptionEnabled()).toBe(false);
    });

    it("can set encryption key", () => {
      const noKeyClient = new TraceSyncClient({
        platformUrl: "https://api.test.com",
        apiKey: "test-api-key",
      });
      expect(noKeyClient.isEncryptionEnabled()).toBe(false);

      noKeyClient.setEncryptionKey(testKey, 2);
      expect(noKeyClient.isEncryptionEnabled()).toBe(true);
    });

    it("throws error for invalid key length", () => {
      const noKeyClient = new TraceSyncClient({
        platformUrl: "https://api.test.com",
        apiKey: "test-api-key",
      });
      const shortKey = new Uint8Array(16);
      crypto.getRandomValues(shortKey);

      expect(() => noKeyClient.setEncryptionKey(shortKey)).toThrow(
        "Encryption key must be 32 bytes"
      );
    });
  });

  describe("addTrace", () => {
    it("adds trace to pending buffer", () => {
      client.addTrace(createMockTrace());
      expect(client.getPendingCount()).toBe(1);
    });

    it("accumulates multiple traces", () => {
      client.addTrace(createMockTrace());
      client.addTrace(createMockTrace());
      client.addTrace(createMockTrace());
      expect(client.getPendingCount()).toBe(3);
    });
  });

  describe("namespace config", () => {
    it("can set namespace config", () => {
      const config = createMockNamespaceConfig();
      // Should not throw
      expect(() => client.setNamespaceConfig(config)).not.toThrow();
    });
  });

  describe("flush", () => {
    it("returns empty result when no pending traces", async () => {
      const result = await client.flush();
      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("skips flush when encryption is not enabled", async () => {
      const noKeyClient = new TraceSyncClient({
        platformUrl: "https://api.test.com",
        apiKey: "test-api-key",
      });
      noKeyClient.addTrace(createMockTrace());

      const result = await noKeyClient.flush();
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Encryption not enabled");
    });

    it("makes API request with correct format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, uploaded: 1, failed: 0 }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      client.setNamespaceConfig(createMockNamespaceConfig());
      client.addTrace(createMockTrace({ serverName: "browser" }));

      await client.flush();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.test.com/api/traces");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-api-key");

      const body = JSON.parse(options.body);
      expect(body.traces).toHaveLength(1);
      expect(body.traces[0].toolName).toBe("screenshot");
      expect(body.traces[0].status).toBe("success");
      expect(body.traces[0].encryptedPayload).toBeDefined();
      expect(body.traces[0].namespaceId).toBe("ns-123");
      expect(body.traces[0].mcpServerId).toBe("srv-001");
      expect(body.traces[0].endpointId).toBe("ep-456");

      globalThis.fetch = originalFetch;
    });

    it("retries on failure by putting traces back", async () => {
      // Mock fetch before creating client to ensure consistent behavior
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        // Create a fresh client for this test
        const freshClient = new TraceSyncClient({
          platformUrl: "https://api.test.com",
          apiKey: "test-api-key",
          encryptionKey: testKey,
          encryptionKeyVersion: 1,
          batchSize: 100, // Large batch to prevent auto-flush
          flushInterval: 1000,
        });

        const countBefore = freshClient.getPendingCount();
        expect(countBefore).toBe(0);

        freshClient.addTrace(createMockTrace());
        expect(freshClient.getPendingCount()).toBe(1);

        const result = await freshClient.flush();

        expect(result.success).toBe(false);
        expect(result.failed).toBe(1);
        // Traces should be put back for retry - same count as after add
        expect(freshClient.getPendingCount()).toBe(1);

        freshClient.clear();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("flushAll", () => {
    it("flushes all pending traces in batches", async () => {
      // Mock fetch first to prevent auto-flush from hitting real network
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, uploaded: 5, failed: 0 }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        // Create a fresh client with larger batch size to control flushing
        const freshClient = new TraceSyncClient({
          platformUrl: "https://api.test.com",
          apiKey: "test-api-key",
          encryptionKey: testKey,
          encryptionKeyVersion: 1,
          batchSize: 5,
          flushInterval: 1000,
        });

        // Add more traces than batch size (auto-flush will trigger at 5, 10)
        for (let i = 0; i < 12; i++) {
          freshClient.addTrace(createMockTrace());
        }

        // After adding 12 traces with batchSize=5, auto-flush fires at 5 and 10
        // So we should have 2 pending (12 - 5 - 5 = 2)
        // And 2 flush calls already made
        expect(freshClient.getPendingCount()).toBe(2);

        const result = await freshClient.flushAll();

        // Should have made 3 total requests (5 auto, 5 auto, 2 flushAll)
        expect(mockFetch).toHaveBeenCalledTimes(3);
        // Total uploaded from all flushes
        expect(freshClient.getPendingCount()).toBe(0);

        freshClient.clear();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("clear", () => {
    it("removes all pending traces", () => {
      client.addTrace(createMockTrace());
      client.addTrace(createMockTrace());
      expect(client.getPendingCount()).toBe(2);

      client.clear();

      expect(client.getPendingCount()).toBe(0);
    });
  });

  describe("periodic flush", () => {
    it("can start and stop periodic flush", () => {
      // Should not throw
      expect(() => client.startPeriodicFlush()).not.toThrow();
      expect(() => client.stopPeriodicFlush()).not.toThrow();
    });
  });
});

describe("createTraceSyncClient", () => {
  it("creates client with minimal config", () => {
    const client = createTraceSyncClient({
      platformUrl: "https://api.test.com",
      apiKey: "test-key",
    });

    expect(client).toBeInstanceOf(TraceSyncClient);
    expect(client.isEncryptionEnabled()).toBe(false);
  });

  it("creates client with encryption key", () => {
    const client = createTraceSyncClient({
      platformUrl: "https://api.test.com",
      apiKey: "test-key",
      encryptionKey: generateTestKey(),
      encryptionKeyVersion: 2,
    });

    expect(client.isEncryptionEnabled()).toBe(true);
  });
});
