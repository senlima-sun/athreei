/**
 * CLI Configuration Types
 *
 * Defines configuration schemas for local and cloud modes.
 * The athreei CLI supports two operational modes:
 *
 * - **Local mode**: Offline-capable, file-based config with servers array
 * - **Cloud mode**: API-connected, uses apiKey for Platform sync
 */

import { z } from "zod"
import { serverConfigSchema, type ServerConfig } from "./server-config.js"

/** Default Platform URL */
export const DEFAULT_PLATFORM_URL = "https://athreei.com"

/** Default sync interval: 5 minutes */
export const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000

/**
 * Local mode configuration
 *
 * Used when running `athreei --local` for offline/self-hosted usage.
 *
 * @example
 * ```json
 * {
 *   "servers": [
 *     {
 *       "name": "filesystem",
 *       "transport": "stdio",
 *       "command": "npx",
 *       "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
 *     }
 *   ]
 * }
 * ```
 */
export interface LocalConfig {
  /** List of MCP servers to connect to */
  servers: ServerConfig[]
}

/**
 * Zod schema for local configuration
 */
export const localConfigSchema = z.object({
  servers: z.array(serverConfigSchema).default([]),
})

/**
 * Cloud mode configuration
 *
 * Used when running `athreei` connected to the Platform.
 *
 * @example
 * ```json
 * {
 *   "apiKey": "atr_your_api_key",
 *   "endpoint": "your-endpoint-name",
 *   "platformUrl": "https://athreei.com",
 *   "syncInterval": 300000
 * }
 * ```
 */
export interface CloudConfig {
  /** API key for Platform authentication */
  apiKey: string
  /** Endpoint name to connect to */
  endpoint: string
  /** Platform URL (defaults to https://athreei.com) */
  platformUrl?: string
  /** Config sync interval in milliseconds (defaults to 5 minutes) */
  syncInterval?: number
}

/**
 * Zod schema for cloud configuration
 */
export const cloudConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  endpoint: z.string().min(1, "Endpoint name is required"),
  platformUrl: z.string().url().optional().default(DEFAULT_PLATFORM_URL),
  syncInterval: z.number().positive().optional().default(DEFAULT_SYNC_INTERVAL),
})

/**
 * Combined configuration type supporting both modes
 *
 * The config file at ~/.athreei/config.json can contain either:
 * - Local config with `servers` array
 * - Cloud config with `apiKey` and `endpoint`
 */
export type AthreeiConfig = LocalConfig | CloudConfig

/**
 * Zod schema for combined configuration
 *
 * Uses discriminated union based on presence of `servers` vs `apiKey`:
 * - If `servers` array exists → Local mode
 * - If `apiKey` exists → Cloud mode
 */
export const athreeiConfigSchema = z.union([
  // Local mode: has servers array
  localConfigSchema,
  // Cloud mode: has apiKey
  cloudConfigSchema,
])

/**
 * Check if config is for local mode
 *
 * @param config - Configuration to check
 * @returns true if config has `servers` array (local mode)
 */
export function isLocalConfig(config: AthreeiConfig): config is LocalConfig {
  return "servers" in config && Array.isArray(config.servers)
}

/**
 * Check if config is for cloud mode
 *
 * @param config - Configuration to check
 * @returns true if config has `apiKey` (cloud mode)
 */
export function isCloudConfig(config: AthreeiConfig): config is CloudConfig {
  return "apiKey" in config && typeof config.apiKey === "string"
}

/**
 * Detect operational mode from configuration
 *
 * Priority:
 * 1. If config has `servers` array → local
 * 2. If config has `apiKey` → cloud
 * 3. Default → local (empty servers)
 *
 * @param config - Configuration to analyze
 * @returns "local" or "cloud"
 */
export function detectModeFromConfig(config: AthreeiConfig): "local" | "cloud" {
  if (isCloudConfig(config)) {
    return "cloud"
  }
  return "local"
}

/**
 * Create an empty local configuration
 */
export function createEmptyLocalConfig(): LocalConfig {
  return {
    servers: [],
  }
}

/**
 * Create a cloud configuration
 */
export function createCloudConfig(
  apiKey: string,
  endpoint: string,
  options?: { platformUrl?: string; syncInterval?: number }
): CloudConfig {
  return {
    apiKey,
    endpoint,
    platformUrl: options?.platformUrl ?? DEFAULT_PLATFORM_URL,
    syncInterval: options?.syncInterval ?? DEFAULT_SYNC_INTERVAL,
  }
}

/**
 * Legacy a3i server configuration (for migration)
 */
export interface LegacyA3iServerConfig {
  name: string
  url: string
  token: string // encrypted format
}

/**
 * Legacy a3i configuration (for migration)
 */
export interface LegacyA3iConfig {
  servers: LegacyA3iServerConfig[]
}

/**
 * Check if config is legacy a3i format
 */
export function isLegacyA3iConfig(config: unknown): config is LegacyA3iConfig {
  if (!config || typeof config !== "object") return false
  const c = config as Record<string, unknown>

  if (!Array.isArray(c.servers)) return false

  // Check if first server has legacy format (url + token, no transport)
  const firstServer = c.servers[0] as Record<string, unknown> | undefined
  if (firstServer) {
    return (
      typeof firstServer.url === "string" &&
      typeof firstServer.token === "string" &&
      !("transport" in firstServer)
    )
  }

  return false
}

/**
 * Convert legacy a3i config to new local config format
 *
 * @param legacy - Legacy a3i configuration
 * @returns New local configuration
 */
export function migrateLegacyConfig(legacy: LegacyA3iConfig): LocalConfig {
  return {
    servers: legacy.servers.map((server) => ({
      name: server.name,
      transport: "sse" as const,
      url: server.url,
      token: server.token,
    })),
  }
}
