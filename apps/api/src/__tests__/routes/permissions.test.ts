/**
 * Tests for the Permissions routes
 *
 * These tests verify the permission management operations including:
 * - Listing permissions for an organization
 * - Updating permission levels
 * - Deleting permissions
 * - Authorization checks for org membership
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json(
    { error: err.message, code: (err as Error & { code?: string }).code },
    statusCode
  )
}

const {
  mockDb,
  mockSchema,
  mockAuthContext,
  mockPermissions,
  mockVerifyOrganizationMembership,
} = vi.hoisted(() => {
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
  const mockPermissions = [
    {
      id: "perm_123",
      origin: "https://example.com",
      tool: "browser_navigate",
      allowed: "allowed",
      organizationId: "org_123",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "perm_456",
      origin: "https://example.com",
      tool: "browser_click",
      allowed: "ask",
      organizationId: "org_123",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "perm_789",
      origin: "https://malicious.com",
      tool: "browser_evaluate",
      allowed: "denied",
      organizationId: "org_123",
      createdAt: now,
      updatedAt: now,
    },
  ]

  const mockSchema = {
    permission: {
      id: "id",
      origin: "origin",
      tool: "tool",
      allowed: "allowed",
      organizationId: "organizationId",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }

  const mockDb = {
    query: {
      permission: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  }

  const mockVerifyOrganizationMembership = vi.fn()

  return {
    mockDb,
    mockSchema,
    mockAuthContext,
    mockPermissions,
    mockVerifyOrganizationMembership,
  }
})

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  permission: {
    id: "id",
    origin: "origin",
    tool: "tool",
    allowed: "allowed",
    organizationId: "organizationId",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
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

vi.mock("../../services", () => ({
  verifyOrganizationMembership: mockVerifyOrganizationMembership,
}))

interface PermissionResponse {
  id: string
  origin: string
  tool: string
  allowed: string
  createdAt: number
  updatedAt: number
}

interface PermissionListResponse {
  data: PermissionResponse[]
  count: number
}

interface MessageResponse {
  message: string
}

interface ErrorResponse {
  error: string
  code?: string
}

describe("Permissions Routes", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /permissions", () => {
    it("should list all permissions for an organization", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue(mockPermissions)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as PermissionListResponse

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(3)
      expect(data.count).toBe(3)
      expect(data.data[0]).toMatchObject({
        id: "perm_123",
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed",
      })
    })

    it("should return 400 when missing organizationId", async () => {
      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("organizationId query parameter is required")
    })

    it("should return 403 when not org member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain(
        "You do not have access to this organization"
      )
    })

    it("should return empty array when no permissions exist", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue([])

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as PermissionListResponse

      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
      expect(data.count).toBe(0)
    })

    it("should transform date fields to timestamps", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue([mockPermissions[0]])

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as PermissionListResponse

      expect(response.status).toBe(200)
      expect(typeof data.data[0]!.createdAt).toBe("number")
      expect(typeof data.data[0]!.updatedAt).toBe("number")
    })
  })

  describe("PUT /permissions/:id", () => {
    it("should update permission level", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })
      const data = (await response.json()) as PermissionResponse

      expect(response.status).toBe(200)
      expect(data.id).toBe("perm_123")
      expect(data.allowed).toBe("denied")
      expect(mockDb.update).toHaveBeenCalled()
    })

    it("should return 404 when permission not found", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(null)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_nonexistent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Permission not found")
    })

    it("should return 403 when not org member", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("You do not have access to this permission")
    })

    it("should validate allowed values (allowed)", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "allowed" }),
      })

      expect(response.status).toBe(200)
    })

    it("should validate allowed values (denied)", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })

      expect(response.status).toBe(200)
    })

    it("should validate allowed values (ask)", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "ask" }),
      })

      expect(response.status).toBe(200)
    })

    it("should reject invalid allowed values", async () => {
      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "invalid_value" }),
      })

      expect(response.status).toBe(400)
    })

    it("should reject request without allowed field", async () => {
      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })

    it("should update updatedAt timestamp", async () => {
      const beforeUpdate = Date.now()
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })
      const data = (await response.json()) as PermissionResponse
      const afterUpdate = Date.now()

      expect(response.status).toBe(200)
      expect(data.updatedAt).toBeGreaterThanOrEqual(beforeUpdate)
      expect(data.updatedAt).toBeLessThanOrEqual(afterUpdate)
    })
  })

  describe("DELETE /permissions/:id", () => {
    it("should delete permission successfully", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "DELETE",
      })
      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("Permission deleted successfully")
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it("should return 404 when permission not found", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(null)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_nonexistent", {
        method: "DELETE",
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Permission not found")
    })

    it("should return 403 when not org member", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_123", {
        method: "DELETE",
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("You do not have access to this permission")
    })

    it("should return 404 for empty permission ID", async () => {
      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/", {
        method: "DELETE",
      })

      expect(response.status).toBe(404)
    })
  })

  describe("Edge Cases", () => {
    it("should handle permission with numeric timestamp", async () => {
      const permWithNumericTimestamp = {
        ...mockPermissions[0],
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      }
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue([
        permWithNumericTimestamp,
      ])

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as PermissionListResponse

      expect(response.status).toBe(200)
      expect(data.data[0]!.createdAt).toBe(1704067200000)
      expect(data.data[0]!.updatedAt).toBe(1704067200000)
    })

    it("should handle permission with Date object timestamp", async () => {
      const permWithDateTimestamp = {
        ...mockPermissions[0],
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      }
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue([
        permWithDateTimestamp,
      ])

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as PermissionListResponse

      expect(response.status).toBe(200)
      expect(data.data[0]!.createdAt).toBe(1704067200000)
      expect(data.data[0]!.updatedAt).toBe(1704067200000)
    })

    it("should handle multiple permissions with different allowed states", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue(mockPermissions)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions?organizationId=org_123")
      const data = (await response.json()) as PermissionListResponse

      expect(response.status).toBe(200)
      const allowedStates = data.data.map((p) => p.allowed)
      expect(allowedStates).toContain("allowed")
      expect(allowedStates).toContain("ask")
      expect(allowedStates).toContain("denied")
    })

    it("should handle update with special characters in permission ID", async () => {
      const specialPermission = {
        ...mockPermissions[0],
        id: "perm_abc-123_xyz",
      }
      mockDb.query.permission.findFirst.mockResolvedValue(specialPermission)
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      const response = await app.request("/permissions/perm_abc-123_xyz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })

      expect(response.status).toBe(200)
    })

    it("should verify membership is called with correct parameters", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockDb.query.permission.findMany.mockResolvedValue([])

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      await app.request("/permissions?organizationId=org_test_123")

      expect(mockVerifyOrganizationMembership).toHaveBeenCalledWith(
        "user_123",
        "org_test_123"
      )
    })

    it("should verify membership for permission access check", async () => {
      mockDb.query.permission.findFirst.mockResolvedValue(mockPermissions[0])
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: permissions } = await import("../../routes/permissions")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/permissions", permissions)

      await app.request("/permissions/perm_123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: "denied" }),
      })

      expect(mockVerifyOrganizationMembership).toHaveBeenCalledWith(
        "user_123",
        "org_123"
      )
    })
  })
})
