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
import type { GatewayConfig, NamespaceConfig } from "./types.js"
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
