/**
 * Registry Loader Service tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFile } from "fs/promises"
import {
  initRegistryLoader,
  loadRegistry,
  getRegistryServers,
  getRegistryServerBySlug,
  getRegistryCategories,
  clearRegistryCache,
  getRegistryCacheStatus,
} from "../../services/registry-loader"

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}))

const mockRegistryData = {
  $schema: "./mcp-servers.schema.json",
  version: "1.0.0",
  lastUpdated: "2026-01-10T00:00:00Z",
  servers: [
    {
      slug: "test-server",
      name: "Test Server",
      description: "A test MCP server",
      publisher: "Test Publisher",
      transport: "stdio",
      command: "npx",
      args: ["-y", "test-mcp"],
      docsUrl: "https://example.com/docs",
      envVars: [
        {
          name: "TEST_API_KEY",
          description: "Test API key",
          required: true,
        },
      ],
      categories: ["testing", "developer-tools"],
      verified: true,
    },
    {
      slug: "another-server",
      name: "Another Server",
      description: "Another test server",
      publisher: "Another Publisher",
      transport: "sse",
      url: "https://example.com/sse",
      docsUrl: "https://example.com/another-docs",
      envVars: [],
      categories: ["productivity"],
      verified: false,
    },
  ],
}

describe("Registry Loader Service", () => {
  beforeEach(() => {
    clearRegistryCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearRegistryCache()
  })

  describe("loadRegistry", () => {
    it("should load registry from local file", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
        cacheTtlMs: 60000,
      })

      const registry = await loadRegistry()

      expect(registry.version).toBe("1.0.0")
      expect(registry.servers).toHaveLength(2)
      expect(readFile).toHaveBeenCalledWith("/test/path/registry.json", "utf-8")
    })

    it("should cache registry data", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
        cacheTtlMs: 60000,
      })

      await loadRegistry()
      await loadRegistry()
      await loadRegistry()

      expect(readFile).toHaveBeenCalledTimes(1)
    })

    it("should invalidate cache after TTL", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
        cacheTtlMs: 100,
      })

      await loadRegistry()
      expect(readFile).toHaveBeenCalledTimes(1)

      await new Promise((resolve) => setTimeout(resolve, 150))

      await loadRegistry()
      expect(readFile).toHaveBeenCalledTimes(2)
    })

    it("should throw error for invalid registry data", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ invalid: "data" }))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
      })

      await expect(loadRegistry()).rejects.toThrow()
    })

    it("should load from remote URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryData),
      })
      vi.stubGlobal("fetch", mockFetch)

      initRegistryLoader({
        source: "remote",
        remoteUrl: "https://example.com/registry.json",
      })

      const registry = await loadRegistry()

      expect(registry.version).toBe("1.0.0")
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/registry.json"
      )

      vi.unstubAllGlobals()
    })

    it("should throw error for failed remote fetch", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
      vi.stubGlobal("fetch", mockFetch)

      initRegistryLoader({
        source: "remote",
        remoteUrl: "https://example.com/registry.json",
      })

      await expect(loadRegistry()).rejects.toThrow("Failed to fetch registry")

      vi.unstubAllGlobals()
    })
  })

  describe("getRegistryServers", () => {
    it("should return all servers", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
      })

      const servers = await getRegistryServers()

      expect(servers).toHaveLength(2)
      expect(servers[0].slug).toBe("test-server")
      expect(servers[1].slug).toBe("another-server")
    })
  })

  describe("getRegistryServerBySlug", () => {
    it("should return server by slug", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
      })

      const server = await getRegistryServerBySlug("test-server")

      expect(server).toBeDefined()
      expect(server?.name).toBe("Test Server")
    })

    it("should return undefined for non-existent slug", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
      })

      const server = await getRegistryServerBySlug("nonexistent")

      expect(server).toBeUndefined()
    })
  })

  describe("getRegistryCategories", () => {
    it("should return unique sorted categories", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
      })

      const categories = await getRegistryCategories()

      expect(categories).toEqual(["developer-tools", "productivity", "testing"])
    })
  })

  describe("clearRegistryCache", () => {
    it("should clear the cache", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
      })

      await loadRegistry()
      expect(readFile).toHaveBeenCalledTimes(1)

      clearRegistryCache()

      await loadRegistry()
      expect(readFile).toHaveBeenCalledTimes(2)
    })
  })

  describe("getRegistryCacheStatus", () => {
    it("should return cache status", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockRegistryData))

      initRegistryLoader({
        source: "local",
        localPath: "/test/path/registry.json",
        cacheTtlMs: 30000,
      })

      let status = getRegistryCacheStatus()
      expect(status.cached).toBe(false)
      expect(status.timestamp).toBeNull()
      expect(status.ttlMs).toBe(30000)

      await loadRegistry()

      status = getRegistryCacheStatus()
      expect(status.cached).toBe(true)
      expect(status.timestamp).not.toBeNull()
    })
  })
})
