/**
 * Browser Tools Registration
 *
 * Registers all browser automation tools with the MCP server.
 * These tools connect to the Chrome extension via the IPC client.
 *
 * @ts-nocheck - MCP SDK has excessively deep type instantiation issues with Zod schemas
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { MCP_TOOL_DEFINITIONS } from "@athreei/shared"
import { logger } from "../utils/logger"
import { getIPCClient } from "../bridge/index"
import { createAuditLogEntry } from "../db/repositories/audit-log"
import { getAiAppName } from "../context/index"
import type { AuditStatus } from "@athreei/shared"

// Type definitions for tool arguments to avoid implicit any
interface NavigateArgs {
  url: string
  tabId?: number
  waitUntil?: "load" | "domcontentloaded" | "networkidle"
}

interface ContentArgs {
  tabId?: number
  format?: "a11y" | "html" | "text"
  selector?: string
}

interface ElementsArgs {
  tabId?: number
  selector?: string
  roles?: string[]
  interactiveOnly?: boolean
}

interface ClickArgs {
  tabId?: number
  selector?: string
  index?: number
  button?: "left" | "right" | "middle"
  clickCount?: number
  modifiers?: string[]
}

interface TypeArgs {
  tabId?: number
  selector?: string
  index?: number
  text: string
  clear?: boolean
  delay?: number
  submit?: boolean
}

interface ScrollArgs {
  tabId?: number
  selector?: string
  direction?: "up" | "down" | "left" | "right"
  amount?: number
  x?: number
  y?: number
  behavior?: "smooth" | "instant"
}

interface ScreenshotArgs {
  tabId?: number
  selector?: string
  fullPage?: boolean
  format?: "png" | "jpeg"
  quality?: number
}

interface ExecuteScriptArgs {
  tabId?: number
  script: string
  args?: unknown[]
}

interface WaitArgs {
  tabId?: number
  selector?: string
  state?: "visible" | "hidden" | "attached" | "detached"
  timeout?: number
  condition?: string
}

/**
 * Helper function to log tool execution with audit logging
 *
 * Wraps tool execution to automatically create audit log entries with:
 * - Start/end timestamps
 * - Tool name and arguments
 * - Origin URL (extracted from result)
 * - Success/error status
 * - Execution duration
 */
async function logToolExecution<T = unknown>(
  tool: string,
  args: Record<string, unknown>,
  executor: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  const logId = crypto.randomUUID()

  try {
    const result = await executor()

    const resultObj = result as Record<string, unknown>
    let origin: string | undefined
    if (typeof resultObj.url === "string") {
      try {
        origin = new URL(resultObj.url).origin
      } catch {
        // Invalid URL, leave origin undefined
      }
    }

    createAuditLogEntry({
      id: logId,
      timestamp: startTime,
      aiApp: getAiAppName(),
      tool,
      origin,
      args,
      result,
      status: "success" as AuditStatus,
    })

    logger.debug(
      `Audit log created for ${tool}: success (${Date.now() - startTime}ms)`
    )

    return result
  } catch (error) {
    let origin: string | undefined
    if (typeof args.url === "string") {
      try {
        origin = new URL(args.url).origin
      } catch {
        // Invalid URL, leave origin undefined
      }
    }

    createAuditLogEntry({
      id: logId,
      timestamp: startTime,
      aiApp: getAiAppName(),
      tool,
      origin,
      args,
      result: {
        error: error instanceof Error ? error.message : String(error),
      },
      status: "error" as AuditStatus,
    })

    logger.debug(
      `Audit log created for ${tool}: error (${Date.now() - startTime}ms)`
    )

    // Re-throw the error to maintain normal error handling
    throw error
  }
}

/**
 * Register all browser tools with the MCP server
 */
