/**
 * Workspaces API - Tauri IPC wrappers for workspace, task, and handoff operations
 */

import { invoke } from "@tauri-apps/api/core"

import type {
  CreateHandoffInput,
  CreateTaskInput,
  CreateWorkspaceInput,
  Handoff,
  Task,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceStatus,
  WorkspaceWithTasks,
} from "../types"

// =============================================================================
// Workspace Operations
// =============================================================================

/**
 * List workspaces with optional filters
 *
 * @param spaceId - Optional space ID to filter by
 * @param statuses - Optional status filter
 * @param limit - Max number of results
 * @param offset - Pagination offset
 * @returns Array of workspaces
 */
export const listWorkspaces = (
  spaceId?: string,
  statuses?: WorkspaceStatus[],
  limit?: number,
  offset?: number
): Promise<Workspace[]> =>
  invoke("list_workspaces", {
    spaceId,
    statuses,
    limit,
    offset,
  })

/**
 * Get a workspace by ID with tasks and latest handoff
 *
 * @param id - The workspace ID
 * @returns The workspace with tasks and handoff, or null if not found
 */
export const getWorkspace = (id: string): Promise<WorkspaceWithTasks | null> =>
  invoke("get_workspace", { id })

/**
 * Create a new workspace
 *
 * @param input - Workspace creation input
 * @returns The created workspace
 */
export const createWorkspace = (
  input: CreateWorkspaceInput
): Promise<Workspace> =>
  invoke("create_workspace", {
    name: input.name,
    goal: input.goal,
    spaceId: input.space_id,
    description: input.description,
    successCriteria: input.success_criteria,
  })

/**
 * Update an existing workspace
 *
 * @param id - Workspace ID to update
 * @param input - Update fields
 * @returns The updated workspace
 */
export const updateWorkspace = (
  id: string,
  input: UpdateWorkspaceInput
): Promise<Workspace> =>
  invoke("update_workspace", {
    id,
    name: input.name,
    description: input.description,
    goal: input.goal,
    successCriteria: input.success_criteria,
    status: input.status,
    blocker: input.blocker,
    context: input.context,
  })

/**
 * Delete a workspace
 *
 * @param id - Workspace ID to delete
 */
export const deleteWorkspace = (id: string): Promise<void> =>
  invoke("delete_workspace", { id })

/**
 * Count workspaces with optional status filter
 *
 * @param statuses - Optional status filter
 * @returns Number of workspaces
 */
export const countWorkspaces = (
  statuses?: WorkspaceStatus[]
): Promise<number> => invoke("count_workspaces", { statuses })

// =============================================================================
// Task Operations
// =============================================================================

/**
 * List tasks for a workspace
 *
 * @param workspaceId - Workspace ID
 * @returns Array of tasks ordered by position
 */
export const listTasks = (workspaceId: string): Promise<Task[]> =>
  invoke("list_tasks", { workspaceId })

/**
 * Get a task by ID
 *
 * @param id - Task ID
 * @returns The task or null if not found
 */
export const getTask = (id: string): Promise<Task | null> =>
  invoke("get_task", { id })

/**
 * Create a new task
 *
 * @param input - Task creation input
 * @returns The created task
 */
export const createTask = (input: CreateTaskInput): Promise<Task> =>
  invoke("create_task", {
    workspaceId: input.workspace_id,
    title: input.title,
    description: input.description,
    isNextAction: input.is_next_action,
  })

/**
 * Update a task
 *
 * @param id - Task ID to update
 * @param input - Update fields
 * @returns The updated task
 */
export const updateTask = (id: string, input: UpdateTaskInput): Promise<Task> =>
  invoke("update_task", {
    id,
    title: input.title,
    description: input.description,
    status: input.status,
    blocker: input.blocker,
    isNextAction: input.is_next_action,
  })

/**
 * Delete a task
 *
 * @param id - Task ID to delete
 */
export const deleteTask = (id: string): Promise<void> =>
  invoke("delete_task", { id })

/**
 * Reorder tasks within a workspace
 *
 * @param workspaceId - Workspace ID
 * @param taskIds - Ordered array of task IDs
 */
export const reorderTasks = (
  workspaceId: string,
  taskIds: string[]
): Promise<void> => invoke("reorder_tasks", { workspaceId, taskIds })

// =============================================================================
// Handoff Operations
// =============================================================================

/**
 * List handoffs for a workspace
 *
 * @param workspaceId - Workspace ID
 * @param limit - Max number of results (default: 10)
 * @returns Array of handoffs ordered by created_at DESC
 */
export const listHandoffs = (
  workspaceId: string,
  limit?: number
): Promise<Handoff[]> => invoke("list_handoffs", { workspaceId, limit })

/**
 * Get a handoff by ID
 *
 * @param id - Handoff ID
 * @returns The handoff or null if not found
 */
export const getHandoff = (id: string): Promise<Handoff | null> =>
  invoke("get_handoff", { id })

/**
 * Create a new handoff
 *
 * @param input - Handoff creation input
 * @returns The created handoff
 */
export const createHandoff = (input: CreateHandoffInput): Promise<Handoff> =>
  invoke("create_handoff", {
    workspaceId: input.workspace_id,
    progressSummary: input.progress_summary,
    currentState: input.current_state,
    nextSteps: input.next_steps,
    blockers: input.blockers,
    whatWorked: input.what_worked,
    whatFailed: input.what_failed,
    keyDecisions: input.key_decisions,
  })

/**
 * Delete a handoff
 *
 * @param id - Handoff ID to delete
 */
export const deleteHandoff = (id: string): Promise<void> =>
  invoke("delete_handoff", { id })

/**
 * Get the latest handoff for a workspace
 *
 * @param workspaceId - Workspace ID
 * @returns The latest handoff or null if none exists
 */
export const getLatestHandoff = (
  workspaceId: string
): Promise<Handoff | null> => invoke("get_latest_handoff", { workspaceId })
