/**
 * Tests for Request Routing Logic
 */

import { describe, it, expect, vi } from "vitest"
import {
  parseToolName,
  routeToolCall,
  validateToolCall,
  getRoutingInfo,
  isServerAvailable,
  getAvailableServers,
} from "../router"
import { sanitizeName } from "../aggregator"
import type {
  ConnectedMcp,
  AggregatedTool,
  RouterState,
  Logger,
} from "../types"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

// Mock MCP client with callTool function
function createMockClient() {
  return {
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
    }),
  } as unknown as ConnectedMcp["client"]
}

// Helper to create a mock connected MCP
function createMockMcp(name: string, tools: Tool[]): ConnectedMcp {
  return {
    config: {
      id: `mcp-${name}`,
      name,
      transport: "stdio",
      command: "/usr/bin/test",
      status: "active",
    },
    sanitizedName: sanitizeName(name),
    client: createMockClient(),
    tools,
    connectedAt: new Date(),
  }
}

// Helper to create a mock aggregated tool
function createAggregatedTool(
  serverName: string,
  toolName: string
): AggregatedTool {
  return {
    name: `${serverName}__${toolName}`,
    description: `Tool: ${toolName}`,
    inputSchema: { type: "object", properties: {} },
    originalName: toolName,
    serverName,
  }
}

// Helper to create a router state
function createRouterState(): RouterState {
  return {
    connectedMcps: new Map(),
    aggregatedTools: [],
  }
}

describe("parseToolName", () => {
  it("parses simple tool name", () => {
    const result = parseToolName("browser__screenshot")

    expect(result.serverName).toBe("browser")
    expect(result.toolName).toBe("screenshot")
  })

  it("parses tool name with underscores", () => {
    const result = parseToolName("github__create_pull_request")

    expect(result.serverName).toBe("github")
    expect(result.toolName).toBe("create_pull_request")
  })

  it("handles tool names containing double underscores", () => {
    // Tool name itself contains __ (edge case)
    const result = parseToolName("server__tool__with__underscores")

    expect(result.serverName).toBe("server")
    expect(result.toolName).toBe("tool__with__underscores")
  })

  it("throws for invalid format - no separator", () => {
    expect(() => parseToolName("invalid")).toThrow(
      'Invalid tool name format: "invalid"'
    )
  })

  it("throws for empty server name", () => {
    expect(() => parseToolName("__toolname")).toThrow(
      'Invalid tool name format: "__toolname"'
    )
  })

  it("throws for empty tool name", () => {
    expect(() => parseToolName("server__")).toThrow(
      'Invalid tool name format: "server__"'
    )
  })

  it("throws for only separator", () => {
    expect(() => parseToolName("__")).toThrow('Invalid tool name format: "__"')
  })

  it("handles single underscore in server name", () => {
    const result = parseToolName("my_server__tool")

    expect(result.serverName).toBe("my_server")
    expect(result.toolName).toBe("tool")
  })
})

describe("validateToolCall", () => {
  it("returns valid for known tool on connected server", () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    state.connectedMcps.set("browser", mcp)

    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    const result = validateToolCall(state, "browser__screenshot")

    expect(result.valid).toBe(true)
  })

  it("returns invalid for unknown tool", () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [])
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = []

    const result = validateToolCall(state, "browser__unknown")

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain("Unknown tool")
    }
  })

  it("returns invalid for disconnected server", () => {
    const state = createRouterState()

    // Tool exists but server is not connected
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]
    // Note: connectedMcps is empty

    const result = validateToolCall(state, "browser__screenshot")

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain("not connected")
    }
  })

  it("returns invalid for malformed tool name", () => {
    const state = createRouterState()

    const result = validateToolCall(state, "invalid")

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain("Invalid tool name format")
    }
  })
})

