/**
 * HTTP API for Local Gateway
 *
 * Exposes traces, servers, and tools for the dashboard to consume.
 * Runs alongside the MCP server (stdio transport).
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import type { GatewayState } from "./server.js"
import type { TraceCollector } from "./trace-collector.js"
import { log } from "./logger.js"

const VERSION = "0.1.0"

/**
 * Create the HTTP API app for local gateway
 */
export function createHttpApi(
  state: GatewayState,
  traceCollector: TraceCollector
) {
  const app = new Hono()

  // Enable CORS for dashboard access
  app.use(
    "/*",
    cors({
      origin: ["http://localhost:5173", "http://localhost:3000"],
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  )

  // GET /api/status - Gateway health status
  app.get("/api/status", (c) => {
    const stats = traceCollector.getStats()

    return c.json({
      status: "ok",
      version: VERSION,
      uptime: process.uptime(),
      servers: {
        connected: state.connectedMcps.size,
        names: Array.from(state.connectedMcps.keys()),
      },
      tools: {
        count: state.aggregatedTools.length,
      },
      traces: {
        total: traceCollector.getTotal(),
        successful: stats.successfulCalls,
        failed: stats.failedCalls,
        averageDurationMs: stats.averageDurationMs,
      },
    })
  })

  // GET /api/traces - List traces with pagination
  app.get("/api/traces", (c) => {
    const limit = parseInt(c.req.query("limit") ?? "50", 10)
    const offset = parseInt(c.req.query("offset") ?? "0", 10)
    const statusParam = c.req.query("status")
    const search = c.req.query("search") ?? undefined

    // Validate status filter
    const status =
      statusParam === "success" || statusParam === "error"
        ? statusParam
        : undefined

    const traces = traceCollector.getTraces({ limit, offset, status, search })
    const total = traceCollector.getFilteredTotal({ status, search })

    return c.json({
      traces,
      total,
      limit,
      offset,
    })
  })

  // GET /api/traces/:id - Get single trace by ID
  app.get("/api/traces/:id", (c) => {
    const traceId = c.req.param("id")
    const trace = traceCollector.getTrace(traceId)

    if (!trace) {
      return c.json({ error: "Trace not found" }, 404)
    }

    return c.json(trace)
  })

  // GET /api/servers - List connected MCP servers
  app.get("/api/servers", (c) => {
    const servers = Array.from(state.connectedMcps.values()).map((mcp) => ({
      name: mcp.config.name,
      sanitizedName: mcp.sanitizedName,
      transport: mcp.config.transport,
      command: mcp.config.command,
      args: mcp.config.args,
      url: mcp.config.url,
      status: mcp.config.status,
      tools: mcp.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
      toolCount: mcp.tools.length,
    }))

    return c.json({
      servers,
      total: servers.length,
    })
  })

  // GET /api/tools - List aggregated tools
  app.get("/api/tools", (c) => {
    const tools = state.aggregatedTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      serverName: tool.serverName,
      originalName: tool.originalName,
    }))

    return c.json({
      tools,
      total: tools.length,
    })
  })

  return app
}

/**
 * Start the HTTP API server
 */
export function startHttpApiServer(
  state: GatewayState,
  traceCollector: TraceCollector,
  port: number
): { stop: () => void } {
  const app = createHttpApi(state, traceCollector)

  const server = Bun.serve({
    port,
    fetch: app.fetch,
  })

  log.info(`HTTP API running at http://localhost:${port}`)
  log.info(`  - Status: http://localhost:${port}/api/status`)
  log.info(`  - Traces: http://localhost:${port}/api/traces`)
  log.info(`  - Servers: http://localhost:${port}/api/servers`)
  log.info(`  - Tools: http://localhost:${port}/api/tools`)

  return {
    stop: () => {
      server.stop()
      log.info("HTTP API server stopped")
    },
  }
}
