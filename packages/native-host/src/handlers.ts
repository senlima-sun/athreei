/**
 * Message Handlers
 *
 * Route incoming requests from the extension to appropriate handlers.
 * Each browser tool method maps to a handler function.
 */

import type { NativeRequest, NativeResponse } from "@athreei/shared"
import { createResponse } from "./protocol.js"

/**
 * Handler function type
 */
type HandlerFunction = (payload: Record<string, unknown>) => Promise<unknown>

/**
 * Registry of handlers for each method
 */
const handlers = new Map<string, HandlerFunction>()

/**
 * Register a handler for a method
 */
export function registerHandler(method: string, handler: HandlerFunction): void {
  if (handlers.has(method)) {
    console.error(`[handlers] Overwriting existing handler for method: ${method}`)
  }
  handlers.set(method, handler)
  console.error(`[handlers] Registered handler: ${method}`)
}

/**
 * Handle an incoming request message
 */
export async function handleRequest(request: NativeRequest): Promise<NativeResponse> {
  const { id, method, payload } = request

  console.error(`[handlers] Handling request: ${method} (id: ${id})`)

  try {
    const handler = handlers.get(method)

    if (!handler) {
      console.error(`[handlers] No handler for method: ${method}`)
      return createResponse(id, false, null, `Unknown method: ${method}`)
    }

    const result = await handler(payload)
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
 * Note: These are placeholder implementations.
 * The actual implementation will forward these to the Chrome extension.
 * For now, they return mock responses to test the protocol.
 */
export function initializeHandlers(): void {
  // Heartbeat/ping handler for health checks
  registerHandler("ping", async () => {
    return { pong: true, timestamp: Date.now() }
  })

  // Browser tool handlers (will be implemented in Phase 3)
  // These will forward requests to the Chrome extension via chrome.runtime.sendNativeMessage

  registerHandler("browser_list_tabs", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_list_tabs called with:", payload)
    return {
      tabs: [],
      // Will be populated by extension
    }
  })

  registerHandler("browser_get_active_tab", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_get_active_tab called with:", payload)
    return {
      id: 0,
      url: "",
      title: "",
      windowId: 0,
      // Will be populated by extension
    }
  })

  registerHandler("browser_navigate", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_navigate called with:", payload)
    return {
      success: false,
      url: "",
      title: "",
      // Will be populated by extension
    }
  })

  registerHandler("browser_get_content", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_get_content called with:", payload)
    return {
      content: "",
      format: "a11y",
      url: "",
      title: "",
      // Will be populated by extension
    }
  })

  registerHandler("browser_get_elements", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_get_elements called with:", payload)
    return {
      elements: [],
      count: 0,
      // Will be populated by extension
    }
  })

  registerHandler("browser_click", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_click called with:", payload)
    return {
      success: false,
      clicked: {
        selector: "",
        text: "",
      },
      // Will be populated by extension
    }
  })

  registerHandler("browser_type", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_type called with:", payload)
    return {
      success: false,
      typed: {
        selector: "",
        text: "",
      },
      // Will be populated by extension
    }
  })

  registerHandler("browser_scroll", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_scroll called with:", payload)
    return {
      success: false,
      scrollPosition: { x: 0, y: 0 },
      // Will be populated by extension
    }
  })

  registerHandler("browser_screenshot", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_screenshot called with:", payload)
    return {
      success: false,
      image: "",
      format: "png",
      dimensions: { width: 0, height: 0 },
      // Will be populated by extension
    }
  })

  registerHandler("browser_execute_script", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_execute_script called with:", payload)
    return {
      success: false,
      result: null,
      // Will be populated by extension
    }
  })

  registerHandler("browser_wait", async (payload) => {
    // TODO: Forward to extension
    console.error("[handlers] browser_wait called with:", payload)
    return {
      success: false,
      waited: 0,
      timedOut: true,
      // Will be populated by extension
    }
  })

  console.error(`[handlers] Initialized ${handlers.size} handlers`)
}

/**
 * Get list of registered methods
 */
export function getRegisteredMethods(): string[] {
  return Array.from(handlers.keys())
}
