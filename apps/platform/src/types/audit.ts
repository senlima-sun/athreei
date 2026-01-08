/**
 * Audit log type definitions for the platform
 */

export type AuditStatus = "success" | "denied" | "error"

export interface AuditLogEntry {
  id: string
  timestamp: number
  aiApp?: string
  tool: string
  origin?: string
  args?: Record<string, unknown>
  result?: unknown
  status: AuditStatus
}

export interface AuditLogsResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