describe("getRoutingInfo", () => {
  it("returns routing info for connected server", () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    state.connectedMcps.set("browser", mcp)

    const result = getRoutingInfo(state, "browser__screenshot")

    expect(result).not.toBeNull()
    expect(result?.serverName).toBe("browser")
    expect(result?.toolName).toBe("screenshot")
    expect(result?.isConnected).toBe(true)
    expect(result?.serverConfig.name).toBe("browser")
  })

  it("returns null for unknown server", () => {
    const state = createRouterState()

    const result = getRoutingInfo(state, "unknown__tool")

    expect(result).toBeNull()
  })

  it("returns null for invalid tool name format", () => {
    const state = createRouterState()

    const result = getRoutingInfo(state, "invalid")

    expect(result).toBeNull()
  })
})

describe("routeToolCall", () => {
  it("routes call to correct MCP server", async () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    const result = await routeToolCall(state, "browser__screenshot", {
      url: "https://example.com",
    })

    expect(result).toBeDefined()
    expect(mcp.client.callTool).toHaveBeenCalledWith({
      name: "screenshot",
      arguments: { url: "https://example.com" },
    })
  })

  it("throws for unknown tool", async () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [])
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = []

    await expect(
      routeToolCall(state, "browser__unknown", undefined)
    ).rejects.toThrow('Unknown tool: "browser__unknown"')
  })

  it("throws for disconnected server", async () => {
    const state = createRouterState()
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]
    // Note: connectedMcps is empty

    await expect(
      routeToolCall(state, "browser__screenshot", undefined)
    ).rejects.toThrow('MCP server not found: "browser"')
  })

  it("throws for invalid tool name format", async () => {
    const state = createRouterState()

    await expect(routeToolCall(state, "invalid", undefined)).rejects.toThrow(
      'Invalid tool name format: "invalid"'
    )
  })

  it("passes arguments correctly", async () => {
    const state = createRouterState()

    const mcp = createMockMcp("math", [{ name: "add", inputSchema: {} }])
    state.connectedMcps.set("math", mcp)
    state.aggregatedTools = [createAggregatedTool("math", "add")]

    await routeToolCall(state, "math__add", { a: 1, b: 2 })

    expect(mcp.client.callTool).toHaveBeenCalledWith({
      name: "add",
      arguments: { a: 1, b: 2 },
    })
  })

  it("handles undefined arguments", async () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    await routeToolCall(state, "browser__screenshot", undefined)

    expect(mcp.client.callTool).toHaveBeenCalledWith({
      name: "screenshot",
      arguments: undefined,
    })
  })

  it("logs with provided logger", async () => {
    const state = createRouterState()

    const mockLogger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    await routeToolCall(state, "browser__screenshot", undefined, {
      logger: mockLogger,
    })

    expect(mockLogger.info).toHaveBeenCalled()
    expect(mockLogger.debug).toHaveBeenCalled()
  })

  it("propagates errors from upstream MCP", async () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    ;(mcp.client.callTool as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Upstream error")
    )
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    await expect(
      routeToolCall(state, "browser__screenshot", undefined)
    ).rejects.toThrow("Upstream error")
  })
})

describe("isServerAvailable", () => {
  it("returns true for connected server", () => {
    const state = createRouterState()

    const mcp = createMockMcp("browser", [])
    state.connectedMcps.set("browser", mcp)

    expect(isServerAvailable(state, "browser")).toBe(true)
  })

  it("returns false for disconnected server", () => {
    const state = createRouterState()

    expect(isServerAvailable(state, "browser")).toBe(false)
  })
})

describe("getAvailableServers", () => {
  it("returns list of connected server names", () => {
    const state = createRouterState()

    state.connectedMcps.set("browser", createMockMcp("browser", []))
    state.connectedMcps.set("github", createMockMcp("github", []))
    state.connectedMcps.set("filesystem", createMockMcp("filesystem", []))

    const servers = getAvailableServers(state)

    expect(servers).toHaveLength(3)
    expect(servers).toContain("browser")
    expect(servers).toContain("github")
    expect(servers).toContain("filesystem")
  })

  it("returns empty array when no servers connected", () => {
    const state = createRouterState()

    const servers = getAvailableServers(state)

    expect(servers).toHaveLength(0)
  })
})
