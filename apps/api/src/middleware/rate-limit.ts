import type { Context, Next } from "hono"

export interface RateLimitConfig {
  windowMs?: number
  defaultLimit?: number
  cleanupIntervalMs?: number
}

export interface RateLimitInfo {
  current: number
  limit: number
  resetIn: number
  limited: boolean
}

export type RateLimitVariables = {
  rateLimit: RateLimitInfo
}

const requestStore = new Map<string, number[]>()

let lastCleanup = Date.now()

function cleanup(windowMs: number): void {
  const now = Date.now()
  const cutoff = now - windowMs

  for (const [key, timestamps] of requestStore.entries()) {
    const filtered = timestamps.filter((t) => t > cutoff)
    if (filtered.length === 0) {
      requestStore.delete(key)
    } else {
      requestStore.set(key, filtered)
    }
  }
}

export function checkRateLimit(
  keyHash: string,
  limit: number,
  windowMs: number
): RateLimitInfo {
  const now = Date.now()
  const cutoff = now - windowMs

  const timestamps = (requestStore.get(keyHash) || []).filter((t) => t > cutoff)

  const info: RateLimitInfo = {
    current: timestamps.length,
    limit,
    resetIn:
      timestamps.length > 0
        ? (timestamps[0] ?? now) + windowMs - now
        : windowMs,
    limited: timestamps.length >= limit,
  }

  if (!info.limited) {
    timestamps.push(now)
    requestStore.set(keyHash, timestamps)
    info.current = timestamps.length
  }

  return info
}

export function createRateLimiter(
  getKeyAndLimit: (
    c: Context
  ) => Promise<{ keyHash: string; limit: number } | null>,
  config: RateLimitConfig = {}
) {
  const {
    windowMs = 60_000,
    defaultLimit = 60,
    cleanupIntervalMs = 300_000,
  } = config

  return async function rateLimitMiddleware(c: Context, next: Next) {
    const now = Date.now()
    if (now - lastCleanup > cleanupIntervalMs) {
      cleanup(windowMs)
      lastCleanup = now
    }

    const keyInfo = await getKeyAndLimit(c)
    if (!keyInfo) {
      return next()
    }

    const { keyHash, limit } = keyInfo
    const effectiveLimit = limit || defaultLimit

    const info = checkRateLimit(keyHash, effectiveLimit, windowMs)

    c.set("rateLimit", info)

    c.header("X-RateLimit-Limit", String(effectiveLimit))
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, effectiveLimit - info.current))
    )
    c.header(
      "X-RateLimit-Reset",
      String(Math.ceil((now + info.resetIn) / 1000))
    )

    if (info.limited) {
      c.header("Retry-After", String(Math.ceil(info.resetIn / 1000)))
      return c.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${Math.ceil(info.resetIn / 1000)} seconds.`,
          retryAfter: Math.ceil(info.resetIn / 1000),
        },
        429
      )
    }

    return next()
  }
}

export function getRateLimitInfo(c: Context): RateLimitInfo | undefined {
  return c.get("rateLimit") as RateLimitInfo | undefined
}

export function resetRateLimit(keyHash: string): void {
  requestStore.delete(keyHash)
}

export function clearAllRateLimits(): void {
  requestStore.clear()
}
