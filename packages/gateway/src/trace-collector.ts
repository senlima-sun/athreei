/**
 * Trace Collector
 *
 * Collects tool call traces for monitoring, debugging, and analytics.
 * Traces can be stored locally and/or sent to the Platform.
 */

import type { ToolCallTrace, GatewayEvent, GatewayEventHandler } from "./types.js";
import { log } from "./logger.js";

/**
 * Trace collector configuration
 */
export interface TraceCollectorConfig {
  /** Maximum number of traces to keep in memory */
  maxTraces?: number;
  /** Whether to send traces to Platform API */
  sendToPlatform?: boolean;
  /** Platform API URL */
  platformUrl?: string;
  /** API key for Platform authentication */
  apiKey?: string;
  /** Batch size for sending traces */
  batchSize?: number;
  /** Flush interval in ms */
  flushInterval?: number;
}

const DEFAULT_CONFIG: Required<TraceCollectorConfig> = {
  maxTraces: 1000,
  sendToPlatform: false,
  platformUrl: "https://athreei.com",
  apiKey: "",
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
};

/**
 * Trace statistics
 */
export interface TraceStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDurationMs: number;
  callsByServer: Map<string, number>;
  callsByTool: Map<string, number>;
}

/**
 * Trace Collector for monitoring tool calls
 */
export class TraceCollector {
  private config: Required<TraceCollectorConfig>;
  private traces: ToolCallTrace[] = [];
  private pendingTraces: ToolCallTrace[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private stats: TraceStats;

  constructor(config: TraceCollectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.createEmptyStats();
  }

  private createEmptyStats(): TraceStats {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDurationMs: 0,
      callsByServer: new Map(),
      callsByTool: new Map(),
    };
  }

  /**
   * Create an event handler that can be added to the gateway
   */
  createEventHandler(): GatewayEventHandler {
    return (event: GatewayEvent) => {
      if (event.type === "tool_call") {
        this.addTrace(event.trace);
      }
    };
  }

  /**
   * Add a trace to the collector
   */
  addTrace(trace: ToolCallTrace): void {
    // Add to in-memory traces (with size limit)
    this.traces.push(trace);
    if (this.traces.length > this.config.maxTraces) {
      this.traces.shift(); // Remove oldest
    }

    // Update statistics
    this.updateStats(trace);

    // Add to pending for Platform sync
    if (this.config.sendToPlatform) {
      this.pendingTraces.push(trace);
    }

    log.debug(
      `Trace collected: ${trace.aggregatedToolName} (${trace.durationMs}ms, ${trace.error ? "failed" : "success"})`
    );
  }

  private updateStats(trace: ToolCallTrace): void {
    this.stats.totalCalls++;

    if (trace.error) {
      this.stats.failedCalls++;
    } else {
      this.stats.successfulCalls++;
    }

    // Update average duration
    if (trace.durationMs !== undefined) {
      const totalDuration =
        this.stats.averageDurationMs * (this.stats.totalCalls - 1) +
        trace.durationMs;
      this.stats.averageDurationMs = totalDuration / this.stats.totalCalls;
    }

    // Update calls by server
    const serverCount = this.stats.callsByServer.get(trace.serverName) || 0;
    this.stats.callsByServer.set(trace.serverName, serverCount + 1);

    // Update calls by tool
    const toolCount =
      this.stats.callsByTool.get(trace.aggregatedToolName) || 0;
    this.stats.callsByTool.set(trace.aggregatedToolName, toolCount + 1);
  }

  /**
   * Get all traces
   */
  getTraces(): ToolCallTrace[] {
    return [...this.traces];
  }

  /**
   * Get recent traces
   */
  getRecentTraces(count: number = 10): ToolCallTrace[] {
    return this.traces.slice(-count);
  }

  /**
   * Get traces for a specific server
   */
  getTracesForServer(serverName: string): ToolCallTrace[] {
    return this.traces.filter((t) => t.serverName === serverName);
  }

  /**
   * Get traces for a specific tool
   */
  getTracesForTool(toolName: string): ToolCallTrace[] {
    return this.traces.filter((t) => t.aggregatedToolName === toolName);
  }

  /**
   * Get failed traces
   */
  getFailedTraces(): ToolCallTrace[] {
    return this.traces.filter((t) => t.error !== undefined);
  }

  /**
   * Get statistics
   */
  getStats(): TraceStats {
    return {
      ...this.stats,
      callsByServer: new Map(this.stats.callsByServer),
      callsByTool: new Map(this.stats.callsByTool),
    };
  }

  /**
   * Clear all traces and reset statistics
   */
  clear(): void {
    this.traces = [];
    this.pendingTraces = [];
    this.stats = this.createEmptyStats();
    log.info("Trace collector cleared");
  }

  /**
   * Start periodic flush to Platform
   */
  startPeriodicFlush(): void {
    if (!this.config.sendToPlatform) {
      log.debug("Platform trace sync disabled");
      return;
    }

    if (this.flushTimer) {
      return; // Already running
    }

    log.info(
      `Starting periodic trace flush (every ${this.config.flushInterval / 1000}s)`
    );

    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        log.error("Trace flush failed:", error);
      }
    }, this.config.flushInterval);
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      log.info("Periodic trace flush stopped");
    }
  }

  /**
   * Flush pending traces to Platform
   */
  async flush(): Promise<void> {
    if (!this.config.sendToPlatform || this.pendingTraces.length === 0) {
      return;
    }

    const tracesToSend = this.pendingTraces.splice(0, this.config.batchSize);

    log.debug(`Flushing ${tracesToSend.length} traces to Platform`);

    try {
      const response = await fetch(
        `${this.config.platformUrl}/api/gateway/traces`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ traces: tracesToSend }),
        }
      );

      if (!response.ok) {
        // Put traces back for retry
        this.pendingTraces.unshift(...tracesToSend);
        throw new Error(`Trace flush failed: ${response.status}`);
      }

      log.debug(`Successfully flushed ${tracesToSend.length} traces`);
    } catch (error) {
      // Put traces back for retry
      this.pendingTraces.unshift(...tracesToSend);
      throw error;
    }
  }

  /**
   * Export traces as JSON
   */
  exportJson(): string {
    return JSON.stringify(
      {
        traces: this.traces,
        stats: {
          ...this.stats,
          callsByServer: Object.fromEntries(this.stats.callsByServer),
          callsByTool: Object.fromEntries(this.stats.callsByTool),
        },
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}
