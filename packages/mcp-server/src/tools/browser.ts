/**
 * Browser Tools Registration
 *
 * Registers all browser automation tools with the MCP server.
 * For now, these are stub implementations that return mock data.
 * Phase 2.3 will connect these to the Chrome extension via Native Messaging.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOL_DEFINITIONS } from "@athreei/shared";
import { logger } from "../utils/logger.js";

/**
 * Register all browser tools with the MCP server
 */
export function registerBrowserTools(server: McpServer) {
  logger.info("Registering browser tools...");

  // browser_list_tabs
  server.registerTool(
    "browser_list_tabs",
    {
      description: MCP_TOOL_DEFINITIONS.browser_list_tabs.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_list_tabs.inputSchema,
    },
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
  server.registerTool(
    "browser_get_active_tab",
    {
      description: MCP_TOOL_DEFINITIONS.browser_get_active_tab.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_get_active_tab.inputSchema,
    },
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
  server.registerTool(
    "browser_navigate",
    {
      description: MCP_TOOL_DEFINITIONS.browser_navigate.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_navigate.inputSchema,
    },
    async ({ url, tabId, waitUntil }) => {
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
  server.registerTool(
    "browser_get_content",
    {
      description: MCP_TOOL_DEFINITIONS.browser_get_content.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_get_content.inputSchema,
    },
    async ({ tabId, format, selector }) => {
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
  server.registerTool(
    "browser_get_elements",
    {
      description: MCP_TOOL_DEFINITIONS.browser_get_elements.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_get_elements.inputSchema,
    },
    async ({ tabId, selector, roles, interactiveOnly }) => {
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
  server.registerTool(
    "browser_click",
    {
      description: MCP_TOOL_DEFINITIONS.browser_click.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_click.inputSchema,
    },
    async ({ tabId, selector, index, button, clickCount, modifiers }) => {
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
  server.registerTool(
    "browser_type",
    {
      description: MCP_TOOL_DEFINITIONS.browser_type.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_type.inputSchema,
    },
    async ({ tabId, selector, index, text, clear, delay, submit }) => {
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
  server.registerTool(
    "browser_scroll",
    {
      description: MCP_TOOL_DEFINITIONS.browser_scroll.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_scroll.inputSchema,
    },
    async ({ tabId, selector, direction, amount, x, y, behavior }) => {
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
  server.registerTool(
    "browser_screenshot",
    {
      description: MCP_TOOL_DEFINITIONS.browser_screenshot.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_screenshot.inputSchema,
    },
    async ({ tabId, selector, fullPage, format, quality }) => {
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
  server.registerTool(
    "browser_execute_script",
    {
      description: MCP_TOOL_DEFINITIONS.browser_execute_script.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_execute_script.inputSchema,
    },
    async ({ tabId, script, args }) => {
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
  server.registerTool(
    "browser_wait",
    {
      description: MCP_TOOL_DEFINITIONS.browser_wait.description,
      inputSchema: MCP_TOOL_DEFINITIONS.browser_wait.inputSchema,
    },
    async ({ tabId, selector, state, timeout, condition }) => {
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
