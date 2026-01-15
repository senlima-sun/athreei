import { createLogger, honoLogger, type LoggerEnv } from "@athreei/shared"

/**
 * API service logger instance
 *
 * Configuration:
 * - service: "api" - identifies logs from this service
 * - level: Controlled by LOG_LEVEL env var (default: "info")
 * - pretty: Enabled in development for readable output
 */
export const logger = createLogger({
  service: "api",
  level:
    (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  pretty: process.env.NODE_ENV !== "production",
})

/**
 * Pre-configured Hono middleware with API logger
 */
export function apiLogger() {
  return honoLogger({ logger })
}

/**
 * Re-export LoggerEnv for route handlers that need typed access to logger
 *
 * @example
 * ```ts
 * import type { LoggerEnv } from "../lib/logger"
 *
 * const app = new Hono<LoggerEnv>()
 * app.get("/", (c) => {
 *   const log = c.get("logger")
 *   log.info("Processing request")
 * })
 * ```
 */
export type { LoggerEnv }
