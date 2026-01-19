import { z } from "zod"

export interface EnvVar {
  key: string
  value: string
  isSecret: boolean
}

export interface ParsedMcpServer {
  name: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  envVars: EnvVar[]
}

export interface ParsedMcpConfig {
  success: boolean
  servers: ParsedMcpServer[]
  error?: string
}

const mcpServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  env: z.record(z.string()).optional(),
})

const mcpConfigSchema = z.object({
  mcpServers: z.record(mcpServerSchema),
})

// Common secret key patterns
const SECRET_PATTERNS = [
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /credential/i,
  /api_key/i,
  /apikey/i,
  /auth/i,
]

function isSecretKey(key: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(key))
}

export function parseMcpConfig(jsonString: string): ParsedMcpConfig {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return {
      success: false,
      servers: [],
      error: "Invalid JSON: Could not parse the configuration",
    }
  }

  const result = mcpConfigSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues
    if (issues.some((i) => i.path.includes("mcpServers"))) {
      return {
        success: false,
        servers: [],
        error: 'Missing or invalid "mcpServers" key in configuration',
      }
    }
    return {
      success: false,
      servers: [],
      error: `Invalid configuration: ${issues[0]?.message || "Unknown error"}`,
    }
  }

  const servers: ParsedMcpServer[] = []

  for (const [name, config] of Object.entries(result.data.mcpServers)) {
    const transport = config.url ? "sse" : "stdio"

    const envVars: EnvVar[] = []
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        envVars.push({
          key,
          value,
          isSecret: isSecretKey(key),
        })
      }
    }

    servers.push({
      name,
      transport,
      command: config.command,
      args: config.args,
      url: config.url,
      envVars,
    })
  }

  return {
    success: true,
    servers,
  }
}

/**
 * Format servers back to Claude Desktop JSON format
 */
export function formatMcpConfig(servers: ParsedMcpServer[]): string {
  const mcpServers: Record<string, unknown> = {}

  for (const server of servers) {
    const config: Record<string, unknown> = {}

    if (server.transport === "stdio") {
      if (server.command) config.command = server.command
      if (server.args?.length) config.args = server.args
    } else {
      if (server.url) config.url = server.url
    }

    if (server.envVars.length > 0) {
      config.env = Object.fromEntries(
        server.envVars.map((v) => [v.key, v.value])
      )
    }

    mcpServers[server.name] = config
  }

  return JSON.stringify({ mcpServers }, null, 2)
}
