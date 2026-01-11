/**
 * MCP API - Tauri IPC wrappers for MCP server operations
 */

import { invoke } from "@tauri-apps/api/core"

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
