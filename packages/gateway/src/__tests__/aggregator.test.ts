/**
 * Tests for Tool Aggregation Logic
 *
 * Note: Core aggregation logic is now in @athreei/gateway-core.
 * These tests verify the integration with the gateway package.
 */

import { describe, it, expect } from "vitest"
import {
  sanitizeName,
  createPrefixedName,
  aggregateTools,
  findAggregatedTool,
  getToolsForServer,
  getAggregationSummary,
} from "@athreei/gateway-core"
import type { ConnectedMcp } from "../types"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

// Mock MCP client
const mockClient = {} as ConnectedMcp["client"]

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
    sanitizedName: sanitizedName || sanitizeName(name),
    client: mockClient,
    tools,
    connectedAt: new Date(),
  }
}

describe("sanitizeName", () => {
  it("converts to lowercase", () => {
    expect(sanitizeName("GitHub")).toBe("github")
    expect(sanitizeName("BROWSER")).toBe("browser")
  })

  it("replaces spaces with underscores", () => {
    expect(sanitizeName("my server")).toBe("my_server")
  })

  it("replaces special characters with underscores", () => {
    expect(sanitizeName("my-server")).toBe("my_server")
    expect(sanitizeName("my.server")).toBe("my_server")
    expect(sanitizeName("my@server!")).toBe("my_server")
  })

  it("collapses consecutive underscores", () => {
    expect(sanitizeName("my--server")).toBe("my_server")
    expect(sanitizeName("my___server")).toBe("my_server")
  })

  it("removes leading and trailing underscores", () => {
    expect(sanitizeName("_server_")).toBe("server")
    expect(sanitizeName("__server__")).toBe("server")
  })

  it("handles complex names", () => {
    expect(sanitizeName("My-GitHub-Server v2.0")).toBe("my_github_server_v2_0")
  })

  it("preserves underscores in original name", () => {
    expect(sanitizeName("my_server")).toBe("my_server")
  })
})

describe("createPrefixedName", () => {
  it("creates prefixed name with double underscore separator", () => {
    expect(createPrefixedName("browser", "screenshot")).toBe(
      "browser__screenshot"
    )
    expect(createPrefixedName("github", "create_issue")).toBe(
      "github__create_issue"
    )
  })

  it("handles tool names with underscores", () => {
    expect(createPrefixedName("server", "read_file_content")).toBe(
      "server__read_file_content"
    )
  })
})

describe("aggregateTools", () => {
  it("aggregates tools from single MCP", () => {
    const mcps = [
      createMockMcp("browser", [
        createMockTool("screenshot"),
        createMockTool("click"),
      ]),
    ]

    const result = aggregateTools(mcps)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("browser__screenshot")
    expect(result[1].name).toBe("browser__click")
  })

  it("aggregates tools from multiple MCPs", () => {
    const mcps = [
      createMockMcp("browser", [createMockTool("screenshot")]),
      createMockMcp("github", [createMockTool("create_issue")]),
      createMockMcp("filesystem", [createMockTool("read_file")]),
    ]

    const result = aggregateTools(mcps)

    expect(result).toHaveLength(3)
    expect(result.map((t) => t.name)).toContain("browser__screenshot")
    expect(result.map((t) => t.name)).toContain("github__create_issue")
    expect(result.map((t) => t.name)).toContain("filesystem__read_file")
  })

  it("preserves original tool name", () => {
    const mcps = [createMockMcp("browser", [createMockTool("screenshot")])]

    const result = aggregateTools(mcps)

    expect(result[0].originalName).toBe("screenshot")
    expect(result[0].serverName).toBe("browser")
  })

  it("prefixes description with server name", () => {
    const mcps = [
      createMockMcp("browser", [
        createMockTool("screenshot", "Take a screenshot"),
      ]),
    ]

    const result = aggregateTools(mcps)

    expect(result[0].description).toBe("[browser] Take a screenshot")
  })

  it("handles MCPs with no tools", () => {
    const mcps = [
      createMockMcp("empty", []),
      createMockMcp("browser", [createMockTool("screenshot")]),
    ]

    const result = aggregateTools(mcps)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("browser__screenshot")
  })

  it("handles empty MCP list", () => {
    const result = aggregateTools([])
    expect(result).toHaveLength(0)
  })

  it("uses sanitized server name in prefix", () => {
    const mcps = [
      createMockMcp("My-GitHub-Server", [createMockTool("create_issue")]),
    ]

    const result = aggregateTools(mcps)

    expect(result[0].name).toBe("my_github_server__create_issue")
    expect(result[0].serverName).toBe("my_github_server")
  })
})

describe("findAggregatedTool", () => {
  it("finds tool by prefixed name", () => {
    const tools = aggregateTools([
      createMockMcp("browser", [
        createMockTool("screenshot"),
        createMockTool("click"),
      ]),
    ])

    const result = findAggregatedTool(tools, "browser__screenshot")

    expect(result).toBeDefined()
    expect(result?.originalName).toBe("screenshot")
  })

  it("returns undefined for unknown tool", () => {
    const tools = aggregateTools([
      createMockMcp("browser", [createMockTool("screenshot")]),
    ])

    const result = findAggregatedTool(tools, "browser__unknown")

    expect(result).toBeUndefined()
  })
})

describe("getToolsForServer", () => {
  it("returns tools for specific server", () => {
    const tools = aggregateTools([
      createMockMcp("browser", [
        createMockTool("screenshot"),
        createMockTool("click"),
      ]),
      createMockMcp("github", [createMockTool("create_issue")]),
    ])

    const browserTools = getToolsForServer(tools, "browser")

    expect(browserTools).toHaveLength(2)
    expect(browserTools.every((t) => t.serverName === "browser")).toBe(true)
  })

  it("returns empty array for unknown server", () => {
    const tools = aggregateTools([
      createMockMcp("browser", [createMockTool("screenshot")]),
    ])

    const result = getToolsForServer(tools, "unknown")

    expect(result).toHaveLength(0)
  })

  it("sanitizes server name for comparison", () => {
    const tools = aggregateTools([
      createMockMcp("My-Server", [createMockTool("tool1")]),
    ])

    const result = getToolsForServer(tools, "My-Server")

    expect(result).toHaveLength(1)
  })
})

describe("getAggregationSummary", () => {
  it("returns tool count by server", () => {
    const tools = aggregateTools([
      createMockMcp("browser", [
        createMockTool("screenshot"),
        createMockTool("click"),
        createMockTool("type"),
      ]),
      createMockMcp("github", [createMockTool("create_issue")]),
    ])

    const summary = getAggregationSummary(tools)

    expect(summary.get("browser")).toBe(3)
    expect(summary.get("github")).toBe(1)
  })

  it("handles empty tools array", () => {
    const summary = getAggregationSummary([])
    expect(summary.size).toBe(0)
  })
})
