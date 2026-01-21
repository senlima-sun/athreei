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
  TimeoutConfig,
} from "@athreei/gateway-core"

export {
  noopLogger,
  ToolCallTimeoutError,
  RateLimitExceededError,
  RateLimiter,
  TIMEOUT,
} from "@athreei/gateway-core"

export type { RateLimiterConfig } from "@athreei/gateway-core"

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
  /** Skills to expose to AI clients */
  skills?: SkillConfig[]
  /** Rules to apply to AI interactions */
  rules?: RuleConfig[]
  /** Hooks for tool call interception */
  hooks?: HookConfig[]
  /** Timeout configuration for tool calls */
  timeout?: import("@athreei/gateway-core").TimeoutConfig
}

/**
 * Skill configuration for AI capabilities
 */
export interface SkillConfig {
  /** Unique skill ID */
  id: string
  /** Skill name */
  name: string
  /** Optional description */
  description?: string | null
  /** Markdown content defining the skill */
  content: string
  /** Tags for categorization */
  tags?: string[]
  /** Version number */
  version?: number
  /** Whether the skill is enabled */
  isEnabled?: boolean
}

/**
 * Rule configuration for AI behavior guidelines
 */
export interface RuleConfig {
  /** Unique rule ID */
  id: string
  /** Rule name */
  name: string
  /** Optional description */
  description?: string | null
  /** Markdown content defining the rule */
  content: string
  /** Priority for ordering (higher = applied first) */
  priority: number
  /** Scope of the rule */
  scope: "global" | "namespace" | "endpoint"
  /** Whether the rule is enabled */
  isEnabled?: boolean
}

/**
 * Hook handler types
 */
export type HookHandler =
  | { type: "skill"; skillRef: string }
  | { type: "script"; command: string; args?: string[] }
  | { type: "rule"; action: "block" | "allow" | "ask"; message?: string }

/**
 * Hook configuration for tool call interception
 */
export interface HookConfig {
  /** Unique hook ID */
  id: string
  /** Event that triggers this hook */
  event: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "Stop"
  /** Optional regex pattern to match tool names */
  toolNamePattern?: string
  /** Handler configuration */
  handler: HookHandler
  /** Priority for ordering (higher = executed first) */
  priority?: number
  /** Whether the hook is enabled */
  isEnabled?: boolean
  /** Source plugin ID (if from plugin) */
  sourcePluginId?: string
}

/**
 * Context provided to PreToolUse hooks
 */
export interface PreToolUseContext {
  /** Trace ID for correlation */
  traceId: string
  /** Prefixed tool name (serverName__toolName) */
  toolName: string
  /** Server name parsed from prefixed tool name */
  serverName: string
  /** Tool call arguments */
  arguments: Record<string, unknown> | undefined
  /** Timestamp when the hook was triggered */
  timestamp: number
}

/**
 * Context provided to PostToolUse hooks
 */
export interface PostToolUseContext {
  /** Trace ID for correlation */
  traceId: string
  /** Prefixed tool name (serverName__toolName) */
  toolName: string
  /** Server name parsed from prefixed tool name */
  serverName: string
  /** Tool call arguments */
  arguments: Record<string, unknown> | undefined
  /** Tool call result */
  result: import("@modelcontextprotocol/sdk/types.js").CallToolResult
  /** Duration in milliseconds */
  durationMs: number
  /** Timestamp when the hook was triggered */
  timestamp: number
}

/**
 * Hook evaluation decision
 */
export interface HookDecision {
  /** Action to take */
  action: "allow" | "block" | "modify"
  /** Optional reason for the decision */
  reason?: string
  /** Modified arguments (only used with action: "modify") */
  modifiedArgs?: Record<string, unknown>
}

/**
 * Async event handler that can return hook decisions
 */
export type AsyncGatewayEventHandler = (
  event: GatewayEvent
) => Promise<HookDecision | void> | HookDecision | void

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
  /** Skills assigned to this namespace */
  skills?: SkillConfig[]
  /** Rules assigned to this namespace */
  rules?: RuleConfig[]
  /** Hooks assigned to this namespace */
  hooks?: HookConfig[]
  /** Config version for change detection */
  configVersion: string
}

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
  /** IDs of skills that were active during this trace */
  activeSkillIds?: string[]
  /** IDs of rules that were active during this trace */
  activeRuleIds?: string[]
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
  /** IDs of skills that were active during this trace (unencrypted for filtering) */
  activeSkillIds?: string[]
  /** IDs of rules that were active during this trace (unencrypted for filtering) */
  activeRuleIds?: string[]
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
