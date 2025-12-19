/**
 * Content script entry point
 * Initializes the provider bridge and sets up action handling
 */

import { initBridge, getBridge } from "./provider-bridge"
import { executeClick } from "./actions/click"
import { executeType } from "./actions/type"
import { executeNavigate } from "./actions/navigate"
import type {
  AiiiToolType,
  AiiiClickArgs,
  AiiiTypeArgs,
  AiiiNavigateArgs,
  AiiiScrollArgs,
  AiiiSelectArgs,
  AiiiToolArgs,
} from "@athreei/shared"

const VERSION = "0.1.0"

// Initialize bridge on content script load
initBridge(VERSION)

/**
 * Execute a browser action by tool type
 */
export async function executeAction(
  tool: AiiiToolType,
  args: AiiiToolArgs
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const bridge = getBridge()

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
      return bridge.executeAction(tool, args as AiiiScrollArgs, async (a) => {
        const target = a.selector ? document.querySelector(a.selector) : window
        if (a.selector && !target) {
          throw new Error(`Element not found: ${a.selector}`)
        }
        if (target === window) {
          window.scrollTo({
            left: a.x ?? window.scrollX,
            top: a.y ?? window.scrollY,
            behavior: a.behavior ?? "auto",
          })
        } else {
          ;(target as Element).scrollTo({
            left: a.x ?? 0,
            top: a.y ?? 0,
            behavior: a.behavior ?? "auto",
          })
        }
        return { scrolled: true }
      })

    case "select":
      return bridge.executeAction(tool, args as AiiiSelectArgs, async (a) => {
        const element = document.querySelector(a.selector)
        if (!element || !(element instanceof HTMLSelectElement)) {
          throw new Error(`Select element not found: ${a.selector}`)
        }
        const values = Array.isArray(a.value) ? a.value : [a.value]
        for (const option of element.options) {
          option.selected = values.includes(option.value)
        }
        element.dispatchEvent(new Event("change", { bubbles: true }))
        return { selected: values }
      })

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

// Export for external use
export { getBridge, initBridge } from "./provider-bridge"
export * from "./events"
