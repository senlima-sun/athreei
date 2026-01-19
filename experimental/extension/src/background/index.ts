/**
 * Service Worker (Background Script)
 *
 * Responsibilities:
 * - Manage native host connection
 * - Route messages between native host and content scripts
 * - Handle browser tab operations (chrome.tabs API)
 * - Track connection state with auto-reconnect
 * - Enforce permissions for browser operations
 */

import type {
  NativeRequest,
  NativeResponse,
  NativeMessage,
} from "@athreei/shared"

import { permissionManager } from "./permission-manager"
import { PermissionDeniedError } from "./types"
import { handlePermissionRequest } from "./permission-handler"

const NATIVE_HOST_NAME = "com.athreei.native_host"
const VERSION = "0.1.0"

// Reconnection configuration
const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 30000
const RETRY_BACKOFF_MULTIPLIER = 2

// Health check configuration
const HEALTH_CHECK_INTERVAL_MS = 30000
// @ts-expect-error Reserved for future use
const _HEALTH_CHECK_TIMEOUT_MS = 5000

// Default AI app name when not provided by MCP context
const DEFAULT_AI_APP = "AI Assistant"

// Current AI app name for the active request (extracted from MCP context)
let currentAiApp: string = DEFAULT_AI_APP

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"

interface ConnectionManager {
  state: ConnectionState
  port: chrome.runtime.Port | null
  retryCount: number
  retryTimeoutId: number | null
  healthCheckIntervalId: number | null
  pendingRequests: Map<string, PendingRequest>
}

interface PendingRequest {
  resolve: (response: NativeResponse) => void
  reject: (error: Error) => void
  timestamp: number
}

const connection: ConnectionManager = {
  state: "disconnected",
  port: null,
  retryCount: 0,
  retryTimeoutId: null,
  healthCheckIntervalId: null,
  pendingRequests: new Map(),
}

/**
 * Connect to the native host application
 */
function connectToNativeHost(): void {
  if (connection.state === "connecting" || connection.state === "connected") {
    console.log("[Background] Already connected or connecting")
    return
  }

  console.log("[Background] Connecting to native host:", NATIVE_HOST_NAME)
  connection.state = "connecting"

  try {
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME)

    port.onMessage.addListener(handleNativeMessage)
    port.onDisconnect.addListener(handleNativeDisconnect)

    connection.port = port
    connection.state = "connected"
    connection.retryCount = 0

    console.log("[Background] Connected to native host")

    startHealthCheck()

    broadcastConnectionStatus(true)
  } catch (error) {
    console.error("[Background] Failed to connect to native host:", error)
    connection.state = "disconnected"
    scheduleReconnect()
  }
}

/**
 * Disconnect from native host
 * @ts-expect-error Exported for debugging/testing purposes
 */
function _disconnectFromNativeHost(): void {
  if (connection.port) {
    connection.port.disconnect()
    connection.port = null
  }

  stopHealthCheck()
  connection.state = "disconnected"

  for (const [_id, pending] of connection.pendingRequests) {
    pending.reject(new Error("Native host disconnected"))
  }
  connection.pendingRequests.clear()

  broadcastConnectionStatus(false)
}

/**
 * Handle disconnect event from native host
 */
