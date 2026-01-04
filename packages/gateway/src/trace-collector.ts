/**
 * Trace Collector
 *
 * Collects tool call traces for monitoring, debugging, and analytics.
 * Traces can be stored locally and/or sent to the Platform with E2E encryption.
 *
 * Encryption:
 * - Uses XChaCha20-Poly1305 for authenticated encryption
 * - User's encryption key derived from password (Argon2)
 * - Platform never sees plaintext traces (E2E encrypted)
 */

import type {
  ToolCallTrace,
  EncryptedToolCallTrace,
  GatewayEvent,
  GatewayEventHandler,
} from "./types.js"
import { log } from "./logger.js"
import {
  encryptTrace,
  decryptTrace,
  type TracePayload,
  type EncryptedTrace,
} from "@athreei/shared"

/**
 * Trace collector configuration
 */
export interface TraceCollectorConfig {
  /** Maximum number of traces to keep in memory */
  maxTraces?: number
  /** Whether to send traces to Platform API */
  sendToPlatform?: boolean
  /** Platform API URL */
  platformUrl?: string
  /** API key for Platform authentication */
  apiKey?: string
  /** Batch size for sending traces */
  batchSize?: number
  /** Flush interval in ms */
  flushInterval?: number
  /** Encryption key for E2E encryption (32 bytes) */
  encryptionKey?: Uint8Array
  /** Key version for encryption */
  encryptionKeyVersion?: number
}

const DEFAULT_CONFIG: Required<TraceCollectorConfig> = {
  maxTraces: 1000,
  sendToPlatform: false,
  platformUrl: "https://athreei.com",
  apiKey: "",
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  encryptionKey: new Uint8Array(0),
  encryptionKeyVersion: 1,
}

/**
 * Trace statistics
 */
export interface TraceStats {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageDurationMs: number
  callsByServer: Map<string, number>
  callsByTool: Map<string, number>
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Extract the payload that should be encrypted from a trace
 */
export function extractTracePayload(trace: ToolCallTrace): TracePayload {
  return {
    request: trace.arguments,
    response: trace.result,
    error: trace.error,
  }
}

/**
 * Encrypt a trace's sensitive payload
 *
 * @param trace - The full trace object
 * @param key - 256-bit encryption key
 * @param keyVersion - Key version for rotation tracking
 * @returns Encrypted trace with encrypted payload
 */
export function encryptTracePayload(
  trace: ToolCallTrace,
  key: Uint8Array,
  keyVersion: number = 1
): EncryptedToolCallTrace {
  const payload = extractTracePayload(trace)
  const encrypted = encryptTrace(payload, key, keyVersion)

  return {
    traceId: trace.traceId,
    requestId: trace.requestId,
    aggregatedToolName: trace.aggregatedToolName,
    serverName: trace.serverName,
    toolName: trace.toolName,
    startedAt: trace.startedAt,
    endedAt: trace.endedAt,
    durationMs: trace.durationMs,
    status: trace.status,
    encryptedPayload: {
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext,
      keyVersion: encrypted.keyVersion,
      algorithm: encrypted.algorithm,
    },
  }
}

/**
 * Decrypt a trace's encrypted payload and reconstruct the full trace
 *
 * @param encryptedTrace - The encrypted trace
 * @param key - 256-bit decryption key
 * @returns Full trace with decrypted payload
 */
export function decryptTracePayload(
  encryptedTrace: EncryptedToolCallTrace,
  key: Uint8Array
): ToolCallTrace {
  const encrypted: EncryptedTrace = {
    nonce: encryptedTrace.encryptedPayload.nonce,
    ciphertext: encryptedTrace.encryptedPayload.ciphertext,
    keyVersion: encryptedTrace.encryptedPayload.keyVersion,
    algorithm: encryptedTrace.encryptedPayload.algorithm,
  }

  const payload = decryptTrace(encrypted, key)

  return {
    traceId: encryptedTrace.traceId,
    requestId: encryptedTrace.requestId,
    aggregatedToolName: encryptedTrace.aggregatedToolName,
    serverName: encryptedTrace.serverName,
    toolName: encryptedTrace.toolName,
    arguments: payload.request,
    result: payload.response,
    error: payload.error,
    startedAt: encryptedTrace.startedAt,
    endedAt: encryptedTrace.endedAt,
    durationMs: encryptedTrace.durationMs,
    status: encryptedTrace.status,
  }
}

/**
 * Trace Collector for monitoring tool calls
 */
export class TraceCollector {
  private config: Required<TraceCollectorConfig>
  private traces: ToolCallTrace[] = []
  private pendingTraces: ToolCallTrace[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private stats: TraceStats

  constructor(config: TraceCollectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.stats = this.createEmptyStats()
  }

  private createEmptyStats(): TraceStats {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDurationMs: 0,
      callsByServer: new Map(),
      callsByTool: new Map(),
    }
  }

