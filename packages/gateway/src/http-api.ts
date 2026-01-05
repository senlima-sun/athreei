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
      allowMethods: ["GET", "POST", "OPTIONS"],
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

  // GET /api/servers/:name/test - Test a server connection by calling tools/list
  app.get("/api/servers/:name/test", async (c) => {
    const serverName = c.req.param("name")
    const mcp = state.connectedMcps.get(serverName)

    if (!mcp) {
      return c.json(
        {
          success: false,
          error: `Server "${serverName}" not found`,
          availableServers: Array.from(state.connectedMcps.keys()),
        },
        404
      )
    }

    try {
      const startTime = Date.now()
      const toolsResponse = await mcp.client.listTools()
      const durationMs = Date.now() - startTime

      return c.json({
        success: true,
        server: serverName,
        durationMs,
        tools: toolsResponse.tools?.length ?? 0,
        message: `Server "${serverName}" is healthy`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`Server test failed for "${serverName}":`, error)

      return c.json(
        {
          success: false,
          server: serverName,
          error: message,
          message: `Server "${serverName}" connection test failed`,
        },
        500
      )
    }
  })

  // POST /api/test-config - Test a server configuration without connecting
  app.post("/api/test-config", async (c) => {
    try {
      const body = await c.req.json()

      // Validate required fields
      if (!body.name || typeof body.name !== "string") {
        return c.json({ success: false, error: "name is required" }, 400)
      }

      if (!body.transport || typeof body.transport !== "string") {
        return c.json({ success: false, error: "transport is required" }, 400)
      }

      if (body.transport === "stdio") {
        if (!body.command || typeof body.command !== "string") {
          return c.json(
            { success: false, error: "command is required for stdio transport" },
            400
          )
        }
      } else if (body.transport === "sse" || body.transport === "streamable-http") {
        if (!body.url || typeof body.url !== "string") {
          return c.json(
            { success: false, error: "url is required for SSE/HTTP transport" },
            400
          )
        }

        // Validate URL format
        try {
          new URL(body.url)
        } catch {
          return c.json({ success: false, error: "Invalid URL format" }, 400)
        }
      } else {
        return c.json(
          { success: false, error: `Unknown transport: ${body.transport}` },
          400
        )
      }

      return c.json({
        success: true,
        message: "Configuration is valid",
        config: {
          name: body.name,
          transport: body.transport,
          command: body.command,
          args: body.args,
          url: body.url,
          hasHeaders: !!(body.headers && Object.keys(body.headers).length > 0),
        },
      })
    } catch (error) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400)
    }
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
