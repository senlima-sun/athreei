/**
 * Core type definitions for athreei
 *
 * Note: MCP tool schemas are in ./mcp-tools.ts
 * Note: aiii:* event schemas are in ./aiii-events.ts
 * Note: Server/CLI config types are in ./server-config.ts and ./cli-config.ts
 */

// Re-export server and CLI configuration types
export * from "./server-config.js"
export * from "./cli-config.js"

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

// ============================================================================
// Content Script Action Types
// ============================================================================

export type AiiiToolType =
  | "click"
  | "type"
  | "navigate"
  | "scroll"
  | "select"
  | "screenshot"
  | "wait"
  | "form"
  | "get_content"
  | "get_elements"
  | "execute_script"

export type AiiiToolArgs =
  | AiiiClickArgs
  | AiiiTypeArgs
  | AiiiNavigateArgs
  | AiiiScrollArgs
  | AiiiSelectArgs
  | AiiiWaitArgs
  | AiiiFormArgs
  | AiiiGetContentArgs
  | AiiiGetElementsArgs
  | AiiiExecuteScriptArgs

export interface AiiiClickArgs {
  selector?: string
  text?: string
  x?: number
  y?: number
  button?: "left" | "right" | "middle"
  clickCount?: number
  modifiers?: Array<"ctrl" | "shift" | "alt" | "meta">
}

export interface AiiiTypeArgs {
  selector: string
  text: string
  clear?: boolean
  delay?: number
  submit?: boolean
}

export interface AiiiNavigateArgs {
  url: string
  waitUntil?: "load" | "domcontentloaded" | "networkidle"
}

export interface AiiiScrollArgs {
  selector?: string
  direction?: "up" | "down" | "left" | "right"
  amount?: number
  x?: number
  y?: number
  behavior?: "auto" | "smooth"
}

export interface AiiiSelectArgs {
  selector: string
  value: string | string[]
}

export interface AiiiWaitArgs {
  selector?: string
  state?: "attached" | "detached" | "visible" | "hidden"
  timeout?: number
  text?: string
  condition?: string
}

export interface AiiiFormArgs {
  selector: string
  action: "submit" | "reset" | "get-values" | "set-values"
  values?: Record<string, unknown>
}

export interface AiiiGetContentArgs {
  format?: "accessibility" | "html" | "text" | "markdown"
  selector?: string
}

export interface AiiiGetElementsArgs {
  filter?: string
}

export interface AiiiExecuteScriptArgs {
  script: string
}

export type AiiiActionBeforeDetail = {
  requestId: string
  tool: string
  args: Record<string, unknown>
  timestamp: number
  origin: string
  aiApp?: string
  cancellable?: boolean
}

export type AiiiActionAfterDetail = {
  requestId: string
  tool: string
  success: boolean
  result?: unknown
  error?: string
  timestamp: number
  duration: number
}

// ============================================================================
// Permission Request/Response Messages
// ============================================================================

/**
 * Message from content script to background for permission requests
 */
export interface PermissionRequestMessage {
  type: "permission_request"
  requestId: string
  origin: string
  scope: string
  description?: string
  aiApp?: string
}

/**
 * Response from background to content script for permission requests
 */
export interface PermissionResponseMessage {
  type: "permission_response"
  requestId: string
  decision: "allow" | "deny" | "allow_once"
  remember: boolean
}
