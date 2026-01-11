/**
 * Sync API - Tauri IPC wrappers for sync operations
 */

import { invoke } from "@tauri-apps/api/core"

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
