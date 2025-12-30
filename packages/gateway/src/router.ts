/**
 * Request Routing
 *
 * Routes tool calls to the correct upstream MCP server based on
 * the prefixed tool name: {serverName}__{toolName}
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { GatewayState } from "./server.js";
import type { ParsedToolName, ToolCallTrace } from "./types.js";
import { sanitizeName, findAggregatedTool } from "./aggregator.js";
import { log } from "./logger.js";

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
 * Route a tool call to the appropriate MCP server
 */
export async function routeToolCall(
  state: GatewayState,
  prefixedName: string,
  args: Record<string, unknown> | undefined
): Promise<CallToolResult> {
  const startTime = Date.now();
  const traceId = crypto.randomUUID();

  // Parse the tool name
  const { serverName, toolName } = parseToolName(prefixedName);

  log.info(`Routing tool call: ${prefixedName} → ${serverName}/${toolName}`);

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

  // Create trace record
  const requestId = crypto.randomUUID();
  const trace: ToolCallTrace = {
    traceId,
    requestId,
    aggregatedToolName: prefixedName,
    serverName,
    toolName,
    arguments: args,
    startedAt: new Date(),
    status: "success", // Will be updated on error
  };

  try {
    // Call the tool on the upstream MCP server
    log.debug(`Calling ${toolName} on ${mcp.config.name}`);

    const result = await mcp.client.callTool({
      name: toolName,
      arguments: args,
    });

    // Update trace with success
    trace.endedAt = new Date();
    trace.durationMs = Date.now() - startTime;
    trace.result = result;

    log.info(
      `Tool call completed: ${prefixedName} (${trace.durationMs}ms)`
    );

    // Emit trace event
    emitTraceEvent(state, trace);

    return result as CallToolResult;
  } catch (error) {
    // Update trace with error
    trace.endedAt = new Date();
    trace.durationMs = Date.now() - startTime;
    trace.error = error instanceof Error ? error.message : String(error);
    trace.status = "error";

    log.error(`Tool call failed: ${prefixedName}`, error);

    // Emit trace event
    emitTraceEvent(state, trace);

    throw error;
  }
}

/**
 * Emit a tool call trace event to all handlers
 */
function emitTraceEvent(state: GatewayState, trace: ToolCallTrace): void {
  for (const handler of state.eventHandlers) {
    handler({ type: "tool_call", trace });
  }
}

/**
 * Validate that a tool exists and the server is connected
 */
export function validateToolCall(
  state: GatewayState,
  prefixedName: string
): { valid: true } | { valid: false; error: string } {
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
 * Get routing information for a tool
 */
export function getRoutingInfo(
  state: GatewayState,
  prefixedName: string
): {
  serverName: string;
  toolName: string;
  serverConfig: import("./types.js").McpServerConfig;
  isConnected: boolean;
} | null {
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
