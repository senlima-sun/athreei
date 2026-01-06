/**
 * Tests for the MCP servers verify endpoint
 *
 * These tests verify the MCP server connection verification including:
 * - Input validation
 * - Rate limiting
 * - Success and failure responses
 * - Timeout handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Hono } from "hono"

// Response types
interface VerifySuccessResponse {
  success: true
  tools: string[]
  toolCount: number
}

interface VerifyFailureResponse {
  success: false
  error: string
}

type VerifyResponse = VerifySuccessResponse | VerifyFailureResponse

// Mock auth context
const mockAuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(),
  },
}

// Mock MCP Client
const mockMcpClient = {
  connect: vi.fn(),
  listTools: vi.fn(),
  close: vi.fn(),
}

// Store for transport creation callback to test auth headers
let lastTransportConfig: {
  url: URL
  options: { requestInit: RequestInit }
} | null = null

// Mock modules
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => ({})),
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
  },
}))

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => mockMcpClient),
}))

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn((url, options) => {
    lastTransportConfig = { url, options }
    return { type: "sse" }
  }),
}))

// Mock rate limiting - track calls
const rateLimitStore = new Map<string, number[]>()

vi.mock("../../middleware/rate-limit", () => ({
  checkRateLimit: vi.fn((keyHash: string, limit: number, windowMs: number) => {
    const now = Date.now()
    const cutoff = now - windowMs
    const timestamps = (rateLimitStore.get(keyHash) || []).filter(
      (t) => t > cutoff
    )

    const info = {
      current: timestamps.length,
      limit,
      resetIn:
        timestamps.length > 0 ? timestamps[0] + windowMs - now : windowMs,
      limited: timestamps.length >= limit,
    }

    if (!info.limited) {
      timestamps.push(now)
      rateLimitStore.set(keyHash, timestamps)
      info.current = timestamps.length
    }

    return info
  }),
  clearAllRateLimits: vi.fn(() => {
    rateLimitStore.clear()
  }),
}))

describe("MCP Servers Verify Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitStore.clear()
    lastTransportConfig = null

    // Reset default mock implementations
    mockMcpClient.connect.mockResolvedValue(undefined)
    mockMcpClient.listTools.mockResolvedValue({
      tools: [
        { name: "tool_1", description: "First tool" },
        { name: "tool_2", description: "Second tool" },
      ],
    })
    mockMcpClient.close.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("POST /api/mcp-servers/verify", () => {
    it("should return 400 for missing serverUrl", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authToken: "test-token",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for missing authToken", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid URL format", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "not-a-valid-url",
          authToken: "test-token",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for empty authToken", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should successfully verify connection and return tools", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.tools).toEqual(["tool_1", "tool_2"])
        expect(data.toolCount).toBe(2)
      }
    })

    it("should pass auth token in Authorization header", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "my-secret-token",
        }),
      })

      expect(lastTransportConfig).toBeTruthy()
      expect(lastTransportConfig?.options.requestInit.headers).toEqual({
        Authorization: "Bearer my-secret-token",
      })
    })

    it("should return failure for connection errors", async () => {
      mockMcpClient.connect.mockRejectedValue(new Error("ECONNREFUSED"))

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toContain("Could not connect")
      }
    })

    it("should return failure for authentication errors (401)", async () => {
      mockMcpClient.connect.mockRejectedValue(new Error("401 Unauthorized"))

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "invalid-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toContain("Authentication failed")
      }
    })

    it("should return failure for permission errors (403)", async () => {
      mockMcpClient.connect.mockRejectedValue(new Error("403 Forbidden"))

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toContain("Access denied")
      }
    })

    it("should return failure for DNS resolution errors", async () => {
      mockMcpClient.connect.mockRejectedValue(new Error("ENOTFOUND"))

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://nonexistent-server.example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toContain("Could not connect")
      }
    })

    it("should set rate limit headers", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      expect(response.headers.get("X-RateLimit-Limit")).toBe("20")
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined()
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined()
    })

    it("should return 429 when rate limit exceeded", async () => {
      // Fill up the rate limit bucket
      for (let i = 0; i < 20; i++) {
        rateLimitStore.set(
          `verify:${mockAuthContext.userId}`,
          Array(20).fill(Date.now())
        )
      }

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toContain("Rate limit exceeded")
      }
      expect(response.headers.get("Retry-After")).toBeDefined()
    })

    it("should close client connection on success", async () => {
      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      expect(mockMcpClient.close).toHaveBeenCalled()
    })

    it("should close client connection on error", async () => {
      mockMcpClient.connect.mockRejectedValue(new Error("Connection failed"))

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      expect(mockMcpClient.close).toHaveBeenCalled()
    })

    it("should handle server returning empty tools list", async () => {
      mockMcpClient.listTools.mockResolvedValue({ tools: [] })

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.tools).toEqual([])
        expect(data.toolCount).toBe(0)
      }
    })

    it("should handle listTools failure after successful connection", async () => {
      mockMcpClient.listTools.mockRejectedValue(
        new Error("Failed to list tools")
      )

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
    })

    it("should handle timeout errors with friendly message", async () => {
      mockMcpClient.connect.mockRejectedValue(
        new Error("Connection timeout after 10 seconds")
      )

      const { default: mcpServers } = await import("../../routes/mcp-servers")
      const app = new Hono()
      app.route("/api/mcp-servers", mcpServers)

      const response = await app.request("/api/mcp-servers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: "https://slow-server.example.com/mcp",
          authToken: "test-token",
        }),
      })

      const data = (await response.json()) as VerifyResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.error).toContain("timeout")
      }
    })
  })
})
