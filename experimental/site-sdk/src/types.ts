/**
 * Public types for the athreei SDK
 */

// Re-export event types from shared
export type {
  AiiiReadyEvent,
  AiiiRequestEvent,
  AiiiResponseEvent,
  AiiiRegisterEvent,
  AiiiPermissionEvent,
  AiiiToolParameter,
  AiiiActionBeforeEvent,
  AiiiActionAfterEvent,
} from "@athreei/shared"

/**
 * Permission scope for AI actions
 */
export type PermissionScope =
  | "read"
  | "interact"
  | "navigate"
  | "screenshot"
  | "execute"
  | "custom"

/**
 * How long a permission should last
 */
export type PermissionDuration = "session" | "persistent" | "once"

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object"
  required?: boolean
  default?: unknown
  description?: string
  enum?: (string | number)[]
  items?: {
    type: "string" | "number" | "boolean" | "object"
  }
}

/**
 * Tool definition for registration
 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  handler?: RequestHandler
  returns?: {
    type: "string" | "number" | "boolean" | "array" | "object" | "void"
    description?: string
  }
  examples?: Array<{
    description: string
    args: Record<string, unknown>
    result?: unknown
  }>
  requiresPermission?: boolean
}

/**
 * Handler function for tool requests
 */
export type RequestHandler = (
  args: Record<string, unknown>,
  requestId: string
) => unknown | Promise<unknown>

/**
 * Information about the athreei extension
 */
export interface AthreeiInfo {
  version: string
  capabilities: string[]
  extensionId?: string
}

/**
 * Options for requesting permission
 */
export interface PermissionOptions {
  scopes?: PermissionScope[]
  scope?: PermissionScope
  tools?: string[]
  reason?: string
  duration?: PermissionDuration
}

/**
 * Action event callback
 */
export type ActionCallback = (action: {
  requestId: string
  tool: string
  args: Record<string, unknown>
  timestamp: number
  origin: string
  aiApp?: string
}) => void | boolean | Promise<void | boolean>

/**
 * Action result callback
 */
export type ActionResultCallback = (action: {
  requestId: string
  tool: string
  success: boolean
  result?: unknown
  error?: string
  timestamp: number
  duration: number
}) => void | Promise<void>

/**
 * Options for AthreeiClient
 */
export interface AthreeiClientOptions {
  debug?: boolean
  timeout?: number
  mockMode?: boolean
}

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void
