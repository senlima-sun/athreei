/**
 * Tool Aggregation Logic
 *
 * Re-exports core aggregation functionality from @athreei/gateway-core
 * with gateway-specific logging integration.
 */

// Re-export all aggregation functions from gateway-core
export {
  sanitizeName,
  createPrefixedName,
  aggregateTools,
  findAggregatedTool,
  getToolsForServer,
  getAggregationSummary,
  type AggregateToolsOptions,
} from "@athreei/gateway-core";

// The log import is used by other modules in the gateway package
// that may want to use the aggregation functions with logging
import { log } from "./logger.js";
import type { ConnectedMcp, AggregatedTool } from "./types.js";
import { aggregateTools as coreAggregateTools } from "@athreei/gateway-core";

/**
 * Aggregate tools from connected MCPs with gateway-specific logging.
 * This is a convenience wrapper that automatically uses the gateway logger.
 */
export function aggregateToolsWithLogging(mcps: ConnectedMcp[]): AggregatedTool[] {
  return coreAggregateTools(mcps, { logger: log });
}
