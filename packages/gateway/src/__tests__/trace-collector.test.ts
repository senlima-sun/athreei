/**
 * Tests for Trace Collector
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TraceCollector,
  generateRequestId,
  extractTracePayload,
  encryptTracePayload,
  decryptTracePayload,
} from "../trace-collector";
import type { ToolCallTrace, EncryptedToolCallTrace } from "../types";

// Generate a valid 32-byte test key using Node crypto
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
    arguments: options.arguments || {},
    startedAt: options.startedAt || new Date(),
    endedAt: options.endedAt || new Date(),
    durationMs: options.durationMs || 100,
    result: options.result,
    error: options.error,
    status: options.status || "success",
  };
}

describe("TraceCollector", () => {
  let collector: TraceCollector;

  beforeEach(() => {
    collector = new TraceCollector({ maxTraces: 100 });
  });

  describe("addTrace", () => {
    it("adds trace to collection", () => {
      const trace = createMockTrace();
      collector.addTrace(trace);

      const traces = collector.getTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0].traceId).toBe(trace.traceId);
    });

    it("respects maxTraces limit", () => {
      const smallCollector = new TraceCollector({ maxTraces: 3 });

      for (let i = 0; i < 5; i++) {
        smallCollector.addTrace(createMockTrace({ traceId: `trace-${i}` }));
      }

      const traces = smallCollector.getTraces();
      expect(traces).toHaveLength(3);
      // Should keep the most recent traces
      expect(traces[0].traceId).toBe("trace-2");
      expect(traces[2].traceId).toBe("trace-4");
    });
  });

  describe("getRecentTraces", () => {
    it("returns last N traces", () => {
      for (let i = 0; i < 10; i++) {
        collector.addTrace(createMockTrace({ traceId: `trace-${i}` }));
      }

      const recent = collector.getRecentTraces(3);

      expect(recent).toHaveLength(3);
      expect(recent[0].traceId).toBe("trace-7");
      expect(recent[2].traceId).toBe("trace-9");
    });

    it("returns all traces if less than N available", () => {
      collector.addTrace(createMockTrace({ traceId: "only-one" }));

      const recent = collector.getRecentTraces(10);

      expect(recent).toHaveLength(1);
    });
  });

  describe("getTracesForServer", () => {
    it("filters traces by server name", () => {
      collector.addTrace(createMockTrace({ serverName: "browser" }));
      collector.addTrace(createMockTrace({ serverName: "github" }));
      collector.addTrace(createMockTrace({ serverName: "browser" }));

      const browserTraces = collector.getTracesForServer("browser");

      expect(browserTraces).toHaveLength(2);
      expect(browserTraces.every((t) => t.serverName === "browser")).toBe(true);
    });
  });

  describe("getTracesForTool", () => {
    it("filters traces by tool name", () => {
      collector.addTrace(
        createMockTrace({ aggregatedToolName: "browser__screenshot" })
      );
      collector.addTrace(
        createMockTrace({ aggregatedToolName: "browser__click" })
      );
      collector.addTrace(
        createMockTrace({ aggregatedToolName: "browser__screenshot" })
      );

      const screenshotTraces = collector.getTracesForTool("browser__screenshot");

      expect(screenshotTraces).toHaveLength(2);
    });
  });

  describe("getTraceByRequestId", () => {
    it("finds trace by request ID", () => {
      const requestId = crypto.randomUUID();
      collector.addTrace(createMockTrace({ requestId }));
      collector.addTrace(createMockTrace());

      const trace = collector.getTraceByRequestId(requestId);

      expect(trace).toBeDefined();
      expect(trace?.requestId).toBe(requestId);
    });

    it("returns undefined for unknown request ID", () => {
      collector.addTrace(createMockTrace());

      const trace = collector.getTraceByRequestId("unknown-id");

      expect(trace).toBeUndefined();
    });
  });

  describe("getFailedTraces", () => {
    it("returns only traces with error status", () => {
      collector.addTrace(createMockTrace({ status: "success" }));
      collector.addTrace(
        createMockTrace({ status: "error", error: "Connection failed" })
      );
      collector.addTrace(createMockTrace({ status: "success" }));
      collector.addTrace(createMockTrace({ status: "error", error: "Timeout" }));

      const failed = collector.getFailedTraces();

      expect(failed).toHaveLength(2);
      expect(failed[0].error).toBe("Connection failed");
      expect(failed[1].error).toBe("Timeout");
    });
  });

  describe("getStats", () => {
    it("tracks total calls", () => {
      collector.addTrace(createMockTrace());
      collector.addTrace(createMockTrace());
      collector.addTrace(createMockTrace());

      const stats = collector.getStats();

      expect(stats.totalCalls).toBe(3);
    });

    it("tracks successful and failed calls", () => {
      collector.addTrace(createMockTrace({ status: "success" }));
      collector.addTrace(createMockTrace({ status: "success" }));
      collector.addTrace(createMockTrace({ status: "error", error: "Failed" }));

      const stats = collector.getStats();

      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(1);
    });

    it("calculates average duration", () => {
      collector.addTrace(createMockTrace({ durationMs: 100 }));
      collector.addTrace(createMockTrace({ durationMs: 200 }));
      collector.addTrace(createMockTrace({ durationMs: 300 }));

      const stats = collector.getStats();

      expect(stats.averageDurationMs).toBe(200);
    });

    it("tracks calls by server", () => {
      collector.addTrace(createMockTrace({ serverName: "browser" }));
      collector.addTrace(createMockTrace({ serverName: "browser" }));
      collector.addTrace(createMockTrace({ serverName: "github" }));

      const stats = collector.getStats();

      expect(stats.callsByServer.get("browser")).toBe(2);
      expect(stats.callsByServer.get("github")).toBe(1);
    });

    it("tracks calls by tool", () => {
      collector.addTrace(
        createMockTrace({ aggregatedToolName: "browser__screenshot" })
      );
      collector.addTrace(
        createMockTrace({ aggregatedToolName: "browser__screenshot" })
      );
      collector.addTrace(
        createMockTrace({ aggregatedToolName: "browser__click" })
      );

      const stats = collector.getStats();

      expect(stats.callsByTool.get("browser__screenshot")).toBe(2);
      expect(stats.callsByTool.get("browser__click")).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all traces and resets stats", () => {
      collector.addTrace(createMockTrace());
      collector.addTrace(createMockTrace());

      collector.clear();

      expect(collector.getTraces()).toHaveLength(0);
      expect(collector.getStats().totalCalls).toBe(0);
    });
  });

  describe("createEventHandler", () => {
    it("creates handler that adds traces on tool_call events", () => {
      const handler = collector.createEventHandler();
      const trace = createMockTrace();

      handler({ type: "tool_call", trace });

      expect(collector.getTraces()).toHaveLength(1);
    });

    it("ignores non-tool_call events", () => {
      const handler = collector.createEventHandler();

      handler({ type: "config_loaded", config: {} as any });
      handler({ type: "error", message: "test" });

      expect(collector.getTraces()).toHaveLength(0);
    });
  });

  describe("exportJson", () => {
    it("exports traces and stats as JSON", () => {
      collector.addTrace(createMockTrace({ serverName: "browser" }));

      const json = collector.exportJson();
      const parsed = JSON.parse(json);

      expect(parsed.traces).toHaveLength(1);
      expect(parsed.stats.totalCalls).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
    });
  });
});

describe("Encryption utilities", () => {
  let testKey: Uint8Array;

  beforeEach(() => {
    testKey = generateTestKey();
  });

  describe("generateRequestId", () => {
    it("generates a valid UUID", () => {
      const id = generateRequestId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("generates unique IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("extractTracePayload", () => {
    it("extracts request, response, and error from trace", () => {
      const trace = createMockTrace({
        arguments: { url: "https://example.com" },
        result: { status: 200 },
        error: undefined,
      });

      const payload = extractTracePayload(trace);

      expect(payload.request).toEqual(trace.arguments);
      expect(payload.response).toEqual(trace.result);
      expect(payload.error).toBeUndefined();
    });

    it("handles trace with error", () => {
      const trace = createMockTrace({
        arguments: { url: "https://example.com" },
        error: "Connection failed",
        status: "error",
      });

      const payload = extractTracePayload(trace);

      expect(payload.error).toBe("Connection failed");
    });
  });

  describe("encryptTracePayload", () => {
    it("encrypts trace payload and preserves metadata", () => {
      const trace = createMockTrace({
        arguments: { secret: "data" },
        result: { response: "value" },
      });

      const encrypted = encryptTracePayload(trace, testKey, 1);

      expect(encrypted.traceId).toBe(trace.traceId);
      expect(encrypted.requestId).toBe(trace.requestId);
      expect(encrypted.serverName).toBe(trace.serverName);
      expect(encrypted.toolName).toBe(trace.toolName);
      expect(encrypted.aggregatedToolName).toBe(trace.aggregatedToolName);
      expect(encrypted.status).toBe(trace.status);
      expect(encrypted.encryptedPayload).toBeDefined();
      expect(encrypted.encryptedPayload.algorithm).toBe("xchacha20poly1305");
    });

    it("uses specified key version", () => {
      const trace = createMockTrace();
      const encrypted = encryptTracePayload(trace, testKey, 5);

      expect(encrypted.encryptedPayload.keyVersion).toBe(5);
    });

    it("encrypted payload does not contain plaintext", () => {
      const trace = createMockTrace({
        arguments: { sensitiveApiKey: "sk_live_secret123" },
      });

      const encrypted = encryptTracePayload(trace, testKey);

      expect(encrypted.encryptedPayload.ciphertext).not.toContain("sk_live");
      expect(encrypted.encryptedPayload.ciphertext).not.toContain("secret123");
    });
  });

  describe("decryptTracePayload", () => {
    it("decrypts and reconstructs full trace", () => {
      const original = createMockTrace({
        arguments: { url: "https://api.example.com", headers: { auth: "token" } },
        result: { status: 200, body: { success: true } },
      });

      const encrypted = encryptTracePayload(original, testKey);
      const decrypted = decryptTracePayload(encrypted, testKey);

      expect(decrypted.traceId).toBe(original.traceId);
      expect(decrypted.requestId).toBe(original.requestId);
      expect(decrypted.serverName).toBe(original.serverName);
      expect(decrypted.toolName).toBe(original.toolName);
      expect(decrypted.arguments).toEqual(original.arguments);
      expect(decrypted.result).toEqual(original.result);
      expect(decrypted.status).toBe(original.status);
    });

    it("decrypts trace with error", () => {
      const original = createMockTrace({
        error: "Server returned 500",
        status: "error",
      });

      const encrypted = encryptTracePayload(original, testKey);
      const decrypted = decryptTracePayload(encrypted, testKey);

      expect(decrypted.error).toBe(original.error);
      expect(decrypted.status).toBe("error");
    });

    it("throws error for wrong key", () => {
      const original = createMockTrace({ arguments: { secret: "data" } });
      const encrypted = encryptTracePayload(original, testKey);
      const wrongKey = generateTestKey();

      expect(() => decryptTracePayload(encrypted, wrongKey)).toThrow(
        "Decryption failed"
      );
    });
  });
});

describe("TraceCollector with Encryption", () => {
  let collector: TraceCollector;
  let testKey: Uint8Array;

  beforeEach(() => {
    testKey = generateTestKey();
    collector = new TraceCollector({
      maxTraces: 100,
      encryptionKey: testKey,
      encryptionKeyVersion: 1,
    });
  });

  describe("encryption key management", () => {
    it("reports encryption enabled when key is set", () => {
      expect(collector.isEncryptionEnabled()).toBe(true);
    });

    it("reports encryption disabled when key is not set", () => {
      const noKeyCollector = new TraceCollector({ maxTraces: 100 });
      expect(noKeyCollector.isEncryptionEnabled()).toBe(false);
    });

    it("can set encryption key", () => {
      const noKeyCollector = new TraceCollector({ maxTraces: 100 });
      expect(noKeyCollector.isEncryptionEnabled()).toBe(false);

      noKeyCollector.setEncryptionKey(testKey, 2);
      expect(noKeyCollector.isEncryptionEnabled()).toBe(true);
    });

    it("throws error for invalid key length", () => {
      const noKeyCollector = new TraceCollector({ maxTraces: 100 });
      const shortKey = new Uint8Array(16);
      crypto.getRandomValues(shortKey);

      expect(() => noKeyCollector.setEncryptionKey(shortKey)).toThrow(
        "Encryption key must be 32 bytes"
      );
    });

    it("can clear encryption key", () => {
      expect(collector.isEncryptionEnabled()).toBe(true);
      collector.clearEncryptionKey();
      expect(collector.isEncryptionEnabled()).toBe(false);
    });
  });

  describe("exportEncryptedTraces", () => {
    it("exports encrypted traces when encryption is enabled", () => {
      collector.addTrace(createMockTrace({ arguments: { secret: "data1" } }));
      collector.addTrace(createMockTrace({ arguments: { secret: "data2" } }));

      const encrypted = collector.exportEncryptedTraces();

      expect(encrypted).toHaveLength(2);
      expect(encrypted![0].encryptedPayload).toBeDefined();
      expect(encrypted![1].encryptedPayload).toBeDefined();
    });

    it("returns null when encryption is disabled", () => {
      const noKeyCollector = new TraceCollector({ maxTraces: 100 });
      noKeyCollector.addTrace(createMockTrace());

      const encrypted = noKeyCollector.exportEncryptedTraces();

      expect(encrypted).toBeNull();
    });
  });

  describe("importEncryptedTraces", () => {
    it("imports and decrypts encrypted traces", () => {
      const trace1 = createMockTrace({
        arguments: { id: 1 },
        result: { ok: true },
      });
      const trace2 = createMockTrace({
        arguments: { id: 2 },
        error: "Failed",
        status: "error",
      });

      collector.addTrace(trace1);
      collector.addTrace(trace2);

      const encrypted = collector.exportEncryptedTraces()!;

      // Clear and import
      collector.clear();
      expect(collector.getTraces()).toHaveLength(0);

      collector.importEncryptedTraces(encrypted, testKey);

      expect(collector.getTraces()).toHaveLength(2);
      expect(collector.getTraces()[0].arguments).toEqual({ id: 1 });
      expect(collector.getTraces()[1].error).toBe("Failed");
    });
  });
});
