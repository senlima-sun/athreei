/**
 * Tauri IPC API for aiii Desktop
 *
 * Type-safe wrappers around Tauri invoke commands.
 */

import { invoke } from "@tauri-apps/api/core"

import type { CreateMemoryInput, Memory, Space, TagWithCount } from "./types"

// ==================== Vault API ====================

/**
 * Unlock the vault with a passphrase
 *
 * @param passphrase - The user's passphrase
 * @throws Error if unlock fails
 */
export const vaultUnlock = (passphrase: string): Promise<void> =>
  invoke("vault_unlock", { passphrase })

/**
 * Lock the vault, clearing the encryption key from memory
 */
export const vaultLock = (): Promise<void> => invoke("vault_lock")

/**
 * Check if the vault is currently unlocked
 *
 * @returns true if unlocked, false if locked
 */
export const vaultStatus = (): Promise<boolean> => invoke("vault_status")

/**
 * Set up a new vault with a passphrase
 *
 * Should only be called when no vault exists yet.
 *
 * @param passphrase - The user's chosen passphrase
 * @throws Error if vault is already set up
 */
export const vaultSetup = (passphrase: string): Promise<void> =>
  invoke("vault_setup", { passphrase })

/**
 * Check if a vault has been set up
 *
 * @returns true if vault exists, false otherwise
 */
export const vaultIsSetup = (): Promise<boolean> => invoke("vault_is_setup")

/**
 * Result of changing the passphrase
 */
export interface ChangePassphraseResult {
  memories_re_encrypted: number
  total_memories: number
  errors: string[]
}

/**
 * Change the vault passphrase
 *
 * This will re-encrypt all memories with the new passphrase.
 *
 * @param oldPassphrase - Current passphrase
 * @param newPassphrase - New passphrase (min 8 characters)
 * @returns Result of the operation
 */
export const vaultChangePassphrase = (
  oldPassphrase: string,
  newPassphrase: string
): Promise<ChangePassphraseResult> =>
  invoke("vault_change_passphrase", { oldPassphrase, newPassphrase })

// ==================== Spaces API ====================

/**
 * List all spaces ordered by name
 *
 * @returns Array of spaces
 */
export const listSpaces = (): Promise<Space[]> => invoke("list_spaces")

/**
 * Get a space by ID
 *
 * @param id - The space ID
 * @returns The space or null if not found
 */
export const getSpace = (id: string): Promise<Space | null> =>
  invoke("get_space", { id })

/**
 * Create a new space
 *
 * @param name - Space name
 * @param icon - Optional icon (emoji or identifier)
 * @returns The created space
 */
export const createSpace = (name: string, icon?: string): Promise<Space> =>
  invoke("create_space", { name, icon })

/**
 * Update an existing space
 *
 * @param id - Space ID to update
 * @param name - New name (optional)
 * @param icon - New icon (optional)
 * @returns The updated space
 */
export const updateSpace = (
  id: string,
  name?: string,
  icon?: string
): Promise<Space> => invoke("update_space", { id, name, icon })

/**
 * Delete a space
 *
 * @param id - Space ID to delete
 */
export const deleteSpace = (id: string): Promise<void> =>
  invoke("delete_space", { id })

/**
 * Count memories in a space
 *
 * @param spaceId - Space ID
 * @returns Number of memories in the space
 */
export const countSpaceMemories = (spaceId: string): Promise<number> =>
  invoke("count_space_memories", { spaceId })

// ==================== Memories API ====================

/**
 * List memories with optional filtering and pagination
 *
 * Requires vault to be unlocked.
 *
 * @param spaceId - Optional space filter
 * @param limit - Maximum number of results (default 50)
 * @param offset - Number of results to skip (default 0)
 * @returns Array of decrypted memories
 * @throws Error if vault is locked
 */
export const listMemories = (
  spaceId?: string,
  limit?: number,
  offset?: number
): Promise<Memory[]> => invoke("list_memories", { spaceId, limit, offset })

/**
 * Get a single memory by ID
 *
 * Requires vault to be unlocked.
 *
 * @param id - Memory ID
 * @returns The decrypted memory or null if not found
 * @throws Error if vault is locked
 */
