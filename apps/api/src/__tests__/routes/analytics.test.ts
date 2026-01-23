import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json({ error: err.message }, statusCode)
}

const { mockSelectResult, mockDb } = vi.hoisted(() => {
  const mockSelectResult = vi.fn(() => [] as unknown[])
  const mockDb: Record<string, unknown> = {}
  mockDb.select = vi.fn(() => mockDb)
  mockDb.from = vi.fn(() => mockDb)
  mockDb.where = vi.fn(() => ({
    ...mockDb,
    then: (resolve: (value: unknown) => void) => resolve(mockSelectResult()),
  }))
  mockDb.groupBy = vi.fn(() => mockDb)
  mockDb.orderBy = vi.fn(() => mockDb)
  mockDb.limit = vi.fn(() => mockSelectResult())
  return { mockSelectResult, mockDb }
})

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set("auth", mockAuthContext)
    return next()
  }),
  getAuthContext: vi.fn((c) => c.get("auth")),
  ApiError: {
    badRequest: (msg: string) => {
      const error = new Error(`BadRequest: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 400
      return error
    },
    forbidden: (msg: string) => {
      const error = new Error(`Forbidden: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 403
      return error
    },
  },
}))

vi.mock("../../services", () => ({
  verifyOrganizationMembership: vi.fn(),
}))

interface OverviewResponse {
  overview: {
    total: number
    errors: number
    success: number
    errorRate: number
  }
}

interface ByToolResponse {
  byTool: Array<{
    toolName: string
    total: number
    errors: number
    errorRate: number
  }>
}

interface ByServerResponse {
  byServer: Array<{
    serverId: string | null
    total: number
    errors: number
    errorRate: number
  }>
}

interface CommonMessagesResponse {
  commonMessages: Array<{
    message: string
    count: number
  }>
}

interface TrendResponse {
  trend: Array<{
    date: string
    total: number
    errors: number
    errorRate: number
  }>
}

interface ErrorResponse {
  error: string
}

const mockAuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(),
  },
}

