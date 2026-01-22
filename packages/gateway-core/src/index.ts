/**
 * Gateway Core
 *
 * Shared gateway logic for MCP server aggregation and request routing.
 * Used by both the local gateway (@athreei/gateway) and cloud gateway
 * (@athreei/gateway-cloud) implementations.
 */

// Re-export types
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
} from "./types"

export { noopLogger, ToolCallTimeoutError } from "./types"

// Re-export constants
export { TIMEOUT, RATE_LIMIT } from "./constants"

// Re-export aggregator functions
export {
  sanitizeName,
  createPrefixedName,
  aggregateTools,
  findAggregatedTool,
  getToolsForServer,
  getAggregationSummary,
  type AggregateToolsOptions,
} from "./aggregator"

// Re-export router functions
export {
  parseToolName,
  routeToolCall,
  validateToolCall,
  getRoutingInfo,
  isServerAvailable,
  getAvailableServers,
  type RouteToolCallOptions,
} from "./router"

// Transport types
export type {
  TransportType,
  TransportConfig,
  StdioTransportConfig,
  StreamableHttpTransportConfig,
  McpMessage,
  TransportStatus,
  TransportConnection,
  TransportEvents,
} from "./types/transports"

// Transport managers
export { StdioTransportManager } from "./transports/stdio-manager"
export { StreamableHttpTransportManager } from "./transports/streamable-http-manager"
export {
  TransportFactory,
  transportFactory,
} from "./transports/transport-factory"
export { ProcessPool, type PoolConfig } from "./transports/process-pool"
export {
  ConnectionHealthChecker,
  type HealthCheckResult,
  type HealthCheckConfig,
} from "./transports/health-check"

// Routing
export {
  NamespaceRouter,
  type Tool as NamespaceTool,
  type NamespaceRoute,
  type NamespacedTool,
} from "./routing/namespace-router"

// Rate limiting
export {
  RateLimiter,
  RateLimitExceededError,
  type RateLimiterConfig,
  type RateLimitResult,
} from "./rate-limiter"
