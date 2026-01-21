import { LRUCache } from "lru-cache"
import { RATE_LIMIT } from "./constants"

interface ServerRateState {
  count: number
  windowStart: number
  burstUsed: number
}

export interface RateLimiterConfig {
  windowMs?: number
  maxRequests?: number
  burstAllowance?: number
  perServer?: Record<string, { windowMs?: number; maxRequests?: number }>
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
  remaining?: number
}

export class RateLimitExceededError extends Error {
  constructor(
    public readonly serverName: string,
    public readonly retryAfterMs: number
  ) {
    super(`Rate limit exceeded for server '${serverName}'. Retry after ${retryAfterMs}ms`)
    this.name = "RateLimitExceededError"
  }
}

export class RateLimiter {
  private cache: LRUCache<string, ServerRateState>
  private config: Required<Omit<RateLimiterConfig, "perServer">> & Pick<RateLimiterConfig, "perServer">

  constructor(config: RateLimiterConfig = {}) {
    this.config = {
      windowMs: config.windowMs ?? RATE_LIMIT.DEFAULT_WINDOW_MS,
      maxRequests: config.maxRequests ?? RATE_LIMIT.DEFAULT_MAX_REQUESTS,
      burstAllowance: config.burstAllowance ?? RATE_LIMIT.DEFAULT_BURST_ALLOWANCE,
      perServer: config.perServer,
    }
    this.cache = new LRUCache<string, ServerRateState>({
      max: RATE_LIMIT.CACHE_MAX_SERVERS,
    })
  }

  private getServerConfig(serverName: string) {
    const serverConfig = this.config.perServer?.[serverName]
    return {
      windowMs: serverConfig?.windowMs ?? this.config.windowMs,
      maxRequests: serverConfig?.maxRequests ?? this.config.maxRequests,
    }
  }

  tryAcquire(serverName: string): RateLimitResult {
    const now = Date.now()
    const { windowMs, maxRequests } = this.getServerConfig(serverName)
    const effectiveLimit = maxRequests + this.config.burstAllowance

    let state = this.cache.get(serverName)

    if (!state || now - state.windowStart >= windowMs) {
      state = { count: 0, windowStart: now, burstUsed: 0 }
    }

    if (state.count >= effectiveLimit) {
      const retryAfterMs = windowMs - (now - state.windowStart)
      return {
        allowed: false,
        retryAfterMs: Math.max(0, retryAfterMs),
        remaining: 0,
      }
    }

    state.count++
    if (state.count > maxRequests) {
      state.burstUsed++
    }
    this.cache.set(serverName, state)

    return {
      allowed: true,
      remaining: effectiveLimit - state.count,
    }
  }

  getState(serverName: string): ServerRateState | undefined {
    return this.cache.get(serverName)
  }

  reset(serverName?: string): void {
    if (serverName) {
      this.cache.delete(serverName)
    } else {
      this.cache.clear()
    }
  }
}
