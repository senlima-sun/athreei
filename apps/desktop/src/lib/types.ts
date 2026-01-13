/**
 * Frontend types for aiii Desktop
 *
 * These types mirror the Rust backend structures for type-safe IPC communication.
 */

/**
 * A space represents a logical grouping of memories
 */
export interface Space {
  id: string
  name: string
  icon: string | null
  source_rules: string | null
  created_at: number
  updated_at: number
}

/**
 * A decrypted memory ready for display
 *
 * All encrypted fields (title, summary, content) are decrypted by the backend
 * before being sent to the frontend.
 */
export interface Memory {
  id: string
  space_id: string | null
  source: string
  source_id: string | null
  title: string | null
  summary: string | null
  content: string | null
  metadata: string | null
  tags: string[]
  created_at: number
  updated_at: number
}

/**
 * Input for creating a new memory
 */
export interface CreateMemoryInput {
  space_id?: string
  source: string
  source_id?: string
  title?: string
  summary?: string
  content?: string
  metadata?: string
  tags?: string[]
}

/**
 * Tag with usage count
 */
export interface TagWithCount {
  name: string
  count: number
}

/**
 * Vault status
 */
export interface VaultStatus {
  isSetup: boolean
  isUnlocked: boolean
}

// =============================================================================
// Workspace & Handoff Types
// =============================================================================

/**
 * Workspace status
 */
export type WorkspaceStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "paused"
  | "completed"
  | "abandoned"
  | "archived"

/**
 * Task status
 */
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "deferred"

/**
 * A workspace represents a goal-oriented container for AI task tracking
 */
export interface Workspace {
  id: string
  name: string
  description: string | null
  space_id: string | null
  goal: string
  success_criteria: string | null
  status: WorkspaceStatus
  blocker: string | null
  context: string | null
  created_at: number
  updated_at: number
  completed_at: number | null
}

/**
 * A task represents an individual work item within a workspace
 */
export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: TaskStatus
  blocker: string | null
  is_next_action: boolean
  position: number
  created_at: number
  updated_at: number
  completed_at: number | null
}

/**
 * A handoff captures session state for seamless resumption
 */
export interface Handoff {
  id: string
  workspace_id: string
  session_id: string | null
  progress_summary: string
  current_state: string
  next_steps: string | null
  blockers: string | null
  what_worked: string | null
  what_failed: string | null
  key_decisions: string | null
  created_at: number
}

/**
 * A workspace with its associated tasks and latest handoff
 */
export interface WorkspaceWithTasks {
  id: string
  name: string
  description: string | null
  space_id: string | null
  goal: string
  success_criteria: string | null
  status: WorkspaceStatus
  blocker: string | null
  context: string | null
  created_at: number
  updated_at: number
  completed_at: number | null
  tasks: Task[]
  latest_handoff: Handoff | null
}

/**
 * Input for creating a new workspace
 */
export interface CreateWorkspaceInput {
  name: string
  goal: string
  space_id?: string
  description?: string
  success_criteria?: string
}

/**
 * Input for updating a workspace
 */
export interface UpdateWorkspaceInput {
  name?: string
  description?: string
  goal?: string
  success_criteria?: string
  status?: WorkspaceStatus
  blocker?: string
  context?: string
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  workspace_id: string
  title: string
  description?: string
  is_next_action?: boolean
}

/**
 * Input for updating a task
 */
export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  blocker?: string
  is_next_action?: boolean
}

/**
 * Input for creating a handoff
 */
export interface CreateHandoffInput {
  workspace_id: string
  progress_summary: string
  current_state: string
  next_steps?: string
  blockers?: string
  what_worked?: string
  what_failed?: string
  key_decisions?: string
}

/**
 * Filters for listing workspaces
 */
export interface ListWorkspacesFilter {
  space_id?: string
  statuses?: WorkspaceStatus[]
  limit?: number
  offset?: number
}
