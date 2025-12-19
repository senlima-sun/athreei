/**
 * Shared type definitions for athreei
 */

// Permission model
export type PermissionLevel = "denied" | "allowed" | "ask"

export interface Permission {
  id: string
  origin: string
  tool: string
  allowed: PermissionLevel
  createdAt: number
  updatedAt: number
}

// Audit log
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

// Session tracking
export interface Session {
  id: string
  tabId?: number
  origin: string
  startedAt: number
  endedAt?: number
  metadata?: Record<string, unknown>
}

// Native messaging types
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

// aiii:* event types
export interface AiiiEventDetail {
  requestId?: string
  tool?: string
  args?: Record<string, unknown>
  success?: boolean
  result?: unknown
  error?: string
}

// Provider event types
export type AiiiEventType =
  | "aiii:ready"
  | "aiii:action:before"
  | "aiii:action:after"

export type AiiiToolType =
  | "click"
  | "type"
  | "navigate"
  | "scroll"
  | "select"
  | "screenshot"

// Tool-specific argument types
export interface AiiiClickArgs {
  selector: string
  button?: "left" | "right" | "middle"
  modifiers?: ("ctrl" | "shift" | "alt" | "meta")[]
}

export interface AiiiTypeArgs {
  selector: string
  text: string
  clear?: boolean
  delay?: number
}

export interface AiiiNavigateArgs {
  url: string
  waitUntil?: "load" | "domcontentloaded" | "networkidle"
}

export interface AiiiScrollArgs {
  selector?: string
  x?: number
  y?: number
  behavior?: "auto" | "smooth"
}

export interface AiiiSelectArgs {
  selector: string
  value: string | string[]
}

export interface AiiiScreenshotArgs {
  selector?: string
  fullPage?: boolean
}

export type AiiiToolArgs =
  | AiiiClickArgs
  | AiiiTypeArgs
  | AiiiNavigateArgs
  | AiiiScrollArgs
  | AiiiSelectArgs
  | AiiiScreenshotArgs

// Provider event detail types
export interface AiiiReadyDetail {
  version: string
  tools: AiiiToolType[]
}

export interface AiiiActionBeforeDetail {
  requestId: string
  tool: AiiiToolType
  args: AiiiToolArgs
  timestamp: number
  origin: string
}

export interface AiiiActionAfterDetail {
  requestId: string
  tool: AiiiToolType
  success: boolean
  result?: unknown
  error?: string
  timestamp: number
  duration: number
}

export interface AiiiToolRegistration {
  tool: string
  description: string
  parameters: Record<
    string,
    {
      type: string
      required?: boolean
      default?: unknown
      description?: string
    }
  >
}

// Browser tool types
export interface TabInfo {
  id: number
  url: string
  title: string
  active: boolean
  windowId: number
}

export interface ElementInfo {
  selector: string
  role: string
  label?: string
  text?: string
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  enabled: boolean
  visible: boolean
}

// MCP client info (from protocol)
export interface MCPClientInfo {
  name: string
  version: string
}
