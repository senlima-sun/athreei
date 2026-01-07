/**
 * Trace Recorder Service
 *
 * Records tool call traces and sends them to the Platform API.
 * Uses buffered writes with automatic flushing for efficiency.
 */

import type { Logger } from "@athreei/gateway-core"

// =============================================================================
// Types
// =============================================================================

interface TraceData {
  traceId: string
  aggregatedToolName: string
  serverName: string
  toolName: string
  arguments?: unknown
  result?: unknown
  error?: string
  startedAt: string
  endedAt?: string
  durationMs?: number
}

// =============================================================================
// TraceRecorder Class
// =============================================================================

export class TraceRecorder {
  private platformUrl: string
  private apiKey: string
  private buffer: TraceData[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private logger: Logger

  private readonly FLUSH_INTERVAL = 5000
  private readonly MAX_BUFFER = 100

  constructor(platformUrl: string, apiKey: string, logger: Logger) {
    this.platformUrl = platformUrl
    this.apiKey = apiKey
    this.logger = logger
  }

  /**
   * Record a tool call trace
   */
  record(
    data: Omit<TraceData, "traceId" | "startedAt" | "endedAt" | "durationMs">,
    startTime: number,
    endTime: number
  ): void {
    const trace: TraceData = {
      ...data,
      traceId: crypto.randomUUID(),
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      durationMs: endTime - startTime,
    }

    this.buffer.push(trace)

    if (this.buffer.length >= this.MAX_BUFFER) {
      this.flush()
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL)
    }
  }

  /**
   * Flush buffered traces to the Platform API
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.buffer.length === 0) {
      return
    }

    const traces = [...this.buffer]
    this.buffer = []

    try {
      const res = await fetch(`${this.platformUrl}/api/gateway/traces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ traces }),
      })

      if (!res.ok) {
        this.logger.warn(`Trace upload failed: ${res.status}`)
      } else {
        this.logger.debug(`Flushed ${traces.length} traces`)
      }
    } catch (err) {
      this.logger.warn(
        `Trace upload error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

// =============================================================================
// Recorder Factory
// =============================================================================

const recorders = new Map<string, TraceRecorder>()

/**
 * Get or create a trace recorder for the given API key
 */
export function getTraceRecorder(
  apiKey: string,
  platformUrl: string,
  logger: Logger
): TraceRecorder {
  if (!recorders.has(apiKey)) {
    recorders.set(apiKey, new TraceRecorder(platformUrl, apiKey, logger))
  }
  return recorders.get(apiKey)!
}

/**
 * Flush all recorders and clear the cache (for shutdown)
 */
export async function flushAllRecorders(): Promise<void> {
  const flushPromises = Array.from(recorders.values()).map((r) => r.flush())
  await Promise.all(flushPromises)
  recorders.clear()
}
