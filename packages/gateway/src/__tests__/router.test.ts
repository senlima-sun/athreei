/**
 * Tests for Request Routing
 *
 * Note: Core routing logic is now in @athreei/gateway-core.
 * These tests verify the integration with the gateway package.
 */

import { describe, it, expect } from "vitest"
import {
  parseToolName,
  validateToolCall,
  getRoutingInfo,
  sanitizeName,
} from "@athreei/gateway-core"
import { createGatewayState } from "../server"
import type { ConnectedMcp, AggregatedTool } from "../types"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

// Mock MCP client
const mockClient = {
  callTool: async () => ({ content: [{ type: "text", text: "result" }] }),
} as unknown as ConnectedMcp["client"]

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
    client: mockClient,
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
})

describe("validateToolCall", () => {
  it("returns valid for known tool on connected server", () => {
    const state = createGatewayState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: { type: "object" } },
    ])
    state.connectedMcps.set("browser", mcp)

    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    const result = validateToolCall(state, "browser__screenshot")

    expect(result.valid).toBe(true)
  })

  it("returns invalid for unknown tool", () => {
    const state = createGatewayState()

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
    const state = createGatewayState()

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
    const state = createGatewayState()

    const result = validateToolCall(state, "invalid")

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain("Invalid tool name format")
    }
  })
})

describe("getRoutingInfo", () => {
  it("returns routing info for connected server", () => {
    const state = createGatewayState()

    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: { type: "object" } },
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
    const state = createGatewayState()

    const result = getRoutingInfo(state, "unknown__tool")

    expect(result).toBeNull()
  })

  it("returns null for invalid tool name format", () => {
    const state = createGatewayState()

    const result = getRoutingInfo(state, "invalid")

    expect(result).toBeNull()
  })
})
