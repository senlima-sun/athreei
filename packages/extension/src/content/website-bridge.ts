/**
 * Website bridge for handling custom tool registration and execution
 */

import type {
  AiiiRegisterEvent,
  AiiiResponseEvent,
  AiiiPermissionEvent,
  AiiiRequestEvent,
} from "@athreei/shared"
import { getRegistry, type RegisteredTool } from "./registry"
import { generateRequestId, dispatchRequest } from "./events"

/**
 * Pending request tracker for matching responses to requests
 */
interface PendingRequest {
  requestId: string
  toolName: string
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

/**
 * Bridge for website integration via aiii:* events
 */
export class WebsiteBridge {
  private origin: string
  private pendingRequests = new Map<string, PendingRequest>()
  private defaultTimeout = 30000 // 30 seconds

  // Event listener references for cleanup
  private registerListener: ((event: Event) => void) | null = null
  private responseListener: ((event: Event) => void) | null = null
  private permissionListener: ((event: Event) => void) | null = null

  constructor(origin: string) {
    this.origin = origin
  }

  /**
   * Initialize the bridge and set up event listeners
   */
  init(): void {
    this.registerListener = this.handleRegister.bind(this)
    this.responseListener = this.handleResponse.bind(this)
    this.permissionListener = this.handlePermission.bind(this)

    window.addEventListener("aiii:register", this.registerListener)
    window.addEventListener("aiii:response", this.responseListener)
    window.addEventListener("aiii:permission", this.permissionListener)
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.registerListener) {
      window.removeEventListener("aiii:register", this.registerListener)
    }
    if (this.responseListener) {
      window.removeEventListener("aiii:response", this.responseListener)
    }
    if (this.permissionListener) {
      window.removeEventListener("aiii:permission", this.permissionListener)
    }

