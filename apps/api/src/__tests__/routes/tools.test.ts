/**
 * Tests for the Tools API routes
 *
 * Tests tool listing and configuration updates including:
 * - Authorization checks
 * - Custom description/prompt fields
 * - Enable/disable tool functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

// Mock modules before importing the routes
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((_c, next) => {
    _c.set("auth", mockAuthContext)
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

const mockMcpServer = {
  id: "srv_123",
  organizationId: "org_123",
  name: "Test MCP Server",
  description: "A test server",
  transport: "stdio",
  command: "npx test-server",
  args: null,
  url: null,
  status: "active",
  version: "1.0.0",
  capabilities: null,
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMcpTool = {
  id: "tool_123",
  serverId: "srv_123",
  name: "get_components",
  description: "Get Figma components",
  inputSchema:
    '{"type": "object", "properties": {"query": {"type": "string"}}}',
  customDescription: null,
  customPrompt: null,
  isEnabled: "true",
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
    },
    mcpTool: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
}

// Error handler for tests
function testErrorHandler(
  err: Error,
  c: { json: (data: object, status: number) => Response }
) {
  const statusCode = (err as Error & { statusCode?: number }).statusCode || 500
  return c.json({ error: err.message }, statusCode)
}

describe("Tools Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/tools", () => {
    it("should require serverId query parameter", async () => {
      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools")

      expect(response.status).toBe(400)
    })

    it("should return 404 for non-existent server", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(null)

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools?serverId=srv_nonexistent")

      expect(response.status).toBe(404)
    })

    it("should return 403 for unauthorized organization", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(null)

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools?serverId=srv_123")

      expect(response.status).toBe(403)
    })

    it("should return tools for a server when authorized", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.mcpTool.findMany.mockResolvedValue([mockMcpTool])

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools?serverId=srv_123")
      const data = (await response.json()) as { tools: unknown[] }

      expect(response.status).toBe(200)
      expect(data.tools).toHaveLength(1)
      expect((data.tools[0] as { name: string }).name).toBe("get_components")
      expect((data.tools[0] as { isEnabled: boolean }).isEnabled).toBe(true)
    })

    it("should parse inputSchema as JSON", async () => {
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.mcpTool.findMany.mockResolvedValue([mockMcpTool])

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools?serverId=srv_123")
      const data = (await response.json()) as {
        tools: { inputSchema: Record<string, unknown> }[]
      }

      expect(response.status).toBe(200)
      expect(data.tools[0].inputSchema).toEqual({
        type: "object",
        properties: { query: { type: "string" } },
      })
    })

    it("should handle invalid JSON in inputSchema gracefully", async () => {
      const toolWithBadSchema = {
        ...mockMcpTool,
        inputSchema: "{invalid json}",
      }
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.query.mcpTool.findMany.mockResolvedValue([toolWithBadSchema])

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools?serverId=srv_123")
      expect(response.status).toBe(200)
      const data = (await response.json()) as {
        tools: { inputSchema: null }[]
      }
      expect(data.tools[0].inputSchema).toBeNull()
    })
  })

  describe("PATCH /api/tools/:id", () => {
    it("should return 404 for non-existent tool", async () => {
      mockDb.query.mcpTool.findFirst.mockResolvedValue(null)

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDescription: "Updated" }),
      })

      expect(response.status).toBe(404)
    })

    it("should return 403 for unauthorized organization", async () => {
      mockDb.query.mcpTool.findFirst.mockResolvedValue(mockMcpTool)
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(null)

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDescription: "Updated" }),
      })

      expect(response.status).toBe(403)
    })

    it("should update tool custom fields when authorized", async () => {
      const updatedTool = {
        ...mockMcpTool,
        customDescription: "Updated description",
        customPrompt: "Always use JSON format",
        updatedAt: new Date(),
      }

      mockDb.query.mcpTool.findFirst.mockResolvedValue(mockMcpTool)
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTool]),
          }),
        }),
      })

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDescription: "Updated description",
          customPrompt: "Always use JSON format",
        }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as {
        tool: { customDescription: string; customPrompt: string }
      }
      expect(data.tool.customDescription).toBe("Updated description")
      expect(data.tool.customPrompt).toBe("Always use JSON format")
    })

    it("should update isEnabled field", async () => {
      const updatedTool = {
        ...mockMcpTool,
        isEnabled: "false",
        updatedAt: new Date(),
      }

      mockDb.query.mcpTool.findFirst.mockResolvedValue(mockMcpTool)
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTool]),
          }),
        }),
      })

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: false }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as { tool: { isEnabled: boolean } }
      expect(data.tool.isEnabled).toBe(false)
    })

    it("should validate customDescription max length", async () => {
      mockDb.query.mcpTool.findFirst.mockResolvedValue(mockMcpTool)
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDescription: "a".repeat(2001), // Exceeds 2000 char limit
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should validate customPrompt max length", async () => {
      mockDb.query.mcpTool.findFirst.mockResolvedValue(mockMcpTool)
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customPrompt: "a".repeat(5001), // Exceeds 5000 char limit
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should allow clearing custom fields with null", async () => {
      const updatedTool = {
        ...mockMcpTool,
        customDescription: null,
        customPrompt: null,
        updatedAt: new Date(),
      }

      mockDb.query.mcpTool.findFirst.mockResolvedValue({
        ...mockMcpTool,
        customDescription: "Some description",
        customPrompt: "Some prompt",
      })
      mockDb.query.mcpServer.findFirst.mockResolvedValue(mockMcpServer)
      mockDb.query.member.findFirst.mockResolvedValue(mockMember)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTool]),
          }),
        }),
      })

      const { default: tools } = await import("../../routes/tools")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/tools", tools)

      const response = await app.request("/api/tools/tool_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDescription: null,
          customPrompt: null,
        }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as {
        tool: { customDescription: null; customPrompt: null }
      }
      expect(data.tool.customDescription).toBeNull()
      expect(data.tool.customPrompt).toBeNull()
    })
  })
})
