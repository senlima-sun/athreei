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
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createServer,
  createGatewayState,
  refreshAggregatedTools,
  addEventHandler,
  type GatewayState,
} from "./server.js";
import { loadConfig, ConfigSyncManager } from "./config-sync.js";
import { connectToAllServers, disconnectAllServers } from "./mcp-client.js";
import { TraceCollector } from "./trace-collector.js";
import { TraceSyncClient, createTraceSyncClient } from "./trace-sync.js";
import { log, setLogLevel } from "./logger.js";
import type { NamespaceConfig, GatewayConfig } from "./types.js";

// Re-export for library use
export { TraceCollector } from "./trace-collector.js";
export { TraceSyncClient, createTraceSyncClient } from "./trace-sync.js";
export { log, setLogLevel } from "./logger.js";
export * from "./types.js";

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  configPath?: string;
  transport: "stdio" | "sse";
  port: number;
  debug: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const config: CliArgs = {
    transport: "stdio",
    port: 3000,
    debug: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--config":
      case "-c":
        config.configPath = args[++i];
        break;

      case "--transport":
      case "-t":
        const transport = args[++i];
        if (transport === "stdio" || transport === "sse") {
          config.transport = transport;
        } else {
          log.error(`Invalid transport: ${transport}. Must be 'stdio' or 'sse'`);
          process.exit(1);
        }
        break;

      case "--port":
      case "-p":
        config.port = parseInt(args[++i], 10);
        if (isNaN(config.port)) {
          log.error("Invalid port number");
          process.exit(1);
        }
        break;

      case "--debug":
      case "-d":
        config.debug = true;
        break;

      case "--help":
      case "-h":
        config.help = true;
        break;

      default:
        if (arg.startsWith("-")) {
          log.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return config;
}

function showHelp(): void {
  console.error(`
athreei Gateway - MCP Aggregation Proxy

Usage: athreei-gateway [options]

Options:
  -c, --config <path>     Path to config file (default: ~/.athreei/config.json)
  -t, --transport <type>  Transport type: stdio (default) or sse
  -p, --port <port>       Port for SSE transport (default: 3000)
  -d, --debug             Enable debug logging
  -h, --help              Show this help message

Examples:
  athreei-gateway                           # Start with stdio transport
  athreei-gateway -t sse -p 3000           # Start with SSE on port 3000
  athreei-gateway -c /path/to/config.json  # Use custom config file

Config file format (~/.athreei/config.json):
{
  "apiKey": "ak_your_api_key",
  "endpoint": "your-endpoint-name",
  "platformUrl": "https://athreei.com"
}
`);
}

// =============================================================================
// Gateway Lifecycle
// =============================================================================

/**
 * Initialize the gateway state and connect to all MCP servers
 */
async function initializeGateway(
  gatewayConfig: GatewayConfig,
  namespaceConfig: NamespaceConfig,
  state: GatewayState
): Promise<void> {
  // Connect to all MCP servers in the namespace
  const { connected, failed } = await connectToAllServers(namespaceConfig.servers);

  // Add connected servers to state
  for (const mcp of connected) {
    state.connectedMcps.set(mcp.sanitizedName, mcp);

    // Emit server connected event
    for (const handler of state.eventHandlers) {
      handler({ type: "server_connected", server: mcp });
    }
  }

  // Log failures
  for (const { config, error } of failed) {
    log.warn(`Server "${config.name}" connection failed: ${error}`);
  }

  // Aggregate tools from all connected servers
  refreshAggregatedTools(state);

  log.info(
    `Gateway initialized: ${state.connectedMcps.size} servers, ${state.aggregatedTools.length} tools`
  );
}

/**
 * Handle config changes from sync manager
 */
async function handleConfigChange(
  namespaceConfig: NamespaceConfig,
  state: GatewayState
): Promise<void> {
  log.info("Processing config change...");

  // Disconnect from all current servers
  const currentMcps = Array.from(state.connectedMcps.values());
  await disconnectAllServers(currentMcps);
  state.connectedMcps.clear();

  // Connect to servers from new config
  const { connected, failed } = await connectToAllServers(namespaceConfig.servers);

  for (const mcp of connected) {
    state.connectedMcps.set(mcp.sanitizedName, mcp);

    for (const handler of state.eventHandlers) {
      handler({ type: "server_connected", server: mcp });
    }
  }

  // Log failures
  for (const { config, error } of failed) {
    log.warn(`Server "${config.name}" connection failed: ${error}`);

    for (const handler of state.eventHandlers) {
      handler({
        type: "server_disconnected",
        serverName: config.name,
        reason: error,
      });
    }
  }

  // Refresh aggregated tools
  refreshAggregatedTools(state);

  log.info(
    `Config change processed: ${state.connectedMcps.size} servers, ${state.aggregatedTools.length} tools`
  );
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(
  state: GatewayState,
  syncManager: ConfigSyncManager,
  traceCollector: TraceCollector,
  traceSyncClient: TraceSyncClient | null,
  server: ReturnType<typeof createServer>
): void {
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down gracefully...`);

    try {
      // Stop sync and trace collection
      syncManager.stopPeriodicSync();
      traceCollector.stopPeriodicFlush();
      traceSyncClient?.stopPeriodicFlush();

      // Flush remaining traces
      await traceCollector.flush().catch(() => {});
      await traceSyncClient?.flushAll().catch(() => {});

      // Disconnect from all MCP servers
      const mcps = Array.from(state.connectedMcps.values());
      await disconnectAllServers(mcps);

      // Close the gateway server
      await server.close();

      log.info("Gateway shut down successfully");
      process.exit(0);
    } catch (error) {
      log.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (error) => {
    log.error("Uncaught exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    log.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
}

// =============================================================================
// Transport Setup
// =============================================================================

/**
 * Start the gateway with stdio transport
 */
async function startStdio(
  server: ReturnType<typeof createServer>
): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("Gateway running on stdio transport");
}

/**
 * Start the gateway with SSE transport
 *
 * Note: SSE transport requires Node.js HTTP primitives which are not
 * compatible with Bun's native HTTP server. This will be implemented
 * in a future version using a compatibility layer.
 */
async function startSSE(
  _server: ReturnType<typeof createServer>,
  _port: number
): Promise<void> {
  log.error("SSE transport is not yet implemented for the gateway");
  log.error("Please use stdio transport for now (default)");
  process.exit(1);
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  const cliArgs = parseArgs();

  if (cliArgs.help) {
    showHelp();
    process.exit(0);
  }

  if (cliArgs.debug) {
    setLogLevel("debug");
  }

  log.info("Starting athreei Gateway...");

  // Load local configuration
  let gatewayConfig: GatewayConfig;
  try {
    gatewayConfig = loadConfig(cliArgs.configPath);
  } catch (error) {
    log.error("Failed to load config:", error);
    process.exit(1);
  }

  // Create gateway state
  const state = createGatewayState();

  // Create trace collector (in-memory)
  const traceCollector = new TraceCollector({
    maxTraces: 1000,
    sendToPlatform: false, // Use TraceSyncClient instead for Platform sync
  });

  // Add trace collector event handler
  addEventHandler(state, traceCollector.createEventHandler());

  // Create trace sync client for Platform (if API key is configured)
  let traceSyncClient: TraceSyncClient | null = null;
  if (gatewayConfig.apiKey) {
    traceSyncClient = createTraceSyncClient({
      platformUrl: gatewayConfig.platformUrl ?? "https://athreei.com",
      apiKey: gatewayConfig.apiKey,
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
    });

    // Forward traces to sync client
    addEventHandler(state, (event) => {
      if (event.type === "tool_call") {
        traceSyncClient?.addTrace(event.trace);
      }
    });
  }

  // Create config sync manager
  const syncManager = new ConfigSyncManager(gatewayConfig);

  // Fetch initial namespace configuration
  let namespaceConfig: NamespaceConfig;
  try {
    namespaceConfig = await syncManager.initialSync();

    for (const handler of state.eventHandlers) {
      handler({ type: "namespace_synced", namespace: namespaceConfig });
    }
  } catch (error) {
    log.error("Failed to fetch namespace config:", error);
    process.exit(1);
  }

  // Initialize gateway (connect to all MCP servers)
  await initializeGateway(gatewayConfig, namespaceConfig, state);

  // Update trace sync client with namespace config
  if (traceSyncClient) {
    traceSyncClient.setNamespaceConfig(namespaceConfig);
  }

  // Setup config change handler
  syncManager.setOnConfigChange((newConfig) => {
    handleConfigChange(newConfig, state).catch((error) => {
      log.error("Failed to handle config change:", error);
    });

    // Update trace sync client with new namespace config
    if (traceSyncClient) {
      traceSyncClient.setNamespaceConfig(newConfig);
    }
  });

  // Start periodic config sync
  syncManager.startPeriodicSync();

  // Start periodic trace sync to Platform
  if (traceSyncClient) {
    traceSyncClient.startPeriodicFlush();
    log.info("Trace sync to Platform enabled");
  }

  // Create the gateway MCP server
  const server = createServer(state);

  // Setup shutdown handlers
  setupShutdownHandlers(state, syncManager, traceCollector, traceSyncClient, server);

  // Start the appropriate transport
  if (cliArgs.transport === "stdio") {
    await startStdio(server);
  } else {
    await startSSE(server, cliArgs.port);
  }
}

// Run the gateway
main().catch((error) => {
  log.error("Fatal error:", error);
  process.exit(1);
});
