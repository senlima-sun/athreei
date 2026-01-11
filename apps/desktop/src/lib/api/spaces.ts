/**
 * Spaces API - Tauri IPC wrappers for space operations
 */

import { invoke } from "@tauri-apps/api/core"

import type { Space } from "../types"

/**
 * List all spaces ordered by name
 *
 * @returns Array of spaces
 */
export const listSpaces = (): Promise<Space[]> => invoke("list_spaces")

/**
 * Get a space by ID
 *
 * @param id - The space ID
 * @returns The space or null if not found
 */
export const getSpace = (id: string): Promise<Space | null> =>
  invoke("get_space", { id })

/**
 * Create a new space
 *
 * @param name - Space name
 * @param icon - Optional icon (emoji or identifier)
 * @returns The created space
 */
export const createSpace = (name: string, icon?: string): Promise<Space> =>
  invoke("create_space", { name, icon })

/**
 * Update an existing space
 *
 * @param id - Space ID to update
 * @param name - New name (optional)
 * @param icon - New icon (optional)
 * @returns The updated space
 */
export const updateSpace = (
  id: string,
  name?: string,
  icon?: string
): Promise<Space> => invoke("update_space", { id, name, icon })

/**
 * Delete a space
 *
 * @param id - Space ID to delete
 */
export const deleteSpace = (id: string): Promise<void> =>
  invoke("delete_space", { id })

/**
 * Count memories in a space
 *
 * @param spaceId - Space ID
 * @returns Number of memories in the space
 */
export const countSpaceMemories = (spaceId: string): Promise<number> =>
  invoke("count_space_memories", { spaceId })
