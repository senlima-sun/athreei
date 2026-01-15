/**
 * Logger class implementation
 */

import { formatError, formatJson, formatPretty, getTimestamp } from "./formatters.js"
import type {
  ILogger,
  LogContext,
  LogEntry,
  LoggerConfig,
  LogLevel,
} from "./types.js"
import { LOG_LEVELS } from "./types.js"

/**
 * Logger class that supports structured logging with levels and context
 */
export class Logger implements ILogger {
  private readonly config: Required<LoggerConfig>
  private readonly context: LogContext

  constructor(config: LoggerConfig = {}, context: LogContext = {}) {
    this.config = {
      level: config.level ?? "info",
      service: config.service ?? "",
      pretty: config.pretty ?? process.env.NODE_ENV !== "production",
    }
    // Merge service into context if provided
    this.context = this.config.service
      ? { service: this.config.service, ...context }
      : context
  }

  /**
   * Check if a log level should be output based on configured minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level]
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return
    }

    // Extract error from data if present
    let errorInfo: LogEntry["error"]
    let cleanData = data

    if (data?.error !== undefined) {
      errorInfo = formatError(data.error)
      const { error: _error, ...rest } = data
      cleanData = Object.keys(rest).length > 0 ? rest : undefined
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: getTimestamp(),
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
      ...(errorInfo && { error: errorInfo }),
      ...(cleanData && Object.keys(cleanData).length > 0 && { data: cleanData }),
    }

    const output = this.config.pretty ? formatPretty(entry) : formatJson(entry)

    // Use stderr for errors and warnings, stdout for others
    /* eslint-disable no-console -- Logger intentionally uses console */
    if (level === "error" || level === "warn") {
      console.error(output)
    } else {
      console.log(output)
    }
    /* eslint-enable no-console */
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data)
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data)
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data)
  }

  /**
   * Log an error message
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data)
  }

  /**
   * Create a child logger with additional context
   * The child inherits the parent's config and merges the new context
   */
  child(context: LogContext): Logger {
    return new Logger(this.config, { ...this.context, ...context })
  }
}
