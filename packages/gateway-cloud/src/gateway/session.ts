/**
 * Gateway Session Management
 *
 * Manages per-user gateway instances with automatic cleanup of idle sessions.
 * Each SSE connection gets its own session with connected MCP servers.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import {
  sanitizeName,
  aggregateTools,
  routeToolCall,
  type McpServerConfig,
  type ConnectedMcp,
  type Logger,
  noopLogger,
} from "@athreei/gateway-core"
import type { GatewaySession, CreateSessionOptions } from "../types"

/** In-memory session storage */
const sessions = new Map<string, GatewaySession>()

/** Cleanup interval reference */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

/** Session timeout configuration */
let sessionIdleTimeout = 30 * 60 * 1000 // 30 minutes default

/** Default logger */
let logger: Logger = noopLogger

/**
 * Configure session management settings
 */
export function configureSessionManager(options: {
  idleTimeout?: number
  logger?: Logger
}): void {
  if (options.idleTimeout !== undefined) {
    sessionIdleTimeout = options.idleTimeout
  }
  if (options.logger) {
    logger = options.logger
  }
}

/**
 * Fetch environment variables for an MCP server from the API
 *
 * @param serverId - The MCP server ID
 * @param apiKey - API key for authentication
 * @param log - Logger instance
 * @returns Environment variables as key-value pairs, or empty object on failure
 */
async function getServerEnv(
  serverId: string,
  apiKey: string,
  log: Logger
): Promise<Record<string, string>> {
  const API_URL = process.env.API_URL || "http://localhost:3001"

  try {
    const response = await fetch(`${API_URL}/api/mcp-servers/${serverId}/env`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        log.debug(`No environment variables configured for server ${serverId}`)
        return {}
      }
      log.warn(`Failed to fetch env for server ${serverId}: ${response.status}`)
      return {}
    }

    const data = (await response.json()) as { env?: Record<string, string> }
    log.debug(`Fetched environment variables for server ${serverId}`)
    return data.env || {}
  } catch (error) {
    log.error(
      `Error fetching env for server ${serverId}:`,
      error instanceof Error ? error.message : String(error)
    )
    return {}
  }
}

/**
 * Connect to a single MCP server
 *
 * @param config - MCP server configuration
 * @param log - Logger instance
 * @param apiKey - Optional API key for fetching environment variables
 */
