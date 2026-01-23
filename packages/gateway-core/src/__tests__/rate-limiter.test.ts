import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { RateLimiter, RateLimitExceededError } from "../rate-limiter"
import { RATE_LIMIT } from "../constants"

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    rateLimiter = new RateLimiter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("tryAcquire", () => {
    it("should allow requests within limit", () => {
      const result = rateLimiter.tryAcquire("server1")

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeDefined()
      expect(result.remaining).toBe(
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE - 1
      )
    })

    it("should count requests in window", () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const state = rateLimiter.getState("server1")
      expect(state?.count).toBe(5)
    })

    it("should decrement remaining correctly as requests are made", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      const result1 = rateLimiter.tryAcquire("server1")
      expect(result1.remaining).toBe(effectiveLimit - 1)

      const result2 = rateLimiter.tryAcquire("server1")
      expect(result2.remaining).toBe(effectiveLimit - 2)

      const result3 = rateLimiter.tryAcquire("server1")
      expect(result3.remaining).toBe(effectiveLimit - 3)
    })

    it("should allow burst requests after hitting max", () => {
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_REQUESTS; i++) {
        const result = rateLimiter.tryAcquire("server1")
        expect(result.allowed).toBe(true)
      }

      for (let i = 0; i < RATE_LIMIT.DEFAULT_BURST_ALLOWANCE; i++) {
        const result = rateLimiter.tryAcquire("server1")
        expect(result.allowed).toBe(true)
      }

      const state = rateLimiter.getState("server1")
      expect(state?.burstUsed).toBe(RATE_LIMIT.DEFAULT_BURST_ALLOWANCE)
    })

    it("should track burst usage separately", () => {
      for (let i = 0; i < RATE_LIMIT.DEFAULT_MAX_REQUESTS; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const stateBeforeBurst = rateLimiter.getState("server1")
      expect(stateBeforeBurst?.burstUsed).toBe(0)

      rateLimiter.tryAcquire("server1")

      const stateAfterBurst = rateLimiter.getState("server1")
      expect(stateAfterBurst?.burstUsed).toBe(1)
    })

    it("should reject when limit exceeded", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        const result = rateLimiter.tryAcquire("server1")
        expect(result.allowed).toBe(true)
      }

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeDefined()
      expect(result.remaining).toBe(0)
    })

    it("should provide correct retryAfterMs when limit exceeded", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      vi.advanceTimersByTime(10_000)

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBe(RATE_LIMIT.DEFAULT_WINDOW_MS - 10_000)
    })

    it("should track servers independently", () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const result = rateLimiter.tryAcquire("server2")
      expect(result.allowed).toBe(true)

      const state1 = rateLimiter.getState("server1")
      const state2 = rateLimiter.getState("server2")
      expect(state1?.count).toBe(10)
      expect(state2?.count).toBe(1)
    })

    it("should not affect other servers when one hits limit", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const server1Result = rateLimiter.tryAcquire("server1")
      expect(server1Result.allowed).toBe(false)

      const server2Result = rateLimiter.tryAcquire("server2")
      expect(server2Result.allowed).toBe(true)
    })
  })

  describe("window reset", () => {
    it("should reset count after window expires", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const beforeReset = rateLimiter.tryAcquire("server1")
      expect(beforeReset.allowed).toBe(false)

      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS)

      const afterReset = rateLimiter.tryAcquire("server1")
      expect(afterReset.allowed).toBe(true)
      expect(afterReset.remaining).toBe(effectiveLimit - 1)
    })

    it("should create new window state after expiry", () => {
      rateLimiter.tryAcquire("server1")
      const initialState = rateLimiter.getState("server1")
      const initialWindowStart = initialState?.windowStart

      expect(initialWindowStart).toBeDefined()

      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS)

      rateLimiter.tryAcquire("server1")
      const newState = rateLimiter.getState("server1")
      expect(newState?.windowStart).toBeGreaterThan(
        initialWindowStart as number
      )
      expect(newState?.count).toBe(1)
      expect(newState?.burstUsed).toBe(0)
    })

    it("should not reset before window expires", () => {
      for (let i = 0; i < 50; i++) {
        rateLimiter.tryAcquire("server1")
      }

      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS - 1)

      const state = rateLimiter.getState("server1")
      expect(state?.count).toBe(50)
    })
  })

  describe("per-server config", () => {
    it("should use per-server limits when configured", () => {
      rateLimiter = new RateLimiter({
        maxRequests: 100,
        perServer: {
          special: { maxRequests: 5 },
        },
      })

      for (let i = 0; i < 5; i++) {
        rateLimiter.tryAcquire("special")
      }

      for (let i = 0; i < RATE_LIMIT.DEFAULT_BURST_ALLOWANCE; i++) {
        const result = rateLimiter.tryAcquire("special")
        expect(result.allowed).toBe(true)
      }

      const result = rateLimiter.tryAcquire("special")
      expect(result.allowed).toBe(false)
    })

    it("should use default limits for unconfigured servers", () => {
      rateLimiter = new RateLimiter({
        maxRequests: 10,
        perServer: {
          special: { maxRequests: 5 },
        },
      })

      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.tryAcquire("regular")
        expect(result.allowed).toBe(true)
      }

      const state = rateLimiter.getState("regular")
      expect(state?.count).toBe(10)
    })

    it("should support per-server window configuration", () => {
      const customWindowMs = 5000
      rateLimiter = new RateLimiter({
        windowMs: RATE_LIMIT.DEFAULT_WINDOW_MS,
        maxRequests: 5,
        perServer: {
          fastReset: { windowMs: customWindowMs, maxRequests: 5 },
        },
      })

      const burstAllowance = RATE_LIMIT.DEFAULT_BURST_ALLOWANCE
      for (let i = 0; i < 5 + burstAllowance; i++) {
        rateLimiter.tryAcquire("fastReset")
      }

      const beforeReset = rateLimiter.tryAcquire("fastReset")
      expect(beforeReset.allowed).toBe(false)

      vi.advanceTimersByTime(customWindowMs)

      const afterReset = rateLimiter.tryAcquire("fastReset")
      expect(afterReset.allowed).toBe(true)
    })

    it("should mix default and per-server configs correctly", () => {
      rateLimiter = new RateLimiter({
        maxRequests: 20,
        burstAllowance: 5,
        perServer: {
          limited: { maxRequests: 3 },
        },
      })

      for (let i = 0; i < 8; i++) {
        rateLimiter.tryAcquire("limited")
      }

      const limitedResult = rateLimiter.tryAcquire("limited")
      expect(limitedResult.allowed).toBe(false)

      for (let i = 0; i < 25; i++) {
        const result = rateLimiter.tryAcquire("default")
        expect(result.allowed).toBe(true)
      }

      const defaultResult = rateLimiter.tryAcquire("default")
      expect(defaultResult.allowed).toBe(false)
    })
  })

  describe("reset", () => {
    it("should reset specific server", () => {
      rateLimiter.tryAcquire("server1")
      rateLimiter.tryAcquire("server2")

      rateLimiter.reset("server1")

      expect(rateLimiter.getState("server1")).toBeUndefined()
      expect(rateLimiter.getState("server2")).toBeDefined()
    })

    it("should reset all servers when no argument provided", () => {
      rateLimiter.tryAcquire("server1")
      rateLimiter.tryAcquire("server2")
      rateLimiter.tryAcquire("server3")

      rateLimiter.reset()

      expect(rateLimiter.getState("server1")).toBeUndefined()
      expect(rateLimiter.getState("server2")).toBeUndefined()
      expect(rateLimiter.getState("server3")).toBeUndefined()
    })

    it("should allow new requests after reset", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const beforeReset = rateLimiter.tryAcquire("server1")
      expect(beforeReset.allowed).toBe(false)

      rateLimiter.reset("server1")

      const afterReset = rateLimiter.tryAcquire("server1")
      expect(afterReset.allowed).toBe(true)
    })

    it("should not affect servers not being reset", () => {
      for (let i = 0; i < 50; i++) {
        rateLimiter.tryAcquire("server1")
        rateLimiter.tryAcquire("server2")
      }

      rateLimiter.reset("server1")

      expect(rateLimiter.getState("server1")).toBeUndefined()
      expect(rateLimiter.getState("server2")?.count).toBe(50)
    })
  })

  describe("getState", () => {
    it("should return undefined for unknown server", () => {
      const state = rateLimiter.getState("unknown")
      expect(state).toBeUndefined()
    })

    it("should return current state for known server", () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const state = rateLimiter.getState("server1")
      expect(state).toBeDefined()
      expect(state?.count).toBe(5)
      expect(state?.burstUsed).toBe(0)
      expect(state?.windowStart).toBeDefined()
    })
  })

  describe("LRU cache configuration", () => {
    it("should use CACHE_MAX_SERVERS constant for cache size", () => {
      expect(RATE_LIMIT.CACHE_MAX_SERVERS).toBe(1000)
    })

    it("should track multiple servers independently", () => {
      for (let i = 0; i < 100; i++) {
        rateLimiter.tryAcquire(`server${i}`)
      }

      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.getState(`server${i}`)).toBeDefined()
        expect(rateLimiter.getState(`server${i}`)?.count).toBe(1)
      }
    })
  })

  describe("constructor configuration", () => {
    it("should use default values when no config provided", () => {
      rateLimiter = new RateLimiter()

      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(false)
    })

    it("should accept custom windowMs", () => {
      const customWindowMs = 5000
      rateLimiter = new RateLimiter({ windowMs: customWindowMs })

      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      vi.advanceTimersByTime(customWindowMs)

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(true)
    })

    it("should accept custom maxRequests", () => {
      rateLimiter = new RateLimiter({ maxRequests: 5 })

      for (let i = 0; i < 5 + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(false)
    })

    it("should accept custom burstAllowance", () => {
      rateLimiter = new RateLimiter({
        maxRequests: 10,
        burstAllowance: 20,
      })

      for (let i = 0; i < 30; i++) {
        const result = rateLimiter.tryAcquire("server1")
        expect(result.allowed).toBe(true)
      }

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("should handle zero remaining correctly", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      const result = rateLimiter.tryAcquire("server1")
      expect(result.remaining).toBe(0)
    })

    it("should handle retryAfterMs being 0 at window boundary", () => {
      const effectiveLimit =
        RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE

      for (let i = 0; i < effectiveLimit; i++) {
        rateLimiter.tryAcquire("server1")
      }

      vi.advanceTimersByTime(RATE_LIMIT.DEFAULT_WINDOW_MS)

      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(true)
    })

    it("should handle rapid sequential requests", () => {
      for (let i = 0; i < 1000; i++) {
        const result = rateLimiter.tryAcquire("server1")
        const effectiveLimit =
          RATE_LIMIT.DEFAULT_MAX_REQUESTS + RATE_LIMIT.DEFAULT_BURST_ALLOWANCE
        if (i < effectiveLimit) {
          expect(result.allowed).toBe(true)
        } else {
          expect(result.allowed).toBe(false)
        }
      }
    })

    it("should handle multiple servers concurrently", () => {
      const servers = ["github", "linear", "figma", "sentry", "slack"]

      for (let i = 0; i < 10; i++) {
        for (const server of servers) {
          const result = rateLimiter.tryAcquire(server)
          expect(result.allowed).toBe(true)
        }
      }

      for (const server of servers) {
        expect(rateLimiter.getState(server)?.count).toBe(10)
      }
    })

    it("should handle empty server name", () => {
      const result = rateLimiter.tryAcquire("")
      expect(result.allowed).toBe(true)
      expect(rateLimiter.getState("")).toBeDefined()
    })

    it("should handle special characters in server name", () => {
      const specialName = "server-with_special.chars:123"
      const result = rateLimiter.tryAcquire(specialName)
      expect(result.allowed).toBe(true)
      expect(rateLimiter.getState(specialName)?.count).toBe(1)
    })
  })
})