function handleNativeDisconnect(): void {
  const error = chrome.runtime.lastError
  console.log(
    "[Background] Native host disconnected:",
    error?.message || "Unknown reason"
  )

  connection.port = null
  connection.state = "disconnected"
  stopHealthCheck()

  for (const [_id, pending] of connection.pendingRequests) {
    pending.reject(new Error(error?.message || "Native host disconnected"))
  }
  connection.pendingRequests.clear()

  broadcastConnectionStatus(false)

  // Auto-reconnect
  scheduleReconnect()
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect(): void {
  if (connection.retryTimeoutId !== null) {
    return // Already scheduled
  }

  const delay = Math.min(
    INITIAL_RETRY_DELAY_MS *
      Math.pow(RETRY_BACKOFF_MULTIPLIER, connection.retryCount),
    MAX_RETRY_DELAY_MS
  )

  connection.retryCount++
  connection.state = "reconnecting"

  console.log(
    `[Background] Scheduling reconnect in ${delay}ms (attempt ${connection.retryCount})`
  )

  connection.retryTimeoutId = setTimeout(() => {
    connection.retryTimeoutId = null
    connectToNativeHost()
  }, delay) as unknown as number
}

/**
 * Start periodic health check
 */
function startHealthCheck(): void {
  stopHealthCheck()

  connection.healthCheckIntervalId = setInterval(() => {
    if (connection.state !== "connected") {
      return
    }

    sendToNativeHost({
      id: generateId(),
      type: "request",
      method: "ping",
      payload: {},
    }).catch((error) => {
      console.error("[Background] Health check failed:", error)
      // Don't disconnect here, let onDisconnect handle it
    })
  }, HEALTH_CHECK_INTERVAL_MS) as unknown as number
}

/**
 * Stop health check
 */
function stopHealthCheck(): void {
  if (connection.healthCheckIntervalId !== null) {
    clearInterval(connection.healthCheckIntervalId)
    connection.healthCheckIntervalId = null
  }
}

/**
 * Broadcast connection status to all tabs
 */
function broadcastConnectionStatus(connected: boolean): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "connection_status",
            connected,
          })
          .catch(() => {
            // Ignore errors (tab might not have content script)
          })
      }
    }
  })
}

/**
 * Handle messages from native host
 */
function handleNativeMessage(message: NativeMessage): void {
  console.log("[Background] Received from native host:", message)

  if (message.type === "response") {
    handleNativeResponse(message as NativeResponse)
  } else if (message.type === "request") {
    handleNativeRequest(message as NativeRequest)
  } else if (message.type === "event") {
    handleNativeEvent(message)
  }
}

/**
 * Handle response from native host
 */
function handleNativeResponse(response: NativeResponse): void {
  const pending = connection.pendingRequests.get(response.id)

  if (pending) {
    connection.pendingRequests.delete(response.id)
    pending.resolve(response)
  } else {
    console.warn(
      "[Background] Received response for unknown request:",
      response.id
    )
  }
}

/**
 * Handle request from native host (browser operations)
 */
async function handleNativeRequest(request: NativeRequest): Promise<void> {
  console.log("[Background] Handling native request:", request.method)

  const payload = request.payload as Record<string, unknown>
  currentAiApp = (payload._aiApp as string) || DEFAULT_AI_APP

  try {
    let result: unknown

    // Route to appropriate handler
    switch (request.method) {
      // Tab operations
      case "browser_list_tabs":
        result = await handleListTabs(request.payload)
        break

      case "browser_get_active_tab":
        result = await handleGetActiveTab(request.payload)
        break

      case "browser_navigate":
        result = await handleNavigate(request.payload)
        break

      case "browser_screenshot":
        result = await handleScreenshot(request.payload)
        break

      // Content operations - forward to content script
      case "browser_get_content":
      case "browser_get_elements":
      case "browser_click":
      case "browser_type":
      case "browser_scroll":
      case "browser_execute_script":
      case "browser_wait":
        result = await forwardToContentScript(request)
        break

      default:
        throw new Error(`Unknown method: ${request.method}`)
    }

    await sendResponseToNativeHost({
      id: request.id,
      type: "response",
      success: true,
      payload: result,
    })
  } catch (error) {
    await sendResponseToNativeHost({
      id: request.id,
      type: "response",
      success: false,
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Handle event from native host
 */
function handleNativeEvent(message: NativeMessage): void {
  console.log("[Background] Received event from native host:", message)
  // Events can be broadcast to content scripts if needed
}

/**
 * Send message to native host
 */
async function sendToNativeHost(
  message: NativeRequest
): Promise<NativeResponse> {
  if (!connection.port || connection.state !== "connected") {
    throw new Error("Not connected to native host")
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      connection.pendingRequests.delete(message.id)
      reject(new Error("Request timeout"))
    }, 30000) // 30 second timeout

    connection.pendingRequests.set(message.id, {
      resolve: (response) => {
        clearTimeout(timeout)
        resolve(response)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
      timestamp: Date.now(),
    })

    try {
      connection.port!.postMessage(message)
    } catch (error) {
      connection.pendingRequests.delete(message.id)
      clearTimeout(timeout)
      reject(error)
    }
  })
}

/**
 * Send response to native host
 */
async function sendResponseToNativeHost(
  response: NativeResponse
): Promise<void> {
  if (!connection.port || connection.state !== "connected") {
    throw new Error("Not connected to native host")
  }

  connection.port.postMessage(response)
}

/**
 * List all tabs
 */
async function handleListTabs(
  _payload: Record<string, unknown>
): Promise<unknown> {
  const tabs = await chrome.tabs.query({})

  return {
    tabs: tabs.map((tab) => ({
      id: tab.id,
      url: tab.url || "",
      title: tab.title || "",
      active: tab.active,
      windowId: tab.windowId,
    })),
  }
}

/**
 * Get active tab
 */
async function handleGetActiveTab(
  _payload: Record<string, unknown>
): Promise<unknown> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tabs.length === 0) {
    throw new Error("No active tab found")
  }

  const tab = tabs[0]!
  return {
    id: tab.id!,
    url: tab.url ?? "",
    title: tab.title ?? "",
    windowId: tab.windowId!,
  }
}

