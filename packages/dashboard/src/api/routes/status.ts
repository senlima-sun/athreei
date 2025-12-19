/**
 * Status API routes
 *
 * Endpoints for checking system-wide status and health.
 * Currently returns mock status - will integrate with real checks later.
 */

import { Hono } from "hono"

export const statusRouter = new Hono()

interface SystemStatus {
  mcpServer: boolean
  extension: boolean
  aiApps: string[]
  uptime?: number
  version?: string
}

/**
 * GET /api/status
 * Get overall system status including MCP server, extension, and connected AI apps
 *
 * Returns:
 * - mcpServer: Boolean indicating if MCP server is running
 * - extension: Boolean indicating if Chrome extension is installed/active
 * - aiApps: Array of connected AI app names
 * - uptime: Server uptime in milliseconds (optional)
 * - version: API version (optional)
 */
statusRouter.get("/", (c) => {
  // Mock status - will be replaced with real checks
  const status: SystemStatus = {
    mcpServer: true,
    extension: true,
    aiApps: ["Claude", "ChatGPT"],
    uptime: process.uptime() * 1000,
    version: "0.1.0",
  }

  return c.json(status)
})

/**
 * GET /api/status/mcp
 * Get detailed MCP server status
 */
statusRouter.get("/mcp", (c) => {
  // Mock MCP server status
  return c.json({
    running: true,
    version: "0.1.0",
    connectedClients: 2,
    tools: [
      "aiii:navigate",
      "aiii:click",
      "aiii:type",
      "aiii:screenshot",
      "aiii:form",
      "aiii:scroll",
      "aiii:select",
      "aiii:wait",
    ],
    startedAt: Date.now() - 3600000,
    uptime: 3600000,
  })
})

/**
 * GET /api/status/extension
 * Get detailed Chrome extension status
 */
statusRouter.get("/extension", (c) => {
  // Mock extension status
  return c.json({
    installed: true,
    version: "0.1.0",
    activeTabs: 3,
    permissions: {
      activeTab: true,
      storage: true,
      nativeMessaging: true,
    },
    nativeHost: {
      connected: true,
      version: "0.1.0",
    },
  })
})

/**
 * GET /api/status/health
 * Simple health check endpoint
 */
statusRouter.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: Date.now(),
  })
})
