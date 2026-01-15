/**
 * Configuration Sync
 *
 * Handles loading local configuration and syncing with the Platform API.
 * - Reads local config from ~/.athreei/config.json (or custom path)
 * - Fetches namespace configuration from Platform
 * - Periodically re-syncs to detect config changes
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, dirname } from "node:path"
import type {
  GatewayConfig,
  LocalConfig,
  NamespaceConfig,
  SkillConfig,
  RuleConfig,
} from "./types.js"
import type { McpServerConfig } from "@athreei/gateway-core"
import { log } from "./logger.js"

/** Default Platform URL */
const DEFAULT_PLATFORM_URL = "https://athreei.com"

/** Default sync interval: 5 minutes */
const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000

/** Default config directory */
const DEFAULT_CONFIG_DIR = join(homedir(), ".athreei")

/** Default config file path */
const DEFAULT_CONFIG_PATH = join(DEFAULT_CONFIG_DIR, "config.json")

/**
 * Load gateway configuration from a file
 */
export function loadConfig(configPath?: string): GatewayConfig {
  const path = configPath || DEFAULT_CONFIG_PATH

  log.info(`Loading config from: ${path}`)

  if (!existsSync(path)) {
    throw new Error(
      `Config file not found: ${path}\n` +
        `Create one with: ${JSON.stringify(
          {
            apiKey: "atr_your_api_key",
            endpoint: "your-endpoint-name",
            platformUrl: DEFAULT_PLATFORM_URL,
          },
          null,
          2
        )}`
    )
  }

  const content = readFileSync(path, "utf-8")
  let config: unknown

  try {
    config = JSON.parse(content)
  } catch (error) {
    throw new Error(`Invalid JSON in config file: ${path}`)
  }

  // Validate required fields
  if (!config || typeof config !== "object") {
    throw new Error(`Config must be a JSON object`)
  }

  const cfg = config as Record<string, unknown>

  if (typeof cfg.apiKey !== "string" || !cfg.apiKey) {
    throw new Error(`Config missing required field: apiKey`)
  }

  if (typeof cfg.endpoint !== "string" || !cfg.endpoint) {
    throw new Error(`Config missing required field: endpoint`)
  }

  const gatewayConfig: GatewayConfig = {
    apiKey: cfg.apiKey,
    endpoint: cfg.endpoint,
    platformUrl:
      typeof cfg.platformUrl === "string"
        ? cfg.platformUrl
        : DEFAULT_PLATFORM_URL,
    syncInterval:
      typeof cfg.syncInterval === "number"
        ? cfg.syncInterval
        : DEFAULT_SYNC_INTERVAL,
  }

  log.info(`Config loaded: endpoint="${gatewayConfig.endpoint}"`)
  return gatewayConfig
}

/**
 * Load local-only configuration (servers array only, no Platform sync)
 * Used with --local flag for offline/self-hosted usage
 */
