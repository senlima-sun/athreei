/**
 * Gateway Core
 *
 * Shared gateway logic for MCP server aggregation and request routing.
 * Used by both the local gateway (@athreei/gateway) and cloud gateway
 * (@athreei/gateway-cloud) implementations.
 */

// Re-export types
export type {
  McpServerConfig,
  ConnectedMcp,
  AggregatedTool,
  ParsedToolName,
  RouterState,
  ToolCallValidation,
  RoutingInfo,
  Logger,
} from "./types.js"

export { noopLogger } from "./types.js"

// Re-export aggregator functions
export {
  sanitizeName,
  createPrefixedName,
  aggregateTools,
  findAggregatedTool,
  getToolsForServer,
  getAggregationSummary,
  type AggregateToolsOptions,
} from "./aggregator.js"

// Re-export router functions
export {
  parseToolName,
  routeToolCall,
  validateToolCall,
  getRoutingInfo,
  isServerAvailable,
  getAvailableServers,
  type RouteToolCallOptions,
} from "./router.js"
