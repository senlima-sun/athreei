/**
 * HTTP API Server
 *
 * Provides REST endpoints for the dashboard to query local state.
 * Runs alongside the MCP server on port 3001.
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger as apiLogger } from "hono/logger"

// Initialize database (runs migrations)
import "../db/index.js"

import { statusRoutes } from "./routes/status"
import { auditRoutes } from "./routes/audit"
import { sessionsRoutes } from "./routes/sessions"
import { permissionsRoutes } from "./routes/permissions"
import { settingsRoutes } from "./routes/settings"
import { logger } from "../utils/logger"

const API_PORT = 3001

/**
 * Create and configure the Hono app
 */
export function createApiServer() {
  const app = new Hono()

  // CORS for dashboard (running on :5173 or :5174)
  app.use(
    "*",
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
      ],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      credentials: true,
    })
  )

  // Request logging (logs to stderr)
  app.use(
    "*",
    apiLogger((message) => {
      logger.info(message)
    })
  )

  // Mount routes
  app.route("/api/status", statusRoutes)
  app.route("/api/audit", auditRoutes)
  app.route("/api/sessions", sessionsRoutes)
  app.route("/api/permissions", permissionsRoutes)
  app.route("/api/settings", settingsRoutes)

  // Health check
  app.get("/health", (c) => c.json({ ok: true }))

  return app
}

/**
 * Start the HTTP API server
 * Returns undefined if port is already in use (non-fatal for MCP server)
 */
export function startApiServer(): ReturnType<typeof Bun.serve> | undefined {
  const app = createApiServer()

  logger.info(`Starting HTTP API server on port ${API_PORT}...`)

  try {
    const server = Bun.serve({
      port: API_PORT,
      fetch: app.fetch,
    })

    logger.info(`HTTP API server running on http://localhost:${API_PORT}`)
    return server
  } catch (error) {
    if (error instanceof Error && error.message.includes("EADDRINUSE")) {
      logger.warn(
        `Port ${API_PORT} is already in use. Dashboard API will not be available.`
      )
      logger.warn(
        "This is non-fatal - MCP server will continue without the dashboard API."
      )
      return undefined
    }
    throw error
  }
}
