/**
 * Tests for the traces API routes
 *
 * These tests verify trace listing and retrieval operations including:
 * - Authentication checks
 * - Authorization via organization membership
 * - Filtering and pagination
 * - Proper response formats
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

// Response type interfaces for type-safe assertions
interface TraceAttributes {
  toolName?: string
  serverName?: string
  arguments?: Record<string, unknown>
  result?: unknown
}

interface TraceResponse {
  id: string
  traceId: string
  name: string
  status: string
  attributes: TraceAttributes | null
  events: unknown[] | null
}

interface ListTracesResponse {
  traces: TraceResponse[]
  total: number
  limit: number
  offset: number
}

interface SingleTraceResponse {
  trace: TraceResponse
}

// Mock modules before importing the routes
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
    notFound: (msg: string) => {
      const error = new Error(`NotFound: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 404
      return error
    },
    forbidden: (msg: string) => {
      const error = new Error(`Forbidden: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 403
      return error
    },
  },
}))

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

const mockMember = {
  id: "member_123",
  userId: "user_123",
  organizationId: "org_123",
  role: "admin",
  createdAt: new Date(),
}

const mockTrace = {
  id: "tr_123",
  organizationId: "org_123",
  traceId: "trace-abc-123",
  parentSpanId: null,
  spanId: "span-xyz",
  name: "figma:get_components",
  kind: "internal",
  status: "success",
  statusMessage: null,
  durationMs: 150,
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T10:00:00.150Z"),
  attributes: JSON.stringify({
    toolName: "get_components",
    serverName: "figma",
    arguments: { fileId: "abc123" },
    result: { components: [] },
  }),
  events: null,
  createdAt: new Date("2024-01-01T10:00:00Z"),
}

// Mock database with chainable query builder for count
const mockDb = {
  query: {
    trace: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    }),
  }),
}

// Error handler for tests
function testErrorHandler(
  err: Error,
  c: { json: (data: unknown, status: number) => Response }
) {
  const statusCode = (err as Error & { statusCode?: number }).statusCode || 500
  return c.json({ error: err.message }, statusCode)
}

// Import routes after mocks are set up
const { default: tracesRoutes } = await import("../../routes/traces")

// Create test app
const app = new Hono()
app.onError(testErrorHandler)
app.route("/api/traces", tracesRoutes)

describe("Traces API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/traces", () => {
    it("should return 400 when organizationId is missing", async () => {
      const response = await app.request("/api/traces")
      expect(response.status).toBe(400)
    })

    it("should return 403 when user is not a member of organization", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(null)

      const response = await app.request("/api/traces?organizationId=org_123")
      expect(response.status).toBe(403)
    })

    it("should return traces for authenticated user with membership", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.trace.findMany.mockResolvedValue([mockTrace])

      const response = await app.request("/api/traces?organizationId=org_123")

      expect(response.status).toBe(200)
      const data = (await response.json()) as ListTracesResponse
      expect(data.traces).toHaveLength(1)
      expect(data.traces[0]!.name).toBe("figma:get_components")
      expect(data.traces[0]!.status).toBe("success")
      expect(data.traces[0]!.attributes?.toolName).toBe("get_components")
    })

    it("should filter by status when provided", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.trace.findMany.mockResolvedValue([mockTrace])

      const response = await app.request(
        "/api/traces?organizationId=org_123&status=success"
      )

      expect(response.status).toBe(200)
      expect(mockDb.query.trace.findMany).toHaveBeenCalled()
    })

    it("should filter by search term on name field", async () => {
      // Search filtering now happens at database level, so mock returns filtered result
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.trace.findMany.mockResolvedValue([mockTrace]) // Only matching trace returned

      const response = await app.request(
        "/api/traces?organizationId=org_123&search=figma"
      )

      expect(response.status).toBe(200)
      const data = (await response.json()) as ListTracesResponse
      expect(data.traces).toHaveLength(1)
      expect(data.traces[0]!.name).toBe("figma:get_components")
      expect(mockDb.query.trace.findMany).toHaveBeenCalled()
    })

    it("should respect pagination parameters", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.trace.findMany.mockResolvedValue([])

      const response = await app.request(
        "/api/traces?organizationId=org_123&limit=10&offset=5"
      )

      expect(response.status).toBe(200)
      const data = (await response.json()) as ListTracesResponse
      expect(data.limit).toBe(10)
      expect(data.offset).toBe(5)
    })
  })

  describe("GET /api/traces/:id", () => {
    it("should return 404 when trace not found", async () => {
      mockDb.query.trace.findFirst.mockResolvedValue(null)

      const response = await app.request("/api/traces/tr_notfound")

      expect(response.status).toBe(404)
    })

    it("should return 403 when user is not member of trace organization", async () => {
      mockDb.query.trace.findFirst.mockResolvedValue(mockTrace)
      mockDb.query.member.findFirst.mockResolvedValue(null)

      const response = await app.request("/api/traces/tr_123")

      expect(response.status).toBe(403)
    })

    it("should return trace details with parsed attributes", async () => {
      mockDb.query.trace.findFirst.mockResolvedValue(mockTrace)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const response = await app.request("/api/traces/tr_123")

      expect(response.status).toBe(200)
      const data = (await response.json()) as SingleTraceResponse
      expect(data.trace.id).toBe("tr_123")
      expect(data.trace.name).toBe("figma:get_components")
      expect(data.trace.attributes?.toolName).toBe("get_components")
      expect(data.trace.attributes?.arguments).toEqual({ fileId: "abc123" })
    })

    it("should handle traces with null attributes", async () => {
      const traceWithNullAttrs = {
        ...mockTrace,
        attributes: null,
        events: null,
      }
      mockDb.query.trace.findFirst.mockResolvedValue(traceWithNullAttrs)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const response = await app.request("/api/traces/tr_123")

      expect(response.status).toBe(200)
      const data = (await response.json()) as SingleTraceResponse
      expect(data.trace.attributes).toBeNull()
      expect(data.trace.events).toBeNull()
    })
  })
})
