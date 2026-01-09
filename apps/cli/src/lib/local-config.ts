/**
 * Local Config Operations
 *
 * CRUD operations for local MCP server configuration.
 * Used in local mode for offline/self-hosted usage.
 */

import {
  loadLocalConfigSync,
  saveConfigSync,
  getConfigPath,
  configFileExists,
  createEmptyLocalConfig,
  type ServerConfig,
  type LocalConfig,
} from "@athreei/shared"

// ============================================================================
// Read Operations
// ============================================================================

/**
 * List all servers in local config
 *
 * @returns Array of server configurations
 */
export function listLocalServers(): ServerConfig[] {
  if (!configFileExists()) {
    return []
  }

  const config = loadLocalConfigSync()
  return config.servers
}

/**
 * Get a server by name
 *
 * @param name - Server name to find
 * @returns Server configuration or undefined if not found
 */
export function getLocalServer(name: string): ServerConfig | undefined {
  const servers = listLocalServers()
  return servers.find((s) => s.name === name)
}

/**
 * Check if a server exists by name
 *
 * @param name - Server name to check
 * @returns true if server exists
 */
export function localServerExists(name: string): boolean {
  return getLocalServer(name) !== undefined
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Add or update a server in local config
 *
 * If a server with the same name exists, it will be updated.
 * Otherwise, a new server will be added.
 *
 * @param server - Server configuration to add/update
 * @returns true if added, false if updated
 */
export function addLocalServer(server: ServerConfig): boolean {
  let config: LocalConfig

  if (configFileExists()) {
    config = loadLocalConfigSync()
  } else {
    config = createEmptyLocalConfig()
  }

  const existingIndex = config.servers.findIndex((s) => s.name === server.name)
  const isNew = existingIndex < 0

  if (isNew) {
    config.servers.push(server)
  } else {
    config.servers[existingIndex] = server
  }

  saveConfigSync(config)
  return isNew
}

/**
 * Update an existing server in local config
 *
 * @param name - Server name to update
 * @param updates - Partial server config to merge
 * @returns true if updated, false if server not found
 */
export function updateLocalServer(
  name: string,
  updates: Partial<ServerConfig>
): boolean {
  if (!configFileExists()) {
    return false
  }

  const config = loadLocalConfigSync()
  const index = config.servers.findIndex((s) => s.name === name)

  if (index < 0) {
    return false
  }

  // Merge updates, preserving name
  config.servers[index] = {
    ...config.servers[index],
    ...updates,
    name, // Keep original name
  }

  saveConfigSync(config)
  return true
}

/**
 * Remove a server from local config
 *
 * @param name - Server name to remove
 * @returns true if removed, false if not found
 */
export function removeLocalServer(name: string): boolean {
  if (!configFileExists()) {
    return false
  }

  const config = loadLocalConfigSync()
  const initialLength = config.servers.length
  config.servers = config.servers.filter((s) => s.name !== name)

  if (config.servers.length === initialLength) {
    return false
  }

  saveConfigSync(config)
  return true
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Replace all servers in local config
 *
 * @param servers - New server list
 */
export function setLocalServers(servers: ServerConfig[]): void {
  const config: LocalConfig = { servers }
  saveConfigSync(config)
}

/**
 * Clear all servers from local config
 */
export function clearLocalServers(): void {
  setLocalServers([])
}

// ============================================================================
// Config Info
// ============================================================================

/**
 * Get local config file path
 */
export function getLocalConfigPath(): string {
  return getConfigPath()
}

/**
 * Check if local config file exists
 */
export function hasLocalConfig(): boolean {
  return configFileExists()
}

/**
 * Get count of configured servers
 */
export function getLocalServerCount(): number {
  return listLocalServers().length
}
