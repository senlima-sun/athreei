/**
 * Content script entry point
 * Initializes the provider bridge and sets up action handling
 */

import { initBridge, getBridge } from "./provider-bridge"
import { initWebsiteBridge, getWebsiteBridge } from "./website-bridge"
import { executeClick } from "./actions/click"
import { executeType } from "./actions/type"
import { executeNavigate } from "./actions/navigate"
import { executeScroll } from "./actions/scroll"
import { executeWait } from "./actions/wait"
import { executeForm, executeSelect } from "./actions/form"
import { executeGetContent } from "./actions/get-content"
import { executeGetElements } from "./actions/get-elements"
import { executeScript } from "./actions/execute-script"
import { showPermissionDialog, type PermissionResponse } from "./permission-dialog"
import type {
  AiiiToolType,
  AiiiClickArgs,
  AiiiTypeArgs,
  AiiiNavigateArgs,
  AiiiScrollArgs,
  AiiiSelectArgs,
  AiiiWaitArgs,
  AiiiFormArgs,
  AiiiGetContentArgs,
  AiiiGetElementsArgs,
  AiiiExecuteScriptArgs,
  AiiiToolArgs,
} from "@athreei/shared"

const VERSION = "0.1.0"

// Initialize bridges on content script load
initBridge(VERSION)
initWebsiteBridge(window.location.origin)

/**
 * Execute a browser action by tool type
 * Checks for custom tools first, then falls back to built-in tools
 */
export async function executeAction(
  tool: AiiiToolType | string,
  args: AiiiToolArgs | Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const bridge = getBridge()
  const websiteBridge = getWebsiteBridge()

  // Check if this is a custom tool registered by the website
  if (websiteBridge.isCustomTool(tool)) {
    try {
      const result = await websiteBridge.executeCustomTool(
        tool,
        args as Record<string, unknown>
      )
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // Handle built-in tools
  switch (tool) {
    case "click":
      return bridge.executeAction(tool, args as AiiiClickArgs, executeClick)

    case "type":
      return bridge.executeAction(tool, args as AiiiTypeArgs, executeType)

    case "navigate":
      return bridge.executeAction(
        tool,
        args as AiiiNavigateArgs,
        executeNavigate
      )

    case "scroll":
      return bridge.executeAction(tool, args as AiiiScrollArgs, executeScroll)

    case "select":
      return bridge.executeAction(
        tool,
        args as AiiiSelectArgs,
        executeSelect
      )

    case "wait":
      return bridge.executeAction(tool, args as AiiiWaitArgs, executeWait)

    case "form":
      return bridge.executeAction(tool, args as AiiiFormArgs, executeForm)

    case "get_content":
      return bridge.executeAction(
        tool,
        args as AiiiGetContentArgs,
        executeGetContent
      )

    case "get_elements":
      return bridge.executeAction(
        tool,
        args as AiiiGetElementsArgs,
        executeGetElements
      )

    case "execute_script":
      return bridge.executeAction(
        tool,
        args as AiiiExecuteScriptArgs,
        executeScript
      )

    case "screenshot":
      // Screenshot requires background script / chrome.tabs API
      // This is a placeholder - actual implementation would message background
      return {
        success: false,
        error: "Screenshot requires background script implementation",
      }

    default:
      return {
        success: false,
        error: `Unknown tool: ${tool}`,
      }
  }
}

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Handle browser action requests from background script
  if (message.type === "browser_action") {
    const { method, args } = message

    // Execute the action
    executeAction(method as AiiiToolType, args as AiiiToolArgs)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    // Return true to keep the message channel open for async response
    return true
  }

  // Handle ping requests
  if (message.type === "ping") {
    sendResponse({ pong: true, version: VERSION })
    return false
  }

  // Handle permission dialog request from background script
  if (message.type === "show_permission_dialog") {
    const { tool, origin, aiApp, toolDescription } = message

    showPermissionDialog({
      tool,
      toolDescription,
      origin,
      aiApp: aiApp || "AI Assistant",
    })
      .then((response: PermissionResponse) => {
        sendResponse(response)
      })
      .catch((err: unknown) => {
        sendResponse({
          decision: "deny",
          remember: false,
          error: err instanceof Error ? err.message : String(err),
        })
      })

    // Return true to keep the message channel open for async response
    return true
  }

  // Unknown message type
  return false
})

// Export for external use
export { getBridge, initBridge } from "./provider-bridge"
export { getWebsiteBridge, initWebsiteBridge } from "./website-bridge"
export { getRegistry, resetRegistry } from "./registry"
export * from "./events"
export { showPermissionDialog, getToolDescription } from "./permission-dialog"
export type {
  PermissionDialogOptions,
  PermissionResponse,
} from "./permission-dialog"
