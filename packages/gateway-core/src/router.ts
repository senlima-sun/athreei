/**
 * Request Routing Logic
 *
 * Routes tool calls to the correct upstream MCP server based on
 * the prefixed tool name: {serverName}__{toolName}
 *
 * This module provides pure routing logic without side effects,
 * allowing gateway implementations to handle their own tracing
 * and event emission.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  RouterState,
  ParsedToolName,
  ToolCallValidation,
  RoutingInfo,
  Logger,
} from "./types.js";
import { findAggregatedTool } from "./aggregator.js";
import { noopLogger } from "./types.js";

/**
 * Parse a prefixed tool name into server and tool components.
 * Format: {serverName}__{toolName}
 *
 * The tool name may contain "__" itself, so we split on the first occurrence only.
 */
export function parseToolName(prefixedName: string): ParsedToolName {
  const separatorIndex = prefixedName.indexOf("__");

  if (separatorIndex === -1) {
    throw new Error(
      `Invalid tool name format: "${prefixedName}". Expected format: {serverName}__{toolName}`
    );
  }

  const serverName = prefixedName.substring(0, separatorIndex);
  const toolName = prefixedName.substring(separatorIndex + 2);

  if (!serverName || !toolName) {
    throw new Error(
      `Invalid tool name format: "${prefixedName}". Both server and tool names are required.`
    );
  }

  return { serverName, toolName };
}

/**
 * Options for routing a tool call
 */
export interface RouteToolCallOptions {
  /** Logger for debug output */
  logger?: Logger;
}

/**
 * Route a tool call to the appropriate MCP server.
 * This is the core routing logic without tracing or event emission.
 * Gateway implementations should wrap this with their own tracing.
 */
export async function routeToolCall(
  state: RouterState,
  prefixedName: string,
  args: Record<string, unknown> | undefined,
  options: RouteToolCallOptions = {}
): Promise<CallToolResult> {
  const logger = options.logger ?? noopLogger;

  // Parse the tool name
  const { serverName, toolName } = parseToolName(prefixedName);

  logger.info(`Routing tool call: ${prefixedName} -> ${serverName}/${toolName}`);

  // Find the aggregated tool to verify it exists
  const aggregatedTool = findAggregatedTool(state.aggregatedTools, prefixedName);
  if (!aggregatedTool) {
    throw new Error(`Unknown tool: "${prefixedName}"`);
  }

  // Find the connected MCP server
  const mcp = state.connectedMcps.get(serverName);
  if (!mcp) {
    throw new Error(
      `MCP server not found: "${serverName}". Available servers: ${Array.from(
        state.connectedMcps.keys()
      ).join(", ")}`
    );
  }

  // Call the tool on the upstream MCP server
  logger.debug(`Calling ${toolName} on ${mcp.config.name}`);

  const result = await mcp.client.callTool({
    name: toolName,
    arguments: args,
  });

  return result as CallToolResult;
}

/**
 * Validate that a tool exists and the server is connected.
 * This is a pure validation function without side effects.
 */
export function validateToolCall(
  state: RouterState,
  prefixedName: string
): ToolCallValidation {
  try {
    const { serverName } = parseToolName(prefixedName);

    const aggregatedTool = findAggregatedTool(state.aggregatedTools, prefixedName);
    if (!aggregatedTool) {
      return { valid: false, error: `Unknown tool: "${prefixedName}"` };
    }

    const mcp = state.connectedMcps.get(serverName);
    if (!mcp) {
      return {
        valid: false,
        error: `MCP server not connected: "${serverName}"`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get routing information for a tool without executing the call.
 */
export function getRoutingInfo(
  state: RouterState,
  prefixedName: string
): RoutingInfo | null {
  try {
    const { serverName, toolName } = parseToolName(prefixedName);
    const mcp = state.connectedMcps.get(serverName);

    if (!mcp) {
      return null;
    }

    return {
      serverName,
      toolName,
      serverConfig: mcp.config,
      isConnected: true,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a server is available for routing
 */
export function isServerAvailable(
  state: RouterState,
  serverName: string
): boolean {
  return state.connectedMcps.has(serverName);
}

/**
 * Get list of available server names
 */
export function getAvailableServers(state: RouterState): string[] {
  return Array.from(state.connectedMcps.keys());
}
