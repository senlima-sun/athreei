/**
 * MCP Client Connector
 *
 * Connects to upstream MCP servers based on their transport type.
 * Supports stdio and SSE transports with OAuth authentication.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import type { McpServerConfig, ConnectedMcp } from "./types.js"
import { sanitizeName } from "./aggregator.js"
import { log } from "./logger.js"
import type { OAuthManager } from "./oauth/index.js"

/**
 * Options for connecting to MCP server
 */
export interface ConnectOptions {
  /** OAuth manager for handling authentication */
  oauthManager?: OAuthManager
  /** Callback to prompt user for OAuth */
  promptOAuth?: (message: string) => Promise<void>
}

/**
 * Connect to a single MCP server
 */
export async function connectToMcpServer(
  config: McpServerConfig,
  options?: ConnectOptions
): Promise<ConnectedMcp> {
  log.info(`Connecting to MCP server: ${config.name} (${config.transport})`)

  const client = new Client(
    {
      name: "athreei-gateway",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  let transport

  switch (config.transport) {
    case "stdio":
      if (!config.command) {
        throw new Error(
          `MCP server "${config.name}" is stdio transport but has no command`
        )
      }
      transport = createStdioTransport(config)
      break

    case "sse":
      if (!config.url) {
        throw new Error(
          `MCP server "${config.name}" is SSE transport but has no URL`
        )
      }
      transport = await createSSETransportWithAuth(config, options)
      break

    case "streamable-http":
      // For now, treat streamable-http same as SSE
      if (!config.url) {
        throw new Error(
          `MCP server "${config.name}" is HTTP transport but has no URL`
        )
      }
      transport = await createSSETransportWithAuth(config, options)
      break

    default:
      throw new Error(
        `Unsupported transport type: ${config.transport} for server "${config.name}"`
      )
  }

  // Connect to the server
  await client.connect(transport)
  log.info(`Connected to MCP server: ${config.name}`)

  // Fetch tools from the server
  const toolsResponse = await client.listTools()
  const tools: Tool[] = toolsResponse.tools || []

  log.info(`Server "${config.name}" exposes ${tools.length} tools`)

  return {
    config,
    sanitizedName: sanitizeName(config.name),
    client,
    tools,
    connectedAt: new Date(),
  }
}

/**
 * Create a stdio transport
 */
function createStdioTransport(config: McpServerConfig): StdioClientTransport {
  const command = config.command!
  const args = config.args ? config.args.split(" ").filter(Boolean) : []
  const env = config.env

  log.debug(`Creating stdio transport: ${command} ${args.join(" ")}`)
  if (env && Object.keys(env).length > 0) {
    log.debug(
      `Stdio transport includes ${Object.keys(env).length} environment variables`
    )
  }

  // Build environment: filter out undefined values from process.env
  const mergedEnv = env
    ? Object.fromEntries(
        Object.entries({ ...process.env, ...env }).filter(
          (entry): entry is [string, string] => entry[1] !== undefined
        )
      )
    : undefined

  return new StdioClientTransport({
    command,
    args,
    env: mergedEnv,
  })
}

/**
 * Create an SSE transport with OAuth support
 *
 * Checks if server requires OAuth and initiates flow if needed.
 * Falls back to static headers if OAuth is not required.
 */
async function createSSETransportWithAuth(
  config: McpServerConfig,
  options?: ConnectOptions
): Promise<SSEClientTransport> {
  const url = new URL(config.url!)
  let headers = { ...config.headers }

  // Try OAuth if manager is available
  if (options?.oauthManager && config.url) {
    // Check for existing valid token
    const existingToken = await options.oauthManager.getAccessToken(config.url)

    if (existingToken) {
      log.debug(`Using existing OAuth token for ${config.name}`)
      headers.Authorization = `Bearer ${existingToken}`
    } else {
      // Check if server requires OAuth
      const requiresOAuth = await options.oauthManager.requiresOAuth(config.url)

      if (requiresOAuth) {
        log.info(`${config.name} requires OAuth authentication`)

        // Initiate OAuth flow
        const result = await options.oauthManager.initiateOAuth(config.url, {
          prompt: options.promptOAuth,
        })

        if (result.status === "authorized") {
          headers.Authorization = `Bearer ${result.tokens.access_token}`
          log.info(`OAuth authentication successful for ${config.name}`)
        } else if (result.status === "error") {
          throw new Error(`OAuth failed for ${config.name}: ${result.error}`)
        }
      }
    }
  }

  return createSSETransport(config, headers)
}

/**
 * Create an SSE transport
 *
 * Note: The MCP SDK's SSEClientTransport has a known bug where headers aren't
 * sent on the initial /sse connection when using only `requestInit`. The
 * workaround is to use `eventSourceInit` with a custom fetch that includes
 * the headers on all requests.
 */
function createSSETransport(
  config: McpServerConfig,
  headers?: Record<string, string>
): SSEClientTransport {
  const url = new URL(config.url!)
  const allHeaders = { ...config.headers, ...headers }

  log.debug(`Creating SSE transport: ${url.toString()}`)

  // If headers are provided, use the workaround pattern
  if (allHeaders && Object.keys(allHeaders).length > 0) {
    log.debug(
      `SSE transport includes ${Object.keys(allHeaders).length} custom headers`
    )

    return new SSEClientTransport(url, {
      eventSourceInit: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              ...allHeaders,
            },
          }),
      },
      requestInit: { headers: allHeaders },
    })
  }

  return new SSEClientTransport(url)
}

