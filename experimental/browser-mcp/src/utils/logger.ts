/**
 * Logging utility for MCP Server
 *
 * CRITICAL: For stdio transport, all logs MUST go to stderr (console.error)
 * because stdout is reserved for JSON-RPC communication.
 */

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.error(`[INFO] ${message}`, ...args)
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args)
  },

  warn: (message: string, ...args: unknown[]) => {
    console.error(`[WARN] ${message}`, ...args)
  },

  debug: (message: string, ...args: unknown[]) => {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args)
    }
  },
}
