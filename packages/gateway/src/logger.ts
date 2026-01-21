import { createLogger, type LogLevel, type LogContext } from "@athreei/shared"

export const gatewayLogger = createLogger({
  service: "gateway",
  level: (process.env.LOG_LEVEL as LogLevel) ?? "info",
  pretty: process.env.NODE_ENV !== "production",
})

export function createRequestLogger(context: {
  traceId?: string
  requestId?: string
  serverName?: string
  toolName?: string
}) {
  return gatewayLogger.child(context)
}

export const log = gatewayLogger

export function setLogLevel(_level: LogLevel): void {
  // Note: The shared logger doesn't support runtime level changes.
  // This function is kept for backward compatibility but is a no-op.
  // To change log level, restart with LOG_LEVEL environment variable.
}

export type { LogLevel, LogContext }
