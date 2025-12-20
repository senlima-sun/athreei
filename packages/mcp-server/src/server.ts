/**
 * MCP Server Setup and Configuration
 *
 * This module creates and configures the MCP server instance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBrowserTools } from "./tools/browser.js";
import { logger } from "./utils/logger.js";

/**
 * Create and configure the MCP server
 */
export function createServer() {
  logger.info("Creating MCP server...");

  const server = new McpServer({
    name: "athreei",
    version: "0.1.0",
  });

  // Register all browser tools
  registerBrowserTools(server);

  // Log when server is initialized (error handling moved to index.ts)

  logger.info("MCP server created successfully");

  return server;
}
