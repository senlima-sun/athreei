/**
 * Tauri IPC API for aiii Desktop
 *
 * Type-safe wrappers around Tauri invoke commands.
 */

// Vault operations
export {
  vaultUnlock,
  vaultLock,
  vaultStatus,
  vaultSetup,
  vaultIsSetup,
  vaultChangePassphrase,
  type ChangePassphraseResult,
} from "./vault"

// Space operations
export {
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  deleteSpace,
  countSpaceMemories,
} from "./spaces"

// Memory operations
export {
  listMemories,
  getMemory,
  createMemory,
  searchMemories,
  deleteMemory,
  updateMemoryTags,
  listTags,
  countMemories,
  updateMemory,
  deleteMemories,
  moveMemories,
  tagMemories,
  untagMemories,
  getOldestMemoryDate,
  listMemoriesByDate,
  countMemoriesByDate,
  type UpdateMemoryInput,
} from "./memories"

// MCP server operations
export { mcpStart, mcpStop, mcpStatus, type McpStatus } from "./mcp"

// Sync operations
export {
  syncStatus,
  syncEnable,
  syncDisable,
  syncNow,
  syncGetConflicts,
  syncResolveConflict,
  syncGetConfig,
  syncSetConfig,
  syncPendingCount,
  type SyncState,
  type SyncConfig,
  type SyncConflict,
  type ConflictResolution,
  type SyncResult,
} from "./sync"

// Settings operations
export {
  settingsGetDatabasePath,
  settingsGet,
  settingsSet,
  settingsSetAutoLock,
  settingsGetAutoLock,
  settingsSetLaunchAtStartup,
  settingsGetLaunchAtStartup,
  settingsSetShortcuts,
  settingsGetShortcuts,
  settingsSetDataRetention,
  settingsGetDataRetention,
  settingsCleanupOldMemories,
  settingsGetAppInfo,
  type KeyboardShortcuts,
  type AppSettings,
  type AppInfo,
} from "./settings"

// Backup operations
export {
  backupExport,
  backupImport,
  backupInfo,
  type BackupHeader,
  type ImportResult,
  type ImportStrategy,
  type BackupInfo,
} from "./backup"

// Workspace operations
export {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  countWorkspaces,
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  listHandoffs,
  getHandoff,
  createHandoff,
  deleteHandoff,
  getLatestHandoff,
} from "./workspaces"
