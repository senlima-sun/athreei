import { describe, it, expect } from "vitest"
import { parseMcpConfig, type ParsedMcpConfig } from "../mcp-config-parser"

describe("parseMcpConfig", () => {
  it("parses Claude Desktop format", () => {
    const input = `{
      "mcpServers": {
        "figma": {
          "command": "npx",
          "args": ["-y", "@anthropic/mcp-figma"],
          "env": {
            "FIGMA_ACCESS_TOKEN": "your-token"
          }
        }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    expect(result.servers).toHaveLength(1)
    expect(result.servers[0].name).toBe("figma")
    expect(result.servers[0].transport).toBe("stdio")
    expect(result.servers[0].command).toBe("npx")
    expect(result.servers[0].args).toEqual(["-y", "@anthropic/mcp-figma"])
    expect(result.servers[0].envVars).toEqual([
      { key: "FIGMA_ACCESS_TOKEN", value: "your-token", isSecret: true },
    ])
  })

  it("parses SSE server format", () => {
    const input = `{
      "mcpServers": {
        "custom-api": {
          "url": "https://api.example.com/mcp/sse"
        }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    expect(result.servers[0].transport).toBe("sse")
    expect(result.servers[0].url).toBe("https://api.example.com/mcp/sse")
  })

  it("handles multiple servers", () => {
    const input = `{
      "mcpServers": {
        "figma": { "command": "npx", "args": ["@figma/mcp"] },
        "sentry": { "command": "npx", "args": ["@sentry/mcp"] }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    expect(result.servers).toHaveLength(2)
  })

  it("returns error for invalid JSON", () => {
    const result = parseMcpConfig("not json")

    expect(result.success).toBe(false)
    expect(result.error).toContain("Invalid JSON")
  })

  it("returns error for missing mcpServers key", () => {
    const result = parseMcpConfig('{"servers": {}}')

    expect(result.success).toBe(false)
    expect(result.error).toContain("mcpServers")
  })

  it("detects common secret patterns in env var names", () => {
    const input = `{
      "mcpServers": {
        "test": {
          "command": "node",
          "env": {
            "API_KEY": "key",
            "DEBUG": "true",
            "AUTH_TOKEN": "token",
            "DATABASE_URL": "url"
          }
        }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    const envVars = result.servers[0].envVars
    expect(envVars.find((v) => v.key === "API_KEY")?.isSecret).toBe(true)
    expect(envVars.find((v) => v.key === "DEBUG")?.isSecret).toBe(false)
    expect(envVars.find((v) => v.key === "AUTH_TOKEN")?.isSecret).toBe(true)
    expect(envVars.find((v) => v.key === "DATABASE_URL")?.isSecret).toBe(false)
  })
})
