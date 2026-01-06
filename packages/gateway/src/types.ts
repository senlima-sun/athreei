/**
 * Gateway Type Definitions
 *
 * This file re-exports core types from @athreei/gateway-core and
 * defines gateway-specific types for tracing, configuration, and events.
 */

// Re-export core types
export type {
  OAuthConfig,
  McpServerConfig,
  ConnectedMcp,
  AggregatedTool,
  ParsedToolName,
  RouterState,
  ToolCallValidation,
  RoutingInfo,
  Logger,
} from "@athreei/gateway-core"

export { noopLogger } from "@athreei/gateway-core"

// =============================================================================
// Local Configuration Types
// =============================================================================

/**
 * Local gateway configuration file format (~/.athreei/config.json)
 */
export interface GatewayConfig {
  /** API key for authenticating with the Platform */
  apiKey: string
  /** Endpoint name to connect to */
  endpoint: string
  /** Platform API URL (defaults to https://athreei.com) */
  platformUrl?: string
  /** Config sync interval in ms (defaults to 5 minutes) */
  syncInterval?: number
}

/**
 * Local-only configuration (no Platform sync required)
 * Used with --local flag
 */
export interface LocalConfig {
  /** MCP servers to connect to */
  servers: import("@athreei/gateway-core").McpServerConfig[]
}

// =============================================================================
// Platform API Response Types
// =============================================================================

/**
 * Namespace configuration from Platform API
 * Returned by GET /api/gateway/config?endpoint={name}
 */
export interface NamespaceConfig {
  /** Namespace ID */
  namespaceId: string
  /** Namespace name */
  namespaceName: string
  /** Namespace slug */
  namespaceSlug: string
  /** Endpoint ID */
  endpointId: string
  /** Endpoint name */
  endpointName: string
  /** Organization ID */
  organizationId: string
  /** MCP servers in this namespace */
  servers: import("@athreei/gateway-core").McpServerConfig[]
  /** Config version for change detection */
  configVersion: string
}

// =============================================================================
// Trace Types
// =============================================================================

/**
 * Tool call trace for monitoring and debugging
 */
export interface ToolCallTrace {
  /** Unique trace ID */
  traceId: string
  /** Request ID for correlation (used for encryption) */
  requestId: string
  /** Aggregated tool name that was called */
  aggregatedToolName: string
  /** Parsed server name */
  serverName: string
  /** Original tool name */
  toolName: string
  /** Call arguments */
  arguments: unknown
  /** Call result (on success) */
  result?: unknown
  /** Error message (on failure) */
  error?: string
  /** Call start timestamp */
  startedAt: Date
  /** Call end timestamp */
  endedAt?: Date
  /** Duration in milliseconds */
  durationMs?: number
  /** Status of the trace */
  status: "success" | "error"
}

/**
 * Trace with encrypted payload (for sending to Platform)
 */
export interface EncryptedToolCallTrace {
  /** Unique trace ID */
  traceId: string
  /** Request ID for correlation */
  requestId: string
  /** Aggregated tool name (unencrypted for routing/filtering) */
  aggregatedToolName: string
  /** Server name (unencrypted for routing/filtering) */
  serverName: string
  /** Original tool name (unencrypted for routing/filtering) */
  toolName: string
  /** Call start timestamp */
  startedAt: Date
  /** Call end timestamp */
  endedAt?: Date
  /** Duration in milliseconds */
  durationMs?: number
  /** Status of the trace */
  status: "success" | "error"
  /** Encrypted payload containing arguments, result, and error */
  encryptedPayload: {
    /** Base64-encoded nonce */
    nonce: string
    /** Base64-encoded ciphertext */
    ciphertext: string
    /** Key version used for encryption */
    keyVersion: number
    /** Encryption algorithm */
    algorithm: "xchacha20poly1305"
  }
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
  | {
      type: "server_connected"
      server: import("@athreei/gateway-core").ConnectedMcp
    }
  | { type: "server_disconnected"; serverName: string; reason: string }
  | { type: "tools_aggregated"; count: number }
  | { type: "tool_call"; trace: ToolCallTrace }
  | { type: "error"; message: string; details?: unknown }

/**
 * Event handler callback
 */
export type GatewayEventHandler = (event: GatewayEvent) => void
