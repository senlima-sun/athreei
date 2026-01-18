/**
 * Tests for Namespace Router
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NamespaceRouter } from "../namespace-router"
import type { TransportConnection } from "../../types/transports"

const createMockConnection = (
  id: string,
  overrides: Partial<TransportConnection> = {}
): TransportConnection => ({
  id,
  config: { transport: "stdio", command: "test" },
  status: "connected",
  connectedAt: new Date(),
  send: vi.fn(),
  close: vi.fn(),
  onMessage: vi.fn(),
  onError: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
})

const createMockTool = (name: string, description?: string) => ({
  name,
  description: description || `Tool: ${name}`,
  inputSchema: { type: "object", properties: {} },
})

describe("NamespaceRouter", () => {
  let router: NamespaceRouter

  beforeEach(() => {
    router = new NamespaceRouter()
  })

  describe("registerServer", () => {
    it("stores namespace → connection mapping", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      expect(router.hasNamespace("github")).toBe(true)
      expect(router.getRoute("github")).toBeDefined()
    })

    it("creates tool → namespace mapping for all tools", () => {
      const connection = createMockConnection("conn-1")
      const tools = [
        createMockTool("create_issue"),
        createMockTool("list_repos"),
      ]

      router.registerServer("github", "server-1", connection, tools)

      expect(router.hasTool("github__create_issue")).toBe(true)
      expect(router.hasTool("github__list_repos")).toBe(true)
    })

    it("namespaces tool names with double underscore", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("screenshot")]

      router.registerServer("browser", "server-1", connection, tools)

      const allTools = router.getAllTools()
      expect(allTools[0].namespacedName).toBe("browser__screenshot")
    })

    it("handles server with no tools", () => {
      const connection = createMockConnection("conn-1")

      router.registerServer("empty", "server-1", connection, [])

      expect(router.hasNamespace("empty")).toBe(true)
      expect(router.getToolsForNamespace("empty")).toHaveLength(0)
    })

    it("handles server re-registration (updates mapping)", () => {
      const connection1 = createMockConnection("conn-1")
      const connection2 = createMockConnection("conn-2")
      const tools1 = [createMockTool("tool_a")]
      const tools2 = [createMockTool("tool_b")]

      router.registerServer("github", "server-1", connection1, tools1)
      router.registerServer("github", "server-2", connection2, tools2)

      expect(router.hasTool("github__tool_a")).toBe(false)
      expect(router.hasTool("github__tool_b")).toBe(true)
      expect(router.getRoute("github")?.serverId).toBe("server-2")
    })
  })

  describe("unregisterServer", () => {
    it("removes namespace from routes", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)
      router.unregisterServer("github")

      expect(router.hasNamespace("github")).toBe(false)
    })

    it("removes all tool mappings for namespace", () => {
      const connection = createMockConnection("conn-1")
      const tools = [
        createMockTool("create_issue"),
        createMockTool("list_repos"),
      ]

      router.registerServer("github", "server-1", connection, tools)
      router.unregisterServer("github")

      expect(router.hasTool("github__create_issue")).toBe(false)
      expect(router.hasTool("github__list_repos")).toBe(false)
    })

    it("handles unregister of unknown namespace", () => {
      expect(() => router.unregisterServer("unknown")).not.toThrow()
    })
  })

  describe("routeToolCall", () => {
    it("returns correct route for namespaced tool", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      const route = router.routeToolCall("github__create_issue")

      expect(route).toBeDefined()
      expect(route?.namespace).toBe("github")
      expect(route?.serverId).toBe("server-1")
    })

    it("returns connection for making tool call", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      const route = router.routeToolCall("github__create_issue")

      expect(route?.connection).toBe(connection)
    })

    it("returns undefined for unknown tool", () => {
      expect(router.routeToolCall("unknown__tool")).toBeUndefined()
    })

    it("returns undefined for unnamespaced tool name", () => {
      expect(router.routeToolCall("create_issue")).toBeUndefined()
    })
  })

  describe("getOriginalToolName", () => {
    it("strips namespace prefix: github__create_issue → create_issue", () => {
      expect(router.getOriginalToolName("github__create_issue")).toBe(
        "create_issue"
      )
    })

    it("handles tools with underscores: github__create_pr_comment → create_pr_comment", () => {
      expect(router.getOriginalToolName("github__create_pr_comment")).toBe(
        "create_pr_comment"
      )
    })

    it("returns original if no namespace prefix", () => {
      expect(router.getOriginalToolName("create_issue")).toBe("create_issue")
    })

    it("handles multiple double underscores", () => {
      expect(
        router.getOriginalToolName("github__tool__with__underscores")
      ).toBe("tool__with__underscores")
    })
  })

  describe("getNamespace", () => {
    it("extracts namespace from tool name", () => {
      expect(router.getNamespace("github__create_issue")).toBe("github")
    })

    it("returns undefined for unnamespaced tool", () => {
      expect(router.getNamespace("create_issue")).toBeUndefined()
    })
  })

  describe("parseToolName", () => {
    it("parses namespaced tool correctly", () => {
      const result = router.parseToolName("github__create_issue")

      expect(result.namespace).toBe("github")
      expect(result.toolName).toBe("create_issue")
    })

    it("handles unnamespaced tool", () => {
      const result = router.parseToolName("create_issue")

      expect(result.namespace).toBeUndefined()
      expect(result.toolName).toBe("create_issue")
    })

    it("handles tool with multiple double underscores", () => {
      const result = router.parseToolName("github__create__pr__comment")

      expect(result.namespace).toBe("github")
      expect(result.toolName).toBe("create__pr__comment")
    })
  })

  describe("getAllTools", () => {
    it("returns tools from all registered servers", () => {
      const conn1 = createMockConnection("conn-1")
      const conn2 = createMockConnection("conn-2")

      router.registerServer("github", "s1", conn1, [
        createMockTool("create_issue"),
      ])
      router.registerServer("browser", "s2", conn2, [
        createMockTool("screenshot"),
      ])

      const tools = router.getAllTools()

      expect(tools).toHaveLength(2)
    })

    it("includes namespace prefix on all tools", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      const allTools = router.getAllTools()

      expect(allTools[0].namespacedName).toBe("github__create_issue")
      expect(allTools[0].namespace).toBe("github")
      expect(allTools[0].originalName).toBe("create_issue")
    })

    it("returns empty array when no servers registered", () => {
      expect(router.getAllTools()).toEqual([])
    })
  })

  describe("getToolsForNamespace", () => {
    it("returns tools for specific namespace", () => {
      const connection = createMockConnection("conn-1")
      const tools = [
        createMockTool("create_issue"),
        createMockTool("list_repos"),
      ]

      router.registerServer("github", "server-1", connection, tools)

      const namespaceTools = router.getToolsForNamespace("github")

      expect(namespaceTools).toHaveLength(2)
    })

    it("returns empty array for unknown namespace", () => {
      expect(router.getToolsForNamespace("unknown")).toEqual([])
    })
  })

  describe("getRoute", () => {
    it("returns route for existing namespace", () => {
      const connection = createMockConnection("conn-1")

      router.registerServer("github", "server-1", connection, [])

      const route = router.getRoute("github")

      expect(route).toBeDefined()
      expect(route?.namespace).toBe("github")
      expect(route?.serverId).toBe("server-1")
    })

    it("returns undefined for unknown namespace", () => {
      expect(router.getRoute("unknown")).toBeUndefined()
    })
  })

  describe("getAllRoutes", () => {
    it("returns all registered routes", () => {
      const conn1 = createMockConnection("conn-1")
      const conn2 = createMockConnection("conn-2")

      router.registerServer("github", "s1", conn1, [])
      router.registerServer("browser", "s2", conn2, [])

      const routes = router.getAllRoutes()

      expect(routes).toHaveLength(2)
    })

    it("returns empty array when no routes", () => {
      expect(router.getAllRoutes()).toEqual([])
    })
  })

  describe("getAllNamespaces", () => {
    it("returns all namespace names", () => {
      const conn1 = createMockConnection("conn-1")
      const conn2 = createMockConnection("conn-2")

      router.registerServer("github", "s1", conn1, [])
      router.registerServer("browser", "s2", conn2, [])

      const namespaces = router.getAllNamespaces()

      expect(namespaces).toContain("github")
      expect(namespaces).toContain("browser")
      expect(namespaces).toHaveLength(2)
    })
  })

  describe("hasNamespace", () => {
    it("returns true for registered namespace", () => {
      const connection = createMockConnection("conn-1")
      router.registerServer("github", "server-1", connection, [])

      expect(router.hasNamespace("github")).toBe(true)
    })

    it("returns false for unknown namespace", () => {
      expect(router.hasNamespace("unknown")).toBe(false)
    })
  })

  describe("hasTool", () => {
    it("returns true for registered tool", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      expect(router.hasTool("github__create_issue")).toBe(true)
    })

    it("returns false for unknown tool", () => {
      expect(router.hasTool("unknown__tool")).toBe(false)
    })
  })

  describe("getServerIdForTool", () => {
    it("returns server id for registered tool", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      expect(router.getServerIdForTool("github__create_issue")).toBe("server-1")
    })

    it("returns undefined for unknown tool", () => {
      expect(router.getServerIdForTool("unknown__tool")).toBeUndefined()
    })
  })

  describe("getConnectionForTool", () => {
    it("returns connection for registered tool", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)

      expect(router.getConnectionForTool("github__create_issue")).toBe(
        connection
      )
    })

    it("returns undefined for unknown tool", () => {
      expect(router.getConnectionForTool("unknown__tool")).toBeUndefined()
    })
  })

  describe("clear", () => {
    it("removes all routes and tools", () => {
      const connection = createMockConnection("conn-1")
      const tools = [createMockTool("create_issue")]

      router.registerServer("github", "server-1", connection, tools)
      router.clear()

      expect(router.getAllNamespaces()).toHaveLength(0)
      expect(router.getAllTools()).toHaveLength(0)
    })
  })

  describe("getStats", () => {
    it("returns correct statistics", () => {
      const conn1 = createMockConnection("conn-1")
      const conn2 = createMockConnection("conn-2")

      router.registerServer("github", "s1", conn1, [
        createMockTool("create_issue"),
        createMockTool("list_repos"),
      ])
      router.registerServer("browser", "s2", conn2, [
        createMockTool("screenshot"),
      ])

      const stats = router.getStats()

      expect(stats.namespaceCount).toBe(2)
      expect(stats.totalTools).toBe(3)
      expect(stats.toolsByNamespace.get("github")).toBe(2)
      expect(stats.toolsByNamespace.get("browser")).toBe(1)
    })

    it("returns zeros when empty", () => {
      const stats = router.getStats()

      expect(stats.namespaceCount).toBe(0)
      expect(stats.totalTools).toBe(0)
    })
  })
})
