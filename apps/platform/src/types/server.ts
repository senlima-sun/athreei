/**
 * Server-related type definitions for the platform
 */

export interface ServerTool {
  name: string
  description?: string
}

export interface Server {
  name: string
  sanitizedName: string
  transport: string
  command?: string
  args?: string
  url?: string
  status: string
  tools: ServerTool[]
  toolCount: number
}

export interface ServersResponse {
  servers: Server[]
  total: number
}

export interface TestResult {
  success: boolean
  server: string
  durationMs?: number
  tools?: number
  error?: string
  message: string
}
