/**
 * athreei Gateway - Entry Point
 *
 * MCP aggregation proxy that lets AI apps access multiple MCP servers
 * through a single connection point.
 *
 * Usage:
 *   athreei-gateway [options]
 *
 * Options:
 *   --config, -c <path>    Path to config file (default: ~/.athreei/config.json)
 *   --transport, -t <type> Transport type: stdio (default) or sse
 *   --port, -p <port>      Port for SSE transport (default: 3000)
 *   --debug, -d            Enable debug logging
 *   --help, -h             Show this help message
 *   --version, -v          Show version number
 */

// Package version (imported at runtime to avoid bundling issues)
const VERSION = "0.1.0"

import { Hono } from "hono"
import { cors } from "hono/cors"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  createServer,
  createGatewayState,
  refreshAggregatedTools,
  addEventHandler,
  type GatewayState,
} from "./server"
import { loadConfig, loadLocalConfig, ConfigSyncManager } from "./config-sync"
import { connectToAllServers, disconnectAllServers } from "./mcp-client"
import { TraceCollector } from "./trace-collector"
import { TraceSyncClient, createTraceSyncClient } from "./trace-sync"
import { log, setLogLevel } from "./logger"
import type { NamespaceConfig, GatewayConfig } from "./types"
import {
  createSseApp,
  setNamespaceConfig as setSseNamespaceConfig,
} from "./sse"
import {
  startSessionCleanup,
  stopSessionCleanup,
  cleanupAllSessions,
} from "./session"
import { startHttpApiServer, setHttpApiNamespaceConfig } from "./http-api"

// Re-export for library use
export { TraceCollector } from "./trace-collector"
export { TraceSyncClient, createTraceSyncClient } from "./trace-sync"
export { log, setLogLevel } from "./logger"
export * from "./types"
export { loadConfig, loadLocalConfig, ConfigSyncManager } from "./config-sync"
export {
  loadSkillFromFile,
  loadRuleFromFile,
  loadSkillsFromDirectory,
  loadRulesFromDirectory,
  exportSkillToMarkdown,
  exportRuleToMarkdown,
} from "./skill-file-loader"

