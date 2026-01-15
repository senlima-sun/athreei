/**
 * Hono logger middleware
 *
 * Provides request/response logging with request ID tracking
 */

import type { Context, MiddlewareHandler } from "hono"
import type { Logger } from "./logger.js"
import { createLogger } from "./index.js"

/**
 * Environment type extension for Hono apps using the logger middleware
 */
export interface LoggerEnv {
  Variables: {
    logger: Logger
    requestId: string
  }
}

/**
 * Options for the Hono logger middleware
 */
export interface HonoLoggerOptions {
  /** Custom logger instance to use (default: creates new logger) */
  logger?: Logger
  /** Whether to skip logging for certain paths (e.g., health checks) */
  skip?: (c: Context) => boolean
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Hono middleware for structured request/response logging
 *
 * @example
 * ```ts
 * import { Hono } from "hono"
 * import { honoLogger, createLogger } from "@athreei/shared"
 *
 * const logger = createLogger({ service: "api" })
 * const app = new Hono()
 *
 * app.use("*", honoLogger({ logger }))
 *
 * // Access logger in route handlers
 * app.get("/", (c) => {
 *   const log = c.get("logger")
 *   log.info("Processing request")
 *   return c.json({ ok: true })
 * })
 * ```
 */
export function honoLogger(options: HonoLoggerOptions = {}): MiddlewareHandler {
  const baseLogger = options.logger ?? createLogger()

  return async (c, next) => {
    // Check if we should skip logging for this request
    if (options.skip?.(c)) {
      await next()
      return
    }

    const requestId = generateRequestId()
    const startTime = Date.now()

    // Create child logger with request context
    const requestLogger = baseLogger.child({ requestId })

    // Attach logger and request ID to context
    c.set("logger", requestLogger)
    c.set("requestId", requestId)

    // Log incoming request
    requestLogger.info("Request started", {
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header("user-agent"),
    })

    try {
      await next()
    } catch (error) {
      // Log error and re-throw
      requestLogger.error("Request failed", {
        method: c.req.method,
        path: c.req.path,
        duration: Date.now() - startTime,
        error,
      })
      throw error
    }

    // Log completed request
    const duration = Date.now() - startTime
    const status = c.res.status

    if (status >= 500) {
      requestLogger.error("Request completed with server error", {
        method: c.req.method,
        path: c.req.path,
        status,
        duration,
      })
    } else if (status >= 400) {
      requestLogger.warn("Request completed with client error", {
        method: c.req.method,
        path: c.req.path,
        status,
        duration,
      })
    } else {
      requestLogger.info("Request completed", {
        method: c.req.method,
        path: c.req.path,
        status,
        duration,
      })
    }
  }
}