export function loadLocalConfig(configPath?: string): LocalConfig {
  const path = configPath || DEFAULT_CONFIG_PATH

  log.info(`Loading local config from: ${path}`)

  if (!existsSync(path)) {
    throw new Error(
      `Config file not found: ${path}\n` +
        `Create one with: ${JSON.stringify(
          {
            servers: [
              {
                name: "example",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
              },
            ],
          },
          null,
          2
        )}`
    )
  }

  const content = readFileSync(path, "utf-8")
  let config: unknown

  try {
    config = JSON.parse(content)
  } catch {
    throw new Error(`Invalid JSON in config file: ${path}`)
  }

  if (!config || typeof config !== "object") {
    throw new Error(`Config must be a JSON object`)
  }

  const cfg = config as Record<string, unknown>

  // Validate servers array
  if (!Array.isArray(cfg.servers)) {
    throw new Error(
      `Config missing required field: servers (must be an array of MCP server configs)`
    )
  }

  // Validate each server config
  const servers: McpServerConfig[] = []
  for (const [index, server] of cfg.servers.entries()) {
    if (!server || typeof server !== "object") {
      throw new Error(`servers[${index}] must be an object`)
    }

    const s = server as Record<string, unknown>

    if (typeof s.name !== "string" || !s.name) {
      throw new Error(`servers[${index}].name is required`)
    }

    // Determine transport type (default to stdio)
    const transport =
      s.transport === "sse" || s.transport === "streamable-http"
        ? s.transport
        : "stdio"

    // Validate based on transport type
    if (transport === "stdio") {
      if (typeof s.command !== "string" || !s.command) {
        throw new Error(
          `servers[${index}].command is required for stdio transport`
        )
      }
    } else {
      // SSE or streamable-http transport
      if (typeof s.url !== "string" || !s.url) {
        throw new Error(
          `servers[${index}].url is required for ${transport} transport`
        )
      }
    }

    // Convert args array to space-separated string (McpServerConfig uses string, not string[])
    let argsString: string | undefined
    if (Array.isArray(s.args)) {
      argsString = s.args.join(" ")
    } else if (typeof s.args === "string") {
      argsString = s.args
    }

    // Parse headers for SSE/HTTP transport
    let headers: Record<string, string> | undefined
    if (
      s.headers &&
      typeof s.headers === "object" &&
      !Array.isArray(s.headers)
    ) {
      headers = {}
      for (const [key, value] of Object.entries(s.headers)) {
        if (typeof value === "string") {
          headers[key] = value
        }
      }
    }

    servers.push({
      id: `local-${index}-${s.name}`,
      name: s.name,
      transport,
      command: typeof s.command === "string" ? s.command : undefined,
      args: argsString,
      url: typeof s.url === "string" ? s.url : undefined,
      headers,
      status: "active",
    })
  }

  // Parse skills if present
  const skills: SkillConfig[] = []
  if (Array.isArray(cfg.skills)) {
    for (const [index, skill] of cfg.skills.entries()) {
      if (!skill || typeof skill !== "object") {
        throw new Error(`skills[${index}] must be an object`)
      }

      const sk = skill as Record<string, unknown>

      if (typeof sk.name !== "string" || !sk.name) {
        throw new Error(`skills[${index}].name is required`)
      }

      if (typeof sk.content !== "string" || !sk.content) {
        throw new Error(`skills[${index}].content is required`)
      }

      skills.push({
        id: typeof sk.id === "string" ? sk.id : `local-skill-${index}`,
        name: sk.name,
        description: typeof sk.description === "string" ? sk.description : null,
        content: sk.content,
        tags: Array.isArray(sk.tags)
          ? sk.tags.filter((t): t is string => typeof t === "string")
          : [],
        version: typeof sk.version === "number" ? sk.version : 1,
      })
    }
  }

  // Parse rules if present
  const rules: RuleConfig[] = []
  if (Array.isArray(cfg.rules)) {
    for (const [index, rule] of cfg.rules.entries()) {
      if (!rule || typeof rule !== "object") {
        throw new Error(`rules[${index}] must be an object`)
      }

      const r = rule as Record<string, unknown>

      if (typeof r.name !== "string" || !r.name) {
        throw new Error(`rules[${index}].name is required`)
      }

      if (typeof r.content !== "string" || !r.content) {
        throw new Error(`rules[${index}].content is required`)
      }

      const scope = r.scope as string | undefined
      const validScopes = ["global", "namespace", "endpoint"] as const

      rules.push({
        id: typeof r.id === "string" ? r.id : `local-rule-${index}`,
        name: r.name,
        description: typeof r.description === "string" ? r.description : null,
        content: r.content,
        priority: typeof r.priority === "number" ? r.priority : index,
        scope:
          scope && validScopes.includes(scope as (typeof validScopes)[number])
            ? (scope as (typeof validScopes)[number])
            : "global",
      })
    }
  }

  log.info(
    `Local config loaded: ${servers.length} servers, ${skills.length} skills, ${rules.length} rules`
  )
  return {
    servers,
    skills: skills.length > 0 ? skills : undefined,
    rules: rules.length > 0 ? rules : undefined,
  }
}

/**
 * Save a default config file template
 */
