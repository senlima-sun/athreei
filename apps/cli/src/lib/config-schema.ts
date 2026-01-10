import { z } from "zod"

export const CONFIG_VERSION = 1

const transportSchema = z.enum(["stdio", "sse", "streamable-http"])

const mcpServerConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  transport: transportSchema,
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  env: z.record(z.string()).optional(),
})

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

export type Config = z.infer<typeof configSchema>
export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>
export type Transport = z.infer<typeof transportSchema>

export const defaultConfig: Config = {
  version: CONFIG_VERSION,
  apiUrl: "https://api.athreei.com",
  mcpServers: [],
}

export function validateConfig(data: unknown): Config {
  return configSchema.parse(data)
}

export function validatePartialConfig(data: unknown): Partial<Config> {
  return configSchema.partial().parse(data)
}