  /**
   * Check if encryption is enabled
   */
  isEncryptionEnabled(): boolean {
    return this.config.encryptionKey.length === 32
  }

  /**
   * Set the encryption key
   */
  setEncryptionKey(key: Uint8Array, version: number = 1): void {
    if (key.length !== 32) {
      throw new Error("Encryption key must be 32 bytes (256 bits)")
    }
    this.config.encryptionKey = key
    this.config.encryptionKeyVersion = version
    log.info(`Encryption key set (version ${version})`)
  }

  /**
   * Clear the encryption key
   */
  clearEncryptionKey(): void {
    this.config.encryptionKey = new Uint8Array(0)
    this.config.encryptionKeyVersion = 1
    log.info("Encryption key cleared")
  }

  /**
   * Create an event handler that can be added to the gateway
   */
  createEventHandler(): GatewayEventHandler {
    return (event: GatewayEvent) => {
      if (event.type === "tool_call") {
        this.addTrace(event.trace)
      }
    }
  }

  /**
   * Add a trace to the collector
   */
  addTrace(trace: ToolCallTrace): void {
    // Add to in-memory traces (with size limit)
    this.traces.push(trace)
    if (this.traces.length > this.config.maxTraces) {
      this.traces.shift() // Remove oldest
    }

    // Update statistics
    this.updateStats(trace)

    // Add to pending for Platform sync
    if (this.config.sendToPlatform) {
      this.pendingTraces.push(trace)
    }

    log.debug(
      `Trace collected: ${trace.aggregatedToolName} (${trace.durationMs}ms, ${trace.status})`
    )
  }

  private updateStats(trace: ToolCallTrace): void {
    this.stats.totalCalls++

    if (trace.status === "error") {
      this.stats.failedCalls++
    } else {
      this.stats.successfulCalls++
    }

    // Update average duration
    if (trace.durationMs !== undefined) {
      const totalDuration =
        this.stats.averageDurationMs * (this.stats.totalCalls - 1) +
        trace.durationMs
      this.stats.averageDurationMs = totalDuration / this.stats.totalCalls
    }

    // Update calls by server
    const serverCount = this.stats.callsByServer.get(trace.serverName) || 0
    this.stats.callsByServer.set(trace.serverName, serverCount + 1)

    // Update calls by tool
    const toolCount = this.stats.callsByTool.get(trace.aggregatedToolName) || 0
    this.stats.callsByTool.set(trace.aggregatedToolName, toolCount + 1)
  }

  /**
   * Get all traces
   */
  getTraces(): ToolCallTrace[] {
    return [...this.traces]
  }

  /**
   * Get recent traces
   */
  getRecentTraces(count: number = 10): ToolCallTrace[] {
    return this.traces.slice(-count)
  }

  /**
   * Get traces for a specific server
   */
  getTracesForServer(serverName: string): ToolCallTrace[] {
    return this.traces.filter((t) => t.serverName === serverName)
  }

  /**
   * Get traces for a specific tool
   */
  getTracesForTool(toolName: string): ToolCallTrace[] {
    return this.traces.filter((t) => t.aggregatedToolName === toolName)
  }

  /**
   * Get traces by request ID
   */
  getTraceByRequestId(requestId: string): ToolCallTrace | undefined {
    return this.traces.find((t) => t.requestId === requestId)
  }