export function saveConfigTemplate(configPath?: string): string {
  const path = configPath || DEFAULT_CONFIG_PATH
  const dir = dirname(path)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const template: GatewayConfig = {
    apiKey: "atr_your_api_key_here",
    endpoint: "your-endpoint-name",
    platformUrl: DEFAULT_PLATFORM_URL,
    syncInterval: DEFAULT_SYNC_INTERVAL,
  }

  writeFileSync(path, JSON.stringify(template, null, 2))
  log.info(`Config template saved to: ${path}`)
  return path
}

/**
 * Fetch namespace configuration from Platform API
 */
export async function fetchNamespaceConfig(
  config: GatewayConfig
): Promise<NamespaceConfig> {
  const platformUrl = config.platformUrl || DEFAULT_PLATFORM_URL
  const url = `${platformUrl}/api/gateway/config?endpoint=${encodeURIComponent(
    config.endpoint
  )}`

  log.info(`Fetching namespace config from: ${url}`)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")

    if (response.status === 401) {
      throw new Error(`Authentication failed: Invalid or expired API key`)
    }
    if (response.status === 403) {
      throw new Error(
        `Access denied: API key does not have access to endpoint "${config.endpoint}"`
      )
    }
    if (response.status === 404) {
      throw new Error(`Endpoint not found: "${config.endpoint}"`)
    }

    throw new Error(
      `Failed to fetch namespace config: ${response.status} ${response.statusText}\n${errorBody}`
    )
  }

  const data = await response.json()

  // Validate response structure
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid response from Platform API`)
  }

  const namespaceConfig = data as NamespaceConfig

  if (!namespaceConfig.servers || !Array.isArray(namespaceConfig.servers)) {
    throw new Error(`Invalid namespace config: missing servers array`)
  }

  log.info(
    `Namespace config received: ${namespaceConfig.servers.length} servers in "${namespaceConfig.namespaceName}"`
  )

  return namespaceConfig
}

/**
 * Configuration sync manager
 */
export class ConfigSyncManager {
  private config: GatewayConfig
  private currentNamespaceConfig: NamespaceConfig | null = null
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private onConfigChange: ((config: NamespaceConfig) => void) | null = null

  constructor(config: GatewayConfig) {
    this.config = config
  }

  /**
   * Set callback for config changes
   */
  setOnConfigChange(callback: (config: NamespaceConfig) => void): void {
    this.onConfigChange = callback
  }

  /**
   * Get the current namespace configuration
   */
  getCurrentConfig(): NamespaceConfig | null {
    return this.currentNamespaceConfig
  }

  /**
   * Perform initial sync and return namespace config
   */
  async initialSync(): Promise<NamespaceConfig> {
    this.currentNamespaceConfig = await fetchNamespaceConfig(this.config)
    return this.currentNamespaceConfig
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(): void {
    if (this.syncTimer) {
      return // Already running
    }

    const interval = this.config.syncInterval || DEFAULT_SYNC_INTERVAL
    log.info(`Starting periodic config sync (every ${interval / 1000}s)`)

    this.syncTimer = setInterval(async () => {
      try {
        await this.checkForChanges()
      } catch (error) {
        log.error("Config sync failed:", error)
      }
    }, interval)
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      log.info("Periodic config sync stopped")
    }
  }

  /**
   * Check for config changes and notify if changed
   */
  async checkForChanges(): Promise<boolean> {
    log.debug("Checking for config changes...")

    const newConfig = await fetchNamespaceConfig(this.config)

    // Compare config versions to detect changes
    if (
      this.currentNamespaceConfig &&
      this.currentNamespaceConfig.configVersion === newConfig.configVersion
    ) {
      log.debug("Config unchanged")
      return false
    }

    log.info("Config change detected!")
    this.currentNamespaceConfig = newConfig

    if (this.onConfigChange) {
      this.onConfigChange(newConfig)
    }

    return true
  }

  /**
   * Force a sync now
   */
  async forceSync(): Promise<NamespaceConfig> {
    this.currentNamespaceConfig = await fetchNamespaceConfig(this.config)

    if (this.onConfigChange) {
      this.onConfigChange(this.currentNamespaceConfig)
    }

    return this.currentNamespaceConfig
  }
}
