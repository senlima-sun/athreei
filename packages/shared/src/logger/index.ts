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
} from "./types"
export { LOG_LEVELS } from "./types"

// Re-export formatters
export {
  formatError,
  formatJson,
  formatPretty,
  getTimestamp,
} from "./formatters"

// Re-export Logger class
export { Logger } from "./logger"

// Re-export Hono middleware and types
export { honoLogger } from "./hono-middleware"
export type { HonoLoggerOptions, LoggerEnv } from "./hono-middleware"

import type { LoggerConfig, LogLevel } from "./types"
import { Logger } from "./logger"

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
