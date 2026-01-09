import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { CreateMemoryInput } from "@/lib/types"
import type { UpdateMemoryInput } from "@/lib/api"

/**
 * Query memories with optional space filter and pagination
 */
export function useMemories(spaceId?: string, limit?: number, offset?: number) {
  return useQuery({
    queryKey: ["memories", { spaceId, limit, offset }],
    queryFn: () => api.listMemories(spaceId, limit, offset),
  })
}

/**
 * Query a single memory by ID
 */
export function useMemory(id: string) {
  return useQuery({
    queryKey: ["memories", "detail", id],
    queryFn: () => api.getMemory(id),
    enabled: !!id,
  })
}

/**
 * Query total memory count with optional space filter
 */
export function useMemoryCount(spaceId?: string) {
  return useQuery({
    queryKey: ["memories", "count", spaceId],
    queryFn: () => api.countMemories(spaceId),
  })
}

/**
 * Mutation to create a new memory
 */
export function useCreateMemory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => api.createMemory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}

/**
 * Mutation to delete a memory
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}

/**
 * Mutation to update memory tags
 */
export function useUpdateMemoryTags() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      api.updateMemoryTags(id, tags),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({
        queryKey: ["memories", "detail", variables.id],
      })
    },
  })
}

/**
 * Search memories using full-text search
 */
export function useSearchMemories(query: string, spaceId?: string) {
  return useQuery({
    queryKey: ["memories", "search", query, spaceId],
    queryFn: () => api.searchMemories(query, spaceId),
    enabled: query.length > 0,
  })
}

/**
 * Query all tags with usage counts
 */
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  })
}

/**
 * Mutation to update a memory
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMemoryInput) => api.updateMemory(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({
        queryKey: ["memories", "detail", variables.id],
      })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}
