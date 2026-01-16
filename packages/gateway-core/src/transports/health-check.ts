/**
 * Connection Health Checker
 *
 * Monitors MCP connection health by sending periodic ping requests
 * and tracking response latency.
 */

import type { TransportConnection, McpMessage } from "../types/transports.js"

export interface HealthCheckResult {
  healthy: boolean
  latencyMs: number
  lastCheck: Date
  error?: string
  consecutiveFailures: number
}

export interface HealthCheckConfig {
  timeout: number
  retries: number
  retryDelay: number
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  timeout: 5000,
  retries: 1,
  retryDelay: 500,
}

export class ConnectionHealthChecker {
  private results = new Map<string, HealthCheckResult>()
  private config: HealthCheckConfig
  private intervalTimers = new Map<string, Timer>()

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async check(connection: TransportConnection): Promise<HealthCheckResult> {
    const start = Date.now()
    const previousResult = this.results.get(connection.id)
    let lastError: string | undefined

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay)
        )
      }

      try {
        const pingId = `health-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        const responsePromise = new Promise<McpMessage>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Health check timeout"))
          }, this.config.timeout)

          const _originalOnMessage = connection.onMessage
          connection.onMessage((msg: McpMessage) => {
            if (msg.id === pingId) {
              clearTimeout(timeout)
              resolve(msg)
            }
          })
        })

        await connection.send({
          jsonrpc: "2.0",
          id: pingId,
          method: "ping",
        })

        await responsePromise

        const result: HealthCheckResult = {
          healthy: true,
          latencyMs: Date.now() - start,
          lastCheck: new Date(),
          consecutiveFailures: 0,
        }

        this.results.set(connection.id, result)
        return result
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }

    const result: HealthCheckResult = {
      healthy: false,
      latencyMs: Date.now() - start,
      lastCheck: new Date(),
      error: lastError,
      consecutiveFailures: (previousResult?.consecutiveFailures ?? 0) + 1,
    }

    this.results.set(connection.id, result)
    return result
  }

  async checkWithPing(
    connection: TransportConnection
  ): Promise<HealthCheckResult> {
    const start = Date.now()
    const previousResult = this.results.get(connection.id)

    try {
      await connection.send({
        jsonrpc: "2.0",
        id: `health-${Date.now()}`,
        method: "ping",
      })

      const result: HealthCheckResult = {
        healthy: true,
        latencyMs: Date.now() - start,
        lastCheck: new Date(),
        consecutiveFailures: 0,
      }

      this.results.set(connection.id, result)
      return result
    } catch (e) {
      const result: HealthCheckResult = {
        healthy: false,
        latencyMs: Date.now() - start,
        lastCheck: new Date(),
        error: e instanceof Error ? e.message : String(e),
        consecutiveFailures: (previousResult?.consecutiveFailures ?? 0) + 1,
      }

      this.results.set(connection.id, result)
      return result
    }
  }

  startPeriodicCheck(
    connection: TransportConnection,
    intervalMs: number,
    onResult?: (result: HealthCheckResult) => void
  ): void {
    this.stopPeriodicCheck(connection.id)

    const timer = setInterval(async () => {
      const result = await this.checkWithPing(connection)
      onResult?.(result)
    }, intervalMs)

    this.intervalTimers.set(connection.id, timer)
  }

  stopPeriodicCheck(connectionId: string): void {
    const timer = this.intervalTimers.get(connectionId)
    if (timer) {
      clearInterval(timer)
      this.intervalTimers.delete(connectionId)
    }
  }

  stopAllPeriodicChecks(): void {
    for (const timer of this.intervalTimers.values()) {
      clearInterval(timer)
    }
    this.intervalTimers.clear()
  }

  getLastResult(connectionId: string): HealthCheckResult | undefined {
    return this.results.get(connectionId)
  }

  isHealthy(connectionId: string): boolean {
    const result = this.results.get(connectionId)
    return result?.healthy ?? false
  }

  getConsecutiveFailures(connectionId: string): number {
    return this.results.get(connectionId)?.consecutiveFailures ?? 0
  }

  getAllResults(): Map<string, HealthCheckResult> {
    return new Map(this.results)
  }

  clearResult(connectionId: string): void {
    this.results.delete(connectionId)
    this.stopPeriodicCheck(connectionId)
  }

  clearAllResults(): void {
    this.results.clear()
    this.stopAllPeriodicChecks()
  }

  getUnhealthyConnections(): string[] {
    return Array.from(this.results.entries())
      .filter(([_, result]) => !result.healthy)
      .map(([id]) => id)
  }

  getHealthyConnections(): string[] {
    return Array.from(this.results.entries())
      .filter(([_, result]) => result.healthy)
      .map(([id]) => id)
  }

  getAverageLatency(): number {
    const results = Array.from(this.results.values()).filter((r) => r.healthy)
    if (results.length === 0) return 0
    return results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length
  }
}
