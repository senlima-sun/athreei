/**
 * Gateway Logger
 *
 * Simple logging utility that writes to stderr (since stdout is reserved
 * for MCP JSON-RPC communication in stdio mode).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [gateway] ${message}`;
}

/**
 * Log a message if it meets the current level threshold
 */
function logAt(level: LogLevel, message: string, ...args: unknown[]): void {
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]) {
    const formatted = formatMessage(level, message);
    if (args.length > 0) {
      console.error(formatted, ...args);
    } else {
      console.error(formatted);
    }
  }
}

/**
 * Logger interface
 */
export const log = {
  debug: (message: string, ...args: unknown[]) => logAt("debug", message, ...args),
  info: (message: string, ...args: unknown[]) => logAt("info", message, ...args),
  warn: (message: string, ...args: unknown[]) => logAt("warn", message, ...args),
  error: (message: string, ...args: unknown[]) => logAt("error", message, ...args),
  setLevel: setLogLevel,
};
