/**
 * MCP server-related type definitions
 */

/** Transport types used in the frontend UI */
export type TransportType = "stdio" | "sse" | "http"

/** Transport types as returned from the API (includes streamable-http) */
export type ApiTransportType = "stdio" | "sse" | "streamable-http"

/** Server status values */
export type ServerStatus = "active" | "inactive" | "error"

/** API status values (includes pending) */
export type ApiServerStatus = "active" | "inactive" | "pending"

/**
 * MCP server as returned from the API
 */
export interface ApiMcpServer {
  id: string
  name: string
  description?: string | null
  transport: ApiTransportType
  status: ApiServerStatus
  command?: string | null
  args?: string | null // JSON string in API
  url?: string | null
  envKeys?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * MCP server in frontend display format (compatible with components)
 */
export interface McpServer {
  id: string
  name: string
  description?: string
  transportType: TransportType
  status: ServerStatus
  command?: string
  args?: string[]
  url?: string
  envKeys?: string[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Form data for creating/editing MCP servers
 */
export interface McpServerFormData {
  name: string
  description?: string
  transportType: TransportType
  status: ServerStatus
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
}
