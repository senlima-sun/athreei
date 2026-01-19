/**
 * MCP Server Setup
 *
 * Creates and configures the athreei Gateway as an MCP Server.
 * The gateway aggregates tools from multiple upstream MCP servers
 * and exposes them through a single connection point.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import type { AggregatedTool, GatewayEventHandler } from "./types"
import { aggregateTools } from "@athreei/gateway-core"
import { routeToolCall } from "./router"
import { log } from "./logger"
import { HookExecutor, createHookExecutor } from "./hook-executor"

/**
 * Gateway state managed by the server
 */
export interface GatewayState {
  /** All connected MCP servers */
  connectedMcps: Map<string, import("./types.js").ConnectedMcp>
  /** Aggregated tools from all servers */
  aggregatedTools: AggregatedTool[]
  /** Event handlers */
  eventHandlers: GatewayEventHandler[]
  /** Hook executor for pre/post tool use hooks */
  hookExecutor: HookExecutor
}

/**
 * Create the global gateway state
 */
export function createGatewayState(): GatewayState {
  return {
    connectedMcps: new Map(),
    aggregatedTools: [],
    eventHandlers: [],
    hookExecutor: createHookExecutor(),
  }
}

/**
 * Create and configure the MCP Gateway Server
 */
export function createServer(state: GatewayState): Server {
  log.info("Creating athreei Gateway server...")

  const server = new Server(
    {
      name: "athreei-gateway",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        // Future: prompts and resources can be aggregated too
        // prompts: {},
        // resources: {},
      },
    }
  )

  // Register the tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log.debug(`Listing ${state.aggregatedTools.length} aggregated tools`)
    return {
      tools: state.aggregatedTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }
  })

  // Register the tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    log.info(`Tool call received: ${name}`)

    try {
      const result = await routeToolCall(state, name, args)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`Tool call failed: ${name}`, error)

      for (const handler of state.eventHandlers) {
        handler({
          type: "error",
          message: `Tool call failed: ${message}`,
          details: { toolName: name, error },
        })
      }

      return {
        content: [
          {
            type: "text",
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      }
    }
  })

  log.info("Gateway server created successfully")
  return server
}

/**
 * Refresh the aggregated tools from all connected MCPs
 */
export function refreshAggregatedTools(state: GatewayState): void {
  const mcps = Array.from(state.connectedMcps.values())
  state.aggregatedTools = aggregateTools(mcps, { logger: log })

  log.info(
    `Aggregated ${state.aggregatedTools.length} tools from ${mcps.length} servers`
  )

  for (const handler of state.eventHandlers) {
    handler({
      type: "tools_aggregated",
      count: state.aggregatedTools.length,
    })
  }
}

/**
 * Add an event handler
 */
export function addEventHandler(
  state: GatewayState,
  handler: GatewayEventHandler
): void {
  state.eventHandlers.push(handler)
}

/**
 * Remove an event handler
 */
export function removeEventHandler(
  state: GatewayState,
  handler: GatewayEventHandler
): void {
  const index = state.eventHandlers.indexOf(handler)
  if (index !== -1) {
    state.eventHandlers.splice(index, 1)
  }
}