describe("Analytics Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectResult.mockReset()
  })

  describe("GET /errors/overview", () => {
    it("should return 403 when user is not a member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false)

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/overview?organizationId=org_123"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain("access")
    })

    it("should return 400 when organizationId is missing", async () => {
      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request("/api/analytics/errors/overview")

      expect(response.status).toBe(400)
    })

    it("should return overview stats when user is a member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { total: 100, errors: 10, success: 90 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/overview?organizationId=org_123"
      )
      const data = (await response.json()) as OverviewResponse

      expect(response.status).toBe(200)
      expect(data.overview).toBeDefined()
      expect(data.overview.total).toBe(100)
      expect(data.overview.errors).toBe(10)
      expect(data.overview.success).toBe(90)
      expect(data.overview.errorRate).toBe(10)
    })

    it("should return zero error rate when no traces exist", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([{ total: 0, errors: 0, success: 0 }])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/overview?organizationId=org_123"
      )
      const data = (await response.json()) as OverviewResponse

      expect(response.status).toBe(200)
      expect(data.overview.errorRate).toBe(0)
    })

    it("should filter by date range when provided", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { total: 50, errors: 5, success: 45 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const startDate = "2025-01-01T00:00:00.000Z"
      const endDate = "2025-01-31T23:59:59.999Z"
      const response = await app.request(
        `/api/analytics/errors/overview?organizationId=org_123&startDate=${startDate}&endDate=${endDate}`
      )
      const data = (await response.json()) as OverviewResponse

      expect(response.status).toBe(200)
      expect(data.overview.total).toBe(50)
    })
  })

  describe("GET /errors/by-tool", () => {
    it("should return 403 when user is not a member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false)

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/by-tool?organizationId=org_123"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain("access")
    })

    it("should return errors grouped by tool", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { toolName: "github__create_issue", total: 50, errors: 5 },
        { toolName: "linear__list_issues", total: 30, errors: 3 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/by-tool?organizationId=org_123"
      )
      const data = (await response.json()) as ByToolResponse

      expect(response.status).toBe(200)
      expect(data.byTool).toHaveLength(2)
      expect(data.byTool[0]!.toolName).toBe("github__create_issue")
      expect(data.byTool[0]!.errorRate).toBe(10)
    })

    it("should return empty array when no traces exist", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/by-tool?organizationId=org_123"
      )
      const data = (await response.json()) as ByToolResponse

      expect(response.status).toBe(200)
      expect(data.byTool).toHaveLength(0)
    })
  })

  describe("GET /errors/by-server", () => {
    it("should return 403 when user is not a member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false)

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/by-server?organizationId=org_123"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain("access")
    })

    it("should return errors grouped by server", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { mcpServerId: "server_1", total: 100, errors: 10 },
        { mcpServerId: "server_2", total: 50, errors: 2 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/by-server?organizationId=org_123"
      )
      const data = (await response.json()) as ByServerResponse

      expect(response.status).toBe(200)
      expect(data.byServer).toHaveLength(2)
      expect(data.byServer[0]!.serverId).toBe("server_1")
      expect(data.byServer[0]!.errorRate).toBe(10)
    })

    it("should handle null server ids", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { mcpServerId: null, total: 20, errors: 2 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/by-server?organizationId=org_123"
      )
      const data = (await response.json()) as ByServerResponse

      expect(response.status).toBe(200)
      expect(data.byServer[0]!.serverId).toBeNull()
    })
  })

  describe("GET /errors/common-messages", () => {
    it("should return 403 when user is not a member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false)

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/common-messages?organizationId=org_123"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain("access")
    })

    it("should return common error messages", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { message: "Connection timeout", count: 15 },
        { message: "Rate limit exceeded", count: 10 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/common-messages?organizationId=org_123"
      )
      const data = (await response.json()) as CommonMessagesResponse

      expect(response.status).toBe(200)
      expect(data.commonMessages).toHaveLength(2)
      expect(data.commonMessages[0]!.message).toBe("Connection timeout")
      expect(data.commonMessages[0]!.count).toBe(15)
    })

    it("should handle null messages as Unknown error", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([{ message: null, count: 5 }])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/common-messages?organizationId=org_123"
      )
      const data = (await response.json()) as CommonMessagesResponse

      expect(response.status).toBe(200)
      expect(data.commonMessages[0]!.message).toBe("Unknown error")
    })
  })

  describe("GET /errors/trend", () => {
    it("should return 403 when user is not a member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false)

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/trend?organizationId=org_123"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain("access")
    })

    it("should return error trend by date", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { date: "2025-01-01", total: 100, errors: 10 },
        { date: "2025-01-02", total: 120, errors: 8 },
        { date: "2025-01-03", total: 90, errors: 15 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/trend?organizationId=org_123"
      )
      const data = (await response.json()) as TrendResponse

      expect(response.status).toBe(200)
      expect(data.trend).toHaveLength(3)
      expect(data.trend[0]!.date).toBe("2025-01-01")
      expect(data.trend[0]!.errorRate).toBe(10)
      expect(data.trend[2]!.errorRate).toBeCloseTo(16.67, 1)
    })

    it("should return empty trend when no data exists", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/trend?organizationId=org_123"
      )
      const data = (await response.json()) as TrendResponse

      expect(response.status).toBe(200)
      expect(data.trend).toHaveLength(0)
    })

    it("should handle zero total for a date gracefully", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      ;(
        verifyOrganizationMembership as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true)

      mockSelectResult.mockResolvedValue([
        { date: "2025-01-01", total: 0, errors: 0 },
      ])

      const { default: analytics } = await import("../../routes/analytics")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/analytics", analytics)

      const response = await app.request(
        "/api/analytics/errors/trend?organizationId=org_123"
      )
      const data = (await response.json()) as TrendResponse

      expect(response.status).toBe(200)
      expect(data.trend[0]!.errorRate).toBe(0)
    })
  })
})