/**
 * Disconnect from an MCP server
 */
export async function disconnectMcpServer(mcp: ConnectedMcp): Promise<void> {
  log.info(`Disconnecting from MCP server: ${mcp.config.name}`)

  try {
    await mcp.client.close()
    log.info(`Disconnected from MCP server: ${mcp.config.name}`)
  } catch (error) {
    log.error(`Error disconnecting from ${mcp.config.name}:`, error)
    throw error
  }
}

/**
 * Connect to multiple MCP servers
 */
export async function connectToAllServers(
  configs: McpServerConfig[],
  options?: ConnectOptions
): Promise<{
  connected: ConnectedMcp[]
  failed: Array<{ config: McpServerConfig; error: string }>
}> {
  const connected: ConnectedMcp[] = []
  const failed: Array<{ config: McpServerConfig; error: string }> = []

  // Filter to only active servers
  const activeConfigs = configs.filter((c) => c.status === "active")

  log.info(
    `Connecting to ${activeConfigs.length} active MCP servers (${configs.length - activeConfigs.length} inactive)`
  )

  // Connect to each server
  for (const config of activeConfigs) {
    try {
      const mcp = await connectToMcpServer(config, options)
      connected.push(mcp)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      log.error(`Failed to connect to ${config.name}: ${errorMessage}`)
      failed.push({ config, error: errorMessage })
    }
  }

  log.info(
    `Connected to ${connected.length}/${activeConfigs.length} servers (${failed.length} failed)`
  )

  return { connected, failed }
}

/**
 * Disconnect from all MCP servers
 */
export async function disconnectAllServers(
  mcps: ConnectedMcp[]
): Promise<void> {
  log.info(`Disconnecting from ${mcps.length} MCP servers`)

  const disconnectPromises = mcps.map((mcp) =>
    disconnectMcpServer(mcp).catch((error) => {
      log.error(`Error disconnecting from ${mcp.config.name}:`, error)
    })
  )

  await Promise.all(disconnectPromises)
  log.info("All MCP servers disconnected")
}

/**
 * Refresh tools from a connected MCP server
 */
export async function refreshServerTools(mcp: ConnectedMcp): Promise<Tool[]> {
  log.debug(`Refreshing tools from: ${mcp.config.name}`)

  const toolsResponse = await mcp.client.listTools()
  const tools: Tool[] = toolsResponse.tools || []

  mcp.tools = tools
  mcp.lastHeartbeat = new Date()

  log.debug(`Server "${mcp.config.name}" now has ${tools.length} tools`)
  return tools
}
