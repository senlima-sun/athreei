/**
 * Settings API - Tauri IPC wrappers for settings operations
 */

import { invoke } from "@tauri-apps/api/core"

/**
 * Keyboard shortcuts configuration
 */
export interface KeyboardShortcuts {
  /** Global search shortcut */
  global_search: string
  /** Quick capture shortcut */
  quick_capture: string
  /** Lock vault shortcut */
  lock_vault: string
}

/**
 * Application settings
 */
export interface AppSettings {
  /** Auto-lock timeout in seconds (0 = disabled) */
  auto_lock_timeout: number
  /** Launch at system startup */
  launch_at_startup: boolean
  /** Data retention period in days (0 = keep forever) */
  data_retention_days: number
  /** Keyboard shortcuts */
  shortcuts: KeyboardShortcuts
}

/**
 * Application info
 */
export interface AppInfo {
  version: string
  name: string
  authors: string
}

/**
 * Get current database path
 */
export const settingsGetDatabasePath = (): Promise<string> =>
  invoke("settings_get_database_path")

/**
 * Get current application settings
 */
export const settingsGet = (): Promise<AppSettings> => invoke("settings_get")

/**
 * Update application settings
 */
export const settingsSet = (settings: AppSettings): Promise<void> =>
  invoke("settings_set", { newSettings: settings })

/**
 * Set auto-lock timeout
 */
export const settingsSetAutoLock = (timeoutSeconds: number): Promise<void> =>
  invoke("settings_set_auto_lock", { timeoutSeconds })

/**
 * Get auto-lock timeout
 */
export const settingsGetAutoLock = (): Promise<number> =>
  invoke("settings_get_auto_lock")

/**
 * Set launch at startup
 */
export const settingsSetLaunchAtStartup = (enabled: boolean): Promise<void> =>
  invoke("settings_set_launch_at_startup", { enabled })

/**
 * Get launch at startup setting
 */
export const settingsGetLaunchAtStartup = (): Promise<boolean> =>
  invoke("settings_get_launch_at_startup")

/**
 * Set keyboard shortcuts
 */
export const settingsSetShortcuts = (
  shortcuts: KeyboardShortcuts
): Promise<void> => invoke("settings_set_shortcuts", { shortcuts })

/**
 * Get keyboard shortcuts
 */
export const settingsGetShortcuts = (): Promise<KeyboardShortcuts> =>
  invoke("settings_get_shortcuts")

/**
 * Set data retention period in days
 */
export const settingsSetDataRetention = (days: number): Promise<void> =>
  invoke("settings_set_data_retention", { days })

/**
 * Get data retention period in days
 */
export const settingsGetDataRetention = (): Promise<number> =>
  invoke("settings_get_data_retention")

/**
 * Clean up old memories based on retention period
 */
export const settingsCleanupOldMemories = (): Promise<number> =>
  invoke("settings_cleanup_old_memories")

/**
 * Get app version and info
 */
export const settingsGetAppInfo = (): Promise<AppInfo> =>
  invoke("settings_get_app_info")
