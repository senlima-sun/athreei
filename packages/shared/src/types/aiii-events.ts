/**
 * aiii:* Event Types
 *
 * Custom events for website integration with athreei.
 * These events allow websites to:
 * - Know when the extension is ready
 * - Register custom tools
 * - Handle AI requests with custom logic
 * - Request specific permission scopes
 */

import { z } from "zod"

// ============================================================================
// Event Names
// ============================================================================

export const AIII_EVENT_NAMES = [
  "aiii:ready",
  "aiii:request",
  "aiii:response",
  "aiii:register",
  "aiii:permission",
] as const

export type AiiiEventName = (typeof AIII_EVENT_NAMES)[number]

// ============================================================================
// aiii:ready - Extension → Page
// ============================================================================

/**
 * Dispatched by the extension when it's ready to receive events.
 * Websites should listen for this before registering tools.
 */
export const AiiiReadyEventSchema = z.object({
  version: z.string().describe("Extension version"),
  capabilities: z
    .array(z.string())
    .describe("Available built-in capabilities"),
  extensionId: z.string().optional().describe("Extension ID"),
})

export type AiiiReadyEvent = z.infer<typeof AiiiReadyEventSchema>

// ============================================================================
// aiii:request - Extension → Page
// ============================================================================

/**
 * Dispatched by the extension when an AI app requests a tool call.
 * For custom tools registered by the website, the website should handle
 * this and respond with aiii:response.
 */
export const AiiiRequestEventSchema = z.object({
  requestId: z
    .string()
    .describe("Unique ID for correlating request/response"),
  tool: z.string().describe("Name of the tool being called"),
  args: z
    .record(z.unknown())
    .describe("Arguments passed to the tool"),
  origin: z.string().describe("Origin of the AI request"),
  aiApp: z.string().optional().describe("Name of the AI app making the request"),
  timestamp: z.number().describe("Unix timestamp of the request"),
})

export type AiiiRequestEvent = z.infer<typeof AiiiRequestEventSchema>

// ============================================================================
// aiii:response - Page → Extension
// ============================================================================

/**
 * Dispatched by the website in response to aiii:request.
 * Must include the matching requestId.
 */
export const AiiiResponseEventSchema = z.object({
  requestId: z.string().describe("ID from the original request"),
  success: z.boolean().describe("Whether the operation succeeded"),
  result: z.unknown().optional().describe("Result data on success"),
  error: z.string().optional().describe("Error message on failure"),
  errorCode: z.string().optional().describe("Machine-readable error code"),
})

export type AiiiResponseEvent = z.infer<typeof AiiiResponseEventSchema>

// ============================================================================
// aiii:register - Page → Extension
// ============================================================================

/**
 * Dispatched by the website to register custom tools.
 * Custom tools allow websites to expose their own functionality to AI apps.
 */
export const AiiiToolParameterSchema = z.object({
  type: z
    .enum(["string", "number", "boolean", "array", "object"])
    .describe("Parameter type"),
  required: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether parameter is required"),
  default: z.unknown().optional().describe("Default value if not provided"),
  description: z
    .string()
    .optional()
    .describe("Human-readable description"),
  enum: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .describe("Allowed values"),
  items: z
    .object({
      type: z.enum(["string", "number", "boolean", "object"]),
    })
    .optional()
    .describe("For array type, the type of items"),
})

export const AiiiRegisterEventSchema = z.object({
  tool: z.string().describe("Unique tool name (will be prefixed with origin)"),
  description: z.string().describe("Human-readable description of what the tool does"),
  parameters: z
    .record(AiiiToolParameterSchema)
    .describe("Tool parameters schema"),
  returns: z
    .object({
      type: z.enum(["string", "number", "boolean", "array", "object", "void"]),
      description: z.string().optional(),
    })
    .optional()
    .describe("Description of return value"),
  examples: z
    .array(
      z.object({
        description: z.string(),
        args: z.record(z.unknown()),
        result: z.unknown().optional(),
      })
    )
    .optional()
    .describe("Example usages for AI context"),
  requiresPermission: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether this tool requires user permission"),
})

