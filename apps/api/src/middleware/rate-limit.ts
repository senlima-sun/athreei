/**
 * Rate limiting middleware
 *
 * Implements a sliding window rate limiter keyed by API key hash.
 * Tracks request timestamps and rejects requests when the limit is exceeded.
 */

import type { Context, Next } from "hono"

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Default requests per window if not specified per-key (default: 60) */
  defaultLimit?: number
  /** Interval to clean up stale entries in milliseconds (default: 300000 = 5 minutes) */
  cleanupIntervalMs?: number
}

/**
 * Rate limit info attached to context after check
 */
export interface RateLimitInfo {
  /** Current request count in window */
  current: number
  /** Limit for this key */
  limit: number
  /** Time until window resets (ms) */
  resetIn: number
  /** Whether rate limited */
  limited: boolean
}

/**
 * Context variables for rate limiting
 */
export type RateLimitVariables = {
  rateLimit: RateLimitInfo
}

/**
 * Sliding window rate limiter store
 * Map<keyHash, timestamp[]>
 */
const requestStore = new Map<string, number[]>()

/**
 * Track last cleanup time
 */
let lastCleanup = Date.now()

/**
 * Clean up old entries from the store
 */
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

/**
 * Check and update rate limit for a key
 */
export function checkRateLimit(
  keyHash: string,
  limit: number,
  windowMs: number
): RateLimitInfo {
  const now = Date.now()
  const cutoff = now - windowMs

  // Get existing timestamps and filter out expired ones
  const timestamps = (requestStore.get(keyHash) || []).filter((t) => t > cutoff)

  const info: RateLimitInfo = {
    current: timestamps.length,
    limit,
    resetIn: timestamps.length > 0 ? timestamps[0] + windowMs - now : windowMs,
    limited: timestamps.length >= limit,
  }

  if (!info.limited) {
    // Add current request timestamp
    timestamps.push(now)
    requestStore.set(keyHash, timestamps)
    info.current = timestamps.length
  }

  return info
}

/**
 * Create rate limit middleware
 *
 * @param getKeyAndLimit - Function to extract key hash and limit from context.
 *   Should return null if rate limiting should be skipped for this request.
 *   Returns { keyHash, limit } where limit is requests per window.
 */
export function createRateLimiter(
  getKeyAndLimit: (
    c: Context
  ) => Promise<{ keyHash: string; limit: number } | null>,
  config: RateLimitConfig = {}
) {
  const {
    windowMs = 60_000, // 1 minute
    defaultLimit = 60,
    cleanupIntervalMs = 300_000, // 5 minutes
  } = config

  return async function rateLimitMiddleware(c: Context, next: Next) {
    // Periodic cleanup
    const now = Date.now()
    if (now - lastCleanup > cleanupIntervalMs) {
      cleanup(windowMs)
      lastCleanup = now
    }

    // Get key and limit for this request
    const keyInfo = await getKeyAndLimit(c)
    if (!keyInfo) {
      // Skip rate limiting for this request
      return next()
    }

    const { keyHash, limit } = keyInfo
    const effectiveLimit = limit || defaultLimit

    // Check rate limit
    const info = checkRateLimit(keyHash, effectiveLimit, windowMs)

    // Attach info to context
    c.set("rateLimit", info)

    // Set rate limit headers
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

/**
 * Get rate limit info from context
 */
export function getRateLimitInfo(c: Context): RateLimitInfo | undefined {
  return c.get("rateLimit") as RateLimitInfo | undefined
}

/**
 * Reset rate limit for a specific key (for testing)
 */
export function resetRateLimit(keyHash: string): void {
  requestStore.delete(keyHash)
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  requestStore.clear()
}
