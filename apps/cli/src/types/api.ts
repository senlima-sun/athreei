export interface EnvVar {
  key: string
  masked: boolean
  value?: string
}

export interface McpServer {
  id: string
  name: string
  description: string | null
  transport: "stdio" | "sse" | "streamable-http"
  status: "active" | "inactive" | "pending" | "error"
  command?: string
  args?: string[]
  url?: string
  organizationId: string
  namespaceId?: string | null
  toolsCount?: number
  envVars?: EnvVar[]
  createdAt: string
  updatedAt: string
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface Endpoint {
  id: string
  name: string
  slug: string
  status: "active" | "inactive"
  organizationId: string
  namespaceId?: string | null
  mcpServers?: McpServer[]
  createdAt: string
  updatedAt: string
}

export interface ApiKey {
  id: string
  name: string
  keyHint: string
  expiresAt?: string
  lastUsedAt?: string
  endpointId: string
  createdAt: string
}

export interface ApiKeyCreate {
  id: string
  name: string
  key: string
  expiresAt?: string
  endpointId: string
  createdAt: string
}

export interface Namespace {
  id: string
  name: string
  slug: string
  description?: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string | null
  email: string
  image?: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ListResponse<T> {
  data: T[]
}

export interface VerifyResult {
  success: boolean
  latency?: number
  toolCount?: number
  error?: string
}
