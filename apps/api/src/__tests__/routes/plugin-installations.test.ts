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
  mockAuthContext,
  mockInstallation,
  mockInstallPlugin,
  mockUninstallPlugin,
  mockUpdateInstallation,
  mockUpdateInstallationVersion,
  mockListInstallations,
  mockGetDecryptedEnv,
  mockVerifyOrganizationMembership,
  mockCheckEnvRateLimit,
  mockSetEnvRateLimitHeaders,
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

  const mockInstallation = {
    id: "pi_123",
    organizationId: "org_123",
    pluginId: "plg_123",
    pluginVersionId: "pv_123",
    installedBy: "user_123",
    scope: "organization",
    status: "active",
    config: null,
    installedAt: now,
    updatedAt: now,
    plugin: {
      id: "plg_123",
      slug: "test-plugin",
      name: "Test Plugin",
      marketplace: {
        id: "mkt_123",
        slug: "official",
        name: "Official Marketplace",
      },
    },
    version: {
      id: "pv_123",
      version: "1.0.0",
    },
  }

  const mockInstallPlugin = vi.fn()
  const mockUninstallPlugin = vi.fn()
  const mockUpdateInstallation = vi.fn()
  const mockUpdateInstallationVersion = vi.fn()
  const mockListInstallations = vi.fn()
  const mockGetDecryptedEnv = vi.fn()
  const mockVerifyOrganizationMembership = vi.fn()
  const mockCheckEnvRateLimit = vi.fn(() => ({
    allowed: true,
    remaining: 10,
    resetAt: new Date(Date.now() + 60000),
  }))
  const mockSetEnvRateLimitHeaders = vi.fn()

  return {
    mockAuthContext,
    mockInstallation,
    mockInstallPlugin,
    mockUninstallPlugin,
    mockUpdateInstallation,
    mockUpdateInstallationVersion,
    mockListInstallations,
    mockGetDecryptedEnv,
    mockVerifyOrganizationMembership,
    mockCheckEnvRateLimit,
    mockSetEnvRateLimitHeaders,
  }
})

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => ({})),
}))

