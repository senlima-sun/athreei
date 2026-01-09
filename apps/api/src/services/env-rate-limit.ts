interface RateLimitEntry {
  count: number
  resetAt: number
  violations: number
}

export interface EnvRateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

export const ENV_RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowMs: 60_000,
  cleanupIntervalMs: 300_000,
} as const

const envAccessLimiter = new Map<string, RateLimitEntry>()

let lastEnvLimiterCleanup = Date.now()

export function cleanupEnvRateLimiter(): void {
  const now = Date.now()
  for (const [key, entry] of envAccessLimiter.entries()) {
    if (now > entry.resetAt) {
      envAccessLimiter.delete(key)
    }
  }
  lastEnvLimiterCleanup = now
}

export function checkEnvRateLimit(key: string): EnvRateLimitResult {
  const now = Date.now()
  const config = ENV_RATE_LIMIT_CONFIG

  if (now - lastEnvLimiterCleanup > config.cleanupIntervalMs) {
    cleanupEnvRateLimiter()
  }

  const entry = envAccessLimiter.get(key)

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

  if (entry.count >= config.maxRequests) {
    entry.violations++
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  }
}

export function getEnvRateLimitViolations(key: string): number {
  return envAccessLimiter.get(key)?.violations ?? 0
}

export function resetEnvRateLimit(key: string): void {
  envAccessLimiter.delete(key)
}

export function clearAllEnvRateLimits(): void {
  envAccessLimiter.clear()
  lastEnvLimiterCleanup = Date.now()
}

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
