/**
 * Tests for HTTP API
 *
 * Tests the local gateway HTTP API endpoints that expose traces,
 * servers, and tools for the dashboard.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createHttpApi } from "../http-api"
import type { GatewayState } from "../server"
import { TraceCollector } from "../trace-collector"
import type { ConnectedMcp, AggregatedTool, ToolCallTrace } from "../types"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonData = any

// Mock logger to suppress output during tests
vi.mock("../logger", () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Helper to create a mock tool
function createMockTool(name: string, description?: string): Tool {
  return {
    name,
    description: description || `Tool: ${name}`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  }
}

// Helper to create a mock connected MCP
function createMockMcp(
  name: string,
  tools: Tool[],
  sanitizedName?: string
): ConnectedMcp {
  return {
    config: {
      id: `mcp-${name}`,
      name,
      transport: "stdio",
      command: "/usr/bin/test",
      status: "active",
    },
    sanitizedName:
      sanitizedName || name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    client: {
      listTools: vi.fn().mockResolvedValue({ tools }),
    } as unknown as ConnectedMcp["client"],
    tools,
    connectedAt: new Date(),
  }
}

// Helper to create mock aggregated tool
function createMockAggregatedTool(
  serverName: string,
  toolName: string,
  description?: string
): AggregatedTool {
  return {
    name: `${serverName}__${toolName}`,
    description: description || `[${serverName}] Tool: ${toolName}`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    serverName,
    originalName: toolName,
  }
}

// Helper to create a mock trace
function createMockTrace(options: Partial<ToolCallTrace> = {}): ToolCallTrace {
  return {
    traceId: options.traceId || crypto.randomUUID(),
    requestId: options.requestId || crypto.randomUUID(),
    aggregatedToolName: options.aggregatedToolName || "browser__screenshot",
    serverName: options.serverName || "browser",
    toolName: options.toolName || "screenshot",
    arguments: options.arguments || {},
    startedAt: options.startedAt || new Date(),
    endedAt: options.endedAt || new Date(),
    durationMs: options.durationMs || 100,
    result: options.result,
    error: options.error,
    status: options.status || "success",
  }
}

// Helper to create mock gateway state
function createMockState(overrides: Partial<GatewayState> = {}): GatewayState {
  return {
    connectedMcps: overrides.connectedMcps ?? new Map(),
    aggregatedTools: overrides.aggregatedTools ?? [],
    eventHandlers: overrides.eventHandlers ?? [],
  }
}

describe("HTTP API", () => {
  let mockState: GatewayState
  let traceCollector: TraceCollector

  beforeEach(() => {
    vi.clearAllMocks()
    mockState = createMockState()
    traceCollector = new TraceCollector({ maxTraces: 100 })
  })

  describe("GET /api/status", () => {
    it("returns gateway status with correct structure", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status")

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData

      expect(data.status).toBe("ok")
      expect(data.version).toBeDefined()
      expect(data.uptime).toBeDefined()
      expect(data.servers).toBeDefined()
      expect(data.tools).toBeDefined()
      expect(data.traces).toBeDefined()
    })

    it("includes server count and names", async () => {
      const mcp1 = createMockMcp("browser", [createMockTool("screenshot")])
      const mcp2 = createMockMcp("github", [createMockTool("create_issue")])

      mockState.connectedMcps.set("browser", mcp1)
      mockState.connectedMcps.set("github", mcp2)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status")
      const data = (await res.json()) as JsonData

      expect(data.servers.connected).toBe(2)
      expect(data.servers.names).toContain("browser")
      expect(data.servers.names).toContain("github")
    })

    it("includes tool count", async () => {
      mockState.aggregatedTools = [
        createMockAggregatedTool("browser", "screenshot"),
        createMockAggregatedTool("browser", "click"),
        createMockAggregatedTool("github", "create_issue"),
      ]

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status")
      const data = (await res.json()) as JsonData

      expect(data.tools.count).toBe(3)
    })

    it("includes trace stats", async () => {
      traceCollector.addTrace(
        createMockTrace({ status: "success", durationMs: 100 })
      )
      traceCollector.addTrace(
        createMockTrace({ status: "success", durationMs: 200 })
      )
      traceCollector.addTrace(
        createMockTrace({ status: "error", error: "Failed", durationMs: 50 })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status")
      const data = (await res.json()) as JsonData

      expect(data.traces.total).toBe(3)
      expect(data.traces.successful).toBe(2)
      expect(data.traces.failed).toBe(1)
      expect(data.traces.averageDurationMs).toBeCloseTo(116.67, 1)
    })

    it("returns zero stats when no traces", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status")
      const data = (await res.json()) as JsonData

      expect(data.traces.total).toBe(0)
      expect(data.traces.successful).toBe(0)
      expect(data.traces.failed).toBe(0)
    })
  })

  describe("GET /api/traces", () => {
    it("returns traces list with pagination info", async () => {
      traceCollector.addTrace(createMockTrace())
      traceCollector.addTrace(createMockTrace())

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces")
      const data = (await res.json()) as JsonData

      expect(res.status).toBe(200)
      expect(data.traces).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.limit).toBe(50)
      expect(data.offset).toBe(0)
    })

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        traceCollector.addTrace(createMockTrace({ traceId: `trace-${i}` }))
      }

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?limit=3")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(3)
      expect(data.limit).toBe(3)
      expect(data.total).toBe(10)
    })

    it("respects offset parameter", async () => {
      for (let i = 0; i < 10; i++) {
        traceCollector.addTrace(
          createMockTrace({
            traceId: `trace-${i}`,
            startedAt: new Date(Date.now() + i * 1000), // Different times for ordering
          })
        )
      }

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?limit=3&offset=5")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(3)
      expect(data.offset).toBe(5)
    })

    it("filters by status=success", async () => {
      traceCollector.addTrace(createMockTrace({ status: "success" }))
      traceCollector.addTrace(
        createMockTrace({ status: "error", error: "Failed" })
      )
      traceCollector.addTrace(createMockTrace({ status: "success" }))

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?status=success")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(2)
      expect(
        data.traces.every((t: ToolCallTrace) => t.status === "success")
      ).toBe(true)
      expect(data.total).toBe(2)
    })

    it("filters by status=error", async () => {
      traceCollector.addTrace(createMockTrace({ status: "success" }))
      traceCollector.addTrace(
        createMockTrace({ status: "error", error: "Failed 1" })
      )
      traceCollector.addTrace(
        createMockTrace({ status: "error", error: "Failed 2" })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?status=error")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(2)
      expect(
        data.traces.every((t: ToolCallTrace) => t.status === "error")
      ).toBe(true)
      expect(data.total).toBe(2)
    })

    it("ignores invalid status values", async () => {
      traceCollector.addTrace(createMockTrace({ status: "success" }))
      traceCollector.addTrace(
        createMockTrace({ status: "error", error: "Failed" })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?status=invalid")
      const data = (await res.json()) as JsonData

      // Should return all traces when status is invalid
      expect(data.traces).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it("filters by search term matching tool name", async () => {
      traceCollector.addTrace(
        createMockTrace({
          aggregatedToolName: "browser__screenshot",
          toolName: "screenshot",
        })
      )
      traceCollector.addTrace(
        createMockTrace({
          aggregatedToolName: "browser__click",
          toolName: "click",
        })
      )
      traceCollector.addTrace(
        createMockTrace({
          aggregatedToolName: "github__create_issue",
          toolName: "create_issue",
        })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?search=screenshot")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(1)
      expect(data.traces[0].toolName).toBe("screenshot")
      expect(data.total).toBe(1)
    })

    it("filters by search term matching server name", async () => {
      traceCollector.addTrace(
        createMockTrace({
          serverName: "browser",
          toolName: "screenshot",
          aggregatedToolName: "browser__screenshot",
        })
      )
      traceCollector.addTrace(
        createMockTrace({
          serverName: "browser",
          toolName: "click",
          aggregatedToolName: "browser__click",
        })
      )
      traceCollector.addTrace(
        createMockTrace({
          serverName: "github",
          toolName: "create_issue",
          aggregatedToolName: "github__create_issue",
        })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?search=github")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(1)
      expect(data.total).toBe(1)
    })

    it("search is case-insensitive", async () => {
      traceCollector.addTrace(
        createMockTrace({ serverName: "Browser", toolName: "Screenshot" })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?search=BROWSER")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(1)
    })

    it("combines status and search filters", async () => {
      traceCollector.addTrace(
        createMockTrace({
          serverName: "figma",
          status: "success",
          aggregatedToolName: "figma__export",
          toolName: "export",
        })
      )
      traceCollector.addTrace(
        createMockTrace({
          serverName: "figma",
          status: "error",
          error: "F",
          aggregatedToolName: "figma__import",
          toolName: "import",
        })
      )
      traceCollector.addTrace(
        createMockTrace({
          serverName: "github",
          status: "success",
          aggregatedToolName: "github__create_issue",
          toolName: "create_issue",
        })
      )

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?status=success&search=figma")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(1)
      expect(data.traces[0].serverName).toBe("figma")
      expect(data.traces[0].status).toBe("success")
      expect(data.total).toBe(1)
    })

    it("returns empty array when no traces match filters", async () => {
      traceCollector.addTrace(createMockTrace({ serverName: "browser" }))

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?search=nonexistent")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it("returns total count for pagination", async () => {
      for (let i = 0; i < 100; i++) {
        traceCollector.addTrace(createMockTrace())
      }

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?limit=10&offset=0")
      const data = (await res.json()) as JsonData

      expect(data.traces).toHaveLength(10)
      expect(data.total).toBe(100)
    })
  })

  describe("GET /api/traces/:id", () => {
    it("returns single trace by ID", async () => {
      const traceId = "test-trace-id-123"
      traceCollector.addTrace(createMockTrace({ traceId }))
      traceCollector.addTrace(createMockTrace()) // Add another to ensure we get the right one

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request(`/api/traces/${traceId}`)

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData
      expect(data.traceId).toBe(traceId)
    })

    it("returns trace with all expected fields", async () => {
      const traceId = "full-trace-id"
      const trace = createMockTrace({
        traceId,
        requestId: "req-123",
        aggregatedToolName: "browser__screenshot",
        serverName: "browser",
        toolName: "screenshot",
        arguments: { url: "https://example.com" },
        result: { imageData: "base64..." },
        status: "success",
        durationMs: 150,
      })
      traceCollector.addTrace(trace)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request(`/api/traces/${traceId}`)
      const data = (await res.json()) as JsonData

      expect(data.traceId).toBe(traceId)
      expect(data.requestId).toBe("req-123")
      expect(data.aggregatedToolName).toBe("browser__screenshot")
      expect(data.serverName).toBe("browser")
      expect(data.toolName).toBe("screenshot")
      expect(data.arguments).toEqual({ url: "https://example.com" })
      expect(data.result).toEqual({ imageData: "base64..." })
      expect(data.status).toBe("success")
      expect(data.durationMs).toBe(150)
    })

    it("returns 404 for non-existent trace", async () => {
      traceCollector.addTrace(createMockTrace({ traceId: "existing-id" }))

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces/non-existent-id")

      expect(res.status).toBe(404)
      const data = (await res.json()) as JsonData
      expect(data.error).toBe("Trace not found")
    })

    it("returns 404 when no traces exist", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces/any-id")

      expect(res.status).toBe(404)
    })
  })

  describe("GET /api/servers", () => {
    it("returns list of connected servers", async () => {
      const mcp1 = createMockMcp("browser", [createMockTool("screenshot")])
      const mcp2 = createMockMcp("github", [createMockTool("create_issue")])

      mockState.connectedMcps.set("browser", mcp1)
      mockState.connectedMcps.set("github", mcp2)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers")

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData

      expect(data.servers).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it("includes server configuration details", async () => {
      const mcp = createMockMcp("browser", [createMockTool("screenshot")])
      mockState.connectedMcps.set("browser", mcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers")
      const data = (await res.json()) as JsonData

      const server = data.servers[0]
      expect(server.name).toBe("browser")
      expect(server.sanitizedName).toBeDefined()
      expect(server.transport).toBe("stdio")
      expect(server.command).toBe("/usr/bin/test")
      expect(server.status).toBe("active")
    })

    it("includes tool count per server", async () => {
      const mcp = createMockMcp("browser", [
        createMockTool("screenshot"),
        createMockTool("click"),
        createMockTool("type"),
      ])
      mockState.connectedMcps.set("browser", mcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers")
      const data = (await res.json()) as JsonData

      expect(data.servers[0].toolCount).toBe(3)
    })

    it("includes tool details for each server", async () => {
      const mcp = createMockMcp("browser", [
        createMockTool("screenshot", "Take a screenshot"),
        createMockTool("click", "Click an element"),
      ])
      mockState.connectedMcps.set("browser", mcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers")
      const data = (await res.json()) as JsonData

      const tools = data.servers[0].tools
      expect(tools).toHaveLength(2)
      expect(tools[0].name).toBe("screenshot")
      expect(tools[0].description).toBe("Take a screenshot")
      expect(tools[1].name).toBe("click")
      expect(tools[1].description).toBe("Click an element")
    })

    it("returns empty array when no servers connected", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers")
      const data = (await res.json()) as JsonData

      expect(data.servers).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it("includes URL for SSE transport servers", async () => {
      const mcp: ConnectedMcp = {
        config: {
          id: "mcp-remote",
          name: "remote-server",
          transport: "sse",
          url: "https://api.example.com/mcp",
          status: "active",
        },
        sanitizedName: "remote_server",
        client: {} as ConnectedMcp["client"],
        tools: [],
        connectedAt: new Date(),
      }
      mockState.connectedMcps.set("remote-server", mcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers")
      const data = (await res.json()) as JsonData

      expect(data.servers[0].transport).toBe("sse")
      expect(data.servers[0].url).toBe("https://api.example.com/mcp")
    })
  })

  describe("GET /api/tools", () => {
    it("returns aggregated tools list", async () => {
      mockState.aggregatedTools = [
        createMockAggregatedTool("browser", "screenshot"),
        createMockAggregatedTool("browser", "click"),
        createMockAggregatedTool("github", "create_issue"),
      ]

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/tools")

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData

      expect(data.tools).toHaveLength(3)
      expect(data.total).toBe(3)
    })

    it("includes server name and original tool name", async () => {
      mockState.aggregatedTools = [
        createMockAggregatedTool("browser", "screenshot"),
      ]

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/tools")
      const data = (await res.json()) as JsonData

      const tool = data.tools[0]
      expect(tool.name).toBe("browser__screenshot")
      expect(tool.serverName).toBe("browser")
      expect(tool.originalName).toBe("screenshot")
    })

    it("includes tool description and input schema", async () => {
      const tool = createMockAggregatedTool(
        "browser",
        "screenshot",
        "[browser] Take a screenshot of the page"
      )
      tool.inputSchema = {
        type: "object",
        properties: {
          fullPage: { type: "boolean" },
        },
      }
      mockState.aggregatedTools = [tool]

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/tools")
      const data = (await res.json()) as JsonData

      expect(data.tools[0].description).toBe(
        "[browser] Take a screenshot of the page"
      )
      expect(data.tools[0].inputSchema).toEqual({
        type: "object",
        properties: {
          fullPage: { type: "boolean" },
        },
      })
    })

    it("returns empty array when no tools available", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/tools")
      const data = (await res.json()) as JsonData

      expect(data.tools).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it("handles tools from multiple servers", async () => {
      mockState.aggregatedTools = [
        createMockAggregatedTool("browser", "screenshot"),
        createMockAggregatedTool("github", "create_issue"),
        createMockAggregatedTool("filesystem", "read_file"),
      ]

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/tools")
      const data = (await res.json()) as JsonData

      const serverNames = data.tools.map((t: AggregatedTool) => t.serverName)
      expect(serverNames).toContain("browser")
      expect(serverNames).toContain("github")
      expect(serverNames).toContain("filesystem")
    })
  })

  describe("CORS", () => {
    it("includes CORS headers for localhost:5173", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status", {
        headers: {
          Origin: "http://localhost:5173",
        },
      })

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:5173"
      )
    })

    it("includes CORS headers for localhost:3000", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status", {
        headers: {
          Origin: "http://localhost:3000",
        },
      })

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3000"
      )
    })

    it("handles OPTIONS preflight requests", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/status", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
        },
      })

      expect(res.status).toBe(204)
    })
  })

  describe("Error handling", () => {
    it("returns 404 for unknown routes", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/unknown")

      expect(res.status).toBe(404)
    })

    it("handles malformed query parameters gracefully", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/traces?limit=invalid&offset=bad")

      // parseInt of invalid string returns NaN, which should be handled
      expect(res.status).toBe(200)
    })
  })

  describe("GET /api/servers/:name/test", () => {
    it("returns 404 for non-existent server", async () => {
      const mcp = createMockMcp("filesystem", [
        createMockTool("read_file"),
        createMockTool("write_file"),
      ])
      mockState.connectedMcps.set("filesystem", mcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers/nonexistent/test")

      expect(res.status).toBe(404)
      const data = (await res.json()) as JsonData
      expect(data.success).toBe(false)
      expect(data.error).toContain("not found")
      expect(data.availableServers).toEqual(["filesystem"])
    })

    it("returns success when server connection test passes", async () => {
      const mcp = createMockMcp("filesystem", [
        createMockTool("read_file"),
        createMockTool("write_file"),
      ])
      mockState.connectedMcps.set("filesystem", mcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers/filesystem/test")

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData
      expect(data.success).toBe(true)
      expect(data.server).toBe("filesystem")
      expect(data.tools).toBe(2)
      expect(data.durationMs).toBeGreaterThanOrEqual(0)
    })

    it("returns error when server connection test fails", async () => {
      const failingMcp = createMockMcp("failing-server", [])
      failingMcp.client.listTools = vi
        .fn()
        .mockRejectedValue(new Error("Connection lost"))
      mockState.connectedMcps.set("failing-server", failingMcp)

      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/servers/failing-server/test")

      expect(res.status).toBe(500)
      const data = (await res.json()) as JsonData
      expect(data.success).toBe(false)
      expect(data.error).toBe("Connection lost")
    })
  })

  describe("POST /api/test-config", () => {
    it("validates stdio config correctly", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-server",
          transport: "stdio",
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        }),
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData
      expect(data.success).toBe(true)
      expect(data.config.name).toBe("test-server")
      expect(data.config.transport).toBe("stdio")
    })

    it("validates sse config correctly", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "remote-server",
          transport: "sse",
          url: "https://example.com/mcp/sse",
          headers: { Authorization: "Bearer token" },
        }),
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as JsonData
      expect(data.success).toBe(true)
      expect(data.config.hasHeaders).toBe(true)
    })

    it("returns error for missing name", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport: "stdio", command: "npx" }),
      })

      expect(res.status).toBe(400)
      const data = (await res.json()) as JsonData
      expect(data.error).toContain("name")
    })

    it("returns error for missing command in stdio transport", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test", transport: "stdio" }),
      })

      expect(res.status).toBe(400)
      const data = (await res.json()) as JsonData
      expect(data.error).toContain("command")
    })

    it("returns error for missing url in sse transport", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test", transport: "sse" }),
      })

      expect(res.status).toBe(400)
      const data = (await res.json()) as JsonData
      expect(data.error).toContain("url")
    })

    it("returns error for invalid url format", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test",
          transport: "sse",
          url: "not-a-url",
        }),
      })

      expect(res.status).toBe(400)
      const data = (await res.json()) as JsonData
      expect(data.error).toContain("URL")
    })

    it("returns error for unknown transport", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test", transport: "unknown" }),
      })

      expect(res.status).toBe(400)
      const data = (await res.json()) as JsonData
      expect(data.error).toContain("Unknown transport")
    })

    it("returns error for invalid JSON", async () => {
      const app = createHttpApi(mockState, traceCollector)
      const res = await app.request("/api/test-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      })

      expect(res.status).toBe(400)
    })
  })
})