  /**
   * Get failed traces
   */
  getFailedTraces(): ToolCallTrace[] {
    return this.traces.filter((t) => t.status === "error")
  }

  /**
   * Get statistics
   */
  getStats(): TraceStats {
    return {
      ...this.stats,
      callsByServer: new Map(this.stats.callsByServer),
      callsByTool: new Map(this.stats.callsByTool),
    }
  }

  /**
   * Clear all traces and reset statistics
   */
  clear(): void {
    this.traces = []
    this.pendingTraces = []
    this.stats = this.createEmptyStats()
    log.info("Trace collector cleared")
  }

  /**
   * Start periodic flush to Platform
   */
  startPeriodicFlush(): void {
    if (!this.config.sendToPlatform) {
      log.debug("Platform trace sync disabled")
      return
    }

    if (this.flushTimer) {
      return // Already running
    }

    log.info(
      `Starting periodic trace flush (every ${this.config.flushInterval / 1000}s)`
    )

    this.flushTimer = setInterval(async () => {
      try {
        await this.flush()
      } catch (error) {
        log.error("Trace flush failed:", error)
      }
    }, this.config.flushInterval)
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
      log.info("Periodic trace flush stopped")
    }
  }

  /**
   * Encrypt traces for sending to Platform
   * Returns encrypted traces if encryption key is set, otherwise returns null
   */
  private encryptTracesForSync(
    traces: ToolCallTrace[]
  ): EncryptedToolCallTrace[] | null {
    if (!this.isEncryptionEnabled()) {
      return null
    }

    return traces.map((trace) =>
      encryptTracePayload(
        trace,
        this.config.encryptionKey,
        this.config.encryptionKeyVersion
      )
    )
  }

  /**
   * Flush pending traces to Platform
   */
  async flush(): Promise<void> {
    if (!this.config.sendToPlatform || this.pendingTraces.length === 0) {
      return
    }

    const tracesToSend = this.pendingTraces.splice(0, this.config.batchSize)

    log.debug(`Flushing ${tracesToSend.length} traces to Platform`)

    // Encrypt traces if encryption is enabled
    const encryptedTraces = this.encryptTracesForSync(tracesToSend)

    try {
      const response = await fetch(
        `${this.config.platformUrl}/api/gateway/traces`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            traces: encryptedTraces || tracesToSend,
            encrypted: encryptedTraces !== null,
          }),
        }
      )

      if (!response.ok) {
        // Put traces back for retry
        this.pendingTraces.unshift(...tracesToSend)
        throw new Error(`Trace flush failed: ${response.status}`)
      }

      log.debug(
        `Successfully flushed ${tracesToSend.length} traces (encrypted: ${encryptedTraces !== null})`
      )
    } catch (error) {
      // Put traces back for retry
      this.pendingTraces.unshift(...tracesToSend)
      throw error
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
    )
  }

  /**
   * Export encrypted traces for manual sync
   * Returns null if encryption is not enabled
   */
  exportEncryptedTraces(): EncryptedToolCallTrace[] | null {
    if (!this.isEncryptionEnabled()) {
      log.warn("Encryption not enabled, cannot export encrypted traces")
      return null
    }

    return this.traces.map((trace) =>
      encryptTracePayload(
        trace,
        this.config.encryptionKey,
        this.config.encryptionKeyVersion
      )
    )
  }

  /**
   * Import and decrypt traces
   * Useful for restoring traces from encrypted backup
   */
  importEncryptedTraces(
    encryptedTraces: EncryptedToolCallTrace[],
    key: Uint8Array
  ): void {
    for (const encrypted of encryptedTraces) {
      const trace = decryptTracePayload(encrypted, key)
      this.addTrace(trace)
    }
    log.info(`Imported ${encryptedTraces.length} encrypted traces`)
  }
}

// Re-export encryption utilities for convenience
export { encryptTrace, decryptTrace } from "@athreei/shared"
export type { TracePayload, EncryptedTrace } from "@athreei/shared"