describe("RateLimitExceededError", () => {
  it("should have correct properties", () => {
    const error = new RateLimitExceededError("testServer", 5000)

    expect(error.serverName).toBe("testServer")
    expect(error.retryAfterMs).toBe(5000)
    expect(error.name).toBe("RateLimitExceededError")
  })

  it("should have descriptive message", () => {
    const error = new RateLimitExceededError("github", 3000)

    expect(error.message).toBe(
      "Rate limit exceeded for server 'github'. Retry after 3000ms"
    )
  })

  it("should extend Error", () => {
    const error = new RateLimitExceededError("server", 1000)
    expect(error).toBeInstanceOf(Error)
  })

  it("should have stack trace", () => {
    const error = new RateLimitExceededError("server", 1000)
    expect(error.stack).toBeDefined()
  })

  it("should handle zero retryAfterMs", () => {
    const error = new RateLimitExceededError("server", 0)
    expect(error.retryAfterMs).toBe(0)
    expect(error.message).toContain("Retry after 0ms")
  })

  it("should handle large retryAfterMs", () => {
    const largeMs = 60_000 * 60
    const error = new RateLimitExceededError("server", largeMs)
    expect(error.retryAfterMs).toBe(largeMs)
  })
})

describe("RATE_LIMIT constants", () => {
  it("should have expected default values", () => {
    expect(RATE_LIMIT.DEFAULT_WINDOW_MS).toBe(60_000)
    expect(RATE_LIMIT.DEFAULT_MAX_REQUESTS).toBe(100)
    expect(RATE_LIMIT.DEFAULT_BURST_ALLOWANCE).toBe(10)
    expect(RATE_LIMIT.CACHE_MAX_SERVERS).toBe(1000)
  })
})
