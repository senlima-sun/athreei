/**
 * Config Loader Utilities
 *
 * Load and save athreei configuration files with validation.
 * Supports both local and cloud configuration modes.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import {
  getConfigPath,
  getLegacyConfigPath,
  ensureConfigDir,
} from "./config-path"
import {
  athreeiConfigSchema,
  localConfigSchema,
  cloudConfigSchema,
  isLegacyA3iConfig,
  migrateLegacyConfig,
  createEmptyLocalConfig,
  type AthreeiConfig,
  type LocalConfig,
  type CloudConfig,
} from "../types/cli-config"

/**
 * Configuration error with context
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly path?: string,
    override readonly cause?: unknown
  ) {
    super(message)
    this.name = "ConfigError"
  }
}

/**
 * Load configuration from file (async)
 *
 * @param configPath - Optional custom path, defaults to ~/.athreei/config.json
 * @returns Validated configuration
 * @throws ConfigError if file not found or invalid
 */
export async function loadConfig(configPath?: string): Promise<AthreeiConfig> {
  return loadConfigSync(configPath)
}

/**
 * Save configuration to file (async)
 *
 * @param config - Configuration to save
 * @param configPath - Optional custom path, defaults to ~/.athreei/config.json
 */
export async function saveConfig(
  config: AthreeiConfig,
  configPath?: string
): Promise<void> {
  saveConfigSync(config, configPath)
}

/**
 * Load configuration from file (sync)
 *
 * This is useful for CLI startup where async is inconvenient.
 *
 * @param configPath - Optional custom path, defaults to ~/.athreei/config.json
 * @returns Validated configuration
 * @throws ConfigError if file not found or invalid
 */
export function loadConfigSync(configPath?: string): AthreeiConfig {
  const path = configPath ?? getConfigPath()

  if (!existsSync(path)) {
    throw new ConfigError(
      `Config file not found: ${path}\n` +
        `Run 'athreei config init' to create one.`,
      path
    )
  }

  let content: string
  try {
    content = readFileSync(path, "utf-8")
  } catch (error) {
    throw new ConfigError(`Failed to read config file: ${path}`, path, error)
  }

  let data: unknown
  try {
    data = JSON.parse(content)
  } catch (error) {
    throw new ConfigError(`Invalid JSON in config file: ${path}`, path, error)
  }

  if (isLegacyA3iConfig(data)) {
    // Auto-migrate legacy config
    return migrateLegacyConfig(data)
  }

  const result = athreeiConfigSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new ConfigError(
      `Invalid config file: ${path}\n${issues}`,
      path,
      result.error
    )
  }

  return result.data
}

/**
 * Save configuration to file (sync)
 *
 * @param config - Configuration to save
 * @param configPath - Optional custom path, defaults to ~/.athreei/config.json
 */
export function saveConfigSync(
  config: AthreeiConfig,
  configPath?: string
): void {
  const path = configPath ?? getConfigPath()

  // Ensure directory exists
  ensureConfigDir()

  const result = athreeiConfigSchema.safeParse(config)
  if (!result.success) {
    throw new ConfigError("Invalid configuration", path, result.error)
  }

  try {
    writeFileSync(path, JSON.stringify(config, null, 2) + "\n")
  } catch (error) {
    throw new ConfigError(`Failed to write config file: ${path}`, path, error)
  }
}

/**
 * Load local configuration specifically
 *
 * @param configPath - Optional custom path
 * @returns Validated local configuration
 * @throws ConfigError if not local config or invalid
 */
export function loadLocalConfigSync(configPath?: string): LocalConfig {
  const path = configPath ?? getConfigPath()

  if (!existsSync(path)) {
    return createEmptyLocalConfig()
  }

  let content: string
  try {
    content = readFileSync(path, "utf-8")
  } catch (error) {
    throw new ConfigError(`Failed to read config file: ${path}`, path, error)
  }

  let data: unknown
  try {
    data = JSON.parse(content)
  } catch (error) {
    throw new ConfigError(`Invalid JSON in config file: ${path}`, path, error)
  }

  if (isLegacyA3iConfig(data)) {
    return migrateLegacyConfig(data)
  }

  const result = localConfigSchema.safeParse(data)
  if (!result.success) {
    throw new ConfigError(
      `Config file is not a valid local config: ${path}\n` +
        `Local config requires a 'servers' array.`,
      path,
      result.error
    )
  }

  return result.data
}

/**
 * Load cloud configuration specifically
 *
 * @param configPath - Optional custom path
 * @returns Validated cloud configuration
 * @throws ConfigError if not cloud config or invalid
 */
export function loadCloudConfigSync(configPath?: string): CloudConfig {
  const path = configPath ?? getConfigPath()

  if (!existsSync(path)) {
    throw new ConfigError(
      `Config file not found: ${path}\n` +
        `Run 'athreei config init --cloud' to create one.`,
      path
    )
  }

  let content: string
  try {
    content = readFileSync(path, "utf-8")
  } catch (error) {
    throw new ConfigError(`Failed to read config file: ${path}`, path, error)
  }

  let data: unknown
  try {
    data = JSON.parse(content)
  } catch (error) {
    throw new ConfigError(`Invalid JSON in config file: ${path}`, path, error)
  }

  const result = cloudConfigSchema.safeParse(data)
  if (!result.success) {
    throw new ConfigError(
      `Config file is not a valid cloud config: ${path}\n` +
        `Cloud config requires 'apiKey' and 'endpoint' fields.`,
      path,
      result.error
    )
  }

  return result.data
}

/**
 * Check if legacy a3i config needs migration
 *
 * @returns true if legacy config exists and main config doesn't
 */
export function needsLegacyMigration(): boolean {
  const legacyPath = getLegacyConfigPath()
  const mainPath = getConfigPath()

  return existsSync(legacyPath) && !existsSync(mainPath)
}

/**
 * Load and migrate legacy a3i config
 *
 * @returns Migrated local config
 * @throws ConfigError if legacy config not found or invalid
 */
export function loadLegacyConfigSync(): LocalConfig {
  const path = getLegacyConfigPath()

  if (!existsSync(path)) {
    throw new ConfigError(`Legacy config file not found: ${path}`, path)
  }

  let content: string
  try {
    content = readFileSync(path, "utf-8")
  } catch (error) {
    throw new ConfigError(`Failed to read legacy config: ${path}`, path, error)
  }

  let data: unknown
  try {
    data = JSON.parse(content)
  } catch (error) {
    throw new ConfigError(`Invalid JSON in legacy config: ${path}`, path, error)
  }

  if (!isLegacyA3iConfig(data)) {
    throw new ConfigError(
      `File is not a valid legacy a3i config: ${path}`,
      path
    )
  }

  return migrateLegacyConfig(data)
}

/**
 * Check if config file exists
 *
 * @param configPath - Optional custom path
 * @returns true if config file exists
 */
export function configFileExists(configPath?: string): boolean {
  return existsSync(configPath ?? getConfigPath())
}

/**
 * Try to load config, returning null if not found
 *
 * @param configPath - Optional custom path
 * @returns Configuration or null
 */
export function tryLoadConfigSync(configPath?: string): AthreeiConfig | null {
  try {
    return loadConfigSync(configPath)
  } catch {
    return null
  }
}
