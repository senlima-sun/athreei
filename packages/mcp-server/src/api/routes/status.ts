/**
 * Status API Routes
 *
 * Provides system, MCP, and extension status endpoints.
 */

import { Hono } from "hono"
import { getIPCClient } from "../../bridge/ipc-client.js"

// Track server start time for uptime calculation
const serverStartedAt = Date.now()

// MCP server version
const MCP_VERSION = "0.1.0"

export const statusRoutes = new Hono()

/**
 * GET /api/status - System status overview
 */
statusRoutes.get("/", async (c) => {
  const ipcClient = getIPCClient()

  return c.json({
    mcpServer: true, // We're running, so this is true
    extension: ipcClient.isConnected(),
    aiApps: [], // Will be populated when we track connected AI apps
    uptime: Math.floor((Date.now() - serverStartedAt) / 1000),
    version: MCP_VERSION,
  })
})

/**
 * GET /api/status/mcp - Detailed MCP server status
 */
statusRoutes.get("/mcp", async (c) => {
  // Get list of registered tools from the server
  // For now, we'll return a static list since tools are registered at startup
  const tools = [
    "list_tabs",
    "get_active_tab",
    "navigate_to",
    "go_back",
    "go_forward",
    "reload_tab",
    "close_tab",
    "create_tab",
    "take_screenshot",
    "get_page_content",
    "click_element",
    "type_text",
    "scroll_page",
  ]

  return c.json({
    running: true,
    version: MCP_VERSION,
    connectedClients: 1, // At least one client (the one making this request)
    tools,
    startedAt: serverStartedAt,
    uptime: Math.floor((Date.now() - serverStartedAt) / 1000),
  })
})

/**
 * GET /api/status/extension - Chrome extension status
 */
statusRoutes.get("/extension", async (c) => {
  const ipcClient = getIPCClient()
  const connected = ipcClient.isConnected()

  // If connected, try to get detailed info from the extension
  if (connected) {
    try {
      const info = await ipcClient.sendRequest<{
        version?: string
        activeTabs?: number
      }>("getExtensionInfo", {}, 5000)

      return c.json({
        installed: true,
        version: info.version || "unknown",
        activeTabs: info.activeTabs || 0,
        permissions: {
          activeTab: true,
          storage: true,
          nativeMessaging: true,
        },
        nativeHost: {
          connected: true,
          version: "1.0.0",
        },
      })
    } catch {
      // Extension connected but couldn't get details
      return c.json({
        installed: true,
        version: "unknown",
        activeTabs: 0,
        permissions: {
          activeTab: true,
          storage: true,
          nativeMessaging: true,
        },
        nativeHost: {
          connected: true,
          version: "1.0.0",
        },
      })
    }
  }

  // Not connected
  return c.json({
    installed: false,
    version: "unknown",
    activeTabs: 0,
    permissions: {
      activeTab: false,
      storage: false,
      nativeMessaging: false,
    },
    nativeHost: {
      connected: false,
      version: "unknown",
    },
  })
})
