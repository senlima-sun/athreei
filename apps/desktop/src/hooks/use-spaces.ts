import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"

/**
 * Query all spaces
 */
export function useSpaces() {
  return useQuery({
    queryKey: ["spaces"],
    queryFn: api.listSpaces,
  })
}

/**
 * Query a single space by ID
 */
export function useSpace(id: string) {
  return useQuery({
    queryKey: ["spaces", id],
    queryFn: () => api.getSpace(id),
    enabled: !!id,
  })
}

/**
 * Query memory count for a specific space
 */
export function useSpaceMemoryCount(spaceId: string) {
  return useQuery({
    queryKey: ["spaces", spaceId, "memoryCount"],
    queryFn: () => api.countSpaceMemories(spaceId),
    enabled: !!spaceId,
  })
}

/**
 * Mutation to create a new space
 */
export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, icon }: { name: string; icon?: string }) =>
      api.createSpace(name, icon),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}

/**
 * Mutation to update a space
 */
export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      name,
      icon,
    }: {
      id: string
      name?: string
      icon?: string
    }) => api.updateSpace(id, name, icon),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.id] })
    },
  })
}

/**
 * Mutation to delete a space
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSpace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}
