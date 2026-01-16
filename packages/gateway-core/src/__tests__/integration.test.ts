/**
 * Integration Tests for Gateway Core Transport Layer
 *
 * Tests the components working together end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { TransportFactory } from "../transports/transport-factory.js"
import { NamespaceRouter } from "../routing/namespace-router.js"
import { ProcessPool } from "../transports/process-pool.js"
import { ConnectionHealthChecker } from "../transports/health-check.js"
import type { StdioTransportConfig } from "../types/transports.js"

function createMockReadableStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull(controller) {
      controller.close()
    },
  })
}

function createMockSubprocess() {
  return {
    stdout: createMockReadableStream(),
    stderr: createMockReadableStream(),
    stdin: { write: vi.fn(), flush: vi.fn() },
    killed: false,
    kill: vi.fn(),
  }
}

const mockBunSpawn = vi.fn()
const mockBunSleep = vi.fn().mockResolvedValue(undefined)

vi.stubGlobal("Bun", {
  spawn: mockBunSpawn,
  sleep: mockBunSleep,
})

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("Gateway Core Integration", () => {
  beforeEach(() => {
    mockBunSpawn.mockReset()
    mockBunSleep.mockReset()
    mockFetch.mockReset()
  })

  describe("TransportFactory with NamespaceRouter", () => {
    it("creates stdio connection and registers with router", async () => {
      mockBunSpawn.mockReturnValue(createMockSubprocess())

      const factory = new TransportFactory()
      const router = new NamespaceRouter()

      const config: StdioTransportConfig = {
        transport: "stdio",
        command: "node",
        args: ["server.js"],
      }

      const connection = await factory.createConnection("github-server", config)

      router.registerServer("github", "github-server", connection, [
        { name: "create_issue", description: "Create GitHub issue" },
        { name: "list_repos", description: "List repositories" },
      ])

      expect(router.hasTool("github__create_issue")).toBe(true)
      expect(router.hasTool("github__list_repos")).toBe(true)
      expect(router.getConnectionForTool("github__create_issue")).toBe(
        connection
      )

      await factory.closeAll()
    })

    it("routes tool calls to correct server", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const factory = new TransportFactory()
      const router = new NamespaceRouter()

      const githubConn = await factory.createConnection("github", {
        transport: "stdio",
        command: "github-mcp",
      })

      const browserConn = await factory.createConnection("browser", {
        transport: "stdio",
        command: "browser-mcp",
      })

      router.registerServer("github", "github", githubConn, [
        { name: "create_issue" },
      ])
      router.registerServer("browser", "browser", browserConn, [
        { name: "screenshot" },
      ])

      const githubRoute = router.routeToolCall("github__create_issue")
      const browserRoute = router.routeToolCall("browser__screenshot")

      expect(githubRoute?.connection).toBe(githubConn)
      expect(browserRoute?.connection).toBe(browserConn)

      await factory.closeAll()
    })

    it("handles server disconnect and re-registration", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const factory = new TransportFactory()
      const router = new NamespaceRouter()

      const conn1 = await factory.createConnection("github-1", {
        transport: "stdio",
        command: "github-mcp",
      })

      router.registerServer("github", "github-1", conn1, [
        { name: "create_issue" },
      ])

      expect(router.hasTool("github__create_issue")).toBe(true)

      router.unregisterServer("github")
      expect(router.hasTool("github__create_issue")).toBe(false)

      const conn2 = await factory.createConnection("github-2", {
        transport: "stdio",
        command: "github-mcp-v2",
      })

      router.registerServer("github", "github-2", conn2, [
        { name: "create_issue" },
        { name: "new_feature" },
      ])

      expect(router.hasTool("github__create_issue")).toBe(true)
      expect(router.hasTool("github__new_feature")).toBe(true)
      expect(router.getRoute("github")?.serverId).toBe("github-2")

      await factory.closeAll()
    })
  })

  describe("TransportFactory connection management", () => {
    it("tracks all connections across transport types", async () => {
      mockBunSpawn.mockReturnValue(createMockSubprocess())
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              id: 1,
              result: { protocolVersion: "2025-06-18" },
            }),
        })
      )

      const factory = new TransportFactory()

      await factory.createConnection("stdio-server", {
        transport: "stdio",
        command: "test",
      })

      expect(factory.getAllConnectionIds()).toContain("stdio-server")
      expect(factory.isConnected("stdio-server")).toBe(true)

      await factory.closeAll()
    })

    it("closes specific connection by id", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const factory = new TransportFactory()

      await factory.createConnection("server-1", {
        transport: "stdio",
        command: "test1",
      })
      await factory.createConnection("server-2", {
        transport: "stdio",
        command: "test2",
      })

      expect(factory.getAllConnectionIds()).toHaveLength(2)

      await factory.closeConnection("server-1")

      expect(factory.isConnected("server-1")).toBe(false)
      expect(factory.isConnected("server-2")).toBe(true)

      await factory.closeAll()
    })
  })

  describe("ProcessPool integration", () => {
    it("manages multiple processes for same command", async () => {
      const pool = new ProcessPool({
        maxProcesses: 5,
        idleTimeout: 1000,
      })

      let spawnCount = 0
      const factory = async () => {
        spawnCount++
        return createMockSubprocess() as any
      }

      const proc1 = await pool.acquire("github-mcp", factory)
      await pool.acquire("github-mcp", factory)

      expect(spawnCount).toBe(2)

      pool.release("github-mcp", proc1)

      const proc3 = await pool.acquire("github-mcp", factory)
      expect(spawnCount).toBe(2)
      expect(proc3).toBe(proc1)

      await pool.drainAll()
    })

    it("enforces max process limit", async () => {
      const pool = new ProcessPool({
        maxProcesses: 2,
        idleTimeout: 1000,
      })

      const factory = async () => createMockSubprocess() as any

      await pool.acquire("test", factory)
      await pool.acquire("test", factory)

      await expect(pool.acquire("test", factory)).rejects.toThrow(
        "Process pool limit reached"
      )

      await pool.drainAll()
    })

    it("provides accurate pool statistics", async () => {
      const pool = new ProcessPool({
        maxProcesses: 5,
        idleTimeout: 10000,
      })

      const factory = async () => createMockSubprocess() as any

      const proc1 = await pool.acquire("github", factory)
      await pool.acquire("github", factory)
      await pool.acquire("browser", factory)

      pool.release("github", proc1)

      const stats = pool.getStats()
      const githubStats = stats.find((s) => s.key === "github")
      const browserStats = stats.find((s) => s.key === "browser")

      expect(githubStats?.total).toBe(2)
      expect(githubStats?.inUse).toBe(1)
      expect(githubStats?.idle).toBe(1)
      expect(browserStats?.total).toBe(1)
      expect(browserStats?.inUse).toBe(1)

      await pool.drainAll()
    })
  })

  describe("ConnectionHealthChecker integration", () => {
    it("tracks health results for multiple connections", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const factory = new TransportFactory()
      const healthChecker = new ConnectionHealthChecker()

      const conn1 = await factory.createConnection("server-1", {
        transport: "stdio",
        command: "test1",
      })

      const conn2 = await factory.createConnection("server-2", {
        transport: "stdio",
        command: "test2",
      })

      await healthChecker.checkWithPing(conn1)
      await healthChecker.checkWithPing(conn2)

      expect(healthChecker.getLastResult("server-1")).toBeDefined()
      expect(healthChecker.getLastResult("server-2")).toBeDefined()

      healthChecker.clearAllResults()
      await factory.closeAll()
    })

    it("identifies unhealthy connections", async () => {
      const healthChecker = new ConnectionHealthChecker()

      const mockHealthyConn = {
        id: "healthy",
        config: { transport: "stdio" as const, command: "test" },
        status: "connected" as const,
        send: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        onMessage: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }

      const mockUnhealthyConn = {
        id: "unhealthy",
        config: { transport: "stdio" as const, command: "test" },
        status: "connected" as const,
        send: vi.fn().mockRejectedValue(new Error("Connection failed")),
        close: vi.fn(),
        onMessage: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }

      await healthChecker.checkWithPing(mockHealthyConn)
      await healthChecker.checkWithPing(mockUnhealthyConn)

      expect(healthChecker.isHealthy("healthy")).toBe(true)
      expect(healthChecker.isHealthy("unhealthy")).toBe(false)

      const unhealthyIds = healthChecker.getUnhealthyConnections()
      expect(unhealthyIds).toContain("unhealthy")
      expect(unhealthyIds).not.toContain("healthy")

      healthChecker.clearAllResults()
    })

    it("tracks consecutive failures", async () => {
      const healthChecker = new ConnectionHealthChecker()

      const mockConn = {
        id: "flaky",
        config: { transport: "stdio" as const, command: "test" },
        status: "connected" as const,
        send: vi.fn().mockRejectedValue(new Error("Failed")),
        close: vi.fn(),
        onMessage: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }

      await healthChecker.checkWithPing(mockConn)
      await healthChecker.checkWithPing(mockConn)
      await healthChecker.checkWithPing(mockConn)

      expect(healthChecker.getConsecutiveFailures("flaky")).toBe(3)

      healthChecker.clearAllResults()
    })
  })

  describe("Full integration scenario", () => {
    it("connects servers, registers tools, and routes calls", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const factory = new TransportFactory()
      const router = new NamespaceRouter()
      const healthChecker = new ConnectionHealthChecker()

      const githubConn = await factory.createConnection("github", {
        transport: "stdio",
        command: "github-mcp",
        args: ["--token", "xxx"],
      })

      const browserConn = await factory.createConnection("browser", {
        transport: "stdio",
        command: "browser-mcp",
      })

      router.registerServer("github", "github", githubConn, [
        { name: "create_issue", description: "Create a GitHub issue" },
        { name: "list_repos", description: "List repositories" },
        { name: "create_pr", description: "Create pull request" },
      ])

      router.registerServer("browser", "browser", browserConn, [
        { name: "screenshot", description: "Take screenshot" },
        { name: "navigate", description: "Navigate to URL" },
      ])

      const stats = router.getStats()
      expect(stats.namespaceCount).toBe(2)
      expect(stats.totalTools).toBe(5)

      const allTools = router.getAllTools()
      expect(allTools.map((t) => t.namespacedName)).toContain(
        "github__create_issue"
      )
      expect(allTools.map((t) => t.namespacedName)).toContain(
        "browser__screenshot"
      )

      const route = router.routeToolCall("github__create_pr")
      expect(route?.connection).toBe(githubConn)
      expect(router.getOriginalToolName("github__create_pr")).toBe("create_pr")

      await healthChecker.checkWithPing(githubConn)
      await healthChecker.checkWithPing(browserConn)

      expect(healthChecker.getHealthyConnections()).toHaveLength(2)

      router.unregisterServer("browser")
      await factory.closeConnection("browser")

      expect(router.getAllNamespaces()).toEqual(["github"])
      expect(factory.isConnected("github")).toBe(true)
      expect(factory.isConnected("browser")).toBe(false)

      healthChecker.clearAllResults()
      await factory.closeAll()
    })
  })
})
