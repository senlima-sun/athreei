/**
 * @athreei/browser-mcp - Entry Point
 *
 * Local MCP server for browser automation that connects AI apps to your browser.
 * Supports stdio transport (for Claude Desktop) and SSE transport (for web-based AI apps).
 * Also runs an HTTP API server for the dashboard on port 3001.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createServer } from "./server"
import { startApiServer } from "./api/index"
import { logger } from "./utils/logger"

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    transport: "stdio" as "stdio" | "sse",
    port: 3000,
    clientName: undefined as string | undefined,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case "--transport":
      case "-t": {
        const transport = args[++i]
        if (transport === "stdio" || transport === "sse") {
          config.transport = transport
        } else {
          logger.error(
            `Invalid transport: ${transport}. Must be 'stdio' or 'sse'`
          )
          process.exit(1)
        }
        break
      }
      case "--port":
      case "-p":
        config.port = parseInt(args[++i] ?? "", 10)
        if (isNaN(config.port)) {
          logger.error("Invalid port number")
          process.exit(1)
        }
        break
      case "--client":
      case "-c":
        config.clientName = args[++i]
        break
      case "--help":
      case "-h":
        console.error(`
athreei MCP Server

Usage: bun run src/index.ts [options]

Options:
  -t, --transport <type>   Transport type: stdio (default) or sse
  -p, --port <port>        Port for SSE transport (default: 3000)
  -c, --client <name>      Custom client name for identification
  -h, --help               Show this help message

Examples:
  bun run src/index.ts                    # Start with stdio transport
  bun run src/index.ts -t sse -p 3000    # Start with SSE transport on port 3000
  bun run src/index.ts -c work-claude    # Tag this instance as "work-claude"
`)
        process.exit(0)
        break
      default:
        if (arg?.startsWith("-")) {
          logger.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }

  return config
}

/**
 * Start the MCP server with stdio transport
 */
async function startStdio(server: ReturnType<typeof createServer>) {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info("MCP Server running on stdio")
}

/**
 * Start the MCP server with SSE transport
 */
async function startSSE(
  _server: ReturnType<typeof createServer>,
  _port: number
) {
  // SSE transport implementation will be added in a future phase
  logger.error("SSE transport not yet implemented")
  process.exit(1)
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(
  server: ReturnType<typeof createServer>,
  apiServer?: ReturnType<typeof Bun.serve>
) {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`)
    try {
      await server.close()
      if (apiServer) {
        apiServer.stop()
        logger.info("HTTP API Server stopped")
      }
      logger.info("MCP Server closed successfully")
      process.exit(0)
    } catch (error) {
      logger.error("Error during shutdown:", error)
      process.exit(1)
    }
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error)
    process.exit(1)
  })

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection at:", promise, "reason:", reason)
    process.exit(1)
  })
}

/**
 * Main entry point
 */
async function main() {
  const config = parseArgs()

  logger.info("Starting athreei MCP Server...")
  logger.info(`Transport: ${config.transport}`)
  if (config.clientName) {
    logger.info(`Client name: ${config.clientName}`)
  }

  const apiServer = startApiServer()

  const server = createServer()

  setupShutdownHandlers(server, apiServer)

  if (config.transport === "stdio") {
    await startStdio(server)
  } else {
    await startSSE(server, config.port)
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error)
  process.exit(1)
})
