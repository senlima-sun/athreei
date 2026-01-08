import { describe, it, expect } from "vitest"
import {
  validateConfig,
  validatePartialConfig,
  CONFIG_VERSION,
  defaultConfig,
} from "./config-schema"

describe("validateConfig", () => {
  it("should validate a valid full config", () => {
    const validConfig = {
      version: 1,
      apiUrl: "https://api.athreei.com",
      defaultOrg: "my-org",
      mcpServers: [
        {
          name: "test-server",
          transport: "stdio",
          command: "node",
          args: ["server.js"],
        },
      ],
      gateway: {
        port: 8080,
        logLevel: "info",
      },
    }

    const result = validateConfig(validConfig)
    expect(result.version).toBe(1)
    expect(result.apiUrl).toBe("https://api.athreei.com")
    expect(result.defaultOrg).toBe("my-org")
    expect(result.mcpServers).toHaveLength(1)
    expect(result.gateway?.port).toBe(8080)
  })

  it("should throw on invalid config", () => {
    const invalidConfig = {
      version: "not a number",
      apiUrl: "not a url",
    }

    expect(() => validateConfig(invalidConfig)).toThrow()
  })

  it("should throw on invalid transport type", () => {
    const invalidConfig = {
      version: 1,
      apiUrl: "https://api.athreei.com",
      mcpServers: [
        {
          name: "test",
          transport: "invalid-transport",
        },
      ],
    }

    expect(() => validateConfig(invalidConfig)).toThrow()
  })

  it("should throw on invalid gateway port", () => {
    const invalidConfig = {
      version: 1,
      apiUrl: "https://api.athreei.com",
      mcpServers: [],
      gateway: {
        port: 999999,
      },
    }

    expect(() => validateConfig(invalidConfig)).toThrow()
  })

  it("should apply default values", () => {
    const minimalConfig = {}
    const result = validateConfig(minimalConfig)

    expect(result.version).toBe(CONFIG_VERSION)
    expect(result.apiUrl).toBe("https://api.athreei.com")
    expect(result.mcpServers).toEqual([])
  })

  it("should apply default gateway values when gateway is provided", () => {
    const config = {
      gateway: {},
    }
    const result = validateConfig(config)

    expect(result.gateway?.port).toBe(8080)
    expect(result.gateway?.logLevel).toBe("info")
  })
})

describe("validatePartialConfig", () => {
  it("should validate partial config with only apiUrl", () => {
    const partial = {
      apiUrl: "https://custom.api.com",
    }

    const result = validatePartialConfig(partial)
    expect(result.apiUrl).toBe("https://custom.api.com")
    expect(result.version).toBeUndefined()
  })

  it("should validate partial config with only mcpServers", () => {
    const partial = {
      mcpServers: [
        {
          name: "partial-server",
          transport: "sse",
          url: "https://server.example.com",
        },
      ],
    }

    const result = validatePartialConfig(partial)
    expect(result.mcpServers).toHaveLength(1)
  })

  it("should throw on invalid partial values", () => {
    const invalidPartial = {
      apiUrl: "not-a-valid-url",
    }

    expect(() => validatePartialConfig(invalidPartial)).toThrow()
  })
})

describe("defaultConfig", () => {
  it("should have correct default values", () => {
    expect(defaultConfig.version).toBe(CONFIG_VERSION)
    expect(defaultConfig.apiUrl).toBe("https://api.athreei.com")
    expect(defaultConfig.mcpServers).toEqual([])
    expect(defaultConfig.defaultOrg).toBeUndefined()
  })
})

describe("configSchema", () => {
  it("should accept valid transport types", () => {
    const transports = ["stdio", "sse", "streamable-http"]

    for (const transport of transports) {
      const config = {
        mcpServers: [
          {
            name: "test",
            transport,
            command: "test",
          },
        ],
      }
      expect(() => validateConfig(config)).not.toThrow()
    }
  })

  it("should accept valid log levels", () => {
    const levels = ["debug", "info", "warn", "error"]

    for (const logLevel of levels) {
      const config = {
        gateway: { logLevel },
      }
      expect(() => validateConfig(config)).not.toThrow()
    }
  })
})