    // Clear all pending requests
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeoutId)
      request.reject(new Error("Bridge destroyed"))
    }
    this.pendingRequests.clear()
  }

  /**
   * Handle tool registration from website
   */
  private handleRegister(event: Event): void {
    const customEvent = event as CustomEvent<AiiiRegisterEvent>
    const detail = customEvent.detail

    if (!detail || !detail.tool || !detail.description) {
      console.warn("[athreei] Invalid tool registration:", detail)
      return
    }

    const registry = getRegistry()
    const tool: RegisteredTool = {
      name: detail.tool,
      description: detail.description,
      parameters: detail.parameters,
      origin: this.origin,
      requiresPermission: detail.requiresPermission ?? true,
      returns: detail.returns,
      examples: detail.examples,
    }

    registry.register(tool)
    console.log(`[athreei] Registered custom tool: ${detail.tool}`)
  }

  /**
   * Handle response from website for custom tool execution
   */
  private handleResponse(event: Event): void {
    const customEvent = event as CustomEvent<AiiiResponseEvent>
    const detail = customEvent.detail

    if (!detail || !detail.requestId) {
      console.warn("[athreei] Invalid response event:", detail)
      return
    }

    const pending = this.pendingRequests.get(detail.requestId)
    if (!pending) {
      console.warn(
        `[athreei] Received response for unknown request: ${detail.requestId}`
      )
      return
    }

    // Clear timeout
    clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(detail.requestId)

    // Resolve or reject based on response
    if (detail.success) {
      pending.resolve(detail.result)
    } else {
      const error = new Error(detail.error || "Tool execution failed")
      if (detail.errorCode) {
        ;(error as any).code = detail.errorCode
      }
      pending.reject(error)
    }
  }

  /**
   * Handle permission request from website
   */
  private handlePermission(event: Event): void {
    const customEvent = event as CustomEvent<AiiiPermissionEvent>
    const detail = customEvent.detail

    if (!detail || !detail.scope) {
      console.warn("[athreei] Invalid permission request:", detail)
      return
    }

    // Check if chrome.runtime is available
    if (!chrome?.runtime) {
      console.error("[athreei] chrome.runtime not available")
      this.dispatchPermissionResponse(detail.scope, "deny", false)
      return
    }

    // Generate requestId if not provided
    const requestId = crypto.randomUUID()

    console.log("[athreei] Permission request:", detail)

    // Send message to background script
    chrome.runtime
      .sendMessage({
        type: "permission_request",
        requestId,
        origin: this.origin,
        scope: detail.scope,
        description: detail.reason,
        aiApp: undefined, // Will be filled by background if available
      })
      .then((response: { decision: string; remember: boolean }) => {
        // Dispatch response back to website
        this.dispatchPermissionResponse(
          requestId,
          response.decision as "allow" | "deny" | "allow_once",
          response.remember
        )
      })
      .catch((error) => {
        console.error("[athreei] Permission request failed:", error)
        this.dispatchPermissionResponse(requestId, "deny", false)
      })
  }

  /**
   * Dispatch permission response to website
   */
  private dispatchPermissionResponse(
    requestId: string,
    decision: "allow" | "deny" | "allow_once",
    remember: boolean
  ): void {
    const event = new CustomEvent("aiii:permission-response", {
      detail: {
        requestId,
        decision,
        remember,
      },
    })
    window.dispatchEvent(event)
  }

  /**
   * Execute a custom tool registered by the website
   */
  async executeCustomTool(
    toolName: string,
    args: Record<string, unknown>,
    options?: {
      timeout?: number
      aiApp?: string
    }
  ): Promise<unknown> {
    const registry = getRegistry()
    const tool = registry.get(toolName, this.origin)

    if (!tool) {
      throw new Error(`Custom tool not found: ${toolName}`)
    }

    // Validate required parameters
    this.validateArgs(tool, args)

    // Generate request ID
    const requestId = generateRequestId()
    const timeout = options?.timeout ?? this.defaultTimeout

    // Create promise that will be resolved when response arrives
    const promise = new Promise<unknown>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(
          new Error(
            `Custom tool execution timeout after ${timeout}ms: ${toolName}`
          )
        )
      }, timeout)

      this.pendingRequests.set(requestId, {
        requestId,
        toolName,
        resolve,
        reject,
        timeoutId,
      })
    })

    // Dispatch request to website
    const requestDetail: AiiiRequestEvent = {
      requestId,
      tool: toolName,
      args,
      origin: this.origin,
      aiApp: options?.aiApp,
      timestamp: Date.now(),
    }

    dispatchRequest(requestDetail)

    return promise
  }

  /**
   * Validate tool arguments against parameter schema
   */
  private validateArgs(
    tool: RegisteredTool,
    args: Record<string, unknown>
  ): void {
    for (const [paramName, paramSchema] of Object.entries(tool.parameters)) {
      const value = args[paramName]

      // Check required parameters
      if (paramSchema.required && value === undefined) {
        throw new Error(
          `Missing required parameter: ${paramName} for tool ${tool.name}`
        )
      }

      // Type validation (basic)
      if (value !== undefined) {
        const actualType = Array.isArray(value)
          ? "array"
          : typeof value === "object" && value !== null
            ? "object"
            : typeof value

        if (paramSchema.type !== actualType) {
          throw new Error(
            `Invalid type for parameter ${paramName}: expected ${paramSchema.type}, got ${actualType}`
          )
        }

        // Enum validation
        if (
          paramSchema.enum &&
          !paramSchema.enum.includes(value as string | number)
        ) {
          throw new Error(
            `Invalid value for parameter ${paramName}: must be one of ${paramSchema.enum.join(", ")}`
          )
        }
      }
    }
  }

  /**
   * Get all custom tools registered for this origin
   */
  getCustomTools(): RegisteredTool[] {
    const registry = getRegistry()
    return registry.getByOrigin(this.origin)
  }

  /**
   * Check if a tool is a custom tool
   */
  isCustomTool(toolName: string): boolean {
    const registry = getRegistry()
    return registry.isCustomTool(toolName, this.origin)
  }
}

// Singleton instance
let bridge: WebsiteBridge | null = null

export function getWebsiteBridge(): WebsiteBridge {
  if (!bridge) {
    throw new Error(
      "WebsiteBridge not initialized. Call initWebsiteBridge() first."
    )
  }
  return bridge
}

export function initWebsiteBridge(origin: string): WebsiteBridge {
  if (bridge) {
    bridge.destroy()
  }
  bridge = new WebsiteBridge(origin)
  bridge.init()
  return bridge
}
