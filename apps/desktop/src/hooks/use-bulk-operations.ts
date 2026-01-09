import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"

/**
 * Hook for managing bulk memory operations
 */
export function useBulkOperations() {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Selection handlers
  const selectMemory = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id))
  }, [])

  const deselectMemory = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  // Bulk delete mutation
  const deleteMemories = useMutation({
    mutationFn: (ids: string[]) => api.deleteMemories(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
      clearSelection()
    },
  })

  // Bulk move mutation
  const moveMemories = useMutation({
    mutationFn: ({
      ids,
      targetSpaceId,
    }: {
      ids: string[]
      targetSpaceId: string | null
    }) => api.moveMemories(ids, targetSpaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
      clearSelection()
    },
  })

  // Bulk tag mutation
  const tagMemories = useMutation({
    mutationFn: ({ ids, tags }: { ids: string[]; tags: string[] }) =>
      api.tagMemories(ids, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      clearSelection()
    },
  })

  // Bulk untag mutation
  const untagMemories = useMutation({
    mutationFn: ({ ids, tags }: { ids: string[]; tags: string[] }) =>
      api.untagMemories(ids, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      clearSelection()
    },
  })

  // Action handlers
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    await deleteMemories.mutateAsync(Array.from(selectedIds))
  }, [selectedIds, deleteMemories])

  const handleBulkMove = useCallback(
    async (targetSpaceId: string | null) => {
      if (selectedIds.size === 0) return
      await moveMemories.mutateAsync({
        ids: Array.from(selectedIds),
        targetSpaceId,
      })
    },
    [selectedIds, moveMemories]
  )

  const handleBulkTag = useCallback(
    async (tags: string[]) => {
      if (selectedIds.size === 0 || tags.length === 0) return
      await tagMemories.mutateAsync({
        ids: Array.from(selectedIds),
        tags,
      })
    },
    [selectedIds, tagMemories]
  )

  const handleBulkUntag = useCallback(
    async (tags: string[]) => {
      if (selectedIds.size === 0 || tags.length === 0) return
      await untagMemories.mutateAsync({
        ids: Array.from(selectedIds),
        tags,
      })
    },
    [selectedIds, untagMemories]
  )

  return {
    // Selection state
    selectedIds,
    selectedCount: selectedIds.size,
    hasSelection: selectedIds.size > 0,

    // Selection actions
    selectMemory,
    deselectMemory,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,

    // Bulk operations
    handleBulkDelete,
    handleBulkMove,
    handleBulkTag,
    handleBulkUntag,

    // Operation states
    isDeleting: deleteMemories.isPending,
    isMoving: moveMemories.isPending,
    isTagging: tagMemories.isPending,
    isUntagging: untagMemories.isPending,
    isProcessing:
      deleteMemories.isPending ||
      moveMemories.isPending ||
      tagMemories.isPending ||
      untagMemories.isPending,

    // Errors
    deleteError: deleteMemories.error,
    moveError: moveMemories.error,
    tagError: tagMemories.error,
    untagError: untagMemories.error,
  }
}

/**
 * Hook for updating a single memory
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.updateMemory,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({
        queryKey: ["memories", "detail", variables.id],
      })
    },
  })
}
