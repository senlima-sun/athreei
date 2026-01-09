/**
 * MCP Client Module
 *
 * Direct MCP server communication for local mode.
 * Supports stdio, SSE, and streamable-http transports.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import {
  isStdioServer,
  isHttpServer,
  type ServerConfig,
  type ServerVerifyResult,
} from "@athreei/shared"

// ============================================================================
// Constants
// ============================================================================

/** Default connection timeout in milliseconds */
const DEFAULT_TIMEOUT = 10000

/** CLI client info for MCP protocol */
const CLIENT_INFO = {
  name: "athreei-cli",
  version: "0.1.0",
}

// ============================================================================
// Types
// ============================================================================

/**
 * Tool information from MCP server
 */
export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/**
 * MCP client options
 */
export interface McpClientOptions {
  /** Connection timeout in milliseconds */
  timeout?: number
}

// ============================================================================
// Server Verification
// ============================================================================

/**
 * Verify connection to an MCP server
 *
 * Connects to the server, retrieves server info and tools list,
 * then disconnects. Returns verification result.
 *
 * @param config - Server configuration
 * @param options - Client options
 * @returns Verification result
 */
export async function verifyMcpServer(
  config: ServerConfig,
  options?: McpClientOptions
): Promise<ServerVerifyResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const target = isStdioServer(config)
    ? config.command
    : isHttpServer(config)
      ? config.url
      : "unknown"

  const result: ServerVerifyResult = {
    name: config.name,
    target,
    success: false,
  }

  try {
    const client = new Client(CLIENT_INFO, {
      capabilities: {},
    })

    const transport = createTransport(config)

    // Connect with timeout
    await withTimeout(client.connect(transport), timeout, "Connection timeout")

    // Get server info
    try {
      const serverInfo = client.getServerVersion()
      if (serverInfo) {
        result.serverInfo = {
          name: serverInfo.name,
          version: serverInfo.version,
        }
      }
    } catch {
      // Server info is optional, continue if not available
    }

    // List tools to verify server is responding
    const toolsResponse = await withTimeout(
      client.listTools(),
      timeout,
      "Tools list timeout"
    )
    const tools = toolsResponse.tools ?? []

    result.success = true
    result.tools = tools.map((t) => t.name)

    // Disconnect gracefully
    await client.close()
  } catch (error) {
    result.success = false
    result.error = error instanceof Error ? error.message : String(error)
  }

  return result
}

/**
 * Verify multiple MCP servers
 *
 * @param configs - Server configurations
 * @param options - Client options
 * @returns Array of verification results
 */
export async function verifyMcpServers(
  configs: ServerConfig[],
  options?: McpClientOptions
): Promise<ServerVerifyResult[]> {
  return Promise.all(configs.map((config) => verifyMcpServer(config, options)))
}

// ============================================================================
// Tool Listing
// ============================================================================

/**
 * List tools from an MCP server
 *
 * @param config - Server configuration
 * @param options - Client options
 * @returns Array of tools
 */
export async function listMcpTools(
  config: ServerConfig,
  options?: McpClientOptions
): Promise<McpTool[]> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT

  const client = new Client(CLIENT_INFO, {
    capabilities: {},
  })

  const transport = createTransport(config)

  try {
    await withTimeout(client.connect(transport), timeout, "Connection timeout")

    const response = await withTimeout(
      client.listTools(),
      timeout,
      "Tools list timeout"
    )

    await client.close()

    return (response.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    }))
  } catch (error) {
    await client.close().catch(() => {})
    throw error
  }
}

// ============================================================================
// Transport Factory
// ============================================================================

/**
 * Create appropriate transport for server config
 */
function createTransport(config: ServerConfig) {
  if (isStdioServer(config)) {
    return new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    })
  }

  if (isHttpServer(config)) {
    const url = new URL(config.url)
    const headers: Record<string, string> = {
      ...config.headers,
    }

    // Add token as Authorization header if present
    if (config.token) {
      headers["Authorization"] = `Bearer ${config.token}`
    }

    // Use SSE transport for both SSE and streamable-http
    // (streamable-http is handled by the SSE transport)
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
      requestInit: {
        headers,
      },
    })
  }

  throw new Error(`Unsupported transport: ${config.transport ?? "stdio"}`)
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Execute promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  )
  return Promise.race([promise, timeoutPromise])
}
