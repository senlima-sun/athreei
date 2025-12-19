/**
 * Core type definitions for athreei
 *
 * Note: MCP tool schemas are in ./mcp-tools.ts
 * Note: aiii:* event schemas are in ./aiii-events.ts
 */

// ============================================================================
// Permission Model
// ============================================================================

export type PermissionLevel = "denied" | "allowed" | "ask"

export interface Permission {
  id: string
  origin: string
  tool: string
  allowed: PermissionLevel
  createdAt: number
  updatedAt: number
}

// ============================================================================
// Audit Log
// ============================================================================

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

// ============================================================================
// Session Tracking
// ============================================================================

export interface Session {
  id: string
  tabId?: number
  origin: string
  startedAt: number
  endedAt?: number
  metadata?: Record<string, unknown>
}

// ============================================================================
// Native Messaging Types
// ============================================================================

export interface NativeMessage {
  id: string
  type: "request" | "response" | "event"
  payload: unknown
}

export interface NativeRequest extends NativeMessage {
  type: "request"
  method: string
  payload: Record<string, unknown>
}

export interface NativeResponse extends NativeMessage {
  type: "response"
  success: boolean
  payload: unknown
  error?: string
}

export interface NativeEvent extends NativeMessage {
  type: "event"
  event: string
  payload: unknown
}

// ============================================================================
// MCP Client Info (from protocol)
// ============================================================================

export interface MCPClientInfo {
  name: string
  version: string
}
