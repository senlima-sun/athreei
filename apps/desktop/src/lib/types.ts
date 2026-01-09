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
