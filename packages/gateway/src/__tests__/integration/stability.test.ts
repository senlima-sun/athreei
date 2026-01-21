import { describe, it, expect, beforeEach } from "vitest"
import { ToolCallTimeoutError, RateLimitExceededError, RateLimiter, TIMEOUT, RATE_LIMIT } from "../../types"

describe("Gateway Stability Features Integration", () => {
  describe("Timeout and Rate Limit Constants", () => {
    it("should have correct timeout defaults", () => {
      expect(TIMEOUT.DEFAULT_TOOL_CALL_MS).toBe(30_000)
      expect(TIMEOUT.MIN_TOOL_CALL_MS).toBe(1_000)
      expect(TIMEOUT.MAX_TOOL_CALL_MS).toBe(300_000)
    })

    it("should have correct rate limit defaults", () => {
      expect(RATE_LIMIT.DEFAULT_WINDOW_MS).toBe(60_000)
      expect(RATE_LIMIT.DEFAULT_MAX_REQUESTS).toBe(100)
      expect(RATE_LIMIT.DEFAULT_BURST_ALLOWANCE).toBe(10)
      expect(RATE_LIMIT.CACHE_MAX_SERVERS).toBe(1000)
    })
  })

  describe("Error Types", () => {
    it("should create ToolCallTimeoutError with correct properties", () => {
      const error = new ToolCallTimeoutError("github", "create_issue", 30000)

      expect(error.name).toBe("ToolCallTimeoutError")
      expect(error.serverName).toBe("github")
      expect(error.toolName).toBe("create_issue")
      expect(error.timeoutMs).toBe(30000)
      expect(error.message).toContain("github")
      expect(error.message).toContain("create_issue")
      expect(error.message).toContain("30000")
    })

    it("should create RateLimitExceededError with correct properties", () => {
      const error = new RateLimitExceededError("sentry", 5000)

      expect(error.name).toBe("RateLimitExceededError")
      expect(error.serverName).toBe("sentry")
      expect(error.retryAfterMs).toBe(5000)
      expect(error.message).toContain("sentry")
      expect(error.message).toContain("5000")
    })
  })

  describe("Rate Limiter Integration", () => {
    let rateLimiter: RateLimiter

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        maxRequests: 5,
        burstAllowance: 2,
        windowMs: 1000,
      })
    })

    it("should allow requests within limit", () => {
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.tryAcquire("server1")
        expect(result.allowed).toBe(true)
      }
    })

    it("should allow burst requests", () => {
      for (let i = 0; i < 7; i++) {
        rateLimiter.tryAcquire("server1")
      }
      const state = rateLimiter.getState("server1")
      expect(state?.burstUsed).toBe(2)
    })

    it("should block requests exceeding limit + burst", () => {
      for (let i = 0; i < 7; i++) {
        rateLimiter.tryAcquire("server1")
      }
      const result = rateLimiter.tryAcquire("server1")
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeDefined()
    })

    it("should track different servers independently", () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.tryAcquire("server1")
      }
      const result = rateLimiter.tryAcquire("server2")
      expect(result.allowed).toBe(true)
    })
  })

  describe("Combined Stability Scenario", () => {
    it("should handle timeout error followed by rate limit error", () => {
      const timeoutError = new ToolCallTimeoutError("slow-server", "heavy_operation", 30000)
      const rateLimitError = new RateLimitExceededError("slow-server", 60000)

      expect(timeoutError).toBeInstanceOf(Error)
      expect(rateLimitError).toBeInstanceOf(Error)

      expect(timeoutError.serverName).toBe("slow-server")
      expect(rateLimitError.serverName).toBe("slow-server")
    })
  })
})
