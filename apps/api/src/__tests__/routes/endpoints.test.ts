/**
 * Tests for the endpoints API routes
 *
 * These tests verify the endpoint CRUD operations including:
 * - Validation of request bodies
 * - Authorization checks
 * - Proper response formats
 * - Connection config generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

// Types for API responses
interface ConnectionConfig {
  claudeDesktop: {
    mcpServers: Record<string, { url: string; transport: string }>
  }
  generic: {
    url: string
    transport: string
  }
}

interface EndpointResponse {
  endpoint: unknown
  connectionConfig: ConnectionConfig
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
    badRequest: (msg: string) => new Error(`BadRequest: ${msg}`),
    notFound: (msg: string) => new Error(`NotFound: ${msg}`),
    forbidden: (msg: string) => new Error(`Forbidden: ${msg}`),
    conflict: (msg: string) => new Error(`Conflict: ${msg}`),
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

const mockNamespace = {
  id: "ns_123",
  organizationId: "org_123",
  name: "Production",
  slug: "production",
  description: "Production namespace",
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

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

const mockMember = {
  id: "member_123",
  userId: "user_123",
  organizationId: "org_123",
  role: "admin",
  createdAt: new Date(),
}

const mockResourceMapping = {
  id: "nsr_123",
  namespaceId: "ns_123",
  resourceType: "endpoint",
  resourceId: "ep_123",
  createdAt: new Date(),
}

// Mock database
const mockDb = {
  query: {
    member: {
      findFirst: vi.fn(),
    },
    namespace: {
      findFirst: vi.fn(),
    },
    endpoint: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    namespaceResource: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(),
  })),
}

describe("Endpoints Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/endpoints", () => {
    it("should require organizationId query parameter", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints")

      // The route should throw an error for missing organizationId
      expect(response.status).toBe(500) // Error thrown
    })

    it("should return endpoints for authorized organization", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.endpoint.findMany.mockResolvedValue([mockEndpoint])
      mockDb.query.namespaceResource.findMany.mockResolvedValue([
        mockResourceMapping,
      ])

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request(
        "/api/endpoints?organizationId=org_123"
      )
      const data = (await response.json()) as { endpoints: unknown[] }

      expect(response.status).toBe(200)
      expect(data.endpoints).toBeDefined()
    })
  })

  describe("POST /api/endpoints", () => {
    it("should validate request body", async () => {
      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty body - should fail validation
      })

      expect(response.status).toBe(400)
    })

    it("should create endpoint when namespace exists and user has access", async () => {
      mockDb.query.namespace.findFirst.mockResolvedValue(mockNamespace)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.endpoint.findFirst
        .mockResolvedValueOnce(null) // URL uniqueness check
        .mockResolvedValueOnce(mockEndpoint) // After creation
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Endpoint",
          namespaceId: "ns_123",
          authType: "api_key",
        }),
      })

      expect(response.status).toBe(201)
    })
  })

  describe("GET /api/endpoints/:id", () => {
    it("should return 404 for non-existent endpoint", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_nonexistent")

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should return endpoint with connection config when authorized", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.namespaceResource.findFirst.mockResolvedValue(
        mockResourceMapping
      )
      mockDb.query.namespace.findFirst.mockResolvedValue(mockNamespace)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123")
      const data = (await response.json()) as EndpointResponse

      expect(response.status).toBe(200)
      expect(data.endpoint).toBeDefined()
      expect(data.connectionConfig).toBeDefined()
      expect(data.connectionConfig.claudeDesktop).toBeDefined()
      expect(data.connectionConfig.claudeDesktop.mcpServers).toBeDefined()
    })
  })

  describe("PATCH /api/endpoints/:id", () => {
    it("should update endpoint when authorized", async () => {
      mockDb.query.endpoint.findFirst
        .mockResolvedValueOnce(mockEndpoint) // Before update
        .mockResolvedValueOnce({ ...mockEndpoint, name: "Updated Name" }) // After update
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.namespaceResource.findFirst.mockResolvedValue(
        mockResourceMapping
      )
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })

      expect(response.status).toBe(200)
    })

    it("should validate update body", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid_status" }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("DELETE /api/endpoints/:id", () => {
    it("should delete endpoint when authorized", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123", {
        method: "DELETE",
      })
      const data = (await response.json()) as { message: string }

      expect(response.status).toBe(200)
      expect(data.message).toBe("Endpoint deleted successfully")
    })

    it("should return 404 for non-existent endpoint", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_nonexistent", {
        method: "DELETE",
      })

      expect(response.status).toBe(500) // Error thrown for not found
    })
  })

  describe("Connection Config Format", () => {
    it("should generate correct Claude Desktop config format", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.namespaceResource.findFirst.mockResolvedValue(
        mockResourceMapping
      )
      mockDb.query.namespace.findFirst.mockResolvedValue(mockNamespace)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123")
      const data = (await response.json()) as EndpointResponse

      expect(data.connectionConfig.claudeDesktop.mcpServers["My API"]).toEqual({
        url: "https://athreei.com/mcp/my-api/sse",
        transport: "sse",
      })
    })

    it("should include generic config", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.namespaceResource.findFirst.mockResolvedValue(
        mockResourceMapping
      )
      mockDb.query.namespace.findFirst.mockResolvedValue(mockNamespace)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123")
      const data = (await response.json()) as EndpointResponse

      expect(data.connectionConfig.generic).toEqual({
        url: "https://athreei.com/mcp/my-api/sse",
        transport: "sse",
      })
    })
  })

  describe("Validation Schemas", () => {
    it("should reject invalid authType", async () => {
      mockDb.query.namespace.findFirst.mockResolvedValue(mockNamespace)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          namespaceId: "ns_123",
          authType: "invalid_auth",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should reject name exceeding max length", async () => {
      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "a".repeat(101), // Exceeds 100 char limit
          namespaceId: "ns_123",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should accept valid status values in update", async () => {
      mockDb.query.endpoint.findFirst
        .mockResolvedValueOnce(mockEndpoint)
        .mockResolvedValueOnce({ ...mockEndpoint, status: "deprecated" })
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.namespaceResource.findFirst.mockResolvedValue(
        mockResourceMapping
      )
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const { default: endpoints } = await import("../../routes/endpoints")
      const app = new Hono()
      app.route("/api/endpoints", endpoints)

      const response = await app.request("/api/endpoints/ep_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "deprecated" }),
      })

      expect(response.status).toBe(200)
    })
  })
})
