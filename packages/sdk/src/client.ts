/**
 * AthreeiClient - Main client class for athreei SDK
 */

import type {
  ToolDefinition,
  RequestHandler,
  AthreeiInfo,
  PermissionOptions,
  AthreeiClientOptions,
  ActionCallback,
  ActionResultCallback,
  Unsubscribe,
  AiiiRequestEvent,
  AiiiResponseEvent,
  AiiiRegisterEvent,
  AiiiPermissionEvent,
} from "./types"

import {
  dispatchAiiiEvent,
  listenForAiiiEvent,
  waitForEvent,
  isBrowser,
  AIII_EVENT_NAMES,
} from "./events"

/**
 * AthreeiClient - Advanced API for athreei integration
 */
export class AthreeiClient {
  private options: Required<AthreeiClientOptions>
  private handlers = new Map<string, RequestHandler>()
  private readyPromise: Promise<AthreeiInfo> | null = null
  private unsubscribers: Unsubscribe[] = []

  constructor(options: AthreeiClientOptions = {}) {
    if (!isBrowser()) {
      throw new Error("AthreeiClient can only be used in a browser environment")
    }

    this.options = {
      debug: options.debug ?? false,
      timeout: options.timeout ?? 30000,
      mockMode: options.mockMode ?? false,
    }

    this.initialize()
  }

  private initialize() {
    // Listen for requests from extension
    const unsubRequest = listenForAiiiEvent(AIII_EVENT_NAMES.REQUEST, (detail) => {
      this.handleRequest(detail)
    })
    this.unsubscribers.push(unsubRequest)

    this.log("AthreeiClient initialized")
  }

  private log(...args: unknown[]) {
    if (this.options.debug) {
      console.log("[athreei SDK]", ...args)
    }
  }

  private async handleRequest(request: AiiiRequestEvent) {
    this.log("Received request:", request)

    const handler = this.handlers.get(request.tool)
    if (!handler) {
      this.log(`No handler registered for tool: ${request.tool}`)
      this.sendResponse({
        requestId: request.requestId,
        success: false,
        error: `No handler registered for tool: ${request.tool}`,
        errorCode: "HANDLER_NOT_FOUND",
      })
      return
    }

    try {
      const result = await handler(request.args, request.requestId)
      this.sendResponse({
        requestId: request.requestId,
        success: true,
        result,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`Handler error for ${request.tool}:`, error)
      this.sendResponse({
        requestId: request.requestId,
        success: false,
        error: errorMessage,
        errorCode: "HANDLER_ERROR",
      })
    }
  }

  private sendResponse(response: AiiiResponseEvent) {
    this.log("Sending response:", response)
    dispatchAiiiEvent(AIII_EVENT_NAMES.RESPONSE, response)
  }

  /**
   * Wait for the extension to be ready
   */
  async waitForReady(): Promise<AthreeiInfo> {
    if (this.readyPromise) {
      return this.readyPromise
    }

    this.readyPromise = waitForEvent(AIII_EVENT_NAMES.READY, this.options.timeout)
      .then((info) => {
        this.log("Extension ready:", info)
        return info
      })
      .catch((error) => {
        this.readyPromise = null
        throw error
      })

    return this.readyPromise
  }

  /**
   * Register a custom tool
   */
  registerTool(definition: ToolDefinition): void {
    const { name, description, parameters, handler, returns, examples, requiresPermission } = definition

    // Store handler if provided
    if (handler) {
      this.handlers.set(name, handler)
    }

    // Convert parameters to match AiiiToolParameter format
    const convertedParams: Record<string, {
      type: "string" | "number" | "boolean" | "object" | "array"
      required: boolean
      default?: unknown
      description?: string
      enum?: (string | number)[]
      items?: { type: "string" | "number" | "boolean" | "object" }
    }> = {}

    for (const [key, param] of Object.entries(parameters)) {
      convertedParams[key] = {
        ...param,
        required: param.required ?? false,
      }
    }

    // Dispatch registration event
    const registerEvent: AiiiRegisterEvent = {
      tool: name,
      description,
      parameters: convertedParams,
      returns,
      examples,
      requiresPermission: requiresPermission ?? true,
    }

    this.log("Registering tool:", name)
    dispatchAiiiEvent(AIII_EVENT_NAMES.REGISTER, registerEvent)
  }

  /**
   * Register a handler for a specific tool
   */
  onRequest(toolName: string, handler: RequestHandler): Unsubscribe {
    this.handlers.set(toolName, handler)
    this.log("Handler registered for:", toolName)

    // Return unsubscribe function
    return () => {
      this.handlers.delete(toolName)
      this.log("Handler unregistered for:", toolName)
    }
  }

  /**
   * Request permission from the user
   */
  async requestPermission(options: PermissionOptions): Promise<boolean> {
    console.warn("[athreei SDK] Permission system not yet fully implemented - returning true by default")

    // Normalize scopes
    const scopes = options.scopes || (options.scope ? [options.scope] : undefined)

    const permissionEvent: AiiiPermissionEvent = {
      scope: scopes?.[0] || "custom",
      tools: options.tools,
      reason: options.reason,
      duration: options.duration || "session",
    }

    this.log("Requesting permission:", permissionEvent)

    // Dispatch permission request
    dispatchAiiiEvent(AIII_EVENT_NAMES.PERMISSION, permissionEvent)

    // For now, we assume permission is granted if no error
    // In the future, this should wait for a response event
    // Since the permission event doesn't have a response mechanism yet,
    // we'll resolve immediately
    return true
  }

  /**
   * Listen for actions before they are executed
   */
  onBeforeAction(callback: ActionCallback): Unsubscribe {
    const unsubscribe = listenForAiiiEvent(AIII_EVENT_NAMES.ACTION_BEFORE, (detail, event) => {
      const result = callback({
        requestId: detail.requestId,
        tool: detail.tool,
        args: detail.args,
        timestamp: detail.timestamp,
        origin: detail.origin,
        aiApp: detail.aiApp,
      })

      // If callback returns false, prevent default
      if (result === false && event.cancelable) {
        event.preventDefault()
      }
    })

    this.unsubscribers.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Listen for actions after they are executed
   */
  onAfterAction(callback: ActionResultCallback): Unsubscribe {
    const unsubscribe = listenForAiiiEvent(AIII_EVENT_NAMES.ACTION_AFTER, (detail) => {
      callback({
        requestId: detail.requestId,
        tool: detail.tool,
        success: detail.success,
        result: detail.result,
        error: detail.error,
        timestamp: detail.timestamp,
        duration: detail.duration,
      })
    })

    this.unsubscribers.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Clean up all listeners
   */
  destroy(): void {
    this.log("Destroying client")
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.handlers.clear()
  }
}
