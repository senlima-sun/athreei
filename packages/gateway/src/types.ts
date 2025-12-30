/**
 * Gateway Type Definitions
 *
 * Core types for the athreei Gateway - an MCP aggregation proxy that
 * lets AI apps access multiple MCP servers through a single connection.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// Local Configuration Types
// =============================================================================

/**
 * Local gateway configuration file format (~/.athreei/config.json)
 */
export interface GatewayConfig {
  /** API key for authenticating with the Platform */
  apiKey: string;
  /** Endpoint name to connect to */
  endpoint: string;
  /** Platform API URL (defaults to https://athreei.com) */
  platformUrl?: string;
  /** Config sync interval in ms (defaults to 5 minutes) */
  syncInterval?: number;
}

// =============================================================================
// Platform API Response Types
// =============================================================================

/**
 * MCP server connection configuration from Platform
 */
export interface McpServerConfig {
  /** Server ID in the registry */
  id: string;
  /** Display name for the server */
  name: string;
  /** Optional description */
  description?: string;
  /** Transport type */
  transport: "stdio" | "sse" | "streamable-http";
  /** Command to execute (for stdio transport) */
  command?: string;
  /** Command arguments (for stdio transport) */
  args?: string;
  /** Server URL (for SSE/HTTP transport) */
  url?: string;
  /** Server version */
  version?: string;
  /** Server capabilities as JSON string */
  capabilities?: string;
  /** Whether the server is currently active */
  status: "active" | "inactive" | "pending";
}

/**
 * Namespace configuration from Platform API
 * Returned by GET /api/gateway/config?endpoint={name}
 */
export interface NamespaceConfig {
  /** Namespace ID */
  namespaceId: string;
  /** Namespace name */
  namespaceName: string;
  /** Namespace slug */
  namespaceSlug: string;
  /** Endpoint ID */
  endpointId: string;
  /** Endpoint name */
  endpointName: string;
  /** Organization ID */
  organizationId: string;
  /** MCP servers in this namespace */
  servers: McpServerConfig[];
  /** Config version for change detection */
  configVersion: string;
}

// =============================================================================
// Runtime Types
// =============================================================================

/**
 * A connected MCP server with its tools
 */
export interface ConnectedMcp {
  /** Server configuration */
  config: McpServerConfig;
  /** Sanitized name for tool prefixing (alphanumeric + underscore only) */
  sanitizedName: string;
  /** MCP client instance */
  client: Client;
  /** Tools exposed by this server */
  tools: Tool[];
  /** Connection timestamp */
  connectedAt: Date;
  /** Last successful heartbeat */
  lastHeartbeat?: Date;
}

/**
 * Aggregated tool with server prefix
 * Format: {serverName}__{toolName}
 */
export interface AggregatedTool extends Tool {
  /** Original tool name (without prefix) */
  originalName: string;
  /** Server that provides this tool */
  serverName: string;
}

/**
 * Parsed prefixed tool name
 */
export interface ParsedToolName {
  /** Server name portion */
  serverName: string;
  /** Original tool name */
  toolName: string;
}

// =============================================================================
// Trace Types
// =============================================================================

/**
 * Tool call trace for monitoring and debugging
 */
export interface ToolCallTrace {
  /** Unique trace ID */
  traceId: string;
  /** Aggregated tool name that was called */
  aggregatedToolName: string;
  /** Parsed server name */
  serverName: string;
  /** Original tool name */
  toolName: string;
  /** Call arguments */
  arguments: unknown;
  /** Call result (on success) */
  result?: unknown;
  /** Error message (on failure) */
  error?: string;
  /** Call start timestamp */
  startedAt: Date;
  /** Call end timestamp */
  endedAt?: Date;
  /** Duration in milliseconds */
  durationMs?: number;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Gateway lifecycle events
 */
export type GatewayEvent =
  | { type: "config_loaded"; config: GatewayConfig }
  | { type: "namespace_synced"; namespace: NamespaceConfig }
  | { type: "server_connected"; server: ConnectedMcp }
  | { type: "server_disconnected"; serverName: string; reason: string }
  | { type: "tools_aggregated"; count: number }
  | { type: "tool_call"; trace: ToolCallTrace }
  | { type: "error"; message: string; details?: unknown };

/**
 * Event handler callback
 */
export type GatewayEventHandler = (event: GatewayEvent) => void;
