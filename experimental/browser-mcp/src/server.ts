/**
 * MCP Server Setup and Configuration
 *
 * This module creates and configures the MCP server instance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { registerBrowserTools } from "./tools/browser"
import { logger } from "./utils/logger"
import { setMcpContext, clearMcpContext } from "./context/index"

/**
 * Create and configure the MCP server
 */
export function createServer() {
  logger.info("Creating MCP server...")

  const server = new McpServer({
    name: "athreei",
    version: "0.1.0",
  })

  // Register all browser tools
  registerBrowserTools(server)

  // Capture client info when initialization completes
  server.server.oninitialized = () => {
    const clientVersion = server.server.getClientVersion()
    if (clientVersion) {
      setMcpContext({
        clientName: clientVersion.name || "Unknown",
        clientVersion: clientVersion.version || "0.0.0",
        connectedAt: new Date(),
      })
      logger.info(
        `Client connected: ${clientVersion.name} v${clientVersion.version}`
      )
    }
  }

  server.server.onclose = () => {
    clearMcpContext()
    logger.info("Client disconnected")
  }

  logger.info("MCP server created successfully")

  return server
}
