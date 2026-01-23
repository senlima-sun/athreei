/**
 * MCP Client Connector
 *
 * Connects to upstream MCP servers based on their transport type.
 * Supports stdio and SSE/HTTP transports with static header authentication.
 *
 * For OAuth authentication, use the cloud gateway which handles
 * OAuth flows through the platform.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import type { McpServerConfig, ConnectedMcp } from "./types"
import { sanitizeName } from "./aggregator"
import { log } from "./logger"

/**
 * Connect to a single MCP server
 */
export async function connectToMcpServer(
  config: McpServerConfig
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
    case "streamable-http":
      if (!config.url) {
        throw new Error(
          `MCP server "${config.name}" is ${config.transport} transport but has no URL`
        )
      }
      transport = createSSETransport(config)
      break

    default:
      throw new Error(
        `Unsupported transport type: ${config.transport} for server "${config.name}"`
      )
  }

  await client.connect(transport)
  log.info(`Connected to MCP server: ${config.name}`)

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
 * Create an SSE transport with optional static headers
 *
 * Note: The MCP SDK's SSEClientTransport has a known bug where headers aren't
 * sent on the initial /sse connection when using only `requestInit`. The
 * workaround is to use `eventSourceInit` with a custom fetch that includes
 * the headers on all requests.
 */
function createSSETransport(config: McpServerConfig): SSEClientTransport {
  const url = new URL(config.url!)
  const headers = config.headers

  log.debug(`Creating SSE transport: ${url.toString()}`)

  // If headers are provided, use the workaround pattern
  if (headers && Object.keys(headers).length > 0) {
    log.debug(`SSE transport includes ${Object.keys(headers).length} headers`)

    return new SSEClientTransport(url, {
      eventSourceInit: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              ...headers,
            },
          }),
      },
      requestInit: { headers },
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
    log.error(`Error disconnecting from ${mcp.config.name}`, { error })
    throw error
  }
}

/**
 * Connect to multiple MCP servers
 */
export async function connectToAllServers(configs: McpServerConfig[]): Promise<{
  connected: ConnectedMcp[]
  failed: Array<{ config: McpServerConfig; error: string }>
}> {
  const connected: ConnectedMcp[] = []
  const failed: Array<{ config: McpServerConfig; error: string }> = []

  const activeConfigs = configs.filter((c) => c.status === "active")

  log.info(
    `Connecting to ${activeConfigs.length} active MCP servers (${configs.length - activeConfigs.length} inactive)`
  )

  for (const config of activeConfigs) {
    try {
      const mcp = await connectToMcpServer(config)
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