/**
 * Navigate to URL
 */
async function handleNavigate(
  payload: Record<string, unknown>
): Promise<unknown> {
  const url = payload.url as string
  const tabId = payload.tabId as number | undefined

  if (!url) {
    throw new Error("URL is required")
  }

  let targetTabId = tabId

  // If no tabId specified, use active tab
  if (!targetTabId) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length === 0) {
      throw new Error("No active tab found")
    }
    targetTabId = tabs[0]!.id
  }

  if (!targetTabId) {
    throw new Error("Could not determine target tab")
  }

  const origin = await getTabOrigin(targetTabId)
  await checkAndEnforcePermission(origin, "browser_navigate", targetTabId)

  // Navigate
  const tab = await chrome.tabs.update(targetTabId, { url })

  return {
    success: true,
    url: tab.url || url,
    title: tab.title || "",
  }
}

/**
 * Take screenshot
 */
async function handleScreenshot(
  payload: Record<string, unknown>
): Promise<unknown> {
  const tabId = payload.tabId as number | undefined
  const format = (payload.format as "png" | "jpeg") || "png"
  const quality = (payload.quality as number) || undefined

  let targetTabId = tabId

  // If no tabId specified, use active tab
  if (!targetTabId) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length === 0) {
      throw new Error("No active tab found")
    }
    targetTabId = tabs[0]!.id
  }

  if (!targetTabId) {
    throw new Error("Could not determine target tab")
  }

  const origin = await getTabOrigin(targetTabId)
  await checkAndEnforcePermission(origin, "browser_screenshot", targetTabId)

  const tab = await chrome.tabs.get(targetTabId)
  const windowId = tab.windowId

  // Capture screenshot
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: format === "jpeg" ? "jpeg" : "png",
    quality: format === "jpeg" ? quality : undefined,
  })

  const base64Data = dataUrl.split(",")[1]

  // For full page screenshots or element screenshots, we'd need to
  // coordinate with the content script
  return {
    success: true,
    image: base64Data,
    format,
    dimensions: {
      width: tab.width || 0,
      height: tab.height || 0,
    },
  }
}

/**
 * Forward request to content script
 */
async function forwardToContentScript(
  request: NativeRequest
): Promise<unknown> {
  const payload = request.payload
  const tabId = payload.tabId as number | undefined

  let targetTabId = tabId

  // If no tabId specified, use active tab
  if (!targetTabId) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length === 0) {
      throw new Error("No active tab found")
    }
    targetTabId = tabs[0]!.id
  }

  if (!targetTabId) {
    throw new Error("Could not determine target tab")
  }

  const origin = await getTabOrigin(targetTabId)
  await checkAndEnforcePermission(origin, request.method, targetTabId)

  const response = await chrome.tabs.sendMessage(targetTabId, {
    type: "browser_action",
    method: request.method,
    payload: request.payload,
  })

  return response
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[Background] Message from content script:", message)

  if (message.type === "get_connection_status") {
    sendResponse({
      connected: connection.state === "connected",
      state: connection.state,
    })
    return false
  }

  if (message.type === "forward_to_native") {
    // Forward message to native host
    const request: NativeRequest = {
      id: message.id || generateId(),
      type: "request",
      method: message.method,
      payload: message.payload || {},
    }

    sendToNativeHost(request)
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        sendResponse({
          id: request.id,
          type: "response",
          success: false,
          payload: null,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return true // Will respond asynchronously
  }

  if (message.type === "permission_request") {
    const { origin, scope, description, aiApp } = message

    ;(async () => {
      const response = await handlePermissionRequest(
        { origin, scope, description, aiApp },
        {
          showPermissionDialogToUser,
          updatePermissionLevel,
          getActiveTab: async () => {
            const tabs = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            })
            return tabs.length > 0 ? tabs[0]!.id : undefined
          },
        }
      )
      sendResponse(response)
    })()

    return true // Will respond asynchronously
  }

  return false
})

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract origin from URL
 */
function getOriginFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.origin
  } catch {
    return ""
  }
}

/**
 * Get tab and extract origin
 */
async function getTabOrigin(tabId: number): Promise<string> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url) {
      throw new Error("Tab has no URL")
    }
    return getOriginFromUrl(tab.url)
  } catch (error) {
    console.error("[Background] Error getting tab origin:", error)
    throw error
  }
}

/**
 * Check permission and show dialog if needed
 * Returns true if allowed, throws error if denied
 */
async function checkAndEnforcePermission(
  origin: string,
  tool: string,
  tabId?: number
): Promise<void> {
  const level = await permissionManager.checkPermission(origin, tool)

  if (level === "denied") {
    throw new PermissionDeniedError(origin, tool, level)
  }

  if (level === "ask") {
    const response = await showPermissionDialogToUser(origin, tool, tabId)

    if (response.decision === "deny") {
      throw new PermissionDeniedError(origin, tool, "denied")
    }

    // If "remember" was checked, update the permission
    if (response.remember && response.decision !== "allow_once") {
      await updatePermissionLevel(
        origin,
        tool,
        response.decision === "allow" ? "allowed" : "denied"
      )
    }

    // If "allow_once", we don't update anything but continue execution
    if (response.decision === "allow" || response.decision === "allow_once") {
      return // Continue execution
    }
  }

  // level === "allowed" - continue execution
}

/**
 * Show permission dialog via content script
 */
async function showPermissionDialogToUser(
  origin: string,
  tool: string,
  tabId?: number
): Promise<{ decision: "allow" | "deny" | "allow_once"; remember: boolean }> {
  let targetTabId = tabId

  // If no tabId, get active tab
  if (!targetTabId) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length === 0) {
      throw new Error("No active tab found to show permission dialog")
    }
    targetTabId = tabs[0]!.id
  }

  if (!targetTabId) {
    throw new Error("Could not determine target tab for permission dialog")
  }

  const response = await chrome.tabs.sendMessage(targetTabId, {
    type: "show_permission_dialog",
    tool,
    origin,
    aiApp: currentAiApp, // AI app name from MCP context
    toolDescription: undefined, // Let content script use default description
  })

  if (!response || typeof response.decision !== "string") {
    console.error("[Background] Invalid permission dialog response:", response)
    return { decision: "deny", remember: false }
  }

  return response
}

/**
 * Update permission level in the database via MCP server API
 */
async function updatePermissionLevel(
  origin: string,
  tool: string,
  level: "allowed" | "denied"
): Promise<void> {
  const MCP_SERVER_URL = "http://localhost:3001"

  try {
    const response = await fetch(`${MCP_SERVER_URL}/api/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin,
        tool,
        level,
      }),
    })

    if (!response.ok) {
      console.error(
        `[Background] Failed to update permission: ${response.status} ${response.statusText}`
      )
      return
    }

    // Invalidate cache so next check gets fresh data
    await permissionManager.invalidateCache(origin, tool)

    console.log(
      `[Background] Permission updated: ${origin} / ${tool} -> ${level}`
    )
  } catch (error) {
    console.error("[Background] Error updating permission:", error)
  }
}

console.log("[Background] Service worker starting, version:", VERSION)

connectToNativeHost()

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Background] Extension installed/updated:", details.reason)

  if (details.reason === "install") {
    console.log("[Background] First install")
  } else if (details.reason === "update") {
    console.log(
      "[Background] Updated to version:",
      chrome.runtime.getManifest().version
    )
  }
})

chrome.runtime.onStartup.addListener(() => {
  console.log("[Background] Browser started, reconnecting to native host")
  connectToNativeHost()
})

// Expose connection state for debugging
if (typeof globalThis !== "undefined") {
  ;(globalThis as any).__athreei_connection = connection
  ;(globalThis as any).__athreei_disconnect = _disconnectFromNativeHost
}
