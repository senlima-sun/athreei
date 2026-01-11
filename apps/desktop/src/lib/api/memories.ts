/**
 * Memories API - Tauri IPC wrappers for memory operations
 */

import { invoke } from "@tauri-apps/api/core"

import type { CreateMemoryInput, Memory, TagWithCount } from "../types"

/**
 * List memories with optional filtering and pagination
 *
 * Requires vault to be unlocked.
 *
 * @param spaceId - Optional space filter
 * @param limit - Maximum number of results (default 50)
 * @param offset - Number of results to skip (default 0)
 * @returns Array of decrypted memories
 * @throws Error if vault is locked
 */
export const listMemories = (
  spaceId?: string,
  limit?: number,
  offset?: number
): Promise<Memory[]> => invoke("list_memories", { spaceId, limit, offset })

/**
 * Get a single memory by ID
 *
 * Requires vault to be unlocked.
 *
 * @param id - Memory ID
 * @returns The decrypted memory or null if not found
 * @throws Error if vault is locked
 */
export const getMemory = (id: string): Promise<Memory | null> =>
  invoke("get_memory", { id })

/**
 * Create a new memory
 *
 * Requires vault to be unlocked. Content is encrypted before storage.
 *
 * @param input - Memory creation input
 * @returns The created memory (decrypted)
 * @throws Error if vault is locked
 */
export const createMemory = (input: CreateMemoryInput): Promise<Memory> =>
  invoke("create_memory", { input })

/**
 * Search memories using full-text search
 *
 * Searches across source, source_id, metadata, and tags.
 * Requires vault to be unlocked for decryption.
 *
 * @param query - Search query
 * @param spaceId - Optional space filter
 * @returns Array of matching decrypted memories
 * @throws Error if vault is locked
 */
export const searchMemories = (
  query: string,
  spaceId?: string
): Promise<Memory[]> => invoke("search_memories", { query, spaceId })

/**
 * Delete a memory
 *
 * @param id - Memory ID to delete
 */
export const deleteMemory = (id: string): Promise<void> =>
  invoke("delete_memory", { id })

/**
 * Update memory tags
 *
 * Replaces all tags on a memory with the provided list.
 *
 * @param id - Memory ID
 * @param tags - New tag list
 */
export const updateMemoryTags = (id: string, tags: string[]): Promise<void> =>
  invoke("update_memory_tags", { id, tags })

/**
 * List all tags with usage counts
 *
 * @returns Array of tag objects with name and count
 */
export const listTags = (): Promise<TagWithCount[]> =>
  invoke<[string, number][]>("list_tags").then((results) =>
    results.map(([name, count]) => ({ name, count }))
  )

/**
 * Count all memories
 *
 * @param spaceId - Optional space filter
 * @returns Total number of memories
 */
export const countMemories = (spaceId?: string): Promise<number> =>
  invoke("count_memories", { spaceId })

/**
 * Get the oldest memory timestamp
 *
 * @param spaceId - Optional space filter
 * @returns Unix timestamp of oldest memory, or null if no memories exist
 */
export const getOldestMemoryDate = (spaceId?: string): Promise<number | null> =>
  invoke("get_oldest_memory_date", { spaceId })

/**
 * List memories for a specific date range
 *
 * @param startTimestamp - Start of date range (Unix timestamp)
 * @param endTimestamp - End of date range (Unix timestamp)
 * @param spaceId - Optional space filter
 * @param limit - Maximum number of results (default 50)
 * @param offset - Number of results to skip (default 0)
 * @returns Array of decrypted memories
 */
export const listMemoriesByDate = (
  startTimestamp: number,
  endTimestamp: number,
  spaceId?: string,
  limit?: number,
  offset?: number
): Promise<Memory[]> =>
  invoke("list_memories_by_date", {
    startTimestamp,
    endTimestamp,
    spaceId,
    limit,
    offset,
  })

/**
 * Count memories for a specific date range
 *
 * @param startTimestamp - Start of date range (Unix timestamp)
 * @param endTimestamp - End of date range (Unix timestamp)
 * @param spaceId - Optional space filter
 * @returns Number of memories in the date range
 */
export const countMemoriesByDate = (
  startTimestamp: number,
  endTimestamp: number,
  spaceId?: string
): Promise<number> =>
  invoke("count_memories_by_date", { startTimestamp, endTimestamp, spaceId })

/**
 * Input for updating a memory
 */
export interface UpdateMemoryInput {
  id: string
  space_id?: string | null
  title?: string
  summary?: string
  content?: string
  metadata?: string
}

/**
 * Update a memory
 *
 * @param input - Update input with memory ID and fields to update
 * @returns The updated memory
 */
export const updateMemory = (input: UpdateMemoryInput): Promise<Memory> =>
  invoke("update_memory", { input })

/**
 * Delete multiple memories
 *
 * @param ids - Array of memory IDs to delete
 * @returns Number of memories deleted
 */
export const deleteMemories = (ids: string[]): Promise<number> =>
  invoke("delete_memories", { ids })

/**
 * Move multiple memories to a different space
 *
 * @param ids - Array of memory IDs to move
 * @param targetSpaceId - Target space ID (null for no space)
 * @returns Number of memories moved
 */
export const moveMemories = (
  ids: string[],
  targetSpaceId: string | null
): Promise<number> => invoke("move_memories", { ids, targetSpaceId })

/**
 * Add tags to multiple memories
 *
 * @param ids - Array of memory IDs to tag
 * @param tags - Tags to add
 * @returns Number of memories tagged
 */
export const tagMemories = (ids: string[], tags: string[]): Promise<number> =>
  invoke("tag_memories", { ids, tags })

/**
 * Remove tags from multiple memories
 *
 * @param ids - Array of memory IDs to untag
 * @param tags - Tags to remove
 * @returns Number of memories untagged
 */
export const untagMemories = (ids: string[], tags: string[]): Promise<number> =>
  invoke("untag_memories", { ids, tags })
