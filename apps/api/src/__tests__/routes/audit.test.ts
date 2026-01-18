/**
 * Tests for the Audit routes
 *
 * These tests verify the audit log operations including:
 * - Listing audit events with filters (action, actorId, startDate, endDate)
 * - Pagination (limit/offset)
 * - Organization membership verification
 * - Creating audit log entries
 * - Validation of required fields
 * - The logAuditEvent helper function
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
vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  detectDatabaseType: vi.fn(() => "sqlite"),
  getSchema: vi.fn(() => mockSchema),
  auditLog: {
    id: "id",
    organizationId: "organizationId",
    action: "action",
    actorId: "actorId",
    targetType: "targetType",
    targetId: "targetId",
    metadata: "metadata",
    createdAt: "createdAt",
  },
  user: {
    id: "id",
    name: "name",
  },
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

vi.mock("../../services", () => ({
  verifyOrganizationMembership: vi.fn(),
  generateUUID: vi.fn(() => "generated-uuid-123"),
}))

// Type for test response data
interface AuditEntry {
  id: string
  action: string
  actorId: string
  actorName: string | null
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface ListAuditResponse {
  entries: AuditEntry[]
  total: number
  limit: number
  offset: number
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
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

const mockAuditEntries = [
  {
    id: "audit_001",
    action: "mcp_server.created",
    actorId: "user_123",
    actorName: "Test User",
    targetType: "mcp_server",
    targetId: "server_001",
    metadata: JSON.stringify({ name: "Test Server" }),
    createdAt: now,
  },
  {
    id: "audit_002",
    action: "member.invited",
    actorId: "user_456",
    actorName: "Other User",
    targetType: "member",
    targetId: "member_001",
    metadata: JSON.stringify({ email: "invited@example.com" }),
    createdAt: yesterday,
  },
  {
    id: "audit_003",
    action: "api_key.created",
    actorId: "user_123",
    actorName: "Test User",
    targetType: "api_key",
    targetId: "key_001",
    metadata: null,
    createdAt: twoDaysAgo,
  },
]

// Mock schema
const mockSchema = {
  auditLog: {
    id: "id",
    organizationId: "organizationId",
    action: "action",
    actorId: "actorId",
    targetType: "targetType",
    targetId: "targetId",
    metadata: "metadata",
    createdAt: "createdAt",
  },
  user: {
    id: "id",
    name: "name",
  },
}

// Mock database
const mockDb = {
  query: {
    auditLog: {
      findMany: vi.fn(),
    },
  },
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve(mockAuditEntries)),
            })),
          })),
        })),
      })),
      where: vi.fn(() => Promise.resolve([{ count: 3 }])),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  })),
}

describe("Audit Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe("GET /api/audit", () => {
    it("should list audit events with organizationId filter", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockAuditEntries),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123")
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries).toHaveLength(3)
      expect(data.total).toBe(3)
      expect(data.limit).toBe(20)
      expect(data.offset).toBe(0)
    })

    it("should filter by action type", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      const filteredEntries = [mockAuditEntries[0]]
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(filteredEntries),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&action=mcp_server.created"
      )
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries).toHaveLength(1)
      expect(data.entries[0]!.action).toBe("mcp_server.created")
    })

    it("should filter by actorId", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      const filteredEntries = mockAuditEntries.filter(
        (e) => e.actorId === "user_123"
      )
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(filteredEntries),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&actorId=user_123"
      )
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries).toHaveLength(2)
      expect(data.entries.every((e) => e.actorId === "user_123")).toBe(true)
    })

    it("should filter by date range (startDate and endDate)", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      const filteredEntries = [mockAuditEntries[1]]
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(filteredEntries),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const startDate = twoDaysAgo.toISOString()
      const endDate = yesterday.toISOString()
      const response = await app.request(
        `/api/audit?organizationId=org_123&startDate=${startDate}&endDate=${endDate}`
      )
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries).toHaveLength(1)
    })

    it("should support pagination with limit and offset", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      const paginatedEntries = [mockAuditEntries[1]]
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(paginatedEntries),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&limit=1&offset=1"
      )
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries).toHaveLength(1)
      expect(data.limit).toBe(1)
      expect(data.offset).toBe(1)
      expect(data.total).toBe(3)
    })

    it("should return 403 when not org member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(false)

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain(
        "You do not have access to this organization"
      )
    })

    it("should return empty array when no audit entries exist", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123")
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries).toEqual([])
      expect(data.total).toBe(0)
    })

    it("should parse metadata JSON in entries", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([mockAuditEntries[0]]),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123")
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries[0]!.metadata).toEqual({ name: "Test Server" })
    })

    it("should handle null metadata gracefully", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([mockAuditEntries[2]]),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123")
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.entries[0]!.metadata).toBeNull()
    })

    it("should return 400 for missing organizationId", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit")
      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid action type", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&action=invalid_action"
      )
      expect(response.status).toBe(400)
    })
  })
  describe("POST /api/audit", () => {
    it("should create audit entry successfully", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mcp_server.created",
          targetType: "mcp_server",
          targetId: "server_001",
          metadata: { name: "New Server" },
        }),
      })

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(201)
      expect(data.message).toBe("Audit event logged successfully")
    })

    it("should return 400 for missing organizationId", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mcp_server.created",
          targetType: "mcp_server",
          targetId: "server_001",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("organizationId query parameter is required")
    })

    it("should return 403 when not org member", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(false)

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mcp_server.created",
          targetType: "mcp_server",
          targetId: "server_001",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain(
        "You do not have access to this organization"
      )
    })

    it("should return 400 for invalid action", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invalid_action",
          targetType: "mcp_server",
          targetId: "server_001",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid targetType", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mcp_server.created",
          targetType: "invalid_target",
          targetId: "server_001",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for missing targetId", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mcp_server.created",
          targetType: "mcp_server",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should create audit entry without metadata", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "api_key.revoked",
          targetType: "api_key",
          targetId: "key_001",
        }),
      })

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(201)
      expect(data.message).toBe("Audit event logged successfully")
    })
  })
  describe("logAuditEvent helper", () => {
    it("should insert audit event with all fields", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { logAuditEvent } = await import("../../routes/audit")

      await logAuditEvent({
        action: "member.invited",
        targetType: "member",
        targetId: "member_001",
        actorId: "user_123",
        organizationId: "org_123",
        metadata: { email: "test@example.com", role: "admin" },
      })

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it("should insert audit event without metadata", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { logAuditEvent } = await import("../../routes/audit")

      await logAuditEvent({
        action: "api_key.created",
        targetType: "api_key",
        targetId: "key_001",
        actorId: "user_123",
        organizationId: "org_123",
      })

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it("should generate UUID for audit entry", async () => {
      const { generateUUID } = await import("../../services")

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { logAuditEvent } = await import("../../routes/audit")

      await logAuditEvent({
        action: "organization.updated",
        targetType: "organization",
        targetId: "org_001",
        actorId: "user_123",
        organizationId: "org_123",
      })

      expect(generateUUID).toHaveBeenCalled()
    })
  })
  describe("Edge Cases", () => {
    it("should handle complex metadata objects", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const complexMetadata = {
        changes: {
          before: { name: "Old Name", status: "active" },
          after: { name: "New Name", status: "inactive" },
        },
        triggeredBy: "scheduled_job",
        tags: ["automated", "migration"],
      }

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "organization.updated",
          targetType: "organization",
          targetId: "org_001",
          metadata: complexMetadata,
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should handle maximum limit value", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockAuditEntries),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&limit=100"
      )
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.limit).toBe(100)
    })

    it("should return 400 for limit exceeding maximum", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&limit=101"
      )

      expect(response.status).toBe(400)
    })

    it("should return 400 for negative offset", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request(
        "/api/audit?organizationId=org_123&offset=-1"
      )

      expect(response.status).toBe(400)
    })

    it("should handle all valid action types", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const validActions = [
        "organization.created",
        "organization.updated",
        "organization.deleted",
        "mcp_server.created",
        "mcp_server.updated",
        "mcp_server.deleted",
        "member.invited",
        "member.joined",
        "member.removed",
        "member.role_changed",
        "api_key.created",
        "api_key.revoked",
      ]

      for (const action of validActions) {
        const response = await app.request(
          "/api/audit?organizationId=org_123",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              targetType: "organization",
              targetId: "org_001",
            }),
          }
        )

        expect(response.status).toBe(201)
      }
    })

    it("should handle all valid target types", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const validTargetTypes = [
        "organization",
        "mcp_server",
        "member",
        "invitation",
        "api_key",
      ]

      for (const targetType of validTargetTypes) {
        const response = await app.request(
          "/api/audit?organizationId=org_123",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "organization.created",
              targetType,
              targetId: "target_001",
            }),
          }
        )

        expect(response.status).toBe(201)
      }
    })

    it("should handle empty string targetId validation", async () => {
      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mcp_server.created",
          targetType: "mcp_server",
          targetId: "",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should use default limit when not provided", async () => {
      const { verifyOrganizationMembership } = await import("../../services")
      vi.mocked(verifyOrganizationMembership).mockResolvedValue(true)

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })

      const { default: audit } = await import("../../routes/audit")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/audit", audit)

      const response = await app.request("/api/audit?organizationId=org_123")
      const data = (await response.json()) as ListAuditResponse

      expect(response.status).toBe(200)
      expect(data.limit).toBe(20)
      expect(data.offset).toBe(0)
    })
  })
})