vi.mock("../../services", () => ({
  verifyOrganizationMembership: mockVerifyOrganizationMembership,
  installPlugin: mockInstallPlugin,
  uninstallPlugin: mockUninstallPlugin,
  updateInstallation: mockUpdateInstallation,
  updateInstallationVersion: mockUpdateInstallationVersion,
  listInstallations: mockListInstallations,
  getDecryptedEnv: mockGetDecryptedEnv,
  checkEnvRateLimit: mockCheckEnvRateLimit,
  setEnvRateLimitHeaders: mockSetEnvRateLimitHeaders,
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

interface InstallationResponse {
  id: string
  organizationId: string
  pluginId: string
  pluginVersionId: string
  installedBy: string | null
  scope: string
  status: string
  config: unknown
  installedAt: string
  updatedAt: string
  plugin: {
    id: string
    slug: string
    name: string
    marketplace: {
      id: string
      slug: string
      name: string
    }
  }
  version: {
    id: string
    version: string
  }
}

interface ListInstallationsResponse {
  data: InstallationResponse[]
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

describe("Plugin Installation Routes", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /:orgId/plugins", () => {
    it("should list installations for organization", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockListInstallations.mockResolvedValue({
        data: [mockInstallation],
        pagination: { limit: 20, offset: 0, total: 1, hasMore: false },
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request("/api/organizations/org_123/plugins")
      const data = (await response.json()) as ListInstallationsResponse

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("data")
      expect(data).toHaveProperty("pagination")
      expect(mockListInstallations).toHaveBeenCalledWith(
        "org_123",
        expect.any(Object)
      )
    })

    it("should filter by status", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockListInstallations.mockResolvedValue({
        data: [],
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins?status=active"
      )

      expect(response.status).toBe(200)
      expect(mockListInstallations).toHaveBeenCalledWith(
        "org_123",
        expect.objectContaining({ status: "active" })
      )
    })

    it("should filter by scope", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockListInstallations.mockResolvedValue({
        data: [],
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins?scope=user"
      )

      expect(response.status).toBe(200)
      expect(mockListInstallations).toHaveBeenCalledWith(
        "org_123",
        expect.objectContaining({ scope: "user" })
      )
    })

    it("should return 403 for non-member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request("/api/organizations/org_456/plugins")

      expect(response.status).toBe(403)
    })
  })

  describe("POST /:orgId/plugins/install", () => {
    it("should install plugin with valid input", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockInstallPlugin.mockResolvedValue(mockInstallation)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/install",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketplaceSlug: "official",
            pluginSlug: "test-plugin",
            scope: "organization",
          }),
        }
      )

      expect(response.status).toBe(201)
      expect(mockInstallPlugin).toHaveBeenCalledWith(
        "org_123",
        "user_123",
        expect.objectContaining({
          marketplaceSlug: "official",
          pluginSlug: "test-plugin",
          scope: "organization",
        })
      )
    })

    it("should install specific version", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockInstallPlugin.mockResolvedValue(mockInstallation)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/install",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketplaceSlug: "official",
            pluginSlug: "test-plugin",
            version: "1.0.0",
            scope: "organization",
          }),
        }
      )

      expect(response.status).toBe(201)
      expect(mockInstallPlugin).toHaveBeenCalledWith(
        "org_123",
        "user_123",
        expect.objectContaining({ version: "1.0.0" })
      )
    })

    it("should install with config", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockInstallPlugin.mockResolvedValue(mockInstallation)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/install",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketplaceSlug: "official",
            pluginSlug: "test-plugin",
            scope: "organization",
            config: { enabled: true, setting: "value" },
          }),
        }
      )

      expect(response.status).toBe(201)
      expect(mockInstallPlugin).toHaveBeenCalledWith(
        "org_123",
        "user_123",
        expect.objectContaining({ config: { enabled: true, setting: "value" } })
      )
    })

    it("should return 403 for non-member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_456/plugins/install",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketplaceSlug: "official",
            pluginSlug: "test-plugin",
          }),
        }
      )

      expect(response.status).toBe(403)
    })

    it("should return 409 when plugin already installed", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockInstallPlugin.mockRejectedValue(
        new Error("Plugin is already installed with this scope")
      )

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/install",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketplaceSlug: "official",
            pluginSlug: "test-plugin",
          }),
        }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(409)
      expect(data.error).toContain("already installed")
    })
  })

  describe("POST /:orgId/plugins/:installationId/uninstall", () => {
    it("should uninstall plugin", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUninstallPlugin.mockResolvedValue(undefined)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/uninstall",
        { method: "POST" }
      )

      expect(response.status).toBe(200)
      expect(mockUninstallPlugin).toHaveBeenCalledWith(
        "org_123",
        "pi_123",
        "user_123"
      )
    })

    it("should return 403 for non-member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_456/plugins/pi_123/uninstall",
        { method: "POST" }
      )

      expect(response.status).toBe(403)
    })

    it("should return 404 for non-existent installation", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUninstallPlugin.mockRejectedValue(new Error("Installation not found"))

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_nonexistent/uninstall",
        { method: "POST" }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("not found")
    })
  })

  describe("PATCH /:orgId/plugins/:installationId", () => {
    it("should update installation config", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUpdateInstallation.mockResolvedValue({
        ...mockInstallation,
        config: { newSetting: "value" },
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: { newSetting: "value" } }),
        }
      )

      expect(response.status).toBe(200)
      expect(mockUpdateInstallation).toHaveBeenCalledWith(
        "org_123",
        "pi_123",
        "user_123",
        expect.objectContaining({ config: { newSetting: "value" } })
      )
    })

    it("should update installation envValues", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUpdateInstallation.mockResolvedValue(mockInstallation)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ envValues: { API_KEY: "new_value" } }),
        }
      )

      expect(response.status).toBe(200)
      expect(mockUpdateInstallation).toHaveBeenCalledWith(
        "org_123",
        "pi_123",
        "user_123",
        expect.objectContaining({ envValues: { API_KEY: "new_value" } })
      )
    })

    it("should return 403 for non-member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_456/plugins/pi_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: { setting: "value" } }),
        }
      )

      expect(response.status).toBe(403)
    })

    it("should return 404 for non-existent installation", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUpdateInstallation.mockRejectedValue(
        new Error("Installation not found")
      )

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_nonexistent",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: { setting: "value" } }),
        }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("not found")
    })
  })

  describe("POST /:orgId/plugins/:installationId/update", () => {
    it("should update to latest version", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUpdateInstallationVersion.mockResolvedValue({
        ...mockInstallation,
        version: { id: "pv_456", version: "2.0.0" },
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )

      expect(response.status).toBe(200)
      expect(mockUpdateInstallationVersion).toHaveBeenCalledWith(
        "org_123",
        "pi_123",
        "user_123",
        undefined
      )
    })

    it("should update to specific version", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUpdateInstallationVersion.mockResolvedValue({
        ...mockInstallation,
        version: { id: "pv_789", version: "1.5.0" },
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: "1.5.0" }),
        }
      )

      expect(response.status).toBe(200)
      expect(mockUpdateInstallationVersion).toHaveBeenCalledWith(
        "org_123",
        "pi_123",
        "user_123",
        "1.5.0"
      )
    })

    it("should return 400 when already on version", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockUpdateInstallationVersion.mockRejectedValue(
        new Error("Already on the specified version")
      )

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: "1.0.0" }),
        }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("Already on")
    })

    it("should return 403 for non-member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_456/plugins/pi_123/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )

      expect(response.status).toBe(403)
    })
  })

  describe("GET /:orgId/plugins/:installationId/env", () => {
    it("should return decrypted env values", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockGetDecryptedEnv.mockResolvedValue({ API_KEY: "secret123" })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/env"
      )
      const data = (await response.json()) as {
        envValues: Record<string, string>
      }

      expect(response.status).toBe(200)
      expect(data.envValues).toEqual({ API_KEY: "secret123" })
      expect(mockGetDecryptedEnv).toHaveBeenCalledWith("org_123", "pi_123")
    })

    it("should return empty object when no env values", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockGetDecryptedEnv.mockResolvedValue({})

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/env"
      )
      const data = (await response.json()) as {
        envValues: Record<string, string>
      }

      expect(response.status).toBe(200)
      expect(data.envValues).toEqual({})
    })

    it("should return 403 for non-member", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(false)

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_456/plugins/pi_123/env"
      )

      expect(response.status).toBe(403)
    })

    it("should return 400 when rate limited", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockCheckEnvRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
      })

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_123/env"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("Rate limit")
    })

    it("should return 404 for non-existent installation", async () => {
      mockVerifyOrganizationMembership.mockResolvedValue(true)
      mockCheckEnvRateLimit.mockReturnValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(Date.now() + 60000),
      })
      mockGetDecryptedEnv.mockRejectedValue(new Error("Installation not found"))

      const { default: routes } =
        await import("../../routes/plugin-installations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations/:orgId/plugins", routes)

      const response = await app.request(
        "/api/organizations/org_123/plugins/pi_nonexistent/env"
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("not found")
    })
  })
})
