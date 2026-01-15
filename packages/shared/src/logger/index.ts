/**
 * Logger module entry point
 */

// Re-export types
export type {
  ILogger,
  LogContext,
  LogEntry,
  LoggerConfig,
  LogLevel,
} from "./types.js"
export { LOG_LEVELS } from "./types.js"

// Re-export formatters
export {
  formatError,
  formatJson,
  formatPretty,
  getTimestamp,
} from "./formatters.js"

// Re-export Logger class
export { Logger } from "./logger.js"

// Re-export Hono middleware and types
export { honoLogger } from "./hono-middleware.js"
export type { HonoLoggerOptions, LoggerEnv } from "./hono-middleware.js"

import type { LoggerConfig, LogLevel } from "./types.js"
import { Logger } from "./logger.js"

/**
 * Create a new logger instance with the given configuration
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config)
}

/**
 * Parse log level from environment variable
 */
function parseLogLevel(value: string | undefined): LogLevel {
  const validLevels: LogLevel[] = ["debug", "info", "warn", "error"]
  if (value && validLevels.includes(value as LogLevel)) {
    return value as LogLevel
  }
  return "info"
}

/**
 * Default logger instance configured from environment variables
 *
 * - LOG_LEVEL: Minimum log level (default: "info")
 * - NODE_ENV: If not "production", enables pretty printing
 */
export const defaultLogger = createLogger({
  level: parseLogLevel(process.env.LOG_LEVEL),
  pretty: process.env.NODE_ENV !== "production",
})
