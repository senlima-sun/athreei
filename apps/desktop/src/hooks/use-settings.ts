import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"

/**
 * Query application settings
 */
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.settingsGet,
  })
}

/**
 * Query database path
 */
export function useDatabasePath() {
  return useQuery({
    queryKey: ["settings", "database-path"],
    queryFn: api.settingsGetDatabasePath,
  })
}

/**
 * Query auto-lock timeout
 */
export function useAutoLockTimeout() {
  return useQuery({
    queryKey: ["settings", "auto-lock"],
    queryFn: api.settingsGetAutoLock,
  })
}

/**
 * Query launch at startup setting
 */
export function useLaunchAtStartup() {
  return useQuery({
    queryKey: ["settings", "launch-at-startup"],
    queryFn: api.settingsGetLaunchAtStartup,
  })
}

/**
 * Query keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  return useQuery({
    queryKey: ["settings", "shortcuts"],
    queryFn: api.settingsGetShortcuts,
  })
}

/**
 * Query data retention period
 */
export function useDataRetention() {
  return useQuery({
    queryKey: ["settings", "data-retention"],
    queryFn: api.settingsGetDataRetention,
  })
}

/**
 * Query app info
 */
export function useAppInfo() {
  return useQuery({
    queryKey: ["settings", "app-info"],
    queryFn: api.settingsGetAppInfo,
    staleTime: Infinity, // App info never changes
  })
}

/**
 * Mutation to update all settings
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.settingsSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

/**
 * Mutation to set auto-lock timeout
 */
export function useSetAutoLockTimeout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.settingsSetAutoLock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "auto-lock"] })
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

/**
 * Mutation to set launch at startup
 */
export function useSetLaunchAtStartup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.settingsSetLaunchAtStartup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "launch-at-startup"],
      })
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

/**
 * Mutation to set keyboard shortcuts
 */
export function useSetKeyboardShortcuts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.settingsSetShortcuts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "shortcuts"] })
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

/**
 * Mutation to set data retention period
 */
export function useSetDataRetention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.settingsSetDataRetention,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "data-retention"],
      })
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

/**
 * Mutation to cleanup old memories
 */
export function useCleanupOldMemories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.settingsCleanupOldMemories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
    },
  })
}

/**
 * Auto-lock timeout options
 */
export const AUTO_LOCK_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 300, label: "5 minutes" },
  { value: 900, label: "15 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
] as const

/**
 * Data retention options
 */
export const DATA_RETENTION_OPTIONS = [
  { value: 0, label: "Keep forever" },
  { value: 90, label: "3 months" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
] as const