async function connectToMcpServer(
  config: McpServerConfig,
  log: Logger,
  apiKey?: string
): Promise<ConnectedMcp> {
  log.info(`Connecting to MCP server: ${config.name} (${config.transport})`)

  const client = new Client(
    {
      name: "athreei-gateway-cloud",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  let transport

  switch (config.transport) {
    case "stdio": {
      if (!config.command) {
        throw new Error(
          `MCP server "${config.name}" is stdio transport but has no command`
        )
      }
      const args = config.args ? config.args.split(" ").filter(Boolean) : []

      let serverEnv: Record<string, string> = {}
      if (apiKey) {
        serverEnv = await getServerEnv(config.id, apiKey, log)
      }

      transport = new StdioClientTransport({
        command: config.command,
        args,
        env: {
          // Only pass essential runtime vars, not infrastructure secrets
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          NODE_ENV: process.env.NODE_ENV,
          // Pass server-specific env vars (intentionally configured for this server)
          ...serverEnv,
        } as Record<string, string>,
      })
      break
    }

    case "sse": {
      if (!config.url) {
        throw new Error(
          `MCP server "${config.name}" is sse transport but has no URL`
        )
      }
      transport = new SSEClientTransport(new URL(config.url))
      break
    }

    case "streamable-http": {
      if (!config.url) {
        throw new Error(
          `MCP server "${config.name}" is streamable-http transport but has no URL`
        )
      }
      transport = new StreamableHTTPClientTransport(new URL(config.url))
      break
    }

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
 * Connect to all MCP servers in config
 *
 * @param configs - List of MCP server configurations
 * @param log - Logger instance
 * @param apiKey - Optional API key for fetching environment variables
 */
async function connectToAllServers(
  configs: McpServerConfig[],
  log: Logger,
  apiKey?: string
): Promise<{
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
      const mcp = await connectToMcpServer(config, log, apiKey)
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
 * Disconnect from an MCP server
 */
async function disconnectMcpServer(
  mcp: ConnectedMcp,
  log: Logger
): Promise<void> {
  log.info(`Disconnecting from MCP server: ${mcp.config.name}`)

  try {
    await mcp.client.close()
    log.info(`Disconnected from MCP server: ${mcp.config.name}`)
  } catch (error) {
    log.error(`Error disconnecting from ${mcp.config.name}:`, error)
  }
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Create a new gateway session
 */
export async function createSession(
  options: CreateSessionOptions
): Promise<GatewaySession> {
  const log = options.logger ?? logger
  const sessionId = generateSessionId()

  log.info(
    `Creating session ${sessionId} for endpoint: ${options.endpointName}`
  )

  const { connected, failed } = await connectToAllServers(
    options.servers,
    log,
    options.apiKey
  )

  if (failed.length > 0) {
    log.warn(`Session ${sessionId}: ${failed.length} servers failed to connect`)
  }

  const connectedMcps = new Map<string, ConnectedMcp>()
  for (const mcp of connected) {
    connectedMcps.set(mcp.sanitizedName, mcp)
  }

  // Aggregate tools from all connected servers
  const aggregatedTools = aggregateTools(connected, { logger: log })

  const session: GatewaySession = {
    id: sessionId,
    endpointName: options.endpointName,
    userId: options.userId,
    namespaceId: options.namespaceId,
    connectedMcps,
    aggregatedTools,
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    apiKey: options.apiKey,
    platformUrl: options.platformUrl,
  }

  sessions.set(sessionId, session)

  log.info(
    `Session ${sessionId} created: ${connectedMcps.size} servers, ${aggregatedTools.length} tools`
  )

  return session
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): GatewaySession | undefined {
  return sessions.get(sessionId)
}

/**
 * Update session last activity timestamp
 */
export function touchSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (session && session.isActive) {
    session.lastActivity = new Date()
    return true
  }
  return false
}

/**
 * Destroy a session and cleanup resources
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId)
  if (!session) {
    return false
  }

  logger.info(`Destroying session ${sessionId}`)

  session.isActive = false

  const mcps = Array.from(session.connectedMcps.values())
  await Promise.all(mcps.map((mcp) => disconnectMcpServer(mcp, logger)))

  session.connectedMcps.clear()
  session.aggregatedTools = []

  sessions.delete(sessionId)

  logger.info(`Session ${sessionId} destroyed`)

  return true
}

/**
 * Get all active sessions
 */
export function getAllSessions(): GatewaySession[] {
  return Array.from(sessions.values()).filter((s) => s.isActive)
}

/**
 * Get session count
 */
export function getSessionCount(): number {
  return sessions.size
}

/**
 * List tools for a session
 */
export function listSessionTools(
  sessionId: string
): { name: string; description?: string; inputSchema: unknown }[] {
  const session = sessions.get(sessionId)
  if (!session || !session.isActive) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  touchSession(sessionId)

  return session.aggregatedTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }))
}

/**
 * Call a tool in a session
 */
export async function callSessionTool(
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{
  content: Array<{ type: string; text?: string }>
  isError?: boolean
}> {
  const session = sessions.get(sessionId)
  if (!session || !session.isActive) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  touchSession(sessionId)

  const state = {
    connectedMcps: session.connectedMcps,
    aggregatedTools: session.aggregatedTools,
  }

  return routeToolCall(state, toolName, args, { logger })
}

/**
 * Cleanup idle sessions
 */
export async function cleanupIdleSessions(): Promise<number> {
  const now = Date.now()
  const sessionsToCleanup: string[] = []

  for (const [id, session] of sessions) {
    const idleTime = now - session.lastActivity.getTime()
    if (idleTime > sessionIdleTimeout) {
      sessionsToCleanup.push(id)
    }
  }

  if (sessionsToCleanup.length > 0) {
    logger.info(`Cleaning up ${sessionsToCleanup.length} idle sessions`)

    await Promise.all(
      sessionsToCleanup.map((id) => destroySession(id).catch(() => {}))
    )
  }

  return sessionsToCleanup.length
}

/**
 * Start periodic cleanup of idle sessions
 */
export function startSessionCleanup(intervalMs: number = 60000): void {
  if (cleanupIntervalId) {
    return
  }

  logger.info(`Starting session cleanup (interval: ${intervalMs}ms)`)

  cleanupIntervalId = setInterval(() => {
    cleanupIdleSessions().catch((error) => {
      logger.error("Error during session cleanup:", error)
    })
  }, intervalMs)
}

/**
 * Stop periodic cleanup
 */
export function stopSessionCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
    logger.info("Session cleanup stopped")
  }
}

/**
 * Cleanup all sessions (for shutdown)
 */
export async function cleanupAllSessions(): Promise<void> {
  logger.info(`Cleaning up all ${sessions.size} sessions`)

  const sessionIds = Array.from(sessions.keys())
  await Promise.all(sessionIds.map((id) => destroySession(id).catch(() => {})))

  logger.info("All sessions cleaned up")
}

/**
 * Reset session store (for testing)
 */
export function _resetForTesting(): void {
  sessions.clear()
  stopSessionCleanup()
  sessionIdleTimeout = 30 * 60 * 1000
  logger = noopLogger
}

/**
 * Get raw sessions map (for testing)
 */
export function _getSessionsMap(): Map<string, GatewaySession> {
  return sessions
}
