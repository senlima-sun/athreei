/**
 * Tests for the Dashboard routes
 *
 * These tests verify the dashboard statistics and activity feed operations including:
 * - Fetching aggregated organization stats
 * - Fetching recent activity feed
 * - Organization membership verification
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

// Error handler to properly handle thrown errors
const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json(
    { error: err.message, code: (err as Error & { code?: string }).code },
    statusCode
  )
}

// Mock modules before importing the routes
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  endpoint: { organizationId: "organizationId", status: "status" },
  mcpServer: { organizationId: "organizationId", createdAt: "createdAt", status: "status" },
  trace: { organizationId: "organizationId", startTime: "startTime" },
  member: { organizationId: "organizationId", createdAt: "createdAt" },
}))

vi.mock("../../services", () => ({
  verifyOrganizationMembership: vi.fn(),
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
interface DashboardStats {
  activeEndpoints: number
  mcpServers: number
  totalTraces: number
  teamMembers: number
}

interface ActivityItem {
  id: string
  type: "trace" | "mcp_server_added" | "mcp_server_removed" | "member_joined"
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface ActivityResponse {
  activities: ActivityItem[]
  total: number
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
    expiresAt: new Date(),
  },
}

const now = new Date()

const mockTraces = [
  {
    id: "trace_1",
    name: "get_user",
    status: "success",
    startTime: now,
    mcpServerId: "mcp_1",
  },
  {
    id: "trace_2",
    name: "create_item",
    status: "error",
    startTime: new Date(Date.now() - 1000),
    mcpServerId: "mcp_1",
  },
]

const mockMcpServers = [
  {
    id: "mcp_1",
    name: "Primary Server",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: "active",
  },
]

const mockMembers = [
  {
    id: "member_1",
    userId: "user_123",
    role: "admin",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    user: {
      name: "Test User",
      email: "test@example.com",
    },
  },
]

// Mock database
const mockDb = {
  query: {
    trace: {
      findMany: vi.fn(),
    },
    mcpServer: {
      findMany: vi.fn(),
    },
    member: {
      findMany: vi.fn(),
    },
  },
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ count: 5 }])),
    })),
  })),
}

describe("Dashboard Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // GET /api/dashboard/stats Tests
  // =========================================================================
  describe("GET /api/dashboard/stats", () => {
    it("should return correct stats counts", async () => {
      // Import the mocked service
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      // Mock the select queries for counts
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 150 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 4 }]),
          }),
        })

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/stats?organizationId=org_123"
      )
      const data = (await response.json()) as DashboardStats

      expect(response.status).toBe(200)
      expect(data.activeEndpoints).toBe(3)
      expect(data.mcpServers).toBe(5)
      expect(data.totalTraces).toBe(150)
      expect(data.teamMembers).toBe(4)
    })

    it("should return 403 when user is not a member of organization", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(false)

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/stats?organizationId=org_other"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Access denied")
    })

    it("should return 400 when organizationId is missing", async () => {
      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request("/api/dashboard/stats")

      expect(response.status).toBe(400)
    })

    it("should set cache headers on response", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/stats?organizationId=org_123"
      )

      expect(response.headers.get("Cache-Control")).toContain("private")
      expect(response.headers.get("Cache-Control")).toContain("max-age=60")
    })

    it("should handle zero counts correctly", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/stats?organizationId=org_123"
      )
      const data = (await response.json()) as DashboardStats

      expect(response.status).toBe(200)
      expect(data.activeEndpoints).toBe(0)
      expect(data.mcpServers).toBe(0)
      expect(data.totalTraces).toBe(0)
      expect(data.teamMembers).toBe(0)
    })
  })

  // =========================================================================
  // GET /api/dashboard/activity Tests
  // =========================================================================
  describe("GET /api/dashboard/activity", () => {
    it("should return activity feed with traces, servers, and members", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.query.trace.findMany.mockResolvedValue(mockTraces)
      mockDb.query.mcpServer.findMany.mockResolvedValue(mockMcpServers)
      mockDb.query.member.findMany.mockResolvedValue(mockMembers)

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123"
      )
      const data = (await response.json()) as ActivityResponse

      expect(response.status).toBe(200)
      expect(data.activities).toBeInstanceOf(Array)
      expect(data.total).toBeGreaterThan(0)

      // Check that we have different types of activities
      const types = data.activities.map((a) => a.type)
      expect(types).toContain("trace")
      expect(types).toContain("mcp_server_added")
      expect(types).toContain("member_joined")
    })

    it("should return 403 when user is not a member of organization", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(false)

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_other"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Access denied")
    })

    it("should return 400 when organizationId is missing", async () => {
      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request("/api/dashboard/activity")

      expect(response.status).toBe(400)
    })

    it("should respect limit parameter", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.query.trace.findMany.mockResolvedValue(mockTraces)
      mockDb.query.mcpServer.findMany.mockResolvedValue(mockMcpServers)
      mockDb.query.member.findMany.mockResolvedValue(mockMembers)

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123&limit=2"
      )
      const data = (await response.json()) as ActivityResponse

      expect(response.status).toBe(200)
      expect(data.activities.length).toBeLessThanOrEqual(2)
    })

    it("should return empty activities when no data", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.query.trace.findMany.mockResolvedValue([])
      mockDb.query.mcpServer.findMany.mockResolvedValue([])
      mockDb.query.member.findMany.mockResolvedValue([])

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123"
      )
      const data = (await response.json()) as ActivityResponse

      expect(response.status).toBe(200)
      expect(data.activities).toEqual([])
      expect(data.total).toBe(0)
    })

    it("should sort activities by timestamp descending", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.query.trace.findMany.mockResolvedValue(mockTraces)
      mockDb.query.mcpServer.findMany.mockResolvedValue([])
      mockDb.query.member.findMany.mockResolvedValue([])

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123"
      )
      const data = (await response.json()) as ActivityResponse

      expect(response.status).toBe(200)

      // Check activities are sorted by timestamp (newest first)
      for (let i = 1; i < data.activities.length; i++) {
        const prevTime = new Date(data.activities[i - 1].timestamp).getTime()
        const currTime = new Date(data.activities[i].timestamp).getTime()
        expect(prevTime).toBeGreaterThanOrEqual(currTime)
      }
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("should handle null count results", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: null }]),
        }),
      })

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/stats?organizationId=org_123"
      )
      const data = (await response.json()) as DashboardStats

      expect(response.status).toBe(200)
      expect(data.activeEndpoints).toBe(0)
    })

    it("should handle empty count results array", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/stats?organizationId=org_123"
      )
      const data = (await response.json()) as DashboardStats

      expect(response.status).toBe(200)
      expect(data.activeEndpoints).toBe(0)
    })

    it("should handle member without user info in activity", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      const memberWithoutUser = {
        id: "member_2",
        userId: "user_456",
        role: "viewer",
        createdAt: now,
        user: null,
      }

      mockDb.query.trace.findMany.mockResolvedValue([])
      mockDb.query.mcpServer.findMany.mockResolvedValue([])
      mockDb.query.member.findMany.mockResolvedValue([memberWithoutUser])

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123"
      )
      const data = (await response.json()) as ActivityResponse

      expect(response.status).toBe(200)
      expect(data.activities[0].description).toContain("Unknown user")
    })

    it("should handle limit parameter at maximum value", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.query.trace.findMany.mockResolvedValue([])
      mockDb.query.mcpServer.findMany.mockResolvedValue([])
      mockDb.query.member.findMany.mockResolvedValue([])

      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123&limit=50"
      )

      expect(response.status).toBe(200)
    })

    it("should reject limit above maximum", async () => {
      const { default: dashboard } = await import("../../routes/dashboard")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/dashboard", dashboard)

      const response = await app.request(
        "/api/dashboard/activity?organizationId=org_123&limit=100"
      )

      expect(response.status).toBe(400)
    })
  })
})
