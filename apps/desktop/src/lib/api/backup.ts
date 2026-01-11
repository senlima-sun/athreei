/**
 * Backup API - Tauri IPC wrappers for backup/restore operations
 */

import { invoke } from "@tauri-apps/api/core"

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
