/**
 * Logger type definitions
 */

/**
 * Available log levels in order of severity
 */
export type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Numeric priority for log levels (higher = more severe)
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Contextual information attached to log entries
 */
export interface LogContext {
  service?: string
  requestId?: string
  [key: string]: unknown
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    message: string
    name?: string
    stack?: string
  }
  data?: Record<string, unknown>
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output (default: "info") */
  level?: LogLevel
  /** Service name to include in logs */
  service?: string
  /** Use pretty-print format instead of JSON (default: true in development) */
  pretty?: boolean
}

/**
 * Logger interface
 */
export interface ILogger {
  /** Log a debug message */
  debug(message: string, data?: Record<string, unknown>): void
  /** Log an info message */
  info(message: string, data?: Record<string, unknown>): void
  /** Log a warning message */
  warn(message: string, data?: Record<string, unknown>): void
  /** Log an error message */
  error(message: string, data?: Record<string, unknown>): void
  /** Create a child logger with additional context */
  child(context: LogContext): ILogger
}
