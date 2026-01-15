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
import type { NamespaceConfig, SkillConfig, RuleConfig } from "./types.js"
import { log } from "./logger.js"

const VERSION = "0.1.0"

let currentNamespaceConfig: NamespaceConfig | null = null

export function setHttpApiNamespaceConfig(config: NamespaceConfig): void {
  currentNamespaceConfig = config
}

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
            {
              success: false,
              error: "command is required for stdio transport",
            },
            400
          )
        }
      } else if (
        body.transport === "sse" ||
        body.transport === "streamable-http"
      ) {
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

  // GET /api/skills - List active skills as markdown
  app.get("/api/skills", (c) => {
    const skills = currentNamespaceConfig?.skills ?? []
    const format = c.req.query("format")

    if (format === "markdown") {
      const markdown = skills
        .filter((s) => s.isEnabled !== false)
        .map((s) => `# ${s.name}\n\n${s.content}`)
        .join("\n\n---\n\n")
      return c.text(markdown, 200, { "Content-Type": "text/markdown" })
    }

    return c.json({
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        content: s.content,
        tags: s.tags ?? [],
        isEnabled: s.isEnabled ?? true,
      })),
      total: skills.length,
    })
  })

  // GET /api/skills/:id - Get single skill by ID
  app.get("/api/skills/:id", (c) => {
    const skillId = c.req.param("id")
    const skills = currentNamespaceConfig?.skills ?? []
    const skill = skills.find((s) => s.id === skillId)

    if (!skill) {
      return c.json({ error: "Skill not found" }, 404)
    }

    return c.json({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      content: skill.content,
      tags: skill.tags ?? [],
      isEnabled: skill.isEnabled ?? true,
    })
  })

  // GET /api/rules - List active rules as markdown (ordered by priority)
  app.get("/api/rules", (c) => {
    const rules = [...(currentNamespaceConfig?.rules ?? [])].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    )
    const format = c.req.query("format")
    const scope = c.req.query("scope")

    const filteredRules = scope ? rules.filter((r) => r.scope === scope) : rules

    if (format === "markdown") {
      const markdown = filteredRules
        .filter((r) => r.isEnabled !== false)
        .map((r) => `# ${r.name}\n\n${r.content}`)
        .join("\n\n---\n\n")
      return c.text(markdown, 200, { "Content-Type": "text/markdown" })
    }

    return c.json({
      rules: filteredRules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        content: r.content,
        priority: r.priority ?? 0,
        scope: r.scope ?? "global",
        isEnabled: r.isEnabled ?? true,
      })),
      total: filteredRules.length,
    })
  })

  // GET /api/rules/:id - Get single rule by ID
  app.get("/api/rules/:id", (c) => {
    const ruleId = c.req.param("id")
    const rules = currentNamespaceConfig?.rules ?? []
    const rule = rules.find((r) => r.id === ruleId)

    if (!rule) {
      return c.json({ error: "Rule not found" }, 404)
    }

    return c.json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      content: rule.content,
      priority: rule.priority ?? 0,
      scope: rule.scope ?? "global",
      isEnabled: rule.isEnabled ?? true,
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
  log.info(`  - Skills: http://localhost:${port}/api/skills`)
  log.info(`  - Rules: http://localhost:${port}/api/rules`)

  return {
    stop: () => {
      server.stop()
      log.info("HTTP API server stopped")
    },
  }
}
