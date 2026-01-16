/**
 * MCP Transport Type Definitions
 *
 * Defines the transport layer interfaces for connecting to MCP servers.
 * Supports stdio (subprocess) and Streamable HTTP transports.
 */

export type TransportType = "stdio" | "streamable-http"

export interface StdioTransportConfig {
  transport: "stdio"
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  maxRestarts?: number
  restartDelay?: number
  healthCheckInterval?: number
}

export interface StreamableHttpTransportConfig {
  transport: "streamable-http"
  url: string
  headers?: Record<string, string>
  sessionTimeout?: number
  enableResumability?: boolean
  connectTimeout?: number
  requestTimeout?: number
}

export type TransportConfig = StdioTransportConfig | StreamableHttpTransportConfig

export interface McpMessage {
  jsonrpc: "2.0"
  id?: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export type TransportStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export interface TransportConnection {
  id: string
  config: TransportConfig
  status: TransportStatus
  connectedAt?: Date
  lastMessageAt?: Date
  send(message: McpMessage): Promise<void>
  close(): Promise<void>
  onMessage(handler: (message: McpMessage) => void): void
  onError(handler: (error: Error) => void): void
  onClose(handler: () => void): void
}

export interface TransportEvents {
  message: (message: McpMessage) => void
  error: (error: Error) => void
  close: () => void
}
