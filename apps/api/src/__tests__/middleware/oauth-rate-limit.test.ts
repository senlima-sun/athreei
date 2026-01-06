/**
 * Tests for the OAuth rate limiting middleware
 *
 * These tests verify the OAuth-specific rate limiting configurations:
 * - /connect: 10 req/min per user
 * - /callback: 20 req/min per IP
 * - /token: 60 req/min per user
 * - /connections: 30 req/min per user
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Hono } from "hono"
import {
  createConnectRateLimiter,
  createCallbackRateLimiter,
  createTokenRateLimiter,
  createConnectionsRateLimiter,
  withRateLimitLogging,
  OAUTH_RATE_LIMITS,
} from "../../middleware/oauth-rate-limit"
import { clearAllRateLimits } from "../../middleware/rate-limit"
import type { AuthContext } from "../../middleware/auth"

// Mock auth context
const mockAuthContext: AuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: { id: "sess_123", expiresAt: new Date("2099-01-01") },
}

// Type for test app
type TestVariables = {
  auth: AuthContext
}

// Helper to create test app with rate limiter
function createTestApp(
  rateLimiter: ReturnType<typeof createConnectRateLimiter>
) {
  const app = new Hono<{ Variables: TestVariables }>()

  // Add mock auth middleware
  app.use("*", async (c, next) => {
    c.set("auth", mockAuthContext)
    await next()
  })

  // Add rate limiter
  app.use("*", rateLimiter)

  // Test route
  app.get("/test", (c) => c.json({ success: true }))
  app.post("/test", (c) => c.json({ success: true }))

  return app
}

describe("OAuth Rate Limiting Middleware", () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearAllRateLimits()
  })

  describe("OAUTH_RATE_LIMITS configuration", () => {
    it("should have correct rate limits for connect endpoint", () => {
      expect(OAUTH_RATE_LIMITS.connect).toEqual({
        limit: 10,
        windowMs: 60_000,
      })
    })

    it("should have correct rate limits for callback endpoint", () => {
      expect(OAUTH_RATE_LIMITS.callback).toEqual({
        limit: 20,
        windowMs: 60_000,
      })
    })

    it("should have correct rate limits for token endpoint", () => {
      expect(OAUTH_RATE_LIMITS.token).toEqual({
        limit: 60,
        windowMs: 60_000,
      })
    })

    it("should have correct rate limits for connections endpoint", () => {
      expect(OAUTH_RATE_LIMITS.connections).toEqual({
        limit: 30,
        windowMs: 60_000,
      })
    })
  })

  describe("createConnectRateLimiter", () => {
    it("should allow requests under the limit", async () => {
      const rateLimiter = createConnectRateLimiter()
      const app = createTestApp(rateLimiter)

      // Make 5 requests (under limit of 10)
      for (let i = 0; i < 5; i++) {
        const response = await app.request("/test")
        expect(response.status).toBe(200)
      }
    })

    it("should rate limit after exceeding 10 requests", async () => {
      const rateLimiter = createConnectRateLimiter()
      const app = createTestApp(rateLimiter)

      // Make 10 requests (at limit)
      for (let i = 0; i < 10; i++) {
        const response = await app.request("/test")
        expect(response.status).toBe(200)
      }

      // 11th request should be rate limited
      const response = await app.request("/test")
      expect(response.status).toBe(429)

      const data = (await response.json()) as {
        error?: string
        retryAfter?: number
      }
      expect(data.error).toBe("Too Many Requests")
      expect(data.retryAfter).toBeDefined()
    })

    it("should include proper rate limit headers", async () => {
      const rateLimiter = createConnectRateLimiter()
      const app = createTestApp(rateLimiter)

      const response = await app.request("/test")

      expect(response.headers.get("X-RateLimit-Limit")).toBe("10")
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined()
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined()
    })

    it("should include Retry-After header when rate limited", async () => {
      const rateLimiter = createConnectRateLimiter()
      const app = createTestApp(rateLimiter)

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await app.request("/test")
      }

      // Rate limited request
      const response = await app.request("/test")
      expect(response.status).toBe(429)
      expect(response.headers.get("Retry-After")).toBeDefined()
    })

    it("should key rate limits by user ID", async () => {
      const rateLimiter = createConnectRateLimiter()
      const app = new Hono<{ Variables: TestVariables }>()

      // Different users
      let currentUserId = "user_1"
      app.use("*", async (c, next) => {
        c.set("auth", {
          userId: currentUserId,
          email: "test@example.com",
          name: "Test User",
          session: { id: "sess_123", expiresAt: new Date("2099-01-01") },
        })
        await next()
      })
      app.use("*", rateLimiter)
      app.get("/test", (c) => c.json({ success: true }))

      // User 1: make 10 requests
      for (let i = 0; i < 10; i++) {
        await app.request("/test")
      }

      // User 1 should be rate limited
      let response = await app.request("/test")
      expect(response.status).toBe(429)

      // User 2 should not be rate limited
      currentUserId = "user_2"
      response = await app.request("/test")
      expect(response.status).toBe(200)
    })
  })

  describe("createCallbackRateLimiter", () => {
    it("should allow requests under the limit", async () => {
      const rateLimiter = createCallbackRateLimiter()
      const app = new Hono()
      app.use("*", rateLimiter)
      app.get("/callback", (c) => c.json({ success: true }))

      // Make 10 requests (under limit of 20)
      for (let i = 0; i < 10; i++) {
        const response = await app.request("/callback")
        expect(response.status).toBe(200)
      }
    })

    it("should rate limit after exceeding 20 requests", async () => {
      const rateLimiter = createCallbackRateLimiter()
      const app = new Hono()
      app.use("*", rateLimiter)
      app.get("/callback", (c) => c.json({ success: true }))

      // Make 20 requests (at limit)
      for (let i = 0; i < 20; i++) {
        const response = await app.request("/callback")
        expect(response.status).toBe(200)
      }

      // 21st request should be rate limited
      const response = await app.request("/callback")
      expect(response.status).toBe(429)
    })

    it("should key rate limits by IP address", async () => {
      const rateLimiter = createCallbackRateLimiter()
      const app = new Hono()
      app.use("*", rateLimiter)
      app.get("/callback", (c) => c.json({ success: true }))

      // Make 20 requests with one IP
      for (let i = 0; i < 20; i++) {
        await app.request("/callback", {
          headers: { "X-Forwarded-For": "192.168.1.1" },
        })
      }

      // Same IP should be rate limited
      let response = await app.request("/callback", {
        headers: { "X-Forwarded-For": "192.168.1.1" },
      })
      expect(response.status).toBe(429)

      // Different IP should not be rate limited
      response = await app.request("/callback", {
        headers: { "X-Forwarded-For": "192.168.1.2" },
      })
      expect(response.status).toBe(200)
    })
  })

  describe("createTokenRateLimiter", () => {
    it("should have higher limit (60 req/min) for token endpoint", async () => {
      const rateLimiter = createTokenRateLimiter()
      const app = createTestApp(rateLimiter)

      // Make 50 requests (under limit of 60)
      for (let i = 0; i < 50; i++) {
        const response = await app.request("/test")
        expect(response.status).toBe(200)
      }
    })

    it("should rate limit after exceeding 60 requests", async () => {
      const rateLimiter = createTokenRateLimiter()
      const app = createTestApp(rateLimiter)

      // Make 60 requests (at limit)
      for (let i = 0; i < 60; i++) {
        const response = await app.request("/test")
        expect(response.status).toBe(200)
      }

      // 61st request should be rate limited
      const response = await app.request("/test")
      expect(response.status).toBe(429)
    })
  })

  describe("createConnectionsRateLimiter", () => {
    it("should allow 30 requests per minute", async () => {
      const rateLimiter = createConnectionsRateLimiter()
      const app = createTestApp(rateLimiter)

      // Make 30 requests (at limit)
      for (let i = 0; i < 30; i++) {
        const response = await app.request("/test")
        expect(response.status).toBe(200)
      }

      // 31st request should be rate limited
      const response = await app.request("/test")
      expect(response.status).toBe(429)
    })
  })

  describe("withRateLimitLogging", () => {
    it("should wrap rate limiter and log on rate limit hit", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const rawRateLimiter = createConnectRateLimiter()
      const loggingRateLimiter = withRateLimitLogging("connect", rawRateLimiter)
      const app = createTestApp(loggingRateLimiter)

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await app.request("/test")
      }

      // Rate limited request should trigger logging
      await app.request("/test")

      // Check that logging was called
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[oauth-rate-limit]")
      )

      consoleSpy.mockRestore()
    })

    it("should pass through normal requests without logging", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const rawRateLimiter = createConnectRateLimiter()
      const loggingRateLimiter = withRateLimitLogging("connect", rawRateLimiter)
      const app = createTestApp(loggingRateLimiter)

      // Normal request
      await app.request("/test")

      // Should not log for successful requests
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe("Rate limit response format", () => {
    it("should return 429 with proper JSON response", async () => {
      const rateLimiter = createConnectRateLimiter()
      const app = createTestApp(rateLimiter)

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await app.request("/test")
      }

      const response = await app.request("/test")
      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data).toMatchObject({
        error: "Too Many Requests",
        message: expect.stringContaining("Rate limit exceeded"),
        retryAfter: expect.any(Number),
      })
    })
  })
})
