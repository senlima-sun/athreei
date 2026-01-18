/**
 * SSE Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Hono } from "hono"
import sseRoutes, { configureSseRoutes } from "../routes/sse"
import { _resetForTesting, createSession } from "../gateway/session"

// Mock fetch for API key validation
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({
      tools: [
        {
          name: "test_tool",
          description: "A test tool",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    }),
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Tool result" }],
    }),
  })),
}))

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({})),
}))

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({})),
}))

describe("SSE Routes", () => {
  let app: Hono

  beforeEach(() => {
    _resetForTesting()
    mockFetch.mockReset()

    app = new Hono()
    app.route("/mcp", sseRoutes)

    configureSseRoutes({
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    })
  })

  afterEach(() => {
    _resetForTesting()
  })

  describe("GET /mcp/:endpointName/sse", () => {
    it("should return 401 without API key", async () => {
      const res = await app.request("/mcp/test-endpoint/sse")

      expect(res.status).toBe(401)

      const body = await res.json()

      expect(body.error).toBe("UNAUTHORIZED")
    })

    it("should return 401 with invalid API key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      })

      const res = await app.request("/mcp/test-endpoint/sse", {
        headers: {
          Authorization: "Bearer invalid-key",
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe("POST /mcp/messages", () => {
    it("should return 400 without sessionId", async () => {
      const res = await app.request("/mcp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ping",
        }),
      })

      expect(res.status).toBe(400)

      const body = await res.json()

      expect(body.error).toBe("INVALID_REQUEST")
      expect(body.message).toContain("sessionId")
    })

    it("should return 404 for non-existent session", async () => {
      const res = await app.request("/mcp/messages?sessionId=invalid-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ping",
        }),
      })

      expect(res.status).toBe(404)

      const body = await res.json()

      expect(body.error).toBe("SESSION_NOT_FOUND")
    })

    it("should return 400 for invalid JSON", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      })

      expect(res.status).toBe(400)

      const body = await res.json()

      expect(body.error).toBe("INVALID_REQUEST")
    })

    it("should return 400 for invalid JSON-RPC request", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "request" }),
      })

      expect(res.status).toBe(400)

      const body = await res.json()

      expect(body.error).toBe("INVALID_REQUEST")
      expect(body.message).toContain("JSON-RPC")
    })

    it("should handle ping request", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ping",
        }),
      })

      expect(res.status).toBe(200)

      const body = await res.json()

      expect(body.jsonrpc).toBe("2.0")
      expect(body.id).toBe(1)
      expect(body.result).toEqual({})
    })

    it("should handle initialize request", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0",
            },
          },
        }),
      })

      expect(res.status).toBe(200)

      const body = await res.json()

      expect(body.jsonrpc).toBe("2.0")
      expect(body.id).toBe(1)
      expect(body.result.protocolVersion).toBe("2024-11-05")
      expect(body.result.serverInfo.name).toBe("athreei-gateway-cloud")
      expect(body.result.capabilities.tools).toBeDefined()
    })

    it("should handle tools/list request", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [
          {
            id: "server-1",
            name: "Test Server",
            transport: "sse",
            url: "http://localhost:3000/sse",
            status: "active",
          },
        ],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
      })

      expect(res.status).toBe(200)

      const body = await res.json()

      expect(body.jsonrpc).toBe("2.0")
      expect(body.id).toBe(1)
      expect(body.result.tools).toBeDefined()
      expect(Array.isArray(body.result.tools)).toBe(true)
    })

    it("should handle tools/call request with missing name", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {},
        }),
      })

      expect(res.status).toBe(200)

      const body = await res.json()

      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32602)
      expect(body.error.message).toContain("name")
    })

    it("should return error for unknown method", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "unknown/method",
        }),
      })

      expect(res.status).toBe(200)

      const body = await res.json()

      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32601)
      expect(body.error.message).toContain("Method not found")
    })

    it("should return 410 for expired session", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      // Mark session as inactive
      session.isActive = false

      const res = await app.request(`/mcp/messages?sessionId=${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ping",
        }),
      })

      expect(res.status).toBe(410)

      const body = await res.json()

      expect(body.error).toBe("SESSION_EXPIRED")
    })
  })

  describe("GET /mcp/session/:sessionId/sse", () => {
    it("should return 404 for non-existent session", async () => {
      const res = await app.request("/mcp/session/invalid-session/sse")

      expect(res.status).toBe(404)

      const body = await res.json()

      expect(body.error).toBe("SESSION_NOT_FOUND")
    })

    it("should return 410 for expired session", async () => {
      const session = await createSession({
        endpointName: "test-endpoint",
        userId: "user-123",
        namespaceId: "ns-456",
        servers: [],
      })

      session.isActive = false

      const res = await app.request(`/mcp/session/${session.id}/sse`)

      expect(res.status).toBe(410)

      const body = await res.json()

      expect(body.error).toBe("SESSION_EXPIRED")
    })
  })
})
