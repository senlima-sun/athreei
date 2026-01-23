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
  mockPlugin,
  mockPluginVersion,
  mockSearchPlugins,
  mockGetPluginDetails,
  mockGetPluginVersions,
  mockGetPluginVersionDetails,
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
    slug: "official",
    name: "Official Marketplace",
  }

  const mockPlugin = {
    id: "plg_123",
    marketplaceId: "mkt_123",
    slug: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin for testing",
    author: "Test Author",
    tags: "[]",
    downloadCount: "100",
    isVerified: false,
    isFeatured: false,
    createdAt: now,
    updatedAt: now,
    marketplace: mockMarketplace,
  }

  const mockPluginVersion = {
    id: "pv_123",
    pluginId: "plg_123",
    version: "1.0.0",
    manifest: JSON.stringify({ name: "Test Plugin", version: "1.0.0" }),
    isLatest: true,
    publishedAt: now,
    createdAt: now,
  }

  const mockDb = {
    query: {
      marketplace: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      plugin: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      pluginVersion: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      pluginComponent: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
      })),
    })),
  }

  const mockSearchPlugins = vi.fn()
  const mockGetPluginDetails = vi.fn()
  const mockGetPluginVersions = vi.fn()
  const mockGetPluginVersionDetails = vi.fn()

  return {
    mockDb,
    mockAuthContext,
    mockPlugin,
    mockPluginVersion,
    mockSearchPlugins,
    mockGetPluginDetails,
    mockGetPluginVersions,
    mockGetPluginVersionDetails,
  }
})

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  detectDatabaseType: vi.fn(() => "sqlite"),
  plugin: {
    id: "id",
    marketplaceId: "marketplace_id",
    slug: "slug",
    name: "name",
    description: "description",
    author: "author",
    tags: "tags",
    downloadCount: "download_count",
    isVerified: "is_verified",
    isFeatured: "is_featured",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  marketplace: {
    id: "id",
    slug: "slug",
    name: "name",
  },
  pluginVersion: {
    id: "id",
    pluginId: "plugin_id",
    version: "version",
    manifest: "manifest",
    isLatest: "is_latest",
    publishedAt: "published_at",
    createdAt: "created_at",
  },
  pluginComponent: {
    id: "id",
    pluginVersionId: "plugin_version_id",
    type: "type",
    name: "name",
    config: "config",
    createdAt: "created_at",
  },
}))

vi.mock("../../services/plugin-discovery", () => ({
  searchPlugins: mockSearchPlugins,
  getPluginDetails: mockGetPluginDetails,
  getPluginVersions: mockGetPluginVersions,
  getPluginVersionDetails: mockGetPluginVersionDetails,
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

interface PluginResponse {
  id: string
  slug: string
  name: string
  description?: string | null
  author?: string | null
  tags: string[]
  downloadCount: number
  isVerified: boolean
  isFeatured: boolean
  marketplace: {
    id: string
    slug: string
    name: string
  }
}

interface ListPluginsResponse {
  plugins: PluginResponse[]
  total: number
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface PluginVersionResponse {
  id: string
  version: string
  manifest: unknown
  isLatest: boolean
  publishedAt: string
  createdAt: string
}

describe("Plugin Routes", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/plugins", () => {
    it("should list plugins without filters", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [mockPlugin],
        total: 1,
        pagination: { limit: 20, offset: 0, total: 1, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins")
      const data = (await response.json()) as ListPluginsResponse

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("plugins")
      expect(data).toHaveProperty("pagination")
      expect(mockSearchPlugins).toHaveBeenCalled()
    })

    it("should filter by marketplace slug", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [mockPlugin],
        total: 1,
        pagination: { limit: 20, offset: 0, total: 1, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request(
        "/api/plugins?marketplaceSlug=official"
      )

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ marketplaceSlug: "official" }),
        undefined
      )
    })

    it("should filter by search term", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [mockPlugin],
        total: 1,
        pagination: { limit: 20, offset: 0, total: 1, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?search=test")

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test" }),
        undefined
      )
    })

    it("should filter by tags", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 0,
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?tags=ai,automation")

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ tags: "ai,automation" }),
        undefined
      )
    })

    it("should filter by isVerified", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 0,
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?isVerified=true")

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: true }),
        undefined
      )
    })

    it("should filter by isFeatured", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 0,
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?isFeatured=true")

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ isFeatured: true }),
        undefined
      )
    })

    it("should sort by popularity", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 0,
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?sort=popularity")

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "popularity" }),
        undefined
      )
    })

    it("should sort by recent", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 0,
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?sort=recent")

      expect(response.status).toBe(200)
      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "recent" }),
        undefined
      )
    })

    it("should respect pagination parameters", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 100,
        pagination: { limit: 10, offset: 20, total: 100, hasMore: true },
      })

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins?limit=10&offset=20")
      const data = (await response.json()) as ListPluginsResponse

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.offset).toBe(20)
    })
  })

  describe("GET /api/plugins/:marketplaceSlug/:pluginSlug", () => {
    it("should return plugin details", async () => {
      mockGetPluginDetails.mockResolvedValue(mockPlugin)

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins/official/test-plugin")

      expect(response.status).toBe(200)
      expect(mockGetPluginDetails).toHaveBeenCalledWith(
        "official",
        "test-plugin",
        undefined
      )
    })

    it("should return 404 for non-existent plugin", async () => {
      mockGetPluginDetails.mockResolvedValue(null)

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request("/api/plugins/official/non-existent")

      expect(response.status).toBe(404)
    })
  })

  describe("GET /api/plugins/:marketplaceSlug/:pluginSlug/versions", () => {
    it("should return plugin versions", async () => {
      mockGetPluginVersions.mockResolvedValue([mockPluginVersion])

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request(
        "/api/plugins/official/test-plugin/versions"
      )
      const data = (await response.json()) as {
        versions: PluginVersionResponse[]
      }

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("versions")
      expect(mockGetPluginVersions).toHaveBeenCalledWith(
        "official",
        "test-plugin",
        undefined
      )
    })

    it("should return 404 when no versions found", async () => {
      mockGetPluginVersions.mockResolvedValue([])

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request(
        "/api/plugins/official/test-plugin/versions"
      )

      expect(response.status).toBe(404)
    })
  })

  describe("GET /api/plugins/:marketplaceSlug/:pluginSlug/versions/:version", () => {
    it("should return specific version details", async () => {
      const versionDetails = {
        ...mockPluginVersion,
        components: [],
      }
      mockGetPluginVersionDetails.mockResolvedValue(versionDetails)

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request(
        "/api/plugins/official/test-plugin/versions/1.0.0"
      )

      expect(response.status).toBe(200)
      expect(mockGetPluginVersionDetails).toHaveBeenCalledWith(
        "official",
        "test-plugin",
        "1.0.0",
        undefined
      )
    })

    it("should return 404 for non-existent version", async () => {
      mockGetPluginVersionDetails.mockResolvedValue(null)

      const { default: plugins } = await import("../../routes/plugins")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/plugins", plugins)

      const response = await app.request(
        "/api/plugins/official/test-plugin/versions/9.9.9"
      )

      expect(response.status).toBe(404)
    })
  })
})
