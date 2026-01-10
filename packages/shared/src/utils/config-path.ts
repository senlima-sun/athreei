/**
 * Config Path Utilities
 *
 * Platform-aware utilities for locating athreei configuration files.
 * Follows OS conventions for config directory locations.
 */

import { homedir, platform } from "node:os"
import { join } from "node:path"
import { existsSync, mkdirSync } from "node:fs"

/** Config directory name */
const CONFIG_DIR_NAME = ".athreei"

/** Legacy a3i config directory name */
const LEGACY_CONFIG_DIR_NAME = ".a3i"

/** Config file name */
const CONFIG_FILE_NAME = "config.json"

/**
 * Get the config directory path based on platform
 *
 * - macOS: ~/Library/Application Support/athreei/ (or ~/.athreei for compatibility)
 * - Windows: %APPDATA%\athreei\
 * - Linux: ~/.athreei/ (XDG not used for simplicity)
 *
 * For now, we use ~/.athreei on all platforms for consistency with gateway.
 *
 * @returns Absolute path to config directory
 */
export function getConfigDir(): string {
  return join(homedir(), CONFIG_DIR_NAME)
}

/**
 * Get the legacy a3i config directory path
 *
 * @returns Absolute path to legacy ~/.a3i directory
 */
export function getLegacyConfigDir(): string {
  return join(homedir(), LEGACY_CONFIG_DIR_NAME)
}

/**
 * Get the main config file path
 *
 * @returns Absolute path to ~/.athreei/config.json
 */
export function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME)
}

/**
 * Get the legacy a3i config file path
 *
 * @returns Absolute path to ~/.a3i/config.json
 */
export function getLegacyConfigPath(): string {
  return join(getLegacyConfigDir(), CONFIG_FILE_NAME)
}

/**
 * Get platform-specific application data directory
 *
 * - macOS: ~/Library/Application Support/athreei
 * - Windows: %APPDATA%\athreei
 * - Linux: ~/.local/share/athreei
 *
 * This is used for storing larger data like traces, logs, etc.
 *
 * @returns Absolute path to application data directory
 */
export function getAppDataDir(): string {
  const os = platform()

  switch (os) {
    case "darwin":
      return join(homedir(), "Library", "Application Support", "athreei")
    case "win32":
      return join(process.env.APPDATA ?? homedir(), "athreei")
    default:
      return join(homedir(), ".local", "share", "athreei")
  }
}

/**
 * Ensure the config directory exists
 *
 * Creates ~/.athreei/ if it doesn't exist.
 *
 * @returns Path to the config directory
 */
export function ensureConfigDir(): string {
  const dir = getConfigDir()

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  return dir
}

/**
 * Ensure the app data directory exists
 *
 * @returns Path to the app data directory
 */
export function ensureAppDataDir(): string {
  const dir = getAppDataDir()

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  return dir
}

/**
 * Check if main config file exists
 *
 * @returns true if ~/.athreei/config.json exists
 */
export function configExists(): boolean {
  return existsSync(getConfigPath())
}

/**
 * Check if legacy a3i config exists
 *
 * @returns true if ~/.a3i/config.json exists
 */
export function legacyConfigExists(): boolean {
  return existsSync(getLegacyConfigPath())
}

/**
 * Check if config directory exists
 *
 * @returns true if ~/.athreei/ directory exists
 */
export function configDirExists(): boolean {
  return existsSync(getConfigDir())
}
