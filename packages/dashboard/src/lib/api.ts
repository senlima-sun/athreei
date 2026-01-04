/**
 * API client for athreei dashboard
 *
 * Centralized API calls to the Hono backend running on port 3001
 */

const API_BASE = "http://localhost:3001"

export async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// Status API
export interface SystemStatus {
  mcpServer: boolean
  extension: boolean
  aiApps: string[]
  uptime?: number
  version?: string
}

export interface McpStatus {
  running: boolean
  version: string
  connectedClients: number
  tools: string[]
  startedAt: number
  uptime: number
}

export interface ExtensionStatus {
  installed: boolean
  version: string
  activeTabs: number
  permissions: {
    activeTab: boolean
    storage: boolean
    nativeMessaging: boolean
  }
  nativeHost: {
    connected: boolean
    version: string
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return fetchApi<SystemStatus>("/api/status")
}

export async function getMcpStatus(): Promise<McpStatus> {
  return fetchApi<McpStatus>("/api/status/mcp")
}

export async function getExtensionStatus(): Promise<ExtensionStatus> {
  return fetchApi<ExtensionStatus>("/api/status/extension")
}

// Audit Log API
export interface AuditLogEntry {
  id: string
  timestamp: number
  aiApp?: string
  tool: string
  origin: string
  args: Record<string, unknown>
  result?: Record<string, unknown>
  status: "success" | "denied" | "error"
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getAuditLogs(params?: {
  tool?: string
  origin?: string
  status?: string
  aiApp?: string
  dateFrom?: number
  dateTo?: number
  page?: number
  limit?: number
}): Promise<AuditLogResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
  }
  const query = searchParams.toString()
  return fetchApi<AuditLogResponse>(`/api/audit${query ? `?${query}` : ""}`)
}

// Sessions API
export interface Session {
  id: string
  tabId?: number
  origin: string
  startedAt: number
  endedAt?: number
  metadata?: {
    userAgent?: string
    aiApp?: string
    actionsPerformed?: number
    duration?: number
  }
}

export interface SessionsResponse {
  data: Session[]
  count: number
  total: number
}

export async function getSessions(params?: {
  origin?: string
  active?: boolean
  aiApp?: string
  limit?: number
}): Promise<SessionsResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
  }
  const query = searchParams.toString()
  return fetchApi<SessionsResponse>(`/api/sessions${query ? `?${query}` : ""}`)
}

// Permissions API
// Aligned with @athreei/shared types
export type PermissionLevel = "denied" | "allowed" | "ask"

export interface Permission {
  id: string
  origin: string
  tool: string
  allowed: PermissionLevel
  createdAt: number
  updatedAt: number
}

export interface PermissionsResponse {
  data: Permission[]
  count: number
}

export async function getPermissions(params?: {
  origin?: string
  tool?: string
  permission?: string
}): Promise<PermissionsResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
  }
  const query = searchParams.toString()
  return fetchApi<PermissionsResponse>(
    `/api/permissions${query ? `?${query}` : ""}`
  )
}

// Settings API
export interface Settings {
  theme: "dark" | "light" | "auto"
  language: string
  autoApprove: boolean
  logRetention: number
  notificationsEnabled: boolean
  notifyOnPermissionRequests: boolean
  notifyOnDeniedTools: boolean
  notifyOnNewSessions: boolean
}

export interface SettingsUpdateResponse {
  success: boolean
  settings?: Settings
  message?: string
  error?: string
}

export interface DataClearResponse {
  success: boolean
  message?: string
}

export async function getSettings(): Promise<Settings> {
  return fetchApi<Settings>("/api/settings")
}

export async function updateSettings(
  settings: Partial<Settings>
): Promise<SettingsUpdateResponse> {
  return fetchApi<SettingsUpdateResponse>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  })
}

export interface ExportData {
  version: string
  exportedAt: number
  settings: Settings
  auditLogs: AuditLogEntry[]
  permissions: Permission[]
  sessions: Session[]
}

export async function exportData(): Promise<ExportData> {
  return fetchApi<ExportData>("/api/settings/export", {
    method: "POST",
  })
}

export async function clearAllData(): Promise<DataClearResponse> {
  return fetchApi<DataClearResponse>("/api/settings/data", {
    method: "DELETE",
  })
}

export async function resetSettings(): Promise<SettingsUpdateResponse> {
  return fetchApi<SettingsUpdateResponse>("/api/settings/reset", {
    method: "POST",
  })
}

// API client object for pages that use object-style API calls
export const api = {
  get: <T>(path: string): Promise<T> => fetchApi<T>(path),
  post: <T>(path: string, data?: unknown): Promise<T> =>
    fetchApi<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(path: string, data?: unknown): Promise<T> =>
    fetchApi<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string): Promise<T> =>
    fetchApi<T>(path, {
      method: "DELETE",
    }),
}
