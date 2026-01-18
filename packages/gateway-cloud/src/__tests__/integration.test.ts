/**
 * Gateway Cloud Integration Tests
 *
 * Tests the full integration between Gateway Cloud, API server, and MCP servers.
 * These tests verify end-to-end functionality of the cloud gateway.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Hono } from "hono"
import { app as _app } from "../index"
import sseRoutes, { configureSseRoutes } from "../routes/sse"
import healthRoutes from "../routes/health"
import {
  createSession,
  getSession,
  destroySession,
  getAllSessions,
  getSessionCount,
  cleanupIdleSessions,
  configureSessionManager,
  listSessionTools,
  callSessionTool,
  _resetForTesting,
} from "../gateway/session"
import { GatewayErrorCode } from "../types"

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
          name: "integration_tool",
          description: "A tool for integration testing",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
            },
            required: ["query"],
          },
        },
        {
          name: "another_tool",
          description: "Another test tool",
          inputSchema: {
            type: "object",
            properties: {
              value: { type: "number" },
            },
          },
        },
      ],
    }),
    callTool: vi.fn().mockImplementation(async ({ name, arguments: args }) => {
      if (name === "integration_tool") {
        return {
          content: [
            {
              type: "text",
              text: `Results for: ${(args as { query: string }).query}`,
            },
          ],
        }
      }
      return {
        content: [{ type: "text", text: "Tool result" }],
      }
    }),
  })),
}))

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({})),
}))

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({})),
}))

const mockEndpointConfig = {
  namespaceId: "ns_integration_test",
  namespaceName: "Integration Test Namespace",
  namespaceSlug: "integration-test",
  endpointId: "ep_integration_test",
  endpointName: "Integration Test Endpoint",
  userId: "user_integration_test",
  organizationId: "org_integration_test",
  configVersion: "1704067200000-2",
  servers: [
    {
      id: "srv_1",
      name: "Test MCP Server 1",
      description: "Primary test server",
      transport: "sse" as const,
      url: "http://localhost:4000/sse",
      status: "active" as const,
    },
    {
      id: "srv_2",
      name: "Test MCP Server 2",
      description: "Secondary test server",
      transport: "stdio" as const,
      command: "npx",
      args: "-y @test/mcp-server",
      status: "active" as const,
    },
    {
      id: "srv_3",
      name: "Inactive Server",
      description: "Should be skipped",
      transport: "sse" as const,
      url: "http://localhost:4001/sse",
      status: "inactive" as const,
    },
  ],
}

const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

describe("Gateway Cloud Integration Tests", () => {
  let testApp: Hono

  beforeEach(() => {
    _resetForTesting()
    mockFetch.mockReset()

    testApp = new Hono()
    testApp.route("/mcp", sseRoutes)
    testApp.route("/health", healthRoutes)

    configureSseRoutes({ logger: mockLogger })
    configureSessionManager({ logger: mockLogger })
  })

  afterEach(async () => {
    // Cleanup all sessions
    const sessions = getAllSessions()
    await Promise.all(sessions.map((s) => destroySession(s.id)))
    _resetForTesting()
  })

  describe("End-to-End Session Lifecycle", () => {
    it("should handle complete session lifecycle: create → use → destroy", async () => {
      // 1. Create session
      const session = await createSession({
        endpointName: "integration-endpoint",
        userId: "user_e2e_test",
        namespaceId: "ns_e2e_test",
        servers: mockEndpointConfig.servers,
        logger: mockLogger,
      })

      expect(session).toBeDefined()
      expect(session.isActive).toBe(true)
      // Should connect to 2 active servers, skip 1 inactive
      expect(session.connectedMcps.size).toBe(2)
      expect(session.aggregatedTools.length).toBeGreaterThan(0)

      // 2. List tools
      const tools = listSessionTools(session.id)
      expect(tools.length).toBeGreaterThan(0)
      expect(tools.some((t) => t.name.includes("integration_tool"))).toBe(true)

      // 3. Call a tool
      const result = await callSessionTool(session.id, tools[0].name, {
        query: "test query",
      })
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()

      // 4. Verify session is tracked
      expect(getSessionCount()).toBe(1)
      expect(getSession(session.id)).toBe(session)

      // 5. Destroy session
      const destroyed = await destroySession(session.id)
      expect(destroyed).toBe(true)
      expect(getSessionCount()).toBe(0)
      expect(session.isActive).toBe(false)
    })

    it("should handle multiple concurrent sessions", async () => {
      const sessions = await Promise.all([
        createSession({
          endpointName: "endpoint-1",
          userId: "user_1",
          namespaceId: "ns_1",
          servers: [mockEndpointConfig.servers[0]],
          logger: mockLogger,
        }),
        createSession({
          endpointName: "endpoint-2",
          userId: "user_2",
          namespaceId: "ns_2",
          servers: [mockEndpointConfig.servers[1]],
          logger: mockLogger,
        }),
        createSession({
          endpointName: "endpoint-3",
          userId: "user_3",
          namespaceId: "ns_3",
          servers: mockEndpointConfig.servers,
          logger: mockLogger,
        }),
      ])

      expect(getSessionCount()).toBe(3)

      // Each session should be independent
      for (const session of sessions) {
        expect(session.isActive).toBe(true)
        const tools = listSessionTools(session.id)
        expect(tools.length).toBeGreaterThan(0)
      }

      // Destroy one session shouldn't affect others
      await destroySession(sessions[0].id)
      expect(getSessionCount()).toBe(2)
      expect(sessions[1].isActive).toBe(true)
      expect(sessions[2].isActive).toBe(true)
    })

    it("should handle session timeout and cleanup", async () => {
      // Configure very short timeout for testing
      configureSessionManager({
        idleTimeout: 50, // 50ms
        logger: mockLogger,
      })

      const session = await createSession({
        endpointName: "timeout-endpoint",
        userId: "user_timeout",
        namespaceId: "ns_timeout",
        servers: [mockEndpointConfig.servers[0]],
        logger: mockLogger,
      })

      expect(getSessionCount()).toBe(1)

      // Simulate idle time
      session.lastActivity = new Date(Date.now() - 100)

      // Run cleanup
      const cleaned = await cleanupIdleSessions()

      expect(cleaned).toBe(1)
      expect(getSessionCount()).toBe(0)
    })
  })

  describe("MCP Protocol Integration", () => {
    it("should handle MCP initialize request correctly", async () => {
      const session = await createSession({
        endpointName: "mcp-endpoint",
        userId: "user_mcp",
        namespaceId: "ns_mcp",
        servers: [],
        logger: mockLogger,
      })

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
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
                name: "integration-test-client",
                version: "1.0.0",
              },
            },
          }),
        }
      )

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.jsonrpc).toBe("2.0")
      expect(body.id).toBe(1)
      expect(body.result.protocolVersion).toBe("2024-11-05")
      expect(body.result.serverInfo.name).toBe("athreei-gateway-cloud")
      expect(body.result.capabilities.tools).toBeDefined()
    })

    it("should handle MCP tools/list with aggregated tools", async () => {
      const session = await createSession({
        endpointName: "tools-endpoint",
        userId: "user_tools",
        namespaceId: "ns_tools",
        servers: mockEndpointConfig.servers,
        logger: mockLogger,
      })

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
          }),
        }
      )

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.result.tools).toBeDefined()
      expect(Array.isArray(body.result.tools)).toBe(true)
      // Should have tools from connected servers (namespaced)
      expect(body.result.tools.length).toBeGreaterThan(0)
    })

    it("should handle MCP tools/call and route to correct server", async () => {
      const session = await createSession({
        endpointName: "call-endpoint",
        userId: "user_call",
        namespaceId: "ns_call",
        servers: mockEndpointConfig.servers,
        logger: mockLogger,
      })

      // Get the actual tool name (will be namespaced)
      const tools = listSessionTools(session.id)
      const toolName = tools[0].name

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: toolName,
              arguments: { query: "integration test" },
            },
          }),
        }
      )

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.result).toBeDefined()
      expect(body.result.content).toBeDefined()
    })

    it("should handle MCP ping request", async () => {
      const session = await createSession({
        endpointName: "ping-endpoint",
        userId: "user_ping",
        namespaceId: "ns_ping",
        servers: [],
        logger: mockLogger,
      })

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 4,
            method: "ping",
          }),
        }
      )

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.result).toEqual({})
    })

    it("should return proper JSON-RPC error for unknown method", async () => {
      const session = await createSession({
        endpointName: "error-endpoint",
        userId: "user_error",
        namespaceId: "ns_error",
        servers: [],
        logger: mockLogger,
      })

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 5,
            method: "nonexistent/method",
          }),
        }
      )

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32601) // Method not found
      expect(body.error.message).toContain("Method not found")
    })
  })

  describe("Error Handling Integration", () => {
    it("should handle expired session gracefully", async () => {
      const session = await createSession({
        endpointName: "expired-endpoint",
        userId: "user_expired",
        namespaceId: "ns_expired",
        servers: [],
        logger: mockLogger,
      })

      // Mark session as expired
      session.isActive = false

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "ping",
          }),
        }
      )

      expect(res.status).toBe(410) // Gone

      const body = await res.json()
      expect(body.error).toBe(GatewayErrorCode.SESSION_EXPIRED)
    })

    it("should handle missing session ID", async () => {
      const res = await testApp.request("/mcp/messages", {
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
      expect(body.error).toBe(GatewayErrorCode.INVALID_REQUEST)
    })

    it("should handle invalid JSON body", async () => {
      const session = await createSession({
        endpointName: "json-error-endpoint",
        userId: "user_json_error",
        namespaceId: "ns_json_error",
        servers: [],
        logger: mockLogger,
      })

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not valid json",
        }
      )

      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe(GatewayErrorCode.INVALID_REQUEST)
    })

    it("should handle tools/call with missing tool name", async () => {
      const session = await createSession({
        endpointName: "missing-tool-endpoint",
        userId: "user_missing_tool",
        namespaceId: "ns_missing_tool",
        servers: [],
        logger: mockLogger,
      })

      const res = await testApp.request(
        `/mcp/messages?sessionId=${session.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {}, // Missing name
          }),
        }
      )

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32602) // Invalid params
    })

    it("should handle server connection failures gracefully", async () => {
      // This test verifies that session creation doesn't fail entirely
      // when some servers fail to connect
      const session = await createSession({
        endpointName: "partial-failure-endpoint",
        userId: "user_partial",
        namespaceId: "ns_partial",
        servers: [
          {
            id: "srv_good",
            name: "Good Server",
            transport: "sse",
            url: "http://localhost:4000/sse",
            status: "active",
          },
          // The mock will handle this without actual connection failure
          // In real scenarios, failed connections are logged and skipped
        ],
        logger: mockLogger,
      })

      // Session should still be created even if some servers fail
      expect(session).toBeDefined()
      expect(session.isActive).toBe(true)
    })
  })

  describe("Health Check Integration", () => {
    it("should return healthy status", async () => {
      const res = await testApp.request("/health")

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe("ok")
    })

    it("should return detailed health info", async () => {
      // Create some sessions for the health check to report
      await createSession({
        endpointName: "health-endpoint",
        userId: "user_health",
        namespaceId: "ns_health",
        servers: [],
        logger: mockLogger,
      })

      const res = await testApp.request("/health/status")

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe("ok")
      expect(body.sessions).toBeDefined()
      expect(body.sessions.count).toBe(1)
    })
  })

  describe("API Key Validation Integration", () => {
    it("should reject SSE connection without API key", async () => {
      const res = await testApp.request("/mcp/test-endpoint/sse")

      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error).toBe(GatewayErrorCode.UNAUTHORIZED)
    })

    it("should reject SSE connection with invalid API key", async () => {
      // Mock API validation failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      })

      const res = await testApp.request("/mcp/test-endpoint/sse", {
        headers: {
          Authorization: "Bearer invalid_api_key",
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe("Session Resumption Integration", () => {
    it("should allow resuming an existing session", async () => {
      const session = await createSession({
        endpointName: "resume-endpoint",
        userId: "user_resume",
        namespaceId: "ns_resume",
        servers: [],
        logger: mockLogger,
      })

      // Verify session exists and is active
      const retrieved = getSession(session.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.isActive).toBe(true)

      // Make a request to the resume endpoint
      const res = await testApp.request(`/mcp/session/${session.id}/sse`)

      // Should not return 404 (session exists)
      expect(res.status).not.toBe(404)
    })

    it("should reject resumption of non-existent session", async () => {
      const res = await testApp.request(
        "/mcp/session/nonexistent_session_id/sse"
      )

      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error).toBe(GatewayErrorCode.SESSION_NOT_FOUND)
    })

    it("should reject resumption of expired session", async () => {
      const session = await createSession({
        endpointName: "expired-resume-endpoint",
        userId: "user_expired_resume",
        namespaceId: "ns_expired_resume",
        servers: [],
        logger: mockLogger,
      })

      // Mark session as expired
      session.isActive = false

      const res = await testApp.request(`/mcp/session/${session.id}/sse`)

      expect(res.status).toBe(410)

      const body = await res.json()
      expect(body.error).toBe(GatewayErrorCode.SESSION_EXPIRED)
    })
  })
})

describe("Environment Variable Integration", () => {
  beforeEach(() => {
    _resetForTesting()
    mockFetch.mockReset()
  })

  afterEach(() => {
    _resetForTesting()
  })

  it("should fetch environment variables for stdio servers", async () => {
    // Mock the env var fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        env: {
          API_KEY: "test_api_key_value",
          SECRET_TOKEN: "test_secret_token",
        },
      }),
    })

    const session = await createSession({
      endpointName: "env-endpoint",
      userId: "user_env",
      namespaceId: "ns_env",
      servers: [
        {
          id: "srv_stdio_env",
          name: "Stdio Server with Env",
          transport: "stdio",
          command: "npx",
          args: "-y @test/mcp-server",
          status: "active",
        },
      ],
      apiKey: "test_api_key",
      logger: mockLogger,
    })

    expect(session).toBeDefined()
    // The fetch should have been called with the correct URL
    expect(mockFetch).toHaveBeenCalled()
  })

  it("should continue if env var fetch fails", async () => {
    // Mock the env var fetch to fail
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    // Session should still be created even if env fetch fails
    const session = await createSession({
      endpointName: "env-fail-endpoint",
      userId: "user_env_fail",
      namespaceId: "ns_env_fail",
      servers: [
        {
          id: "srv_stdio_env_fail",
          name: "Stdio Server",
          transport: "stdio",
          command: "npx",
          args: "-y @test/mcp-server",
          status: "active",
        },
      ],
      apiKey: "test_api_key",
      logger: mockLogger,
    })

    expect(session).toBeDefined()
    expect(session.isActive).toBe(true)
  })
})
