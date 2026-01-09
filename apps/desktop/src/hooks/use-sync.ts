import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { ConflictResolution } from "@/lib/api"

/**
 * Query sync status
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: api.syncStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

/**
 * Query sync configuration
 */
export function useSyncConfig() {
  return useQuery({
    queryKey: ["sync", "config"],
    queryFn: api.syncGetConfig,
  })
}

/**
 * Query sync conflicts
 */
export function useSyncConflicts() {
  return useQuery({
    queryKey: ["sync", "conflicts"],
    queryFn: api.syncGetConflicts,
  })
}

/**
 * Query pending change count
 */
export function useSyncPendingCount() {
  return useQuery({
    queryKey: ["sync", "pending"],
    queryFn: api.syncPendingCount,
    refetchInterval: 10000, // Refresh every 10 seconds
  })
}

/**
 * Mutation to enable sync
 */
export function useSyncEnable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      authToken,
      serverUrl,
    }: {
      authToken: string
      serverUrl?: string
    }) => api.syncEnable(authToken, serverUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] })
    },
  })
}

/**
 * Mutation to disable sync
 */
export function useSyncDisable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.syncDisable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] })
    },
  })
}

/**
 * Mutation to trigger manual sync
 */
export function useSyncNow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.syncNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] })
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}

/**
 * Mutation to resolve a conflict
 */
export function useSyncResolveConflict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conflictId,
      resolution,
    }: {
      conflictId: string
      resolution: ConflictResolution
    }) => api.syncResolveConflict(conflictId, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "conflicts"] })
      queryClient.invalidateQueries({ queryKey: ["sync", "status"] })
      queryClient.invalidateQueries({ queryKey: ["memories"] })
    },
  })
}

/**
 * Mutation to update sync configuration
 */
export function useSyncSetConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.syncSetConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "config"] })
    },
  })
}
