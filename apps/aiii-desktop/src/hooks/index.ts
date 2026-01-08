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

// Stats hooks
export { useStats } from "./use-stats"
