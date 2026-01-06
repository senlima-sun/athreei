/**
 * OAuth-specific rate limiting middleware
 *
 * Implements different rate limits for OAuth endpoints:
 * - /connect: 10 req/min per user (initiating flows is expensive)
 * - /callback: 20 req/min per IP (callbacks from OAuth providers)
 * - /token: 60 req/min per user (gateway may poll frequently)
 * - /connections: 30 req/min per user
 */

import type { Context, Next } from "hono"
import { createRateLimiter, type RateLimitConfig } from "./rate-limit"
import { getAuthContext } from "./auth"

/**
 * OAuth rate limit configurations
 */
export const OAUTH_RATE_LIMITS = {
  connect: { limit: 10, windowMs: 60_000 }, // 10 req/min
  callback: { limit: 20, windowMs: 60_000 }, // 20 req/min
  token: { limit: 60, windowMs: 60_000 }, // 60 req/min
  connections: { limit: 30, windowMs: 60_000 }, // 30 req/min
} as const

/**
 * Log rate limit hit for debugging
 */
function logRateLimitHit(
  endpoint: string,
  key: string,
  limit: number,
  resetIn: number
): void {
  console.warn(
    `[oauth-rate-limit] Rate limit hit: endpoint=${endpoint}, key=${key.substring(0, 8)}..., limit=${limit}, resetIn=${resetIn}ms`
  )
}

/**
 * Get client IP from request
 * Handles X-Forwarded-For for proxied requests
 */
function getClientIp(c: Context): string {
  // Check common proxy headers
  const forwarded = c.req.header("x-forwarded-for")
  if (forwarded) {
    // Take the first IP (original client)
    return forwarded.split(",")[0].trim()
  }

  const realIp = c.req.header("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback to connection info (may not be available in all environments)
  // In production behind a proxy, this would be the proxy IP
  return "unknown"
}

/**
 * Create OAuth connect rate limiter (10 req/min per user)
 * Used for initiating OAuth flows which are expensive operations
 */
export function createConnectRateLimiter(config?: RateLimitConfig) {
  const { limit, windowMs } = OAUTH_RATE_LIMITS.connect

  return createRateLimiter(
    async (c: Context) => {
      try {
        const auth = getAuthContext(c)
        if (!auth?.userId) {
          return null // Skip rate limiting if not authenticated
        }

        const keyHash = `oauth:connect:${auth.userId}`
        return { keyHash, limit }
      } catch {
        return null // Skip if auth context not available
      }
    },
    { windowMs, ...config }
  )
}

/**
 * Create OAuth callback rate limiter (20 req/min per IP)
 * Used for OAuth provider callbacks - keyed by IP since user may not be authenticated yet
 */
export function createCallbackRateLimiter(config?: RateLimitConfig) {
  const { limit, windowMs } = OAUTH_RATE_LIMITS.callback

  const rateLimiter = createRateLimiter(
    async (c: Context) => {
      const ip = getClientIp(c)
      const keyHash = `oauth:callback:${ip}`
      return { keyHash, limit }
    },
    { windowMs, ...config }
  )

  // Wrap to add logging on rate limit hit
  return async (c: Context, next: Next) => {
    const result = await rateLimiter(c, next)

    // Check if rate limited (response already sent with 429)
    const rateLimit = c.get("rateLimit")
    if (rateLimit?.limited) {
      const ip = getClientIp(c)
      logRateLimitHit("callback", ip, limit, rateLimit.resetIn)
    }

    return result
  }
}

/**
 * Create OAuth token rate limiter (60 req/min per user)
 * Higher limit since gateway may poll frequently for token refresh
 */
export function createTokenRateLimiter(config?: RateLimitConfig) {
  const { limit, windowMs } = OAUTH_RATE_LIMITS.token

  return createRateLimiter(
    async (c: Context) => {
      try {
        const auth = getAuthContext(c)
        if (!auth?.userId) {
          return null
        }

        const keyHash = `oauth:token:${auth.userId}`
        return { keyHash, limit }
      } catch {
        return null
      }
    },
    { windowMs, ...config }
  )
}

/**
 * Create OAuth connections rate limiter (30 req/min per user)
 * Used for listing OAuth connections
 */
export function createConnectionsRateLimiter(config?: RateLimitConfig) {
  const { limit, windowMs } = OAUTH_RATE_LIMITS.connections

  return createRateLimiter(
    async (c: Context) => {
      try {
        const auth = getAuthContext(c)
        if (!auth?.userId) {
          return null
        }

        const keyHash = `oauth:connections:${auth.userId}`
        return { keyHash, limit }
      } catch {
        return null
      }
    },
    { windowMs, ...config }
  )
}

/**
 * Create rate limit middleware with logging wrapper
 * Logs when rate limits are hit for debugging
 */
export function withRateLimitLogging(
  endpoint: string,
  rateLimiter: ReturnType<typeof createRateLimiter>
) {
  return async (c: Context, next: Next) => {
    const result = await rateLimiter(c, next)

    const rateLimit = c.get("rateLimit")
    if (rateLimit?.limited) {
      try {
        const auth = getAuthContext(c)
        const key = auth?.userId || getClientIp(c)
        logRateLimitHit(endpoint, key, rateLimit.limit, rateLimit.resetIn)
      } catch {
        const key = getClientIp(c)
        logRateLimitHit(endpoint, key, rateLimit.limit, rateLimit.resetIn)
      }
    }

    return result
  }
}