export const getMemory = (id: string): Promise<Memory | null> =>
  invoke("get_memory", { id })

/**
 * Create a new memory
 *
 * Requires vault to be unlocked. Content is encrypted before storage.
 *
 * @param input - Memory creation input
 * @returns The created memory (decrypted)
 * @throws Error if vault is locked
 */
export const createMemory = (input: CreateMemoryInput): Promise<Memory> =>
  invoke("create_memory", { input })

/**
 * Search memories using full-text search
 *
 * Searches across source, source_id, metadata, and tags.
 * Requires vault to be unlocked for decryption.
 *
 * @param query - Search query
 * @param spaceId - Optional space filter
 * @returns Array of matching decrypted memories
 * @throws Error if vault is locked
 */
export const searchMemories = (
  query: string,
  spaceId?: string
): Promise<Memory[]> => invoke("search_memories", { query, spaceId })

/**
 * Delete a memory
 *
 * @param id - Memory ID to delete
 */
export const deleteMemory = (id: string): Promise<void> =>
  invoke("delete_memory", { id })

/**
 * Update memory tags
 *
 * Replaces all tags on a memory with the provided list.
 *
 * @param id - Memory ID
 * @param tags - New tag list
 */
export const updateMemoryTags = (id: string, tags: string[]): Promise<void> =>
  invoke("update_memory_tags", { id, tags })

/**
 * List all tags with usage counts
 *
 * @returns Array of [tag name, count] tuples
 */
export const listTags = (): Promise<TagWithCount[]> =>
  invoke<[string, number][]>("list_tags").then((results) =>
    results.map(([name, count]) => ({ name, count }))
  )

/**
 * Count all memories
 *
 * @param spaceId - Optional space filter
 * @returns Total number of memories
 */
export const countMemories = (spaceId?: string): Promise<number> =>
  invoke("count_memories", { spaceId })

/**
 * Input for updating a memory
 */
export interface UpdateMemoryInput {
  id: string
  space_id?: string | null
  title?: string
  summary?: string
  content?: string
  metadata?: string
}

/**
 * Update a memory
 *
 * @param input - Update input with memory ID and fields to update
 * @returns The updated memory
 */
export const updateMemory = (input: UpdateMemoryInput): Promise<Memory> =>
  invoke("update_memory", { input })

// ==================== Bulk Operations API ====================

/**
 * Delete multiple memories
 *
 * @param ids - Array of memory IDs to delete
 * @returns Number of memories deleted
 */
export const deleteMemories = (ids: string[]): Promise<number> =>
  invoke("delete_memories", { ids })

/**
 * Move multiple memories to a different space
 *
 * @param ids - Array of memory IDs to move
 * @param targetSpaceId - Target space ID (null for no space)
 * @returns Number of memories moved
 */
export const moveMemories = (
  ids: string[],
  targetSpaceId: string | null
): Promise<number> => invoke("move_memories", { ids, targetSpaceId })

/**
 * Add tags to multiple memories
 *
 * @param ids - Array of memory IDs to tag
 * @param tags - Tags to add
 * @returns Number of memories tagged
 */
export const tagMemories = (ids: string[], tags: string[]): Promise<number> =>
  invoke("tag_memories", { ids, tags })

/**
 * Remove tags from multiple memories
 *
 * @param ids - Array of memory IDs to untag
 * @param tags - Tags to remove
 * @returns Number of memories untagged
 */
export const untagMemories = (ids: string[], tags: string[]): Promise<number> =>
  invoke("untag_memories", { ids, tags })

// ==================== MCP Server API ====================

/**
 * MCP server status
 */
export interface McpStatus {
  /** Whether the server is currently running */
  running: boolean
  /** Port number if using HTTP transport (None for stdio) */
  port: number | null
  /** Transport type being used */
  transport: string
}

/**
 * Start the MCP server
 *
 * Starts the MCP server using stdio transport, making it available
 * to AI applications like Claude Desktop.
 *
 * @throws Error if server is already running or vault is locked
 */
export const mcpStart = (): Promise<void> => invoke("mcp_start")

/**
 * Stop the MCP server
 *
 * Gracefully stops the running MCP server.
 *
 * @throws Error if server is not running
 */
