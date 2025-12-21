/**
 * Message Handlers
 *
 * Route incoming requests from the extension to appropriate handlers.
 * Each browser tool method maps to a handler function.
 */

import { z } from "zod"
import type { NativeRequest, NativeResponse } from "@athreei/shared"
import { createResponse } from "./protocol.js"

/**
 * Stub response marker - indicates handler is not yet implemented
 */
interface StubResponse {
  stub: true
  message: string
}

function createStubResponse(method: string): StubResponse {
  return {
    stub: true,
    message: `Handler '${method}' is not yet implemented. Will forward to Chrome extension.`,
  }
}

/**
 * Handler function type with typed payload validation
 */
type HandlerFunction<TPayload = unknown, TResult = unknown> = (payload: TPayload) => Promise<TResult>

/**
 * Handler definition with optional payload schema
 */
interface HandlerDefinition {
  handler: HandlerFunction
  payloadSchema?: z.ZodType
}

/**
 * Registry of handlers for each method
 */
const handlers = new Map<string, HandlerDefinition>()

/**
 * Register a handler for a method with optional payload schema
 */
export function registerHandler<TPayload, TResult>(
  method: string,
  handler: HandlerFunction<TPayload, TResult>,
  payloadSchema?: z.ZodType<TPayload>
): void {
  if (handlers.has(method)) {
    throw new Error(`Handler already registered for method: ${method}. Remove it first if you want to replace.`)
  }
  handlers.set(method, {
    handler: handler as HandlerFunction,
    payloadSchema,
  })
  console.error(`[handlers] Registered handler: ${method}`)
}

/**
 * Remove a handler for a method
 */
export function removeHandler(method: string): boolean {
  return handlers.delete(method)
}

/**
 * Clear all handlers (useful for testing)
 */
export function clearHandlers(): void {
  handlers.clear()
}

/**
 * Handle an incoming request message
 */
export async function handleRequest(request: NativeRequest): Promise<NativeResponse> {
  const { id, method, payload } = request

  console.error(`[handlers] Handling request: ${method} (id: ${id})`)

  try {
    const definition = handlers.get(method)

    if (!definition) {
      console.error(`[handlers] No handler for method: ${method}`)
      return createResponse(id, false, null, `Unknown method: ${method}`)
    }

    // Validate payload if schema is provided
    let validatedPayload = payload
    if (definition.payloadSchema) {
      const result = definition.payloadSchema.safeParse(payload)
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        console.error(`[handlers] Payload validation failed for ${method}: ${issues}`)
        return createResponse(id, false, null, `Invalid payload: ${issues}`)
      }
      validatedPayload = result.data
    }

    const result = await definition.handler(validatedPayload)
    return createResponse(id, true, result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[handlers] Error handling ${method}:`, errorMessage)
    return createResponse(id, false, null, errorMessage)
  }
}

/**
 * Payload schemas for browser tool handlers
 */
const BrowserListTabsPayload = z.object({}).passthrough()

const BrowserGetActiveTabPayload = z.object({}).passthrough()

const BrowserNavigatePayload = z.object({
  url: z.string().url(),
  tabId: z.number().optional(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
})

const BrowserGetContentPayload = z.object({
  tabId: z.number().optional(),
  format: z.enum(["a11y", "html", "text", "markdown"]).optional(),
  selector: z.string().optional(),
})

const BrowserGetElementsPayload = z.object({
  tabId: z.number().optional(),
  selector: z.string().optional(),
  role: z.string().optional(),
  text: z.string().optional(),
  limit: z.number().optional(),
})

const BrowserClickPayload = z.object({
  tabId: z.number().optional(),
  selector: z.string().optional(),
  index: z.number().optional(),
  text: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
})

const BrowserTypePayload = z.object({
  tabId: z.number().optional(),
  selector: z.string(),
  text: z.string(),
  clear: z.boolean().optional(),
  submit: z.boolean().optional(),
})

const BrowserScrollPayload = z.object({
  tabId: z.number().optional(),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  amount: z.number().optional(),
  selector: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
})

const BrowserScreenshotPayload = z.object({
  tabId: z.number().optional(),
  selector: z.string().optional(),
  format: z.enum(["png", "jpeg", "webp"]).optional(),
  quality: z.number().min(0).max(100).optional(),
  fullPage: z.boolean().optional(),
})

const BrowserExecuteScriptPayload = z.object({
  tabId: z.number().optional(),
  script: z.string(),
  args: z.array(z.unknown()).optional(),
})

const BrowserWaitPayload = z.object({
  tabId: z.number().optional(),
  selector: z.string().optional(),
  state: z.enum(["attached", "detached", "visible", "hidden"]).optional(),
  timeout: z.number().optional(),
  text: z.string().optional(),
})

/**
 * Initialize built-in handlers
 *
 * Note: Browser tool handlers are stubs that will forward to Chrome extension.
 * The ping handler is fully implemented for health checks.
 */
export function initializeHandlers(): void {
  // Heartbeat/ping handler for health checks (fully implemented)
  registerHandler(
    "ping",
    async () => {
      return { pong: true, timestamp: Date.now() }
    },
    z.object({}).passthrough()
  )

  // Browser tool handlers (stubs - will forward to Chrome extension)
  registerHandler(
    "browser_list_tabs",
    async () => createStubResponse("browser_list_tabs"),
    BrowserListTabsPayload
  )

  registerHandler(
    "browser_get_active_tab",
    async () => createStubResponse("browser_get_active_tab"),
    BrowserGetActiveTabPayload
  )

  registerHandler(
    "browser_navigate",
    async () => createStubResponse("browser_navigate"),
    BrowserNavigatePayload
  )

  registerHandler(
    "browser_get_content",
    async () => createStubResponse("browser_get_content"),
    BrowserGetContentPayload
  )

  registerHandler(
    "browser_get_elements",
    async () => createStubResponse("browser_get_elements"),
    BrowserGetElementsPayload
  )

  registerHandler(
    "browser_click",
    async () => createStubResponse("browser_click"),
    BrowserClickPayload
  )

  registerHandler(
    "browser_type",
    async () => createStubResponse("browser_type"),
    BrowserTypePayload
  )

  registerHandler(
    "browser_scroll",
    async () => createStubResponse("browser_scroll"),
    BrowserScrollPayload
  )

  registerHandler(
    "browser_screenshot",
    async () => createStubResponse("browser_screenshot"),
    BrowserScreenshotPayload
  )

  registerHandler(
    "browser_execute_script",
    async () => createStubResponse("browser_execute_script"),
    BrowserExecuteScriptPayload
  )

  registerHandler(
    "browser_wait",
    async () => createStubResponse("browser_wait"),
    BrowserWaitPayload
  )

  console.error(`[handlers] Initialized ${handlers.size} handlers`)
}

/**
 * Get list of registered methods
 */
export function getRegisteredMethods(): string[] {
  return Array.from(handlers.keys())
}
