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
import type {
  ToolCallTrace,
  McpServerConfig,
  PreToolUseContext,
  PostToolUseContext,
} from "./types"
import { ToolCallTimeoutError, RateLimitExceededError, TIMEOUT } from "./types"
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
 * Route a tool call to the appropriate MCP server with tracing and hooks.
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

  const preHookContext: PreToolUseContext = {
    traceId,
    toolName: prefixedName,
    serverName,
    arguments: args,
    timestamp: startTime,
  }

  let hookDecision
  try {
    hookDecision = await state.hookExecutor.evaluatePreToolUse(preHookContext)
  } catch (hookError) {
    log.error(`PreToolUse hook error for ${prefixedName}`, { error: hookError })

    const requestId = crypto.randomUUID()
    const trace: ToolCallTrace = {
      traceId,
      requestId,
      aggregatedToolName: prefixedName,
      serverName,
      toolName,
      arguments: args,
      startedAt: new Date(),
      endedAt: new Date(),
      durationMs: 0,
      status: "error",
      error: `Hook evaluation failed: ${hookError instanceof Error ? hookError.message : String(hookError)}`,
    }
    emitTraceEvent(state, trace)

    throw hookError
  }

  if (hookDecision.action === "block") {
    log.warn(`Tool call blocked by hook: ${prefixedName}`, {
      reason: hookDecision.reason,
    })

    const requestId = crypto.randomUUID()
    const trace: ToolCallTrace = {
      traceId,
      requestId,
      aggregatedToolName: prefixedName,
      serverName,
      toolName,
      arguments: args,
      startedAt: new Date(),
      endedAt: new Date(),
      durationMs: 0,
      status: "error",
      error: `Blocked by hook: ${hookDecision.reason || "Policy violation"}`,
    }
    emitTraceEvent(state, trace)

    return {
      content: [
        {
          type: "text",
          text: `Tool call blocked: ${hookDecision.reason || "Policy violation"}`,
        },
      ],
      isError: true,
    }
  }

  const effectiveArgs = hookDecision.modifiedArgs ?? args

  const requestId = crypto.randomUUID()
  const trace: ToolCallTrace = {
    traceId,
    requestId,
    aggregatedToolName: prefixedName,
    serverName,
    toolName,
    arguments: effectiveArgs,
    startedAt: new Date(),
    status: "success",
  }

  try {
    log.debug(`Calling ${toolName} on ${mcp.config.name}`)

    const timeoutMs = TIMEOUT.DEFAULT_TOOL_CALL_MS

    const result = await coreRouteToolCall(state, prefixedName, effectiveArgs, {
      logger: log,
      timeoutMs,
      rateLimiter: state.rateLimiter,
    })

    trace.endedAt = new Date()
    trace.durationMs = Date.now() - startTime
    trace.result = result

    log.info(`Tool call completed: ${prefixedName} (${trace.durationMs}ms)`)

    const postHookContext: PostToolUseContext = {
      traceId,
      toolName: prefixedName,
      serverName,
      arguments: effectiveArgs,
      result,
      durationMs: trace.durationMs,
      timestamp: Date.now(),
    }

    state.hookExecutor.evaluatePostToolUse(postHookContext).catch((err) => {
      log.error("PostToolUse hook error:", err)
    })

    emitTraceEvent(state, trace)

    return result
  } catch (error) {
    trace.endedAt = new Date()
    trace.durationMs = Date.now() - startTime
    trace.status = "error"

    if (error instanceof ToolCallTimeoutError) {
      trace.error = `Timeout after ${error.timeoutMs}ms`
      log.error(`Tool call timed out: ${prefixedName} (${error.timeoutMs}ms)`)

      emitTraceEvent(state, trace)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "timeout",
              server: error.serverName,
              tool: error.toolName,
              timeout_ms: error.timeoutMs,
            }),
          },
        ],
        isError: true,
      }
    }

    if (error instanceof RateLimitExceededError) {
      trace.error = `Rate limited, retry after ${error.retryAfterMs}ms`
      log.warn(`Rate limit exceeded for server: ${error.serverName}`)

      emitTraceEvent(state, trace)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "rate_limited",
              server: error.serverName,
              retry_after_ms: error.retryAfterMs,
            }),
          },
        ],
        isError: true,
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    trace.error = errorMessage
    log.error(`Tool call failed: ${prefixedName}`, { error: errorMessage })

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
