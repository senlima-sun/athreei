/**
 * athreei SDK - Simple API for website integration
 *
 * @example
 * ```typescript
 * import { athreei } from '@athreei/sdk'
 *
 * athreei.onReady((info) => {
 *   console.log('athreei ready:', info.version)
 * })
 *
 * athreei.registerTool({
 *   name: 'search_products',
 *   description: 'Search for products',
 *   parameters: {
 *     query: { type: 'string', required: true }
 *   },
 *   handler: async ({ query }) => {
 *     return { results: await searchProducts(query) }
 *   }
 * })
 * ```
 */

import { AthreeiClient } from "./client"
import type {
  ToolDefinition,
  RequestHandler,
  AthreeiInfo,
  PermissionOptions,
  ActionCallback,
  ActionResultCallback,
  Unsubscribe,
} from "./types"

// Re-export everything for advanced usage
export * from "./types"
export * from "./events"
export { AthreeiClient } from "./client"
export { enableMockMode } from "./mock"

/**
 * Simple API interface
 */
export interface SimpleAPI {
  /**
   * Wait for the extension to be ready and call the callback
   */
  onReady(callback: (info: AthreeiInfo) => void): void

  /**
   * Register a custom tool
   */
  registerTool(definition: ToolDefinition): void

  /**
   * Register a handler for a specific tool
   */
  onRequest(toolName: string, handler: RequestHandler): Unsubscribe

  /**
   * Request permission from the user
   */
  requestPermission(options: PermissionOptions): Promise<boolean>

  /**
   * Listen for actions before they are executed
   */
  onBeforeAction(callback: ActionCallback): Unsubscribe

  /**
   * Listen for actions after they are executed
   */
  onAfterAction(callback: ActionResultCallback): Unsubscribe
}

/**
 * Create the simple API singleton
 */
function createSimpleAPI(): SimpleAPI {
  let client: AthreeiClient | null = null

  const getClient = () => {
    if (!client) {
      client = new AthreeiClient({ debug: false })
    }
    return client
  }

  return {
    onReady(callback: (info: AthreeiInfo) => void) {
      getClient()
        .waitForReady()
        .then(callback)
        .catch((error) => {
          console.error("[athreei] Failed to wait for ready:", error)
        })
    },

    registerTool(definition: ToolDefinition) {
      getClient().registerTool(definition)
    },

    onRequest(toolName: string, handler: RequestHandler): Unsubscribe {
      return getClient().onRequest(toolName, handler)
    },

    requestPermission(options: PermissionOptions): Promise<boolean> {
      return getClient().requestPermission(options)
    },

    onBeforeAction(callback: ActionCallback): Unsubscribe {
      return getClient().onBeforeAction(callback)
    },

    onAfterAction(callback: ActionResultCallback): Unsubscribe {
      return getClient().onAfterAction(callback)
    },
  }
}

/**
 * Default export - simple API singleton
 */
export const athreei = createSimpleAPI()
