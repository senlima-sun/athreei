/**
 * Environment Access Rate Limiter
 *
 * Specialized rate limiter for the /mcp-servers/:id/env endpoint.
 * Stricter than general API rate limiting since this endpoint returns credentials.
 */

/**
 * Rate limit entry for tracking access
 */
interface RateLimitEntry {
  /** Number of requests in current window */
  count: number
  /** Timestamp when the window resets */
  resetAt: number
  /** Number of rate limit violations (for potential abuse detection) */
  violations: number
}

/**
 * Rate limit check result
 */
export interface EnvRateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Remaining requests in current window */
  remaining: number
  /** Milliseconds until rate limit resets */
  resetIn: number
}

/**
 * Configuration for env access rate limiting
 */
export const ENV_RATE_LIMIT_CONFIG = {
  /** Maximum requests per window */
  maxRequests: 10,
  /** Window duration in milliseconds (1 minute) */
  windowMs: 60_000,
  /** Cleanup interval in milliseconds (5 minutes) */
  cleanupIntervalMs: 300_000,
} as const

/**
 * In-memory rate limiter storage.
 * Key format: "{userId}:{serverId}"
 */
const envAccessLimiter = new Map<string, RateLimitEntry>()

/**
 * Track last cleanup time for periodic maintenance
 */
let lastEnvLimiterCleanup = Date.now()

/**
 * Clean up expired rate limit entries.
 *
 * Called periodically to prevent memory leaks from stale entries.
 * Safe to call frequently as it only runs cleanup when interval has passed.
 */
export function cleanupEnvRateLimiter(): void {
  const now = Date.now()
  for (const [key, entry] of envAccessLimiter.entries()) {
    if (now > entry.resetAt) {
      envAccessLimiter.delete(key)
    }
  }
  lastEnvLimiterCleanup = now
}

/**
 * Check rate limit for environment variable access.
 *
 * @param key - Rate limit key (usually "{userId}:{serverId}")
 * @returns Rate limit check result
 *
 * @example
 * ```typescript
 * const rateLimitKey = `${auth.userId}:${serverId}`
 * const result = checkEnvRateLimit(rateLimitKey)
 *
 * if (!result.allowed) {
 *   c.header("Retry-After", String(Math.ceil(result.resetIn / 1000)))
 *   return c.json({ error: "Rate limit exceeded" }, 429)
 * }
 *
 * c.header("X-RateLimit-Remaining", String(result.remaining))
 * ```
 */
export function checkEnvRateLimit(key: string): EnvRateLimitResult {
  const now = Date.now()
  const config = ENV_RATE_LIMIT_CONFIG

  // Periodic cleanup to prevent memory leaks
  if (now - lastEnvLimiterCleanup > config.cleanupIntervalMs) {
    cleanupEnvRateLimiter()
  }

  const entry = envAccessLimiter.get(key)

  // No entry or expired window - create new entry
  if (!entry || now > entry.resetAt) {
    envAccessLimiter.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
      violations: entry?.violations ?? 0,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    entry.violations++
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  }
}

/**
 * Get the current violation count for a key.
 *
 * Useful for detecting potential abuse patterns.
 *
 * @param key - Rate limit key
 * @returns Number of violations, or 0 if no entry exists
 */
export function getEnvRateLimitViolations(key: string): number {
  return envAccessLimiter.get(key)?.violations ?? 0
}

/**
 * Reset rate limit for a specific key.
 *
 * Useful for testing or manual intervention.
 *
 * @param key - Rate limit key to reset
 */
export function resetEnvRateLimit(key: string): void {
  envAccessLimiter.delete(key)
}

/**
 * Clear all rate limit entries.
 *
 * Useful for testing or server restart cleanup.
 */
export function clearAllEnvRateLimits(): void {
  envAccessLimiter.clear()
  lastEnvLimiterCleanup = Date.now()
}

/**
 * Set rate limit headers on a response.
 *
 * @param c - Hono context
 * @param result - Rate limit check result
 *
 * @example
 * ```typescript
 * const result = checkEnvRateLimit(key)
 * setEnvRateLimitHeaders(c, result)
 * ```
 */
export function setEnvRateLimitHeaders(
  c: import("hono").Context,
  result: EnvRateLimitResult
): void {
  const config = ENV_RATE_LIMIT_CONFIG
  c.header("X-RateLimit-Limit", String(config.maxRequests))
  c.header("X-RateLimit-Remaining", String(result.remaining))
  c.header(
    "X-RateLimit-Reset",
    String(Math.ceil((Date.now() + result.resetIn) / 1000))
  )

  if (!result.allowed) {
    c.header("Retry-After", String(Math.ceil(result.resetIn / 1000)))
  }
}
