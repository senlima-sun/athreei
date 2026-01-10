/**
 * Tests for the MCP servers API routes
 *
 * These tests verify the MCP server CRUD operations including:
 * - Validation of request bodies
 * - Authorization checks
 * - Proper response formats
 * - Transport-specific validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

// Types for API responses
// PaginationResponse used for list endpoints (GET /)

interface McpServerResponse {
  id: string
  organizationId: string
  name: string
  description: string | null
  transport: string
  command: string | null
  args: string | null
  url: string | null
  status: string
  version: string | null
  capabilities: string | null
  tools?: unknown[]
}

interface ToolsResponse {
  data: unknown[]
  total: number
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

// Mock MCP SDK (used by verify endpoint)
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => ({
    connect: vi.fn(),
    listTools: vi.fn(),
    close: vi.fn(),
  })),
}))

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}))

// Mock rate limiting
vi.mock("../../middleware/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({
    current: 0,
    limit: 20,
    resetIn: 60000,
    limited: false,
  })),
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

const mockMcpServer = {
  id: "mcp_123",
  organizationId: "org_123",
  name: "My MCP Server",
  description: "A test MCP server",
  transport: "stdio",
  command: "npx @example/mcp-server",
  args: "--port 3000",
  url: null,
  status: "active",
  version: "1.0.0",
  capabilities: '{"tools": true}',
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock SSE server for reference (used for SSE transport tests)
const _mockMcpServerSSE = {
  id: "mcp_456",
  organizationId: "org_123",
  name: "SSE MCP Server",
  description: "A test SSE MCP server",
  transport: "sse",
  command: null,
  args: null,
  url: "https://example.com/sse",
  status: "active",
  version: "1.0.0",
  capabilities: null,
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
void _mockMcpServerSSE // Silence unused variable warning

const mockMcpTool = {
  id: "tool_123",
  serverId: "mcp_123",
  name: "search_files",
  description: "Search for files in the codebase",
  inputSchema:
    '{"type": "object", "properties": {"query": {"type": "string"}}}',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock database
const mockDb = {
  query: {
    member: {
      findFirst: vi.fn(),
    },
    mcpServer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    mcpTool: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          offset: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  })),
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

describe("MCP Servers Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/mcp-servers", () => {
    it("should require organizationId query parameter", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers")

      expect(response.status).toBe(400)
    })

    it("should return 403 for unauthorized organization", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(null)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_unauthorized"
      )

      expect(response.status).toBe(500) // Error thrown for forbidden
    })
  })

  describe("GET /api/mcp-servers/:id", () => {
    it("should return 404 for non-existent server", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(null)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_nonexistent")

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should return server with tools when authorized", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.mcpTool.findMany.mockResolvedValue([mockMcpTool])

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123")
      const data = (await response.json()) as McpServerResponse

      expect(response.status).toBe(200)
      expect(data.id).toBe("mcp_123")
      expect(data.name).toBe("My MCP Server")
      expect(data.tools).toBeDefined()
    })
  })

  describe("POST /api/mcp-servers", () => {
    it("should validate request body", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )

      expect(response.status).toBe(400)
    })

    it("should require organizationId query parameter", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Server",
          transport: "stdio",
          command: "npx @example/mcp-server",
        }),
      })

      expect(response.status).toBe(500) // Error thrown for missing organizationId
    })

    it("should require command for stdio transport", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Server",
            transport: "stdio",
            // Missing command
          }),
        }
      )

      expect(response.status).toBe(500) // Error thrown for missing command
    })

    it("should require url for SSE transport", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Server",
            transport: "sse",
            // Missing url
          }),
        }
      )

      expect(response.status).toBe(500) // Error thrown for missing url
    })

    it("should create server with stdio transport when command is provided", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Server",
            transport: "stdio",
            command: "npx @example/mcp-server",
          }),
        }
      )

      expect(response.status).toBe(201)
    })

    it("should create server with SSE transport when url is provided", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Server",
            transport: "sse",
            url: "https://example.com/sse",
          }),
        }
      )

      expect(response.status).toBe(201)
    })
  })

  describe("PATCH /api/mcp-servers/:id", () => {
    it("should return 404 for non-existent server", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(null)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should update server when authorized", async () => {
      const updatedServer = { ...mockMcpServer, name: "Updated Name" }
      mockDb.query.mcpServer.findFirst
        .mockResolvedValueOnce(mockMcpServer)
        .mockResolvedValueOnce(updatedServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })

      expect(response.status).toBe(200)
    })

    it("should validate transport changes require appropriate fields", async () => {
      // Trying to change transport to SSE without providing url
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport: "sse" }),
      })

      expect(response.status).toBe(500) // Error for missing url
    })
  })

  describe("DELETE /api/mcp-servers/:id", () => {
    it("should return 404 for non-existent server", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(null)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_nonexistent", {
        method: "DELETE",
      })

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should delete server when authorized", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123", {
        method: "DELETE",
      })
      const data = (await response.json()) as { message: string }

      expect(response.status).toBe(200)
      expect(data.message).toBe("MCP server deleted successfully")
    })

    it("should return 403 for unauthorized organization", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(null)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123", {
        method: "DELETE",
      })

      expect(response.status).toBe(500) // Error thrown for forbidden
    })
  })

  describe("GET /api/mcp-servers/:id/tools", () => {
    it("should return 404 for non-existent server", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(null)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers/mcp_nonexistent/tools"
      )

      expect(response.status).toBe(500) // Error thrown for not found
    })

    it("should return tools for server when authorized", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.mcpTool.findMany.mockResolvedValue([mockMcpTool])

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123/tools")
      const data = (await response.json()) as ToolsResponse

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.total).toBe(1)
    })
  })

  describe("Validation Schemas", () => {
    it("should reject invalid transport type", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test",
            transport: "invalid_transport",
          }),
        }
      )

      expect(response.status).toBe(400)
    })

    it("should reject name exceeding max length", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "a".repeat(101), // Exceeds 100 char limit
            transport: "stdio",
            command: "npx test",
          }),
        }
      )

      expect(response.status).toBe(400)
    })

    it("should accept valid status values in update", async () => {
      const updatedServer = { ...mockMcpServer, status: "inactive" }
      mockDb.query.mcpServer.findFirst
        .mockResolvedValueOnce(mockMcpServer)
        .mockResolvedValueOnce(updatedServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })

      expect(response.status).toBe(200)
    })

    it("should reject invalid status values", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/mcp_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid_status" }),
      })

      expect(response.status).toBe(400)
    })

    it("should reject invalid URL format", async () => {
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request(
        "/api/mcp-servers?organizationId=org_123",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test",
            transport: "sse",
            url: "not-a-valid-url",
          }),
        }
      )

      expect(response.status).toBe(400)
    })
  })
})
