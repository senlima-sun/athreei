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
 * Handler function type with typed payload validation
 */
type HandlerFunction<TPayload = unknown, TResult = unknown> = (
  payload: TPayload
) => Promise<TResult>

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
    throw new Error(
      `Handler already registered for method: ${method}. Remove it first if you want to replace.`
    )
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
export async function handleRequest(
  request: NativeRequest
): Promise<NativeResponse> {
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
        const issues = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ")
        console.error(
          `[handlers] Payload validation failed for ${method}: ${issues}`
        )
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
 * Initialize built-in handlers
 *
 * Note: Browser tool handlers are removed - requests will be forwarded to Chrome extension via IPC.
 * Only the ping handler remains for health checks.
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

  console.error(`[handlers] Initialized ${handlers.size} handlers`)
}

/**
 * Get list of registered methods
 */
export function getRegisteredMethods(): string[] {
  return Array.from(handlers.keys())
}
