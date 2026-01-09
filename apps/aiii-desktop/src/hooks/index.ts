// Vault hooks
export {
  useVaultStatus,
  useVaultIsSetup,
  useVaultUnlock,
  useVaultLock,
  useVaultSetup,
} from "./use-vault"

// Spaces hooks
export {
  useSpaces,
  useSpace,
  useSpaceMemoryCount,
  useCreateSpace,
  useUpdateSpace,
  useDeleteSpace,
} from "./use-spaces"

// Memories hooks
export {
  useMemories,
  useMemory,
  useMemoryCount,
  useCreateMemory,
  useDeleteMemory,
  useUpdateMemoryTags,
  useSearchMemories,
  useTags,
} from "./use-memories"

// MCP hooks
export { useMcpStatus, useMcpStart, useMcpStop } from "./use-mcp"

// Utility hooks
export { useDebounce } from "./use-debounce"
export { useSearch } from "./use-search"
export {
  useMemoryFilters,
  DATE_RANGE_OPTIONS,
  type MemoryFilters,
  type DateRange,
} from "./use-memory-filters"

// Stats hooks
export { useStats } from "./use-stats"

// Sync hooks
export {
  useSyncStatus,
  useSyncConfig,
  useSyncConflicts,
  useSyncPendingCount,
  useSyncEnable,
  useSyncDisable,
  useSyncNow,
  useSyncResolveConflict,
  useSyncSetConfig,
} from "./use-sync"

// Bulk operations hooks
export { useBulkOperations, useUpdateMemory } from "./use-bulk-operations"

// Settings hooks
export {
  useSettings,
  useDatabasePath,
  useAutoLockTimeout,
  useLaunchAtStartup,
  useKeyboardShortcuts,
  useDataRetention,
  useAppInfo,
  useUpdateSettings,
  useSetAutoLockTimeout,
  useSetLaunchAtStartup,
  useSetKeyboardShortcuts,
  useSetDataRetention,
  useCleanupOldMemories,
  AUTO_LOCK_OPTIONS,
  DATA_RETENTION_OPTIONS,
} from "./use-settings"
