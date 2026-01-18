/**
 * Trace Sync Client
 *
 * Handles uploading encrypted traces to the Platform API.
 * This client is used by the TraceCollector to batch and send traces.
 *
 * API Endpoints:
 * - POST /api/traces - Upload traces (from Gateway)
 * - GET /api/traces - List traces (paginated)
 * - GET /api/traces/:uuid - Get single trace
 * - DELETE /api/traces - Delete traces (bulk)
 */

import type {
  EncryptedToolCallTrace,
  ToolCallTrace,
  NamespaceConfig,
} from "./types"
import { log } from "./logger"
import { encryptTracePayload } from "./trace-collector"

/**
 * Trace sync configuration
 */
export interface TraceSyncConfig {
  /** Platform API URL */
  platformUrl: string
  /** API key for authentication */
  apiKey: string
  /** Batch size for sending traces */
  batchSize?: number
  /** Flush interval in ms */
  flushInterval?: number
  /** Encryption key (32 bytes) */
  encryptionKey?: Uint8Array
  /** Key version for encryption */
  encryptionKeyVersion?: number
  /** Namespace config for trace metadata */
  namespaceConfig?: NamespaceConfig
}

const DEFAULT_CONFIG = {
  batchSize: 100,
  flushInterval: 30000, // 30 seconds
}

/**
 * Trace upload item format for API
 */
export interface TraceUploadItem {
  requestId: string
  namespaceId?: string
  mcpServerId?: string
  endpointId?: string
  toolName: string
  encryptedPayload: string // Base64 encoded
  status: "success" | "error"
  durationMs?: number
  createdAt?: string
}

/**
 * API response format
 */
export interface TraceUploadResponse {
  success: boolean
  uploaded: number
  failed: number
  errors?: string[]
}

/**
 * Helper to create combined encrypted payload
 */
function createEncryptedPayload(
  encrypted: EncryptedToolCallTrace["encryptedPayload"]
): string {
  const payload = {
    nonce: encrypted.nonce,
    ciphertext: encrypted.ciphertext,
    keyVersion: encrypted.keyVersion,
    algorithm: encrypted.algorithm,
  }
  return btoa(JSON.stringify(payload))
}

/**
 * Trace Sync Client for uploading traces to Platform
 */
