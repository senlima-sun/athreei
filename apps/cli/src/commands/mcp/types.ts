import type { McpServer } from "../../types/api"

export type TransportType = "stdio" | "sse" | "streamable-http"

export interface McpServerResponse {
  data: McpServer
}

export interface CreateMcpServerRequest {
  name: string
  description?: string
  transport: TransportType
  command?: string
  args?: string[]
  url?: string
  organizationId: string
}

export interface CreateMcpServerResponse {
  id: string
  name: string
  transport: TransportType
  status: string
}

export interface UpdateMcpServerRequest {
  name?: string
  description?: string
  transport?: TransportType
  command?: string
  args?: string[]
  url?: string
}

export interface McpServerListResponse {
  data: McpServer[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export interface McpToolItem {
  name: string
  description: string
  inputSchema: ToolInputSchema
}

export interface ToolInputSchema {
  type: string
  properties?: Record<string, { type: string; description?: string }>
  required?: string[]
}

export interface McpToolsResponse {
  tools: McpToolItem[]
}
