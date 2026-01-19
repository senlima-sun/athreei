/**
 * Request Routing
 *
 * Routes tool calls to the correct upstream MCP server based on
 * the prefixed tool name: {serverName}__{toolName}
 *
 * This module wraps gateway-core routing with gateway-specific
 * tracing and event emission.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import type { GatewayState } from "./server"
import type { ToolCallTrace, McpServerConfig } from "./types"
import { log } from "./logger"

// Re-export core routing functions from gateway-core
export {
  parseToolName,
  validateToolCall,
  getRoutingInfo,
  isServerAvailable,
  getAvailableServers,
  type RouteToolCallOptions,
} from "@athreei/gateway-core"

import {
  parseToolName,
  findAggregatedTool,
  routeToolCall as coreRouteToolCall,
} from "@athreei/gateway-core"

/**
 * Route a tool call to the appropriate MCP server with tracing.
 * This wraps the core routing logic with gateway-specific tracing and events.
 */
export async function routeToolCall(
  state: GatewayState,
  prefixedName: string,
  args: Record<string, unknown> | undefined
): Promise<CallToolResult> {
  const startTime = Date.now()
  const traceId = crypto.randomUUID()

  const { serverName, toolName } = parseToolName(prefixedName)

  log.info(`Routing tool call: ${prefixedName} -> ${serverName}/${toolName}`)

  const aggregatedTool = findAggregatedTool(state.aggregatedTools, prefixedName)
  if (!aggregatedTool) {
    throw new Error(`Unknown tool: "${prefixedName}"`)
  }

  const mcp = state.connectedMcps.get(serverName)
  if (!mcp) {
    throw new Error(
      `MCP server not found: "${serverName}". Available servers: ${Array.from(
        state.connectedMcps.keys()
      ).join(", ")}`
    )
  }

  const requestId = crypto.randomUUID()
  const trace: ToolCallTrace = {
    traceId,
    requestId,
    aggregatedToolName: prefixedName,
    serverName,
    toolName,
    arguments: args,
    startedAt: new Date(),
    status: "success", // Will be updated on error
  }

  try {
    log.debug(`Calling ${toolName} on ${mcp.config.name}`)

    const result = await coreRouteToolCall(state, prefixedName, args, {
      logger: log,
    })

    trace.endedAt = new Date()
    trace.durationMs = Date.now() - startTime
    trace.result = result

    log.info(`Tool call completed: ${prefixedName} (${trace.durationMs}ms)`)

    emitTraceEvent(state, trace)

    return result
  } catch (error) {
    trace.endedAt = new Date()
    trace.durationMs = Date.now() - startTime
    trace.error = error instanceof Error ? error.message : String(error)
    trace.status = "error"

    log.error(`Tool call failed: ${prefixedName}`, error)

    emitTraceEvent(state, trace)

    throw error
  }
}

/**
 * Emit a tool call trace event to all handlers
 */
function emitTraceEvent(state: GatewayState, trace: ToolCallTrace): void {
  for (const handler of state.eventHandlers) {
    handler({ type: "tool_call", trace })
  }
}

/**
 * Re-export getRoutingInfo with proper typing for gateway
 */
export function getGatewayRoutingInfo(
  state: GatewayState,
  prefixedName: string
): {
  serverName: string
  toolName: string
  serverConfig: McpServerConfig
  isConnected: boolean
} | null {
  try {
    const { serverName, toolName } = parseToolName(prefixedName)
    const mcp = state.connectedMcps.get(serverName)

    if (!mcp) {
      return null
    }

    return {
      serverName,
      toolName,
      serverConfig: mcp.config,
      isConnected: true,
    }
  } catch {
    return null
  }
}