export const mcpStop = (): Promise<void> => invoke("mcp_stop")

/**
 * Get the MCP server status
 *
 * @returns Current server status including running state and transport
 */
export const mcpStatus = (): Promise<McpStatus> => invoke("mcp_status")

// ==================== Sync API ====================

/**
 * Sync state
 */
export interface SyncState {
  /** Whether sync is enabled */
  enabled: boolean
  /** Whether currently syncing */
  syncing: boolean
  /** Last successful sync timestamp */
  last_sync: number | null
  /** Number of pending local changes */
  pending_changes: number
  /** Number of unresolved conflicts */
  conflicts_count: number
  /** Last error message if any */
  last_error: string | null
  /** Remote sync cursor */
  sync_cursor: string | null
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Sync server URL */
  server_url: string
  /** Authentication token */
  auth_token: string | null
  /** Whether to auto-sync on changes */
  auto_sync: boolean
  /** Auto-sync interval in seconds (0 = disabled) */
  sync_interval: number
  /** Unique device identifier */
  device_id: string
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  /** Unique conflict ID */
  id: string
  /** Type of entity in conflict */
  entity_type: "memory" | "space" | "tag"
  /** ID of the conflicting entity */
  entity_id: string
  /** Local version of the entity (serialized) */
  local_data: string
  /** Remote version of the entity (serialized) */
  remote_data: string
  /** When the local change occurred */
  local_timestamp: number
  /** When the remote change occurred */
  remote_timestamp: number
  /** When the conflict was detected */
  detected_at: number
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = "keep_local" | "keep_remote" | "keep_both"

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Number of changes pushed */
  pushed: number
  /** Number of changes pulled */
  pulled: number
  /** Number of conflicts detected */
  conflicts: number
}

/**
 * Get current sync status
 */
export const syncStatus = (): Promise<SyncState> => invoke("sync_status")

/**
 * Enable sync with authentication
 */
export const syncEnable = (
  authToken: string,
  serverUrl?: string
): Promise<void> =>
  invoke("sync_enable", {
    input: { auth_token: authToken, server_url: serverUrl },
  })

/**
 * Disable sync
 */
export const syncDisable = (): Promise<void> => invoke("sync_disable")

/**
 * Trigger manual sync
 */
export const syncNow = (): Promise<SyncResult> => invoke("sync_now")

/**
 * Get all unresolved conflicts
 */
export const syncGetConflicts = (): Promise<SyncConflict[]> =>
  invoke("sync_get_conflicts")

/**
 * Resolve a sync conflict
 */
export const syncResolveConflict = (
  conflictId: string,
  resolution: ConflictResolution
): Promise<void> => invoke("sync_resolve_conflict", { conflictId, resolution })

/**
 * Get sync configuration
 */
export const syncGetConfig = (): Promise<SyncConfig> =>
  invoke("sync_get_config")

/**
 * Update sync configuration
 */
export const syncSetConfig = (config: SyncConfig): Promise<void> =>
  invoke("sync_set_config", { config })

/**
 * Get pending change count
 */
export const syncPendingCount = (): Promise<number> =>
  invoke("sync_pending_count")

// ==================== Settings API ====================

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

// ==================== Backup API ====================

/**
 * Backup header/metadata
 */
export interface BackupHeader {
  version: number
  created_at: number
  spaces_count: number
  memories_count: number
  description: string | null
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  spaces_imported: number
  spaces_skipped: number
  memories_imported: number
  memories_skipped: number
}

/**
 * Import strategy
 */
export type ImportStrategy = "replace" | "merge" | "skip"

/**
 * Information about a backup file
 */
export interface BackupInfo {
  version: number
  created_at: number
  spaces_count: number
  memories_count: number
  file_size: number
  is_compatible: boolean
}

/**
 * Export all data to a backup file
 */
export const backupExport = (path: string): Promise<BackupHeader> =>
  invoke("backup_export", { path })

/**
 * Import data from a backup file
 */
export const backupImport = (
  path: string,
  strategy: ImportStrategy
): Promise<ImportResult> => invoke("backup_import", { path, strategy })

/**
 * Get information about a backup file
 */
export const backupInfo = (path: string): Promise<BackupInfo> =>
  invoke("backup_info", { path })
