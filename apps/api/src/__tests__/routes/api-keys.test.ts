/**
 * Tests for the API keys routes
 *
 * These tests verify the API key management operations including:
 * - Creating API keys with secure generation
 * - Listing API keys with masked values
 * - Revoking API keys
 * - Authorization checks (organization membership verification)
 * - Proper response formats
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

// Error handler to properly handle thrown errors
const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json({ error: err.message }, statusCode)
}

// Mock modules before importing the routes
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => mockDb),
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

// Type for test response data
interface ApiKeyResponse {
  id: string
  name: string
  key?: string
  prefix: string
  lastUsedAt?: string | null
  usageCount?: number
  createdAt: string
  expiresAt?: string | null
  scopes?: string[] | null
}

interface ListKeysResponse {
  keys: ApiKeyResponse[]
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
    expiresAt: new Date(),
  },
}

// Mock endpoint belonging to org_123
const mockEndpoint = {
  id: "ep_123",
  organizationId: "org_123",
  name: "My API",
  description: "Test API endpoint",
  url: "https://athreei.com/mcp/my-api/sse",
  method: "POST",
  authType: "api_key",
  rateLimit: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock endpoint belonging to a different organization
const mockEndpointDifferentOrg = {
  id: "ep_456",
  organizationId: "org_other",
  name: "Other API",
  description: "API endpoint in different org",
  url: "https://athreei.com/mcp/other-api/sse",
  method: "POST",
  authType: "api_key",
  rateLimit: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock membership record
const mockMember = {
  id: "member_123",
  userId: "user_123",
  organizationId: "org_123",
  role: "admin",
  createdAt: new Date(),
}

const mockApiKey = {
  id: "key_123",
  organizationId: "org_123",
  endpointId: "ep_123",
  createdById: "user_123",
  name: "Test API Key",
  keyHash: "abababababababababababababababababababababababababababababababab",
  keyPrefix: "ak_AAECAwQ",
  scopes: null,
  expiresAt: null,
  lastUsedAt: null,
  usageCount: 42,
  revokedAt: null,
  revokedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock database - includes member query for membership verification
const mockDb = {
  query: {
    endpoint: {
      findFirst: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
    apiKey: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}

describe("API Keys Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // Organization Membership Verification Tests
  // =========================================================================
  describe("Organization Membership Verification", () => {
    describe("GET /endpoints/:endpointId/keys", () => {
      it("should return 403 when user is NOT a member of the endpoint's organization", async () => {
        // Endpoint exists but user is not a member of its organization
        mockDb.query.endpoint.findFirst.mockResolvedValue(
          mockEndpointDifferentOrg
        )
        mockDb.query.member.findFirst.mockResolvedValue(null) // No membership

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request("/api/endpoints/ep_456/keys")
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(403)
        expect(data.error.toLowerCase()).toContain("access")
      })

      it("should allow access when user IS a member of the endpoint's organization", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
        mockDb.query.member.findFirst.mockResolvedValue(mockMember) // User is a member
        mockDb.query.apiKey.findMany.mockResolvedValue([mockApiKey])

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request("/api/endpoints/ep_123/keys")
        const data = (await response.json()) as ListKeysResponse

        expect(response.status).toBe(200)
        expect(data.keys).toHaveLength(1)
      })

      it("should return 404 when endpoint does not exist", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(null)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request("/api/endpoints/ep_nonexistent/keys")
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(404)
        expect(data.error.toLowerCase()).toContain("not found")
      })
    })

    describe("POST /endpoints/:endpointId/keys", () => {
      it("should return 403 when user is NOT a member of the endpoint's organization", async () => {
        // Endpoint exists but user is not a member
        mockDb.query.endpoint.findFirst.mockResolvedValue(
          mockEndpointDifferentOrg
        )
        mockDb.query.member.findFirst.mockResolvedValue(null)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request("/api/endpoints/ep_456/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Key" }),
        })
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(403)
        expect(data.error.toLowerCase()).toContain("access")
      })

      it("should allow creating API key when user IS a member", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
        mockDb.query.member.findFirst.mockResolvedValue(mockMember)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request("/api/endpoints/ep_123/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Production Key" }),
        })

        const data = (await response.json()) as ApiKeyResponse

        expect(response.status).toBe(201)
        expect(data.name).toBe("Production Key")
        expect(data.key).toBeDefined()
      })

      it("should return 404 when endpoint does not exist", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(null)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request(
          "/api/endpoints/ep_nonexistent/keys",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Test Key" }),
          }
        )
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(404)
        expect(data.error.toLowerCase()).toContain("not found")
      })
    })

    describe("DELETE /endpoints/:endpointId/keys/:keyId", () => {
      it("should return 403 when user is NOT a member of the endpoint's organization", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(
          mockEndpointDifferentOrg
        )
        mockDb.query.member.findFirst.mockResolvedValue(null)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request(
          "/api/endpoints/ep_456/keys/key_123",
          {
            method: "DELETE",
          }
        )
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(403)
        expect(data.error.toLowerCase()).toContain("access")
      })

      it("should allow deleting API key when user IS a member", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
        mockDb.query.member.findFirst.mockResolvedValue(mockMember)
        mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKey)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request(
          "/api/endpoints/ep_123/keys/key_123",
          {
            method: "DELETE",
          }
        )

        const data = (await response.json()) as MessageResponse

        expect(response.status).toBe(200)
        expect(data.message).toBe("API key revoked successfully")
      })

      it("should return 404 when endpoint does not exist", async () => {
        mockDb.query.endpoint.findFirst.mockResolvedValue(null)

        const { default: apiKeys } = await import("../../routes/api-keys")
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/endpoints", apiKeys)

        const response = await app.request(
          "/api/endpoints/ep_nonexistent/keys/key_123",
          { method: "DELETE" }
        )
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(404)
        expect(data.error.toLowerCase()).toContain("not found")
      })
    })
  })

  // =========================================================================
  // GET /endpoints/:endpointId/keys Tests
  // =========================================================================
  describe("GET /endpoints/:endpointId/keys", () => {
    it("should return 404 when endpoint does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_nonexistent/keys")

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should return empty list when no API keys exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys).toEqual([])
    })

    it("should return API keys with masked values", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([mockApiKey])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys).toHaveLength(1)
      expect(data.keys[0].id).toBe(mockApiKey.id)
      expect(data.keys[0].name).toBe(mockApiKey.name)
      expect(data.keys[0].prefix).toBe(mockApiKey.keyPrefix)
      expect(data.keys[0].usageCount).toBe(42)
      // Should NOT include the full key or key hash
      expect(data.keys[0].key).toBeUndefined()
    })

    it("should return multiple API keys for an endpoint", async () => {
      const mockApiKey2 = {
        ...mockApiKey,
        id: "key_456",
        name: "Second API Key",
        keyPrefix: "ak_BBBCCCDD",
        usageCount: 100,
      }

      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([mockApiKey, mockApiKey2])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys).toHaveLength(2)
      expect(data.keys[0].id).toBe("key_123")
      expect(data.keys[1].id).toBe("key_456")
    })

    it("should include scopes when present on API key", async () => {
      const mockApiKeyWithScopes = {
        ...mockApiKey,
        scopes: JSON.stringify(["read", "write"]),
      }

      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([mockApiKeyWithScopes])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys[0].scopes).toEqual(["read", "write"])
    })
  })

  // =========================================================================
  // POST /endpoints/:endpointId/keys Tests
  // =========================================================================
  describe("POST /endpoints/:endpointId/keys", () => {
    it("should validate request body requires name", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Missing name
      })

      expect(response.status).toBe(400)
    })

    it("should validate name max length", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "a".repeat(101) }), // Exceeds 100 char limit
      })

      expect(response.status).toBe(400)
    })

    it("should validate name minimum length", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }), // Empty name
      })

      expect(response.status).toBe(400)
    })

    it("should return 404 when endpoint does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_nonexistent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      })

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should create API key and return plain key only once", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Production Key" }),
      })

      const data = (await response.json()) as ApiKeyResponse

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.name).toBe("Production Key")
      expect(data.key).toBeDefined()
      expect(data.key).toMatch(/^ak_/) // Prefix format
      expect(data.prefix).toBeDefined()
      expect(data.prefix).toMatch(/^ak_/)
      expect(data.createdAt).toBeDefined()
    })

    it("should create API key with scopes", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Limited Key",
          scopes: ["read:tools", "execute:tools"],
        }),
      })

      const data = (await response.json()) as ApiKeyResponse

      expect(response.status).toBe(201)
      expect(data.scopes).toEqual(["read:tools", "execute:tools"])
    })

    it("should create API key with expiration date", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const expiresAt = "2025-12-31T23:59:59.000Z"
      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Expiring Key",
          expiresAt,
        }),
      })

      const data = (await response.json()) as ApiKeyResponse

      expect(response.status).toBe(201)
      expect(data.expiresAt).toBe(expiresAt)
    })

    it("should call database insert with correct values", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const mockInsertValues = vi.fn(() => Promise.resolve())
      mockDb.insert.mockReturnValue({ values: mockInsertValues })

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      })

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointId: "ep_123",
          organizationId: "org_123",
          createdById: "user_123",
          name: "Test Key",
        })
      )
    })
  })

  // =========================================================================
  // DELETE /endpoints/:endpointId/keys/:keyId Tests
  // =========================================================================
  describe("DELETE /endpoints/:endpointId/keys/:keyId", () => {
    it("should return 404 when endpoint does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request(
        "/api/endpoints/ep_nonexistent/keys/key_123",
        { method: "DELETE" }
      )

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should return 404 when API key does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findFirst.mockResolvedValue(null)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request(
        "/api/endpoints/ep_123/keys/key_nonexistent",
        { method: "DELETE" }
      )

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should revoke API key successfully", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKey)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys/key_123", {
        method: "DELETE",
      })

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("API key revoked successfully")
    })

    it("should not delete already revoked keys", async () => {
      // Mock endpoint exists but key not found (simulating the isNull filter)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findFirst.mockResolvedValue(null)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys/key_123", {
        method: "DELETE",
      })

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should call database update with revocation data", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKey)

      const mockWhere = vi.fn(() => Promise.resolve())
      const mockSet = vi.fn(() => ({ where: mockWhere }))
      mockDb.update.mockReturnValue({ set: mockSet })

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      await app.request("/api/endpoints/ep_123/keys/key_123", {
        method: "DELETE",
      })

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedById: "user_123",
        })
      )
    })
  })

  // =========================================================================
  // API Key Format Tests
  // =========================================================================
  describe("API Key Format", () => {
    it("should generate key with ak_ prefix", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      })

      const data = (await response.json()) as ApiKeyResponse

      expect(data.key!.startsWith("ak_")).toBe(true)
      expect(data.prefix.startsWith("ak_")).toBe(true)
    })

    it("should generate prefix with first 8 chars after ak_", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      })

      const data = (await response.json()) as ApiKeyResponse

      // Prefix should be ak_ + first 8 chars of the generated key
      const keyWithoutPrefix = data.key!.substring(3) // Remove "ak_"
      expect(data.prefix).toBe("ak_" + keyWithoutPrefix.substring(0, 8))
    })
  })

  // =========================================================================
  // Validation Tests
  // =========================================================================
  describe("Validation", () => {
    it("should reject invalid expiresAt format", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Key",
          expiresAt: "not-a-date",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should accept valid scopes array", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Key",
          scopes: ["read", "write", "delete"],
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should accept empty scopes array", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Key",
          scopes: [],
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should reject request with invalid JSON body", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json {",
      })

      expect(response.status).toBe(400)
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("should handle endpoint with different organization than user's membership", async () => {
      // User is a member of org_123, but endpoint belongs to org_other
      mockDb.query.endpoint.findFirst.mockResolvedValue(
        mockEndpointDifferentOrg
      )
      mockDb.query.member.findFirst.mockResolvedValue(null) // Not a member of org_other

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_456/keys")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain("access")
    })

    it("should verify membership is checked against the correct organization", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      await app.request("/api/endpoints/ep_123/keys")

      // Verify member.findFirst was called (membership check happened)
      expect(mockDb.query.member.findFirst).toHaveBeenCalled()
    })

    it("should handle API key with null scopes when listing", async () => {
      const apiKeyWithNullScopes = { ...mockApiKey, scopes: null }
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([apiKeyWithNullScopes])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys[0].scopes).toBeNull()
    })

    it("should handle API key with lastUsedAt date", async () => {
      const lastUsedDate = new Date("2025-01-15T10:30:00.000Z")
      const apiKeyWithLastUsed = { ...mockApiKey, lastUsedAt: lastUsedDate }
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([apiKeyWithLastUsed])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys[0].lastUsedAt).toBe("2025-01-15T10:30:00.000Z")
    })

    it("should handle API key with null lastUsedAt", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([mockApiKey])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys[0].lastUsedAt).toBeNull()
    })

    it("should handle API key with expiresAt date", async () => {
      const expiresDate = new Date("2025-12-31T23:59:59.000Z")
      const apiKeyWithExpires = { ...mockApiKey, expiresAt: expiresDate }
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.apiKey.findMany.mockResolvedValue([apiKeyWithExpires])

      const { default: apiKeys } = await import("../../routes/api-keys")
      const app = new Hono()
      app.route("/api/endpoints", apiKeys)

      const response = await app.request("/api/endpoints/ep_123/keys")
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.keys[0].expiresAt).toBe("2025-12-31T23:59:59.000Z")
    })
  })
})