export function registerBrowserTools(server: McpServer) {
  logger.info("Registering browser tools...")

  // browser_list_tabs
  server.tool(
    "browser_list_tabs",
    MCP_TOOL_DEFINITIONS.browser_list_tabs.description,
    {},
    async () => {
      logger.debug("browser_list_tabs called")
      try {
        const result = await logToolExecution(
          "browser_list_tabs",
          {},
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_list_tabs", {})
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_list_tabs error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_get_active_tab
  server.tool(
    "browser_get_active_tab",
    MCP_TOOL_DEFINITIONS.browser_get_active_tab.description,
    {},
    async () => {
      logger.debug("browser_get_active_tab called")
      try {
        const result = await logToolExecution(
          "browser_get_active_tab",
          {},
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_get_active_tab", {})
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_get_active_tab error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_navigate
  server.tool(
    "browser_navigate",
    MCP_TOOL_DEFINITIONS.browser_navigate.description,
    MCP_TOOL_DEFINITIONS.browser_navigate.inputSchema.shape,
    // @ts-expect-error - Type instantiation too deep
    async (args: NavigateArgs) => {
      const { url, tabId, waitUntil } = args
      logger.debug(
        `browser_navigate called: ${url} (tabId: ${tabId}, waitUntil: ${waitUntil})`
      )
      try {
        const result = await logToolExecution(
          "browser_navigate",
          { url, tabId, waitUntil },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_navigate", {
              url,
              tabId,
              waitUntil,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_navigate error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_get_content
  server.tool(
    "browser_get_content",
    MCP_TOOL_DEFINITIONS.browser_get_content.description,
    MCP_TOOL_DEFINITIONS.browser_get_content.inputSchema.shape,
    async (args: ContentArgs) => {
      const { tabId, format, selector } = args
      logger.debug(
        `browser_get_content called: tabId=${tabId}, format=${format}, selector=${selector}`
      )
      try {
        const result = await logToolExecution(
          "browser_get_content",
          { tabId, format, selector },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_get_content", {
              tabId,
              format,
              selector,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_get_content error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_get_elements
  server.tool(
    "browser_get_elements",
    MCP_TOOL_DEFINITIONS.browser_get_elements.description,
    MCP_TOOL_DEFINITIONS.browser_get_elements.inputSchema.shape,
    async (args: ElementsArgs) => {
      const { tabId, selector, roles, interactiveOnly } = args
      logger.debug(
        `browser_get_elements called: tabId=${tabId}, selector=${selector}, roles=${roles}, interactiveOnly=${interactiveOnly}`
      )
      try {
        const result = await logToolExecution(
          "browser_get_elements",
          { tabId, selector, roles, interactiveOnly },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_get_elements", {
              tabId,
              selector,
              roles,
              interactiveOnly,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_get_elements error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_click
  server.tool(
    "browser_click",
    MCP_TOOL_DEFINITIONS.browser_click.description,
    MCP_TOOL_DEFINITIONS.browser_click.inputSchema.shape,
    async (args: ClickArgs) => {
      const { tabId, selector, index, button, clickCount, modifiers } = args
      logger.debug(
        `browser_click called: tabId=${tabId}, selector=${selector}, index=${index}, button=${button}, clickCount=${clickCount}, modifiers=${modifiers}`
      )
      try {
        const result = await logToolExecution(
          "browser_click",
          { tabId, selector, index, button, clickCount, modifiers },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_click", {
              tabId,
              selector,
              index,
              button,
              clickCount,
              modifiers,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_click error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_type
  server.tool(
    "browser_type",
    MCP_TOOL_DEFINITIONS.browser_type.description,
    MCP_TOOL_DEFINITIONS.browser_type.inputSchema.shape,
    async (args: TypeArgs) => {
      const { tabId, selector, index, text, clear, delay, submit } = args
      logger.debug(
        `browser_type called: tabId=${tabId}, selector=${selector}, index=${index}, text=${text}, clear=${clear}, delay=${delay}, submit=${submit}`
      )
      try {
        const result = await logToolExecution(
          "browser_type",
          { tabId, selector, index, text, clear, delay, submit },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_type", {
              tabId,
              selector,
              index,
              text,
              clear,
              delay,
              submit,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_type error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_scroll
  server.tool(
    "browser_scroll",
    MCP_TOOL_DEFINITIONS.browser_scroll.description,
    MCP_TOOL_DEFINITIONS.browser_scroll.inputSchema.shape,
    async (args: ScrollArgs) => {
      const { tabId, selector, direction, amount, x, y, behavior } = args
      logger.debug(
        `browser_scroll called: tabId=${tabId}, selector=${selector}, direction=${direction}, amount=${amount}, x=${x}, y=${y}, behavior=${behavior}`
      )
      try {
        const result = await logToolExecution(
          "browser_scroll",
          { tabId, selector, direction, amount, x, y, behavior },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_scroll", {
              tabId,
              selector,
              direction,
              amount,
              x,
              y,
              behavior,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_scroll error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_screenshot
  server.tool(
    "browser_screenshot",
    MCP_TOOL_DEFINITIONS.browser_screenshot.description,
    MCP_TOOL_DEFINITIONS.browser_screenshot.inputSchema.shape,
    async (args: ScreenshotArgs) => {
      const { tabId, selector, fullPage, format, quality } = args
      logger.debug(
        `browser_screenshot called: tabId=${tabId}, selector=${selector}, fullPage=${fullPage}, format=${format}, quality=${quality}`
      )
      try {
        const result = await logToolExecution(
          "browser_screenshot",
          { tabId, selector, fullPage, format, quality },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_screenshot", {
              tabId,
              selector,
              fullPage,
              format,
              quality,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_screenshot error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_execute_script
  server.tool(
    "browser_execute_script",
    MCP_TOOL_DEFINITIONS.browser_execute_script.description,
    MCP_TOOL_DEFINITIONS.browser_execute_script.inputSchema.shape,
    async (handlerArgs: ExecuteScriptArgs) => {
      const { tabId, script, args } = handlerArgs
      logger.debug(
        `browser_execute_script called: tabId=${tabId}, script=${script.substring(0, 50)}...`
      )
      try {
        const result = await logToolExecution(
          "browser_execute_script",
          { tabId, script, args },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_execute_script", {
              tabId,
              script,
              args,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_execute_script error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // browser_wait
  server.tool(
    "browser_wait",
    MCP_TOOL_DEFINITIONS.browser_wait.description,
    MCP_TOOL_DEFINITIONS.browser_wait.inputSchema.shape,
    async (args: WaitArgs) => {
      const { tabId, selector, state, timeout, condition } = args
      logger.debug(
        `browser_wait called: tabId=${tabId}, selector=${selector}, state=${state}, timeout=${timeout}`
      )
      try {
        const result = await logToolExecution(
          "browser_wait",
          { tabId, selector, state, timeout, condition },
          async () => {
            const client = getIPCClient()
            return await client.sendRequest("browser_wait", {
              tabId,
              selector,
              state,
              timeout,
              condition,
            })
          }
        )
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        logger.error("browser_wait error", error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  logger.info("Successfully registered 11 browser tools with audit logging")
}
