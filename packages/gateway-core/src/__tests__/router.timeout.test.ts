import { describe, it, expect, vi, beforeEach } from "vitest"
import { routeToolCall } from "../router"
import { ToolCallTimeoutError } from "../types"
import { TIMEOUT } from "../constants"
import { sanitizeName } from "../aggregator"
import type { ConnectedMcp, AggregatedTool, RouterState } from "../types"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

function createMockClient() {
  return {
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
    }),
  } as unknown as ConnectedMcp["client"]
}

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

function createRouterState(): RouterState {
  return {
    connectedMcps: new Map(),
    aggregatedTools: [],
  }
}

function createNeverResolvingPromise<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

describe("routeToolCall timeout handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should complete fast calls without timeout", async () => {
    const state = createRouterState()
    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    const result = await routeToolCall(state, "browser__screenshot", {
      url: "https://example.com",
    })

    expect(result).toEqual({
      content: [{ type: "text", text: "result" }],
    })
    expect(mcp.client.callTool).toHaveBeenCalledWith({
      name: "screenshot",
      arguments: { url: "https://example.com" },
    })
  })

  it("should throw ToolCallTimeoutError when call exceeds timeout", async () => {
    const state = createRouterState()
    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    const shortTimeout = 50

    ;(mcp.client.callTool as ReturnType<typeof vi.fn>).mockReturnValue(
      createNeverResolvingPromise()
    )

    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    await expect(
      routeToolCall(state, "browser__screenshot", undefined, {
        timeoutMs: shortTimeout,
      })
    ).rejects.toThrow(ToolCallTimeoutError)
  })

  it("should use custom timeout when provided", async () => {
    const state = createRouterState()
    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    const customTimeout = 100

    ;(mcp.client.callTool as ReturnType<typeof vi.fn>).mockReturnValue(
      createNeverResolvingPromise()
    )

    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    const startTime = Date.now()

    await expect(
      routeToolCall(state, "browser__screenshot", undefined, {
        timeoutMs: customTimeout,
      })
    ).rejects.toThrow(
      `Tool call 'screenshot' on server 'browser' timed out after ${customTimeout}ms`
    )

    const elapsed = Date.now() - startTime
    expect(elapsed).toBeGreaterThanOrEqual(customTimeout - 10)
    expect(elapsed).toBeLessThan(customTimeout + 100)
  })

  it("should include correct error properties", async () => {
    const state = createRouterState()
    const mcp = createMockMcp("github", [
      { name: "create_issue", inputSchema: {} },
    ])
    const customTimeout = 50

    ;(mcp.client.callTool as ReturnType<typeof vi.fn>).mockReturnValue(
      createNeverResolvingPromise()
    )

    state.connectedMcps.set("github", mcp)
    state.aggregatedTools = [createAggregatedTool("github", "create_issue")]

    let caughtError: unknown
    try {
      await routeToolCall(
        state,
        "github__create_issue",
        { title: "Bug report" },
        { timeoutMs: customTimeout }
      )
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(ToolCallTimeoutError)
    const timeoutError = caughtError as ToolCallTimeoutError
    expect(timeoutError.serverName).toBe("github")
    expect(timeoutError.toolName).toBe("create_issue")
    expect(timeoutError.timeoutMs).toBe(customTimeout)
    expect(timeoutError.name).toBe("ToolCallTimeoutError")
  })

  it("should not timeout when call completes before deadline", async () => {
    const state = createRouterState()
    const mcp = createMockMcp("browser", [
      { name: "screenshot", inputSchema: {} },
    ])
    const timeout = 200
    const responseDelay = 50

    ;(mcp.client.callTool as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ content: [{ type: "text", text: "success" }] }),
            responseDelay
          )
        })
    )

    state.connectedMcps.set("browser", mcp)
    state.aggregatedTools = [createAggregatedTool("browser", "screenshot")]

    const result = await routeToolCall(
      state,
      "browser__screenshot",
      undefined,
      {
        timeoutMs: timeout,
      }
    )

    expect(result).toEqual({
      content: [{ type: "text", text: "success" }],
    })
  })

  it("should use default timeout from constants", () => {
    expect(TIMEOUT.DEFAULT_TOOL_CALL_MS).toBe(30_000)
    expect(TIMEOUT.MIN_TOOL_CALL_MS).toBe(1_000)
    expect(TIMEOUT.MAX_TOOL_CALL_MS).toBe(300_000)
  })
})
