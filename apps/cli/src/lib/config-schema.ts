import { z } from "zod"

// Schema version for migration support
export const CONFIG_VERSION = 1

// Transport type enum
const transportSchema = z.enum(["stdio", "sse", "streamable-http"])

// MCP Server config (for local definition)
const mcpServerConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  transport: transportSchema,
  command: z.string().optional(), // Required for stdio
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(), // Required for sse/http
  env: z.record(z.string()).optional(),
})

// Main config schema
export const configSchema = z.object({
  version: z.number().default(CONFIG_VERSION),
  apiUrl: z.string().url().default("https://api.athreei.com"),
  defaultOrg: z.string().optional(),
  mcpServers: z.array(mcpServerConfigSchema).default([]),
  gateway: z
    .object({
      port: z.number().min(1).max(65535).default(8080),
      logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
    })
    .optional(),
})

// Export types
export type Config = z.infer<typeof configSchema>
export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>
export type Transport = z.infer<typeof transportSchema>

// Default config
export const defaultConfig: Config = {
  version: CONFIG_VERSION,
  apiUrl: "https://api.athreei.com",
  mcpServers: [],
}

// Validation helper
export function validateConfig(data: unknown): Config {
  return configSchema.parse(data)
}

// Partial validation (for updates)
export function validatePartialConfig(data: unknown): Partial<Config> {
  return configSchema.partial().parse(data)
}
