/**
 * Gateway Cloud - Entry Point
 *
 * Cloud-hosted MCP gateway that exposes SSE endpoints for clients
 * that don't want to run a local binary. Each SSE connection gets
 * its own gateway instance with connected MCP servers.
 *
 * Usage:
 *   bun run src/index.ts
 *
 * Environment variables:
 *   PORT          - Port to listen on (default: 3001)
 *   PLATFORM_URL  - Platform API URL for config (default: http://localhost:3000)
 *   NODE_ENV      - Environment (development/production)
 */

// Sentry must be imported first for proper instrumentation
import "./instrument"

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger as honoLogger } from "hono/logger"
import { z } from "zod"
import { createLogger, type LogLevel } from "@athreei/shared"
import healthRoutes from "./routes/health"
import sseRoutes, { configureSseRoutes } from "./routes/sse"
import {
  configureSessionManager,
  startSessionCleanup,
  stopSessionCleanup,
  cleanupAllSessions,
} from "./gateway/session"
import { flushAllRecorders } from "./services/trace-recorder"
import { DEFAULT_CONFIG, type GatewayCloudConfig } from "./types"
import type { Logger } from "@athreei/gateway-core"

const app = new Hono()

const LogLevelSchema = z.enum(["debug", "info", "warn", "error"]).catch("info")

const structuredLogger = createLogger({
  service: "gateway-cloud",
  level: LogLevelSchema.parse(process.env.LOG_LEVEL) as LogLevel,
  pretty: process.env.NODE_ENV !== "production",
})

const log: Logger = {
  debug: (message: string, ...args: unknown[]) => {
    structuredLogger.debug(message, args.length > 0 ? { args } : undefined)
  },
  info: (message: string, ...args: unknown[]) => {
    structuredLogger.info(message, args.length > 0 ? { args } : undefined)
  },
  warn: (message: string, ...args: unknown[]) => {
    structuredLogger.warn(message, args.length > 0 ? { args } : undefined)
  },
  error: (message: string, ...args: unknown[]) => {
    structuredLogger.error(message, args.length > 0 ? { args } : undefined)
  },
}

app.use("*", honoLogger())

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (process.env.NODE_ENV === "development") {
        return origin
      }
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || []
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
)

// Health check routes
app.route("/health", healthRoutes)

// SSE gateway routes
app.route("/mcp", sseRoutes)

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "athreei-gateway-cloud",
    version: "0.1.0",
    description: "Cloud-hosted MCP gateway with SSE transport",
    endpoints: {
      health: "/health",
      sse: "/mcp/:endpointName/sse",
      messages: "/mcp/messages",
    },
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404)
})

app.onError((err, c) => {
  log.error("Server error", { error: err })
  return c.json(
    {
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  )
})

/**
 * Initialize the gateway cloud service
 */
function initialize(config: GatewayCloudConfig): void {
  log.info("Initializing gateway cloud service...")

  configureSessionManager({
    idleTimeout: config.sessionIdleTimeout,
    logger: log,
  })

  // Configure SSE routes
  configureSseRoutes({ logger: log })

  startSessionCleanup(config.sessionCleanupInterval)

  log.info("Gateway cloud service initialized")
}

/**
 * Shutdown the gateway cloud service
 */
async function shutdown(): Promise<void> {
  log.info("Shutting down gateway cloud service...")

  stopSessionCleanup()
  await flushAllRecorders()
  await cleanupAllSessions()

  log.info("Gateway cloud service shut down")
}

const config: GatewayCloudConfig = {
  ...DEFAULT_CONFIG,
  port: parseInt(process.env.PORT ?? "3001", 10),
  platformUrl: process.env.PLATFORM_URL ?? DEFAULT_CONFIG.platformUrl,
  debug: process.env.NODE_ENV === "development",
}

initialize(config)

process.on("SIGINT", async () => {
  await shutdown()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await shutdown()
  process.exit(0)
})

log.info(`Starting gateway cloud on port ${config.port}...`)

export default {
  port: config.port,
  fetch: app.fetch,
}

export { app }
