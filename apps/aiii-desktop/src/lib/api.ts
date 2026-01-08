/**
 * Tauri IPC API for aiii Desktop
 *
 * Type-safe wrappers around Tauri invoke commands.
 */

import { invoke } from "@tauri-apps/api/core"

import type { CreateMemoryInput, Memory, Space, TagWithCount } from "./types"

// ==================== Vault API ====================

/**
 * Unlock the vault with a passphrase
 *
 * @param passphrase - The user's passphrase
 * @throws Error if unlock fails
 */
export const vaultUnlock = (passphrase: string): Promise<void> =>
  invoke("vault_unlock", { passphrase })

/**
 * Lock the vault, clearing the encryption key from memory
 */
export const vaultLock = (): Promise<void> => invoke("vault_lock")

/**
 * Check if the vault is currently unlocked
 *
 * @returns true if unlocked, false if locked
 */
export const vaultStatus = (): Promise<boolean> => invoke("vault_status")

/**
 * Set up a new vault with a passphrase
 *
 * Should only be called when no vault exists yet.
 *
 * @param passphrase - The user's chosen passphrase
 * @throws Error if vault is already set up
 */
export const vaultSetup = (passphrase: string): Promise<void> =>
  invoke("vault_setup", { passphrase })

/**
 * Check if a vault has been set up
 *
 * @returns true if vault exists, false otherwise
 */
export const vaultIsSetup = (): Promise<boolean> => invoke("vault_is_setup")

// ==================== Spaces API ====================

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

// ==================== Memories API ====================

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
 * @returns Array of [tag name, count] tuples
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

// ==================== MCP Server API ====================

/**
 * MCP server status
 */
export interface McpStatus {
  /** Whether the server is currently running */
  running: boolean
  /** Port number if using HTTP transport (None for stdio) */
  port: number | null
  /** Transport type being used */
  transport: string
}

/**
 * Start the MCP server
 *
 * Starts the MCP server using stdio transport, making it available
 * to AI applications like Claude Desktop.
 *
 * @throws Error if server is already running or vault is locked
 */
export const mcpStart = (): Promise<void> => invoke("mcp_start")

/**
 * Stop the MCP server
 *
 * Gracefully stops the running MCP server.
 *
 * @throws Error if server is not running
 */
export const mcpStop = (): Promise<void> => invoke("mcp_stop")

/**
 * Get the MCP server status
 *
 * @returns Current server status including running state and transport
 */
export const mcpStatus = (): Promise<McpStatus> => invoke("mcp_status")
