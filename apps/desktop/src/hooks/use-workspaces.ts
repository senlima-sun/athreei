import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreateHandoffInput,
  CreateTaskInput,
  CreateWorkspaceInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  WorkspaceStatus,
} from "@/lib/types"

// =============================================================================
// Workspace Queries
// =============================================================================

/**
 * Query workspaces with optional filters
 */
export function useWorkspaces(params?: {
  spaceId?: string
  statuses?: WorkspaceStatus[]
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: queryKeys.workspaces.list(params),
    queryFn: () =>
      api.listWorkspaces(
        params?.spaceId,
        params?.statuses,
        params?.limit,
        params?.offset
      ),
    refetchInterval: 5000,
  })
}

/**
 * Query a single workspace with tasks and latest handoff
 */
export function useWorkspace(id: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => api.getWorkspace(id),
    enabled: !!id,
  })
}

/**
 * Query workspace count
 */
export function useWorkspaceCount(statuses?: WorkspaceStatus[]) {
  return useQuery({
    queryKey: queryKeys.workspaces.count(statuses),
    queryFn: () => api.countWorkspaces(statuses),
  })
}

// =============================================================================
// Workspace Mutations
// =============================================================================

/**
 * Mutation to create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => api.createWorkspace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}

/**
 * Mutation to update a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkspaceInput }) =>
      api.updateWorkspace(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.id),
      })
    },
  })
}

/**
 * Mutation to delete a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}

// =============================================================================
// Task Queries
// =============================================================================

/**
 * Query tasks for a workspace
 */
export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.list(workspaceId),
    queryFn: () => api.listTasks(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Query a single task
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => api.getTask(id),
    enabled: !!id,
  })
}

// =============================================================================
// Task Mutations
// =============================================================================

/**
 * Mutation to create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.createTask(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(variables.workspace_id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspace_id),
      })
    },
  })
}

/**
 * Mutation to update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      workspaceId: string
      input: UpdateTaskInput
    }) => api.updateTask(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(variables.workspaceId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      })
    },
  })
}

/**
 * Mutation to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; workspaceId: string }) =>
      api.deleteTask(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(variables.workspaceId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      })
    },
  })
}

/**
 * Mutation to reorder tasks
 */
export function useReorderTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId,
      taskIds,
    }: {
      workspaceId: string
      taskIds: string[]
    }) => api.reorderTasks(workspaceId, taskIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(variables.workspaceId),
      })
    },
  })
}

// =============================================================================
// Handoff Queries
// =============================================================================

/**
 * Query handoffs for a workspace
 */
export function useHandoffs(workspaceId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.handoffs.list(workspaceId, limit),
    queryFn: () => api.listHandoffs(workspaceId, limit),
    enabled: !!workspaceId,
  })
}

/**
 * Query a single handoff
 */
export function useHandoff(id: string) {
  return useQuery({
    queryKey: queryKeys.handoffs.detail(id),
    queryFn: () => api.getHandoff(id),
    enabled: !!id,
  })
}

/**
 * Query the latest handoff for a workspace
 */
export function useLatestHandoff(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.handoffs.latest(workspaceId),
    queryFn: () => api.getLatestHandoff(workspaceId),
    enabled: !!workspaceId,
  })
}

// =============================================================================
// Handoff Mutations
// =============================================================================

/**
 * Mutation to create a new handoff
 */
export function useCreateHandoff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHandoffInput) => api.createHandoff(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.handoffs.list(variables.workspace_id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.handoffs.latest(variables.workspace_id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspace_id),
      })
    },
  })
}

/**
 * Mutation to delete a handoff
 */
export function useDeleteHandoff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; workspaceId: string }) =>
      api.deleteHandoff(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.handoffs.list(variables.workspaceId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.handoffs.latest(variables.workspaceId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      })
    },
  })
}
