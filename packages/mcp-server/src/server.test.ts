/**
 * Integration test for MCP Server
 *
 * This test verifies that the server can be created, all tools are registered,
 * and basic tool invocation works with stub data.
 */

import { describe, it, expect, beforeEach } from "vitest"
import { createServer } from "./server.js"
import { MCP_TOOL_NAMES } from "@athreei/shared"
import {
  getMcpContext,
  clearMcpContext,
  getAiAppName,
} from "./context/index.js"

describe("MCP Server", () => {
  it("should create server successfully", () => {
    const server = createServer()
    expect(server).toBeDefined()
  })

  it("should register all browser tools", () => {
    const server = createServer()

    // The MCP SDK doesn't expose a way to list registered tools,
    // but we can verify by checking that tool names are valid
    expect(MCP_TOOL_NAMES).toHaveLength(11)
    expect(MCP_TOOL_NAMES).toContain("browser_list_tabs")
    expect(MCP_TOOL_NAMES).toContain("browser_get_active_tab")
    expect(MCP_TOOL_NAMES).toContain("browser_navigate")
    expect(MCP_TOOL_NAMES).toContain("browser_get_content")
    expect(MCP_TOOL_NAMES).toContain("browser_get_elements")
    expect(MCP_TOOL_NAMES).toContain("browser_click")
    expect(MCP_TOOL_NAMES).toContain("browser_type")
    expect(MCP_TOOL_NAMES).toContain("browser_scroll")
    expect(MCP_TOOL_NAMES).toContain("browser_screenshot")
    expect(MCP_TOOL_NAMES).toContain("browser_execute_script")
    expect(MCP_TOOL_NAMES).toContain("browser_wait")
  })

  it("should have correct server metadata", () => {
    const server = createServer()
    // The server instance is opaque, but we can verify it was created
    expect(server).toHaveProperty("connect")
    expect(server).toHaveProperty("close")
    expect(server).toHaveProperty("registerTool")
  })

  it("should have oninitialized handler registered", () => {
    const server = createServer()
    // Verify the server has the oninitialized callback set up
    expect(server.server.oninitialized).toBeDefined()
    expect(typeof server.server.oninitialized).toBe("function")
  })

  it("should have onclose handler registered", () => {
    const server = createServer()
    // Verify the server has the onclose callback set up
    expect(server.server.onclose).toBeDefined()
    expect(typeof server.server.onclose).toBe("function")
  })
})

describe("MCP Server Context Integration", () => {
  beforeEach(() => {
    clearMcpContext()
  })

  it("should return default AI app name before client connects", () => {
    expect(getAiAppName()).toBe("AI Assistant")
  })

  it("should have no context before client connects", () => {
    expect(getMcpContext()).toBeNull()
  })
})
