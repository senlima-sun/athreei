/**
 * Gateway Core Type Definitions
 *
 * Shared types used by both local and cloud gateway implementations
 * for MCP server aggregation and request routing.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

// =============================================================================
// MCP Server Configuration Types
// =============================================================================

/**
 * MCP server connection configuration
 */
export interface McpServerConfig {
  /** Server ID in the registry */
  id: string
  /** Display name for the server */
  name: string
  /** Optional description */
  description?: string
  /** Transport type */
  transport: "stdio" | "sse" | "streamable-http"
  /** Command to execute (for stdio transport) */
  command?: string
  /** Command arguments (for stdio transport) */
  args?: string
  /** Server URL (for SSE/HTTP transport) */
  url?: string
  /** Server version */
  version?: string
  /** Server capabilities as JSON string */
  capabilities?: string
  /** Whether the server is currently active */
  status: "active" | "inactive" | "pending"
}

// =============================================================================
// Connected MCP Types
// =============================================================================

/**
 * A connected MCP server with its tools
 */
export interface ConnectedMcp {
  /** Server configuration */
  config: McpServerConfig
  /** Sanitized name for tool prefixing (alphanumeric + underscore only) */
  sanitizedName: string
  /** MCP client instance */
  client: Client
  /** Tools exposed by this server */
  tools: Tool[]
  /** Connection timestamp */
  connectedAt: Date
  /** Last successful heartbeat */
  lastHeartbeat?: Date
}

// =============================================================================
// Aggregated Tool Types
// =============================================================================

/**
 * Aggregated tool with server prefix
 * Format: {serverName}__{toolName}
 */
export interface AggregatedTool extends Tool {
  /** Original tool name (without prefix) */
  originalName: string
  /** Server that provides this tool */
  serverName: string
}

/**
 * Parsed prefixed tool name
 */
export interface ParsedToolName {
  /** Server name portion */
  serverName: string
  /** Original tool name */
  toolName: string
}

// =============================================================================
// Router Types
// =============================================================================

/**
 * Minimal state interface required for routing operations.
 * Gateway implementations should extend this with additional state.
 */
export interface RouterState {
  /** Map of connected MCP servers by sanitized name */
  connectedMcps: Map<string, ConnectedMcp>
  /** List of aggregated tools from all servers */
  aggregatedTools: AggregatedTool[]
}

/**
 * Result of validating a tool call
 */
export type ToolCallValidation =
  | { valid: true }
  | { valid: false; error: string }

/**
 * Routing information for a tool
 */
export interface RoutingInfo {
  /** Parsed server name */
  serverName: string
  /** Original tool name */
  toolName: string
  /** Server configuration */
  serverConfig: McpServerConfig
  /** Whether the server is connected */
  isConnected: boolean
}

// =============================================================================
// Logger Interface
// =============================================================================

/**
 * Logger interface for gateway-core functions.
 * Allows consumers to provide their own logging implementation.
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/**
 * Default no-op logger for when no logger is provided
 */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
