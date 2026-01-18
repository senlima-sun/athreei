import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  getConfigValue,
  setConfigValue,
  getConfigPaths,
  CONFIG_FILE_NAME,
} from "./config-loader"
import type { Config } from "./config-schema"

describe("getConfigValue", () => {
  const testConfig: Config = {
    version: 1,
    apiUrl: "https://api.athreei.com",
    defaultOrg: "test-org",
    mcpServers: [
      {
        name: "test-server",
        transport: "stdio",
        command: "node",
      },
    ],
    gateway: {
      port: 9090,
      logLevel: "debug",
    },
  }

  it("should get top-level values", () => {
    expect(getConfigValue(testConfig, "version")).toBe(1)
    expect(getConfigValue(testConfig, "apiUrl")).toBe("https://api.athreei.com")
    expect(getConfigValue(testConfig, "defaultOrg")).toBe("test-org")
  })

  it("should get nested values with dot notation", () => {
    expect(getConfigValue(testConfig, "gateway.port")).toBe(9090)
    expect(getConfigValue(testConfig, "gateway.logLevel")).toBe("debug")
  })

  it("should return undefined for non-existent keys", () => {
    expect(getConfigValue(testConfig, "nonexistent")).toBeUndefined()
    expect(getConfigValue(testConfig, "gateway.nonexistent")).toBeUndefined()
    expect(getConfigValue(testConfig, "deeply.nested.key")).toBeUndefined()
  })

  it("should get array values", () => {
    const servers = getConfigValue(testConfig, "mcpServers")
    expect(Array.isArray(servers)).toBe(true)
    expect((servers as unknown[]).length).toBe(1)
  })
})

describe("setConfigValue", () => {
  const baseConfig: Config = {
    version: 1,
    apiUrl: "https://api.athreei.com",
    mcpServers: [],
  }

  it("should set top-level values", () => {
    const result = setConfigValue(baseConfig, "defaultOrg", "new-org")
    expect(result.defaultOrg).toBe("new-org")
    // Original should be unchanged
    expect(baseConfig.defaultOrg).toBeUndefined()
  })

  it("should set nested values with dot notation", () => {
    const result = setConfigValue(baseConfig, "gateway.port", 3000)
    expect(result.gateway?.port).toBe(3000)
  })

  it("should create intermediate objects for nested paths", () => {
    const result = setConfigValue(baseConfig, "gateway.logLevel", "error")
    expect(result.gateway).toBeDefined()
    expect(result.gateway?.logLevel).toBe("error")
  })

  it("should validate the result against schema", () => {
    // Setting an invalid port should throw
    expect(() => setConfigValue(baseConfig, "gateway.port", 999999)).toThrow()
  })

  it("should update existing nested values", () => {
    const configWithGateway: Config = {
      ...baseConfig,
      gateway: {
        port: 8080,
        logLevel: "info",
      },
    }
    const result = setConfigValue(configWithGateway, "gateway.port", 9000)
    expect(result.gateway?.port).toBe(9000)
    expect(result.gateway?.logLevel).toBe("info")
  })

  it("should handle array replacement", () => {
    const newServers = [
      {
        name: "new-server",
        transport: "sse" as const,
        url: "https://server.com",
      },
    ]
    const result = setConfigValue(baseConfig, "mcpServers", newServers)
    expect(result.mcpServers).toHaveLength(1)
    expect(result.mcpServers?.[0]?.name).toBe("new-server")
  })
})

describe("getConfigPaths", () => {
  const originalEnv = process.env.ATHREEI_CONFIG

  beforeEach(() => {
    delete process.env.ATHREEI_CONFIG
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ATHREEI_CONFIG = originalEnv
    } else {
      delete process.env.ATHREEI_CONFIG
    }
  })

  it("should return an array of paths", () => {
    const paths = getConfigPaths()
    expect(Array.isArray(paths)).toBe(true)
    expect(paths.length).toBeGreaterThan(0)
  })

  it("should include current working directory path", () => {
    const paths = getConfigPaths()
    const cwdPath = paths.find((p) => p.includes(process.cwd()))
    expect(cwdPath).toBeDefined()
    expect(cwdPath).toContain(CONFIG_FILE_NAME)
  })

  it("should include home directory path", () => {
    const paths = getConfigPaths()
    const homePath = paths.find((p) => p.includes(".athreei"))
    expect(homePath).toBeDefined()
    expect(homePath).toContain(CONFIG_FILE_NAME)
  })

  it("should include environment variable path when set", () => {
    process.env.ATHREEI_CONFIG = "/custom/config/path.json"
    const paths = getConfigPaths()
    expect(paths).toContain("/custom/config/path.json")
  })

  it("should have environment variable path first when set", () => {
    process.env.ATHREEI_CONFIG = "/custom/config/path.json"
    const paths = getConfigPaths()
    expect(paths[0]).toBe("/custom/config/path.json")
  })
})
