/**
 * Tests for the Sessions routes
 *
 * These tests verify the session management operations including:
 * - Listing active sessions with device/browser detection
 * - Revoking sessions
 * - Preventing revocation of current session
 * - Session not found handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

// Error handler to properly handle thrown errors
const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json({ error: err.message, code: (err as Error & { code?: string }).code }, statusCode)
}

// Mock modules before importing the routes
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  detectDatabaseType: vi.fn(() => "sqlite"),
  getSchema: vi.fn(() => mockSchema),
}))

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set("auth", mockAuthContext)
    return next()
  }),
  getAuthContext: vi.fn((c) => c.get("auth")),
  ApiError: {
    badRequest: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 400
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
    notFound: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 404
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
    forbidden: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 403
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
  },
}))

// Type for test response data
interface SessionResponse {
  id: string
  device?: string
  browser?: string
  lastActive: string
  current: boolean
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

interface MessageResponse {
  message: string
}

interface ErrorResponse {
  error: string
  details?: string
  code?: string
}

// Mock data
const mockAuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}

const now = new Date()
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

const mockSessions = [
  {
    id: "session_123",
    userId: "user_123",
    ipAddress: "192.168.1.1",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    createdAt: now,
    updatedAt: now,
    expiresAt: futureDate,
  },
  {
    id: "session_456",
    userId: "user_123",
    ipAddress: "10.0.0.1",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: futureDate,
  },
  {
    id: "session_789",
    userId: "user_123",
    ipAddress: "172.16.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    expiresAt: futureDate,
  },
]

// Mock schema
const mockSchema = {
  session: {
    id: "id",
    userId: "userId",
    ipAddress: "ipAddress",
    userAgent: "userAgent",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    expiresAt: "expiresAt",
  },
}

// Mock database
const mockDb = {
  query: {
    session: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(mockSessions)),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  })),
}

describe("Sessions Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // GET /api/sessions Tests
  // =========================================================================
  describe("GET /api/sessions", () => {
    it("should list all active sessions", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
    })

    it("should mark current session correctly", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      const currentSession = data.find((s) => s.id === "session_123")
      const otherSession = data.find((s) => s.id === "session_456")

      expect(currentSession?.current).toBe(true)
      expect(otherSession?.current).toBe(false)
    })

    it("should parse device and browser from user agent", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      // Mac + Chrome
      const macSession = data.find((s) => s.id === "session_123")
      expect(macSession?.device).toBe("Mac")
      expect(macSession?.browser).toBe("Chrome")

      // iPhone + Safari
      const iphoneSession = data.find((s) => s.id === "session_456")
      expect(iphoneSession?.device).toBe("iPhone")
      expect(iphoneSession?.browser).toBe("Safari")

      // Windows + Firefox
      const windowsSession = data.find((s) => s.id === "session_789")
      expect(windowsSession?.device).toBe("Windows")
      expect(windowsSession?.browser).toBe("Firefox")
    })

    it("should return current session first", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(data[0].id).toBe("session_123")
      expect(data[0].current).toBe(true)
    })

    it("should return empty array when no sessions", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  // =========================================================================
  // DELETE /api/sessions/:sessionId Tests
  // =========================================================================
  describe("DELETE /api/sessions/:sessionId", () => {
    it("should revoke session successfully", async () => {
      mockDb.query.session.findFirst.mockResolvedValue(mockSessions[1])

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions/session_456", {
        method: "DELETE",
      })

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("Session revoked successfully")
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it("should return 400 when trying to revoke current session", async () => {
      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions/session_123", {
        method: "DELETE",
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("Cannot revoke your current session")
      expect(data.code).toBe("CANNOT_REVOKE_CURRENT_SESSION")
    })

    it("should return 404 when session not found", async () => {
      mockDb.query.session.findFirst.mockResolvedValue(null)

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions/session_nonexistent", {
        method: "DELETE",
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Session not found")
      expect(data.code).toBe("SESSION_NOT_FOUND")
    })

    it("should return 400 for invalid session ID", async () => {
      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      // Empty session ID should fail validation - but param schema requires min(1)
      // The route /:sessionId means empty won't match, so we test with path param
      const response = await app.request("/api/sessions/", {
        method: "DELETE",
      })

      // Should return 404 because route doesn't match empty param
      expect(response.status).toBe(404)
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("should handle session without user agent", async () => {
      const sessionWithoutUserAgent = {
        id: "session_no_ua",
        userId: "user_123",
        ipAddress: "192.168.1.1",
        userAgent: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: futureDate,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([sessionWithoutUserAgent]),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(response.status).toBe(200)
      expect(data[0].device).toBeUndefined()
      expect(data[0].browser).toBeUndefined()
    })

    it("should handle session without IP address", async () => {
      const sessionWithoutIP = {
        id: "session_no_ip",
        userId: "user_123",
        ipAddress: null,
        userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
        createdAt: now,
        updatedAt: now,
        expiresAt: futureDate,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([sessionWithoutIP]),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(response.status).toBe(200)
      expect(data[0].ipAddress).toBeUndefined()
    })

    it("should detect Edge browser correctly", async () => {
      const edgeSession = {
        id: "session_edge",
        userId: "user_123",
        ipAddress: "192.168.1.1",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        createdAt: now,
        updatedAt: now,
        expiresAt: futureDate,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([edgeSession]),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(data[0].browser).toBe("Edge")
    })

    it("should detect Android device correctly", async () => {
      const androidSession = {
        id: "session_android",
        userId: "user_123",
        ipAddress: "192.168.1.1",
        userAgent:
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        createdAt: now,
        updatedAt: now,
        expiresAt: futureDate,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([androidSession]),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(data[0].device).toBe("Android")
    })

    it("should detect iPad device correctly", async () => {
      const ipadSession = {
        id: "session_ipad",
        userId: "user_123",
        ipAddress: "192.168.1.1",
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        createdAt: now,
        updatedAt: now,
        expiresAt: futureDate,
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([ipadSession]),
        }),
      })

      const { default: sessions } = await import("../../routes/sessions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/sessions", sessions)

      const response = await app.request("/api/sessions")
      const data = (await response.json()) as SessionResponse[]

      expect(data[0].device).toBe("iPad")
    })
  })
})
