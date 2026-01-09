/**
 * Mode Detection Module
 *
 * Determines CLI operational mode (local vs cloud) based on:
 * 1. CLI flags (--local, --cloud)
 * 2. Environment variable (ATHREEI_MODE)
 * 3. Config file shape (servers array = local, apiKey = cloud)
 */

import {
  isLocalConfig,
  isCloudConfig,
  tryLoadConfigSync,
} from "@athreei/shared"

// ============================================================================
// Types
// ============================================================================

/**
 * CLI operational mode
 */
export type CliMode = "local" | "cloud"

/**
 * Mode detection options from CLI flags
 */
export interface ModeOptions {
  /** --local flag */
  local?: boolean
  /** --cloud flag */
  cloud?: boolean
}

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Detect operational mode from CLI options, env var, or config
 *
 * Priority order:
 * 1. CLI flags (--local, --cloud)
 * 2. ATHREEI_MODE environment variable
 * 3. Config file shape detection
 * 4. Default to local
 *
 * @param options - CLI options with local/cloud flags
 * @returns Detected mode
 */
export function detectMode(options?: ModeOptions): CliMode {
  // 1. CLI flags have highest priority
  if (options?.local) {
    return "local"
  }
  if (options?.cloud) {
    return "cloud"
  }

  // 2. Environment variable
  const envMode = process.env.ATHREEI_MODE?.toLowerCase()
  if (envMode === "local") {
    return "local"
  }
  if (envMode === "cloud") {
    return "cloud"
  }

  // 3. Detect from config file shape
  const config = tryLoadConfigSync()
  if (config) {
    if (isCloudConfig(config)) {
      return "cloud"
    }
    if (isLocalConfig(config)) {
      return "local"
    }
  }

  // 4. Default to local mode
  return "local"
}

// ============================================================================
// Mode Validation Helpers
// ============================================================================

/**
 * Error thrown when a cloud-only command is run in local mode
 */
export class CloudModeRequiredError extends Error {
  constructor(command: string) {
    super(
      `The '${command}' command requires cloud mode.\n` +
        `Either:\n` +
        `  - Run with --cloud flag\n` +
        `  - Set ATHREEI_MODE=cloud\n` +
        `  - Configure apiKey in ~/.athreei/config.json`
    )
    this.name = "CloudModeRequiredError"
  }
}

/**
 * Error thrown when a local-only command is run in cloud mode
 */
export class LocalModeRequiredError extends Error {
  constructor(command: string) {
    super(
      `The '${command}' command requires local mode.\n` +
        `Either:\n` +
        `  - Run with --local flag\n` +
        `  - Set ATHREEI_MODE=local\n` +
        `  - Configure servers array in ~/.athreei/config.json`
    )
    this.name = "LocalModeRequiredError"
  }
}

/**
 * Require cloud mode for a command
 *
 * @param mode - Current mode
 * @param command - Command name for error message
 * @throws CloudModeRequiredError if not in cloud mode
 */
export function requireCloudMode(mode: CliMode, command: string): void {
  if (mode !== "cloud") {
    throw new CloudModeRequiredError(command)
  }
}

/**
 * Require local mode for a command
 *
 * @param mode - Current mode
 * @param command - Command name for error message
 * @throws LocalModeRequiredError if not in local mode
 */
export function requireLocalMode(mode: CliMode, command: string): void {
  if (mode !== "local") {
    throw new LocalModeRequiredError(command)
  }
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get human-readable mode description
 */
export function getModeDescription(mode: CliMode): string {
  return mode === "local"
    ? "Local mode (offline, file-based config)"
    : "Cloud mode (connected to Platform)"
}

/**
 * Get mode indicator for status display
 */
export function getModeIndicator(mode: CliMode): string {
  return mode === "local" ? "[local]" : "[cloud]"
}
