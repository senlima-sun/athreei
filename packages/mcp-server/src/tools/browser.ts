/**
 * Browser Tools Registration
 *
 * Registers all browser automation tools with the MCP server.
 * For now, these are stub implementations that return mock data.
 * Phase 2.3 will connect these to the Chrome extension via Native Messaging.
 *
 * @ts-nocheck - MCP SDK has excessively deep type instantiation issues with Zod schemas
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOL_DEFINITIONS } from "@athreei/shared";
import { logger } from "../utils/logger.js";

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
 * Register all browser tools with the MCP server
 */
export function registerBrowserTools(server: McpServer) {
  logger.info("Registering browser tools...");

  // browser_list_tabs
  server.tool(
    "browser_list_tabs",
    MCP_TOOL_DEFINITIONS.browser_list_tabs.description,
    {},
    async () => {
      logger.debug("browser_list_tabs called");
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tabs: [
                {
                  id: 1,
                  url: "https://example.com",
                  title: "Example Domain",
                  active: true,
                  windowId: 1,
                },
                {
                  id: 2,
                  url: "https://github.com",
                  title: "GitHub",
                  active: false,
                  windowId: 1,
                },
              ],
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_get_active_tab
  server.tool(
    "browser_get_active_tab",
    MCP_TOOL_DEFINITIONS.browser_get_active_tab.description,
    {},
    async () => {
      logger.debug("browser_get_active_tab called");
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: 1,
              url: "https://example.com",
              title: "Example Domain",
              windowId: 1,
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_navigate
  server.tool(
    "browser_navigate",
    MCP_TOOL_DEFINITIONS.browser_navigate.description,
    MCP_TOOL_DEFINITIONS.browser_navigate.inputSchema.shape,
    // @ts-ignore - Type instantiation too deep
    async (args: NavigateArgs) => {
      const { url, tabId, waitUntil } = args
      logger.debug(`browser_navigate called: ${url} (tabId: ${tabId}, waitUntil: ${waitUntil})`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              url,
              title: "Page Title",
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_get_content
  server.tool(
    "browser_get_content",
    MCP_TOOL_DEFINITIONS.browser_get_content.description,
    MCP_TOOL_DEFINITIONS.browser_get_content.inputSchema.shape,
    async (args: ContentArgs) => {
      const { tabId, format, selector } = args
      logger.debug(`browser_get_content called: tabId=${tabId}, format=${format}, selector=${selector}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              content: format === "a11y"
                ? "RootWebArea: Example Domain\n  heading[1]: Example Domain\n  text: This domain is for use in illustrative examples...\n  link: More information..."
                : format === "html"
                ? "<html><body><h1>Example Domain</h1><p>This domain is for use in illustrative examples...</p></body></html>"
                : "Example Domain\nThis domain is for use in illustrative examples...",
              format: format || "a11y",
              url: "https://example.com",
              title: "Example Domain",
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_get_elements
  server.tool(
    "browser_get_elements",
    MCP_TOOL_DEFINITIONS.browser_get_elements.description,
    MCP_TOOL_DEFINITIONS.browser_get_elements.inputSchema.shape,
    async (args: ElementsArgs) => {
      const { tabId, selector, roles, interactiveOnly } = args
      logger.debug(`browser_get_elements called: tabId=${tabId}, selector=${selector}, roles=${roles}, interactiveOnly=${interactiveOnly}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              elements: [
                {
                  index: 0,
                  selector: "a[href='https://www.iana.org/domains/example']",
                  role: "link",
                  name: "More information...",
                  text: "More information...",
                  boundingBox: { x: 10, y: 100, width: 150, height: 20 },
                  enabled: true,
                  visible: true,
                },
              ],
              count: 1,
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_click
  server.tool(
    "browser_click",
    MCP_TOOL_DEFINITIONS.browser_click.description,
    MCP_TOOL_DEFINITIONS.browser_click.inputSchema.shape,
    async (args: ClickArgs) => {
      const { selector, index, button, clickCount, modifiers } = args
      logger.debug(`browser_click called: selector=${selector}, index=${index}, button=${button}, clickCount=${clickCount}, modifiers=${modifiers}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              clicked: {
                selector: selector || `element[${index}]`,
                text: "More information...",
              },
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_type
  server.tool(
    "browser_type",
    MCP_TOOL_DEFINITIONS.browser_type.description,
    MCP_TOOL_DEFINITIONS.browser_type.inputSchema.shape,
    async (args: TypeArgs) => {
      const { selector, index, text, clear, delay, submit } = args
      logger.debug(`browser_type called: selector=${selector}, index=${index}, text=${text}, clear=${clear}, delay=${delay}, submit=${submit}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              typed: {
                selector: selector || `element[${index}]`,
                text,
                previousValue: clear ? "old value" : undefined,
              },
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_scroll
  server.tool(
    "browser_scroll",
    MCP_TOOL_DEFINITIONS.browser_scroll.description,
    MCP_TOOL_DEFINITIONS.browser_scroll.inputSchema.shape,
    async (args: ScrollArgs) => {
      const { selector, direction, amount, x, y, behavior } = args
      logger.debug(`browser_scroll called: selector=${selector}, direction=${direction}, amount=${amount}, x=${x}, y=${y}, behavior=${behavior}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              scrollPosition: {
                x: x || 0,
                y: y || (direction === "down" ? 500 : 0),
              },
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_screenshot
  server.tool(
    "browser_screenshot",
    MCP_TOOL_DEFINITIONS.browser_screenshot.description,
    MCP_TOOL_DEFINITIONS.browser_screenshot.inputSchema.shape,
    async (args: ScreenshotArgs) => {
      const { tabId, selector, fullPage, format, quality } = args
      logger.debug(`browser_screenshot called: tabId=${tabId}, selector=${selector}, fullPage=${fullPage}, format=${format}, quality=${quality}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              format: format || "png",
              dimensions: {
                width: 1920,
                height: 1080,
              },
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_execute_script
  server.tool(
    "browser_execute_script",
    MCP_TOOL_DEFINITIONS.browser_execute_script.description,
    MCP_TOOL_DEFINITIONS.browser_execute_script.inputSchema.shape,
    async (handlerArgs: ExecuteScriptArgs) => {
      const { tabId, script } = handlerArgs
      logger.debug(`browser_execute_script called: tabId=${tabId}, script=${script.substring(0, 50)}...`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              result: { message: "Script executed (stub)" },
            }, null, 2),
          },
        ],
      };
    },
  );

  // browser_wait
  server.tool(
    "browser_wait",
    MCP_TOOL_DEFINITIONS.browser_wait.description,
    MCP_TOOL_DEFINITIONS.browser_wait.inputSchema.shape,
    async (args: WaitArgs) => {
      const { tabId, selector, state, timeout } = args
      logger.debug(`browser_wait called: tabId=${tabId}, selector=${selector}, state=${state}, timeout=${timeout}`);
      // Stub - will be replaced with Native Messaging call
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              waited: 100,
              timedOut: false,
            }, null, 2),
          },
        ],
      };
    },
  );

  logger.info("Successfully registered 11 browser tools");
}