export type AiiiRegisterEvent = z.infer<typeof AiiiRegisterEventSchema>
export type AiiiToolParameter = z.infer<typeof AiiiToolParameterSchema>

// ============================================================================
// aiii:permission - Page → Extension
// ============================================================================

/**
 * Dispatched by the website to request a specific permission scope.
 * This allows websites to pre-request permissions for a better UX.
 */
export const AiiiPermissionEventSchema = z.object({
  scope: z
    .enum([
      "read",      // Read page content
      "interact",  // Click, type, scroll
      "navigate",  // Navigate to URLs
      "screenshot", // Take screenshots
      "execute",   // Execute scripts
      "custom",    // Custom tools only
    ])
    .describe("Permission scope being requested"),
  tools: z
    .array(z.string())
    .optional()
    .describe("Specific tools to request (for granular permissions)"),
  reason: z
    .string()
    .optional()
    .describe("Human-readable reason for the permission request"),
  duration: z
    .enum(["session", "persistent", "once"])
    .optional()
    .default("session")
    .describe("How long the permission should last"),
})

export type AiiiPermissionEvent = z.infer<typeof AiiiPermissionEventSchema>

// ============================================================================
// Extension → Page Action Events (for observation/interception)
// ============================================================================

/**
 * Dispatched before the extension performs a built-in action.
 * Websites can listen to observe or potentially intercept.
 */
export const AiiiActionBeforeEventSchema = z.object({
  requestId: z.string(),
  tool: z.string(),
  args: z.record(z.unknown()),
  timestamp: z.number(),
  origin: z.string(),
  aiApp: z.string().optional(),
  cancellable: z.boolean().describe("Whether the website can cancel this action"),
})

export type AiiiActionBeforeEvent = z.infer<typeof AiiiActionBeforeEventSchema>

/**
 * Dispatched after the extension completes a built-in action.
 */
export const AiiiActionAfterEventSchema = z.object({
  requestId: z.string(),
  tool: z.string(),
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
  duration: z.number().describe("Time taken in ms"),
})

export type AiiiActionAfterEvent = z.infer<typeof AiiiActionAfterEventSchema>

/**
 * Dispatched by the website to cancel a cancellable action.
 */
export const AiiiCancelEventSchema = z.object({
  requestId: z.string(),
  reason: z.string().optional(),
})

export type AiiiCancelEvent = z.infer<typeof AiiiCancelEventSchema>

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Union of all event payload types
 */
export type AiiiEventPayload =
  | AiiiReadyEvent
  | AiiiRequestEvent
  | AiiiResponseEvent
  | AiiiRegisterEvent
  | AiiiPermissionEvent
  | AiiiActionBeforeEvent
  | AiiiActionAfterEvent
  | AiiiCancelEvent

/**
 * Type-safe event dispatcher helper
 */
export interface AiiiEventMap {
  "aiii:ready": AiiiReadyEvent
  "aiii:request": AiiiRequestEvent
  "aiii:response": AiiiResponseEvent
  "aiii:register": AiiiRegisterEvent
  "aiii:permission": AiiiPermissionEvent
  "aiii:action:before": AiiiActionBeforeEvent
  "aiii:action:after": AiiiActionAfterEvent
  "aiii:cancel": AiiiCancelEvent
}

/**
 * Schema registry for validation
 */
export const AIII_EVENT_SCHEMAS = {
  "aiii:ready": AiiiReadyEventSchema,
  "aiii:request": AiiiRequestEventSchema,
  "aiii:response": AiiiResponseEventSchema,
  "aiii:register": AiiiRegisterEventSchema,
  "aiii:permission": AiiiPermissionEventSchema,
  "aiii:action:before": AiiiActionBeforeEventSchema,
  "aiii:action:after": AiiiActionAfterEventSchema,
  "aiii:cancel": AiiiCancelEventSchema,
} as const