export class TraceSyncClient {
  private config: TraceSyncConfig & typeof DEFAULT_CONFIG
  private pendingTraces: ToolCallTrace[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  /** Track in-flight request IDs to prevent duplicate concurrent uploads */
  private inFlightRequestIds: Set<string> = new Set()

  constructor(config: TraceSyncConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if encryption is enabled
   */
  isEncryptionEnabled(): boolean {
    return (
      this.config.encryptionKey !== undefined &&
      this.config.encryptionKey.length === 32
    )
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
    log.info(`Trace sync encryption key set (version ${version})`)
  }

  /**
   * Update namespace config (for trace metadata)
   */
  setNamespaceConfig(config: NamespaceConfig): void {
    this.config.namespaceConfig = config
    log.info(`Trace sync namespace config updated: ${config.namespaceName}`)
  }

  /**
   * Add a trace to the pending buffer
   */
  addTrace(trace: ToolCallTrace): void {
    this.pendingTraces.push(trace)

    // Auto-flush if buffer exceeds batch size
    if (this.pendingTraces.length >= this.config.batchSize) {
      this.flush().catch((error) => {
        log.error("Auto-flush failed:", error)
      })
    }
  }

  /**
   * Get pending trace count
   */
  getPendingCount(): number {
    return this.pendingTraces.length
  }

  /**
   * Start periodic flush
   */
  startPeriodicFlush(): void {
    if (this.flushTimer) {
      return // Already running
    }

    log.info(`Starting trace sync (every ${this.config.flushInterval / 1000}s)`)

    this.flushTimer = setInterval(async () => {
      try {
        await this.flush()
      } catch (error) {
        log.error("Periodic trace flush failed:", error)
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
      log.info("Trace sync stopped")
    }
  }

  /**
   * Find MCP server ID by server name
   */
  private findMcpServerId(serverName: string): string | undefined {
    if (!this.config.namespaceConfig) {
      return undefined
    }
    const server = this.config.namespaceConfig.servers.find(
      (s) => s.name === serverName || s.id === serverName
    )
    return server?.id
  }

  /**
   * Convert trace to API format
   */
  private traceToUploadItem(trace: ToolCallTrace): TraceUploadItem {
    if (!this.isEncryptionEnabled()) {
      throw new Error(
        "Encryption key not set - cannot sync traces without encryption"
      )
    }

    const encrypted = encryptTracePayload(
      trace,
      this.config.encryptionKey!,
      this.config.encryptionKeyVersion ?? 1
    )

    return {
      requestId: trace.requestId,
      namespaceId: this.config.namespaceConfig?.namespaceId,
      mcpServerId: this.findMcpServerId(trace.serverName),
      endpointId: this.config.namespaceConfig?.endpointId,
      toolName: trace.toolName,
      encryptedPayload: createEncryptedPayload(encrypted.encryptedPayload),
      status: trace.status,
      durationMs: trace.durationMs,
      createdAt: trace.startedAt.toISOString(),
    }
  }

  /**
   * Flush pending traces to Platform
   */
  async flush(): Promise<TraceUploadResponse> {
    if (this.pendingTraces.length === 0) {
      return { success: true, uploaded: 0, failed: 0 }
    }

    if (!this.isEncryptionEnabled()) {
      log.warn("Skipping trace flush - encryption not enabled")
      return {
        success: false,
        uploaded: 0,
        failed: this.pendingTraces.length,
        errors: ["Encryption not enabled"],
      }
    }

    // Filter out traces that are already in-flight to prevent duplicates
    const availableTraces = this.pendingTraces.filter(
      (trace) => !this.inFlightRequestIds.has(trace.requestId)
    )

    if (availableTraces.length === 0) {
      log.debug("All pending traces are currently in-flight, skipping flush")
      return { success: true, uploaded: 0, failed: 0 }
    }

    // Take a batch of available traces
    const tracesToSend = availableTraces.slice(0, this.config.batchSize)

    // Mark these traces as in-flight
    const requestIds = tracesToSend.map((t) => t.requestId)
    for (const id of requestIds) {
      this.inFlightRequestIds.add(id)
    }

    // Remove from pending (they're now in-flight)
    this.pendingTraces = this.pendingTraces.filter(
      (t) => !requestIds.includes(t.requestId)
    )

    log.debug(`Flushing ${tracesToSend.length} traces to Platform`)

    try {
      const uploadItems = tracesToSend.map((trace) =>
        this.traceToUploadItem(trace)
      )

      const response = await fetch(`${this.config.platformUrl}/api/traces`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces: uploadItems }),
      })

      if (!response.ok) {
        // Put traces back for retry and remove from in-flight
        for (const id of requestIds) {
          this.inFlightRequestIds.delete(id)
        }
        this.pendingTraces.unshift(...tracesToSend)
        const errorText = await response.text()
        const message = `Trace upload failed: ${response.status} - ${errorText}`
        log.error("Trace upload failed:", message)
        return {
          success: false,
          uploaded: 0,
          failed: tracesToSend.length,
          errors: [message],
        }
      }

      // Success - remove from in-flight tracking (server has them now)
      for (const id of requestIds) {
        this.inFlightRequestIds.delete(id)
      }

      const result = (await response.json()) as TraceUploadResponse

      log.debug(
        `Successfully uploaded ${result.uploaded} traces (${result.failed} failed)`
      )

      return result
    } catch (error) {
      // Network error - put traces back for retry and remove from in-flight
      for (const id of requestIds) {
        this.inFlightRequestIds.delete(id)
      }
      this.pendingTraces.unshift(...tracesToSend)
      const message = error instanceof Error ? error.message : String(error)
      log.error("Trace upload failed:", message)
      return {
        success: false,
        uploaded: 0,
        failed: tracesToSend.length,
        errors: [message],
      }
    }
  }

  /**
   * Force flush all pending traces
   */
  async flushAll(): Promise<TraceUploadResponse> {
    const results: TraceUploadResponse = {
      success: true,
      uploaded: 0,
      failed: 0,
      errors: [],
    }

    while (this.pendingTraces.length > 0) {
      const result = await this.flush()
      results.uploaded += result.uploaded
      results.failed += result.failed
      if (result.errors) {
        results.errors!.push(...result.errors)
      }
      if (!result.success) {
        results.success = false
        break // Stop on error to avoid infinite loop
      }
    }

    return results
  }

  /**
   * Clear pending traces without sending
   */
  clear(): void {
    const count = this.pendingTraces.length
    this.pendingTraces = []
    this.inFlightRequestIds.clear()
    log.info(`Cleared ${count} pending traces`)
  }
}

/**
 * Create a trace sync client from gateway config
 */
export function createTraceSyncClient(config: {
  platformUrl: string
  apiKey: string
  encryptionKey?: Uint8Array
  encryptionKeyVersion?: number
  batchSize?: number
  flushInterval?: number
}): TraceSyncClient {
  return new TraceSyncClient(config)
}
