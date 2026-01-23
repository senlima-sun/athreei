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
  mockAuthContext,
  mockMarketplace,
  mockVerifyOrganizationMembership,
  mockGenerateMarketplaceId,
} = vi.hoisted(() => {
  const now = new Date()

  const mockAuthContext = {
    userId: "user_123",
    email: "test@example.com",
    name: "Test User",
    session: {
      id: "session_123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  }

  const mockMarketplace = {
    id: "mkt_123",
    slug: "test-marketplace",
    name: "Test Marketplace",
    description: "A test marketplace",
    ownerType: "organization",
    ownerId: "org_123",
    sourceType: "internal",
    sourceUrl: null,
    sourceRepo: null,
    sourceRef: null,
    isPublic: true,
    isDefault: false,
    autoUpdate: true,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb: Record<string, any> = {
    query: {
      marketplace: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([mockMarketplace])),
            })),
          })),
        })),
        limit: vi.fn(() => Promise.resolve([mockMarketplace])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  }

  const mockVerifyOrganizationMembership = vi.fn(() => Promise.resolve(true))
  const mockGenerateMarketplaceId = vi.fn(() => "mkt_new_123")

  return {
    mockDb,
    mockAuthContext,
    mockMarketplace,
    mockVerifyOrganizationMembership,
    mockGenerateMarketplaceId,
  }
})

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  detectDatabaseType: vi.fn(() => "sqlite"),
  marketplace: {
    id: "id",
    slug: "slug",
    name: "name",
    description: "description",
    ownerType: "owner_type",
    ownerId: "owner_id",
    sourceType: "source_type",
    sourceUrl: "source_url",
    sourceRepo: "source_repo",
    sourceRef: "source_ref",
    isPublic: "is_public",
    isDefault: "is_default",
    autoUpdate: "auto_update",
    lastSyncedAt: "last_synced_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}))

vi.mock("../../services", () => ({
  verifyOrganizationMembership: mockVerifyOrganizationMembership,
  generateMarketplaceId: mockGenerateMarketplaceId,
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
    conflict: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 409
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
  },
}))

interface MarketplaceResponse {
  id: string
  slug: string
  name: string
  description?: string | null
  ownerType: string
  ownerId?: string | null
  sourceType: string
  isPublic: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface ListMarketplacesResponse {
  data: MarketplaceResponse[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface ErrorResponse {
  error: string
  code?: string
}

describe("Marketplace Routes", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/marketplaces", () => {
    it("should list public marketplaces without auth", async () => {
      const mockResults = [mockMarketplace]
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve(mockResults)),
              })),
            })),
          })),
        })),
      })

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces")
      const data = (await response.json()) as ListMarketplacesResponse

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("data")
      expect(data).toHaveProperty("pagination")
    })

    it("should filter by ownerType", async () => {
      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request(
        "/api/marketplaces?ownerType=organization"
      )

      expect(response.status).toBe(200)
    })

    it("should filter by search term", async () => {
      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces?search=test")

      expect(response.status).toBe(200)
    })

    it("should respect limit and offset pagination", async () => {
      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces?limit=10&offset=5")

      expect(response.status).toBe(200)
    })
  })

  describe("GET /api/marketplaces/:slug", () => {
    it("should return marketplace by slug", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockMarketplace])),
          })),
        })),
      })

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace")

      expect(response.status).toBe(200)
    })

    it("should return 404 for non-existent marketplace", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/non-existent")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("not found")
    })

    it("should deny access to private marketplace for non-members", async () => {
      const privateMarketplace = { ...mockMarketplace, isPublic: false }
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([privateMarketplace])),
          })),
        })),
      })
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request(
        "/api/marketplaces/private-marketplace"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("denied")
    })
  })

  describe("POST /api/marketplaces", () => {
    it("should create marketplace with valid input", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValueOnce(null)
      mockDb.query.marketplace.findFirst.mockResolvedValueOnce({
        ...mockMarketplace,
        id: "mkt_new_123",
      })
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request(
        "/api/marketplaces?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: "new-marketplace",
            name: "New Marketplace",
            description: "A new marketplace",
            isPublic: true,
          }),
        }
      )

      expect(response.status).toBe(201)
    })

    it("should require organizationId query parameter", async () => {
      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "new-marketplace",
          name: "New Marketplace",
        }),
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("organizationId")
    })

    it("should return 403 for non-member organization", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request(
        "/api/marketplaces?organizationId=org_456",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: "new-marketplace",
            name: "New Marketplace",
          }),
        }
      )
      await response.json()

      expect(response.status).toBe(403)
    })

    it("should return 409 for duplicate slug", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValue(mockMarketplace)
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request(
        "/api/marketplaces?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: "test-marketplace",
            name: "Duplicate Marketplace",
          }),
        }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(409)
      expect(data.error).toContain("already exists")
    })

    it("should validate required fields", async () => {
      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request(
        "/api/marketplaces?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )

      expect(response.status).toBe(400)
    })
  })

  describe("PATCH /api/marketplaces/:slug", () => {
    it("should update marketplace name", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValueOnce(mockMarketplace)
      mockDb.query.marketplace.findFirst.mockResolvedValueOnce({
        ...mockMarketplace,
        name: "Updated Name",
      })
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })

      expect(response.status).toBe(200)
    })

    it("should return 404 for non-existent marketplace", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValue(null)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/non-existent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })
      await response.json()

      expect(response.status).toBe(404)
    })

    it("should return 403 for non-member trying to update", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValue(mockMarketplace)
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })
      await response.json()

      expect(response.status).toBe(403)
    })

    it("should not allow updating system marketplace", async () => {
      const systemMarketplace = { ...mockMarketplace, ownerType: "system" }
      mockDb.query.marketplace.findFirst.mockResolvedValue(systemMarketplace)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("admins")
    })
  })

  describe("DELETE /api/marketplaces/:slug", () => {
    it("should delete marketplace", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValue(mockMarketplace)
      mockVerifyOrganizationMembership.mockResolvedValue(true)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace", {
        method: "DELETE",
      })

      expect(response.status).toBe(200)
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it("should return 404 for non-existent marketplace", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValue(null)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/non-existent", {
        method: "DELETE",
      })
      await response.json()

      expect(response.status).toBe(404)
    })

    it("should return 403 for non-member trying to delete", async () => {
      mockDb.query.marketplace.findFirst.mockResolvedValue(mockMarketplace)
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace", {
        method: "DELETE",
      })
      await response.json()

      expect(response.status).toBe(403)
    })

    it("should not allow deleting system marketplace", async () => {
      const systemMarketplace = { ...mockMarketplace, ownerType: "system" }
      mockDb.query.marketplace.findFirst.mockResolvedValue(systemMarketplace)

      const { default: marketplaces } =
        await import("../../routes/marketplaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/marketplaces", marketplaces)

      const response = await app.request("/api/marketplaces/test-marketplace", {
        method: "DELETE",
      })
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("admins")
    })
  })
})