interface CliArgs {
  configPath?: string
  transport: "stdio" | "sse"
  port: number
  apiPort: number
  debug: boolean
  mock: boolean
  local: boolean
  help: boolean
  version: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const config: CliArgs = {
    transport: "stdio",
    port: 3000,
    apiPort: 3001,
    debug: false,
    mock: false,
    local: false,
    help: false,
    version: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case "--config":
      case "-c":
        config.configPath = args[++i]
        break

      case "--transport":
      case "-t": {
        const transport = args[++i]
        if (transport === "stdio" || transport === "sse") {
          config.transport = transport
        } else {
          log.error(`Invalid transport: ${transport}. Must be 'stdio' or 'sse'`)
          process.exit(1)
        }
        break
      }

      case "--port":
      case "-p": {
        const portArg = args[++i]
        config.port = parseInt(portArg ?? "", 10)
        if (isNaN(config.port)) {
          log.error("Invalid port number")
          process.exit(1)
        }
        break
      }

      case "--api-port": {
        const apiPortArg = args[++i]
        config.apiPort = parseInt(apiPortArg ?? "", 10)
        if (isNaN(config.apiPort)) {
          log.error("Invalid API port number")
          process.exit(1)
        }
        break
      }

      case "--debug":
      case "-d":
        config.debug = true
        break

      case "--mock":
      case "-m":
        config.mock = true
        break

      case "--local":
      case "-l":
        config.local = true
        break

      case "--help":
      case "-h":
        config.help = true
        break

      case "--version":
      case "-v":
        config.version = true
        break

      default:
        if (arg?.startsWith("-")) {
          log.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }

  return config
}

function showHelp(): void {
  log.error(`
athreei Gateway - MCP Aggregation Proxy

Usage: athreei-gateway [options]

Options:
  -c, --config <path>     Path to config file (default: ~/.athreei/config.json)
  -t, --transport <type>  Transport type: stdio (default) or sse
  -p, --port <port>       Port for SSE transport (default: 3000)
  --api-port <port>       Port for HTTP API (default: 3001, local/mock mode only)
  -l, --local             Run in local mode (no Platform sync, read servers from config)
  -m, --mock              Run in mock mode (no servers, for testing)
  -d, --debug             Enable debug logging
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  athreei-gateway --local                   # Local mode with servers from config
  athreei-gateway --local --api-port 4000   # Local mode with custom API port
  athreei-gateway                           # Start with stdio transport (requires API key)
  athreei-gateway -t sse -p 3000           # Start with SSE on port 3000
  athreei-gateway -c /path/to/config.json  # Use custom config file
  athreei-gateway -t sse --mock            # SSE mode with mock servers (for testing)

Config file format for --local mode (~/.athreei/config.json):
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  ]
}

Config file format for Platform mode:
{
  "apiKey": "ak_your_api_key",
  "endpoint": "your-endpoint-name",
  "platformUrl": "https://athreei.com"
}
`)
}

/**
 * Initialize the gateway state and connect to all MCP servers
 */
async function initializeGateway(
  _gatewayConfig: GatewayConfig | null,
  namespaceConfig: NamespaceConfig,
  state: GatewayState
): Promise<void> {
  const { connected, failed } = await connectToAllServers(
    namespaceConfig.servers
  )

  for (const mcp of connected) {
    state.connectedMcps.set(mcp.sanitizedName, mcp)

    for (const handler of state.eventHandlers) {
      handler({ type: "server_connected", server: mcp })
    }
  }

  for (const { config, error } of failed) {
    log.warn(`Server "${config.name}" connection failed: ${error}`)
  }

  // Aggregate tools from all connected servers
  refreshAggregatedTools(state)

  log.info(
    `Gateway initialized: ${state.connectedMcps.size} servers, ${state.aggregatedTools.length} tools`
  )
}

/**
 * Handle config changes from sync manager
 */
async function handleConfigChange(
  namespaceConfig: NamespaceConfig,
  state: GatewayState
): Promise<void> {
  log.info("Processing config change...")

  const currentMcps = Array.from(state.connectedMcps.values())
  await disconnectAllServers(currentMcps)
  state.connectedMcps.clear()

  const { connected, failed } = await connectToAllServers(
    namespaceConfig.servers
  )

  for (const mcp of connected) {
    state.connectedMcps.set(mcp.sanitizedName, mcp)

    for (const handler of state.eventHandlers) {
      handler({ type: "server_connected", server: mcp })
    }
  }

  for (const { config, error } of failed) {
    log.warn(`Server "${config.name}" connection failed: ${error}`)

    for (const handler of state.eventHandlers) {
      handler({
        type: "server_disconnected",
        serverName: config.name,
        reason: error,
      })
    }
  }

  // Refresh aggregated tools
  refreshAggregatedTools(state)

  log.info(
    `Config change processed: ${state.connectedMcps.size} servers, ${state.aggregatedTools.length} tools`
  )
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(
  state: GatewayState,
  syncManager: ConfigSyncManager | null,
  traceCollector: TraceCollector,
  traceSyncClient: TraceSyncClient | null,
  server: ReturnType<typeof createServer>,
  transport: "stdio" | "sse",
  httpApiServer: { stop: () => void } | null = null
): void {
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down gracefully...`)

    try {
      syncManager?.stopPeriodicSync()
      traceCollector.stopPeriodicFlush()
      traceSyncClient?.stopPeriodicFlush()

      httpApiServer?.stop()

      // Flush remaining traces
      await traceCollector.flush().catch(() => {})
      await traceSyncClient?.flushAll().catch(() => {})

      if (transport === "stdio") {
        const mcps = Array.from(state.connectedMcps.values())
        await disconnectAllServers(mcps)

        await server.close()
      } else {
        // SSE mode: cleanup sessions and stop server
        stopSessionCleanup()
        await cleanupAllSessions()

        // Stop SSE server
        const sseServer = (globalThis as Record<string, unknown>)
          .__sseServer as { stop: () => void } | undefined
        sseServer?.stop()
      }

      log.info("Gateway shut down successfully")
      process.exit(0)
    } catch (error) {
      log.error("Error during shutdown", { error })
      process.exit(1)
    }
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  process.on("uncaughtException", (error) => {
    log.error("Uncaught exception", { error })
    process.exit(1)
  })

  process.on("unhandledRejection", (reason, promise) => {
    log.error("Unhandled rejection", { promise: String(promise), reason })
    process.exit(1)
  })
}

/**
 * Start the gateway with stdio transport
 */
async function startStdio(
  server: ReturnType<typeof createServer>
): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  log.info("Gateway running on stdio transport")
}

/**
 * Start the gateway with SSE transport
 */
async function startSSE(
  _server: ReturnType<typeof createServer>,
  port: number
): Promise<void> {
  const sseApp = createSseApp()

  // Create main app with CORS
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: "*",
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "OPTIONS"],
    })
  )

  // Mount SSE routes under /mcp
  app.route("/mcp", sseApp)

  // Root endpoint
  app.get("/", (c) => {
    return c.json({
      name: "athreei-gateway",
      version: VERSION,
      transport: "sse",
      endpoints: {
        sse: "/mcp/sse",
        messages: "/mcp/messages",
        health: "/mcp/health",
      },
    })
  })

  startSessionCleanup(60000)

  const server = Bun.serve({
    port,
    fetch: app.fetch,
  })

  log.info(`Gateway running on SSE transport at http://localhost:${port}`)
  log.info(`SSE endpoint: http://localhost:${port}/mcp/sse`)
  ;(globalThis as Record<string, unknown>).__sseServer = server
}

/**
 * Create mock namespace config for testing
 */
function createMockNamespaceConfig(): NamespaceConfig {
  return {
    namespaceId: "mock-namespace",
    namespaceName: "Mock Namespace",
    namespaceSlug: "mock",
    endpointId: "mock-endpoint",
    endpointName: "mock",
    organizationId: "mock-org",
    servers: [],
    configVersion: "mock-v1",
  }
}

/**
 * Create namespace config from local config (for --local mode)
 */
function createLocalNamespaceConfig(
  localConfig: import("./types.js").LocalConfig
): NamespaceConfig {
  return {
    namespaceId: "local-namespace",
    namespaceName: "Local",
    namespaceSlug: "local",
    endpointId: "local-endpoint",
    endpointName: "local",
    organizationId: "local-org",
    servers: localConfig.servers,
    skills: localConfig.skills,
    rules: localConfig.rules,
    configVersion: `local-v${Date.now()}`,
  }
}

async function main(): Promise<void> {
  const cliArgs = parseArgs()

  if (cliArgs.version) {
    log.info(`athreei-gateway v${VERSION}`)
    process.exit(0)
  }

  if (cliArgs.help) {
    showHelp()
    process.exit(0)
  }

  if (cliArgs.debug) {
    setLogLevel("debug")
  }

  log.info("Starting athreei Gateway...")

  if (cliArgs.mock) {
    log.info("Running in MOCK mode (no Platform connection)")
  }

  const state = createGatewayState()

  // Create trace collector (in-memory)
  const traceCollector = new TraceCollector({
    maxTraces: 1000,
    sendToPlatform: false,
  })

  addEventHandler(state, traceCollector.createEventHandler())

  let gatewayConfig: GatewayConfig | null = null
  let traceSyncClient: TraceSyncClient | null = null
  let syncManager: ConfigSyncManager | null = null
  let namespaceConfig: NamespaceConfig

  if (cliArgs.mock) {
    // Mock mode: use mock config (no servers, no Platform)
    namespaceConfig = createMockNamespaceConfig()
    setSseNamespaceConfig(namespaceConfig)
    setHttpApiNamespaceConfig(namespaceConfig)
  } else if (cliArgs.local) {
    // Local mode: read servers from local config, no Platform sync
    log.info("Running in LOCAL mode (no Platform sync)")
    try {
      const localConfig = loadLocalConfig(cliArgs.configPath)
      namespaceConfig = createLocalNamespaceConfig(localConfig)
      setSseNamespaceConfig(namespaceConfig)
      setHttpApiNamespaceConfig(namespaceConfig)

      if (localConfig.skills?.length) {
        log.info(`Loaded ${localConfig.skills.length} skills`)
      }
      if (localConfig.rules?.length) {
        log.info(`Loaded ${localConfig.rules.length} rules`)
      }
    } catch (error) {
      log.error("Failed to load local config", { error })
      process.exit(1)
    }
  } else {
    // Production mode: load config and sync with Platform
    try {
      gatewayConfig = loadConfig(cliArgs.configPath)
    } catch (error) {
      log.error("Failed to load config", { error })
      log.error("Use --local flag to run without Platform sync")
      log.error("Use --mock flag to run without any config file")
      process.exit(1)
    }

    if (gatewayConfig.apiKey) {
      traceSyncClient = createTraceSyncClient({
        platformUrl: gatewayConfig.platformUrl ?? "https://athreei.com",
        apiKey: gatewayConfig.apiKey,
        batchSize: 100,
        flushInterval: 30000,
      })

      addEventHandler(state, (event) => {
        if (event.type === "tool_call") {
          traceSyncClient?.addTrace(event.trace)
        }
      })
    }

    syncManager = new ConfigSyncManager(gatewayConfig)

    try {
      namespaceConfig = await syncManager.initialSync()

      for (const handler of state.eventHandlers) {
        handler({ type: "namespace_synced", namespace: namespaceConfig })
      }

      setSseNamespaceConfig(namespaceConfig)
      setHttpApiNamespaceConfig(namespaceConfig)
    } catch (error) {
      log.error("Failed to fetch namespace config", { error })
      process.exit(1)
    }
  }

  if (cliArgs.transport === "stdio") {
    await initializeGateway(gatewayConfig, namespaceConfig, state)
  }

  if (traceSyncClient) {
    traceSyncClient.setNamespaceConfig(namespaceConfig)
  }

  if (syncManager) {
    syncManager.setOnConfigChange((newConfig) => {
      // Update SSE namespace config
      setSseNamespaceConfig(newConfig)
      setHttpApiNamespaceConfig(newConfig)

      if (cliArgs.transport === "stdio") {
        handleConfigChange(newConfig, state).catch((error) => {
          log.error("Failed to handle config change:", error)
        })
      }

      if (traceSyncClient) {
        traceSyncClient.setNamespaceConfig(newConfig)
      }
    })

    syncManager.startPeriodicSync()
  }

  if (traceSyncClient) {
    traceSyncClient.startPeriodicFlush()
    log.info("Trace sync to Platform enabled")
  }

  const server = createServer(state)

  let httpApiServer: { stop: () => void } | null = null
  if (cliArgs.local || cliArgs.mock) {
    httpApiServer = startHttpApiServer(state, traceCollector, cliArgs.apiPort)
  }

  setupShutdownHandlers(
    state,
    syncManager,
    traceCollector,
    traceSyncClient,
    server,
    cliArgs.transport,
    httpApiServer
  )

  if (cliArgs.transport === "stdio") {
    await startStdio(server)
  } else {
    await startSSE(server, cliArgs.port)
  }
}

main().catch((error) => {
  log.error("Fatal error:", error)
  process.exit(1)
})
