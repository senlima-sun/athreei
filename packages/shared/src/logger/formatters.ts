/**
 * Logger output formatters
 */

import type { LogEntry, LogLevel } from "./types.js"

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  // Level colors
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
} as const

/**
 * Level labels with fixed width for alignment
 */
const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
}

/**
 * Get current timestamp in ISO 8601 format
 */
export function getTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Extract error details from an unknown error value
 */
export function formatError(error: unknown): {
  message: string
  name?: string
  stack?: string
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  if (typeof error === "string") {
    return { message: error }
  }

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>
    return {
      message: String(obj.message ?? JSON.stringify(error)),
      name: typeof obj.name === "string" ? obj.name : undefined,
      stack: typeof obj.stack === "string" ? obj.stack : undefined,
    }
  }

  return { message: String(error) }
}

/**
 * Format log entry as compact JSON (for production)
 */
export function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry)
}

/**
 * Format log entry for human-readable terminal output (for development)
 */
export function formatPretty(entry: LogEntry): string {
  const color = COLORS[entry.level]
  const label = LEVEL_LABELS[entry.level]
  const time = entry.timestamp.slice(11, 23) // Extract HH:mm:ss.sss

  // Build the main line
  let line = `${COLORS.dim}${time}${COLORS.reset} ${color}${label}${COLORS.reset}`

  // Add service if present
  if (entry.context?.service) {
    line += ` ${COLORS.dim}[${entry.context.service}]${COLORS.reset}`
  }

  // Add request ID if present
  if (entry.context?.requestId) {
    line += ` ${COLORS.dim}(${entry.context.requestId.slice(0, 8)})${COLORS.reset}`
  }

  // Add message
  line += ` ${entry.message}`

  // Add data if present (excluding service and requestId which are already shown)
  const extraContext = { ...entry.context }
  delete extraContext.service
  delete extraContext.requestId

  const hasExtraContext = Object.keys(extraContext).length > 0
  const hasData = entry.data && Object.keys(entry.data).length > 0

  if (hasExtraContext || hasData) {
    const combined = { ...extraContext, ...entry.data }
    line += ` ${COLORS.dim}${JSON.stringify(combined)}${COLORS.reset}`
  }

  // Add error details if present
  if (entry.error) {
    line += `\n  ${color}${entry.error.name ?? "Error"}: ${entry.error.message}${COLORS.reset}`
    if (entry.error.stack) {
      // Indent stack trace lines
      const stackLines = entry.error.stack
        .split("\n")
        .slice(1) // Skip first line (it's the error message)
        .map((l) => `  ${COLORS.dim}${l.trim()}${COLORS.reset}`)
        .join("\n")
      if (stackLines) {
        line += `\n${stackLines}`
      }
    }
  }

  return line
}
