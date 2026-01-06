/**
 * Config file management for CLI
 * Handles reading/writing ~/.a3i/config.json
 */

import { homedir } from "os"
import { join } from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import type { Config, ServerConfig } from "../types.js"

const CONFIG_DIR = join(homedir(), ".a3i")
const CONFIG_FILE = join(CONFIG_DIR, "config.json")

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

/**
 * Get default empty config
 */
function getDefaultConfig(): Config {
  return {
    servers: [],
  }
}

/**
 * Read config file
 */
export function readConfig(): Config {
  ensureConfigDir()

  if (!existsSync(CONFIG_FILE)) {
    return getDefaultConfig()
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8")
    return JSON.parse(content) as Config
  } catch {
    // Return default config if file is corrupted
    return getDefaultConfig()
  }
}

/**
 * Write config file
 */
export function writeConfig(config: Config): void {
  ensureConfigDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

/**
 * Add a server to config
 */
export function addServer(server: ServerConfig): void {
  const config = readConfig()

  // Check if server with same name exists
  const existingIndex = config.servers.findIndex((s) => s.name === server.name)
  if (existingIndex >= 0) {
    // Update existing server
    config.servers[existingIndex] = server
  } else {
    // Add new server
    config.servers.push(server)
  }

  writeConfig(config)
}

/**
 * Remove a server from config
 */
export function removeServer(name: string): boolean {
  const config = readConfig()
  const initialLength = config.servers.length
  config.servers = config.servers.filter((s) => s.name !== name)

  if (config.servers.length !== initialLength) {
    writeConfig(config)
    return true
  }

  return false
}

/**
 * Get a server by name
 */
export function getServer(name: string): ServerConfig | undefined {
  const config = readConfig()
  return config.servers.find((s) => s.name === name)
}

/**
 * Get all servers
 */
export function getServers(): ServerConfig[] {
  return readConfig().servers
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE
}
