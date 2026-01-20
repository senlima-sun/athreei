/**
 * Tests for Configuration Sync
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest"
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  loadConfig,
  saveConfigTemplate,
  ConfigSyncManager,
} from "../config-sync"

const TEST_DIR = join(tmpdir(), "athreei-gateway-tests")

function getTestConfigPath(): string {
  return join(TEST_DIR, `config-${Date.now()}.json`)
}

beforeEach(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true })
  }
})

afterEach(() => {
  // Clean up test files
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
})

describe("loadConfig", () => {
  it("loads valid config file", () => {
    const configPath = getTestConfigPath()
    const configData = {
      apiKey: "ak_test123456789012345678901234567890abc",
      endpoint: "my-endpoint",
      platformUrl: "https://custom.athreei.com",
    }

    writeFileSync(configPath, JSON.stringify(configData))

    const result = loadConfig(configPath)

    expect(result.apiKey).toBe(configData.apiKey)
    expect(result.endpoint).toBe(configData.endpoint)
    expect(result.platformUrl).toBe(configData.platformUrl)
  })

  it("uses default platformUrl if not provided", () => {
    const configPath = getTestConfigPath()
    const configData = {
      apiKey: "ak_test123456789012345678901234567890abc",
      endpoint: "my-endpoint",
    }

    writeFileSync(configPath, JSON.stringify(configData))

    const result = loadConfig(configPath)

    expect(result.platformUrl).toBe("https://athreei.com")
  })

  it("uses default syncInterval if not provided", () => {
    const configPath = getTestConfigPath()
    const configData = {
      apiKey: "ak_test123456789012345678901234567890abc",
      endpoint: "my-endpoint",
    }

    writeFileSync(configPath, JSON.stringify(configData))

    const result = loadConfig(configPath)

    expect(result.syncInterval).toBe(5 * 60 * 1000) // 5 minutes
  })

  it("throws for non-existent file", () => {
    expect(() => loadConfig("/nonexistent/path/config.json")).toThrow(
      "Config file not found"
    )
  })

  it("throws for invalid JSON", () => {
    const configPath = getTestConfigPath()
    writeFileSync(configPath, "not valid json {")

    expect(() => loadConfig(configPath)).toThrow("Invalid JSON")
  })

  it("throws for missing apiKey", () => {
    const configPath = getTestConfigPath()
    writeFileSync(configPath, JSON.stringify({ endpoint: "test" }))

    expect(() => loadConfig(configPath)).toThrow(
      "missing required field: apiKey"
    )
  })

  it("throws for missing endpoint", () => {
    const configPath = getTestConfigPath()
    writeFileSync(
      configPath,
      JSON.stringify({ apiKey: "ak_test123456789012345678901234567890abc" })
    )

    expect(() => loadConfig(configPath)).toThrow(
      "missing required field: endpoint"
    )
  })

  it("throws for empty apiKey", () => {
    const configPath = getTestConfigPath()
    writeFileSync(configPath, JSON.stringify({ apiKey: "", endpoint: "test" }))

    expect(() => loadConfig(configPath)).toThrow(
      "missing required field: apiKey"
    )
  })
})

describe("saveConfigTemplate", () => {
  it("creates config file with template", () => {
    const configPath = getTestConfigPath()

    const result = saveConfigTemplate(configPath)

    expect(result).toBe(configPath)
    expect(existsSync(configPath)).toBe(true)

    // Verify it's valid JSON

    const content = JSON.parse(
      (require("fs") as typeof import("fs")).readFileSync(configPath, "utf-8")
    )
    expect(content.apiKey).toBeDefined()
    expect(content.endpoint).toBeDefined()
    expect(content.platformUrl).toBeDefined()
  })

  it("creates parent directories if needed", () => {
    const nestedPath = join(TEST_DIR, "nested", "dir", "config.json")

    saveConfigTemplate(nestedPath)

    expect(existsSync(nestedPath)).toBe(true)
  })
})

describe("ConfigSyncManager", () => {
  it("stores config on construction", () => {
    const config = {
      apiKey: "ak_test123456789012345678901234567890abc",
      endpoint: "my-endpoint",
    }

    const manager = new ConfigSyncManager(config)

    // Manager should be created without error
    expect(manager).toBeDefined()
    expect(manager.getCurrentConfig()).toBeNull() // Before initial sync
  })

  describe("with mocked fetch", () => {
    let originalFetch: typeof fetch
    let mockFetch: Mock

    beforeEach(() => {
      originalFetch = global.fetch
      mockFetch = vi.fn()
      ;(mockFetch as unknown as { preconnect: typeof vi.fn }).preconnect =
        vi.fn()
      global.fetch = mockFetch as unknown as typeof fetch
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it("fetches namespace config on initial sync", async () => {
      const mockResponse = {
        namespaceId: "ns_123",
        namespaceName: "Production",
        namespaceSlug: "production",
        endpointId: "ep_123",
        endpointName: "my-tools",
        organizationId: "org_123",
        configVersion: "123-1",
        servers: [
          {
            id: "srv_1",
            name: "browser",
            transport: "stdio",
            command: "browser-mcp",
            status: "active",
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const manager = new ConfigSyncManager({
        apiKey: "ak_test123456789012345678901234567890abc",
        endpoint: "my-endpoint",
        platformUrl: "https://test.athreei.com",
      })

      const result = await manager.initialSync()

      expect(result.namespaceId).toBe("ns_123")
      expect(result.servers).toHaveLength(1)
      expect(manager.getCurrentConfig()).toEqual(result)
    })

    it("handles auth errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Invalid API key"),
      } as unknown as Response)

      const manager = new ConfigSyncManager({
        apiKey: "ak_invalid",
        endpoint: "my-endpoint",
      })

      await expect(manager.initialSync()).rejects.toThrow(
        "Authentication failed"
      )
    })

    it("handles 404 errors for unknown endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve("Endpoint not found"),
      } as unknown as Response)

      const manager = new ConfigSyncManager({
        apiKey: "ak_test123456789012345678901234567890abc",
        endpoint: "unknown-endpoint",
      })

      await expect(manager.initialSync()).rejects.toThrow("Endpoint not found")
    })

    it("calls change handler when config changes", async () => {
      const initialConfig = {
        namespaceId: "ns_123",
        namespaceName: "Production",
        namespaceSlug: "production",
        endpointId: "ep_123",
        endpointName: "my-tools",
        organizationId: "org_123",
        configVersion: "100-1",
        servers: [],
      }

      const updatedConfig = {
        ...initialConfig,
        configVersion: "200-2",
        servers: [{ id: "srv_1", name: "new-server", status: "active" }],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialConfig),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedConfig),
        } as Response)

      const changeHandler = vi.fn()

      const manager = new ConfigSyncManager({
        apiKey: "ak_test123456789012345678901234567890abc",
        endpoint: "my-endpoint",
      })

      manager.setOnConfigChange(changeHandler)
      await manager.initialSync()

      const changed = await manager.checkForChanges()

      expect(changed).toBe(true)
      expect(changeHandler).toHaveBeenCalledWith(updatedConfig)
    })

    it("does not call change handler when config is unchanged", async () => {
      const config = {
        namespaceId: "ns_123",
        namespaceName: "Production",
        namespaceSlug: "production",
        endpointId: "ep_123",
        endpointName: "my-tools",
        organizationId: "org_123",
        configVersion: "100-1",
        servers: [],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(config),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(config), // Same config
        } as Response)

      const changeHandler = vi.fn()

      const manager = new ConfigSyncManager({
        apiKey: "ak_test123456789012345678901234567890abc",
        endpoint: "my-endpoint",
      })

      manager.setOnConfigChange(changeHandler)
      await manager.initialSync()

      const changed = await manager.checkForChanges()

      expect(changed).toBe(false)
      expect(changeHandler).not.toHaveBeenCalled()
    })
  })
})
