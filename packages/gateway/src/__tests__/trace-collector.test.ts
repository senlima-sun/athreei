/**
 * Tests for Trace Collector
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TraceCollector } from "../trace-collector";
import type { ToolCallTrace } from "../types";

// Helper to create a mock trace
function createMockTrace(options: Partial<ToolCallTrace> = {}): ToolCallTrace {
  return {
    traceId: options.traceId || crypto.randomUUID(),
    aggregatedToolName: options.aggregatedToolName || "browser__screenshot",
    serverName: options.serverName || "browser",
    toolName: options.toolName || "screenshot",
    arguments: options.arguments || {},
    startedAt: options.startedAt || new Date(),
    endedAt: options.endedAt || new Date(),
    durationMs: options.durationMs || 100,
    result: options.result,
    error: options.error,
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
        smallCollector.addTrace(
          createMockTrace({ traceId: `trace-${i}` })
        );
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

  describe("getFailedTraces", () => {
    it("returns only traces with errors", () => {
      collector.addTrace(createMockTrace({ error: undefined }));
      collector.addTrace(createMockTrace({ error: "Connection failed" }));
      collector.addTrace(createMockTrace({ error: undefined }));
      collector.addTrace(createMockTrace({ error: "Timeout" }));

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
      collector.addTrace(createMockTrace({ error: undefined }));
      collector.addTrace(createMockTrace({ error: undefined }));
      collector.addTrace(createMockTrace({ error: "Failed" }));

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
