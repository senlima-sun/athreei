/**
 * SSE Endpoint for MCP Gateway
 *
 * Provides Server-Sent Events transport for MCP protocol communication.
 * Each SSE connection creates a new gateway session with connected MCP servers.
 */

import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import type { SSEStreamingApi } from "hono/streaming"
import {
  GatewayErrorCode,
  type EndpointConfig,
  type GatewayError,
  type McpRequest,
  type McpResponse,
} from "../types"
import {
  createSession,
  getSession,
  destroySession,
  touchSession,
  listSessionTools,
  callSessionTool,
} from "../gateway/session"
import { noopLogger, type Logger } from "@athreei/gateway-core"
import { getTraceRecorder } from "../services/trace-recorder"

const sse = new Hono()

/** Logger instance (can be configured) */
let logger: Logger = noopLogger

/**
 * Configure the SSE routes
 */
export function configureSseRoutes(options: { logger?: Logger }): void {
  if (options.logger) {
    logger = options.logger
  }
}

/**
 * Validate API key and get endpoint configuration from Platform API
 */
async function validateAndGetConfig(
  endpointName: string,
  apiKey: string | undefined,
  platformUrl: string
): Promise<EndpointConfig | null> {
  if (!apiKey) {
    logger.debug("No API key provided")
    return null
  }

  try {
    const url = `${platformUrl}/api/gateway/config?endpoint=${encodeURIComponent(endpointName)}`

    logger.debug(`Fetching endpoint config from: ${url}`)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      logger.warn(
        `API key validation failed: ${response.status} ${response.statusText}`
      )
      return null
    }

    const config = (await response.json()) as EndpointConfig
    logger.debug(`Endpoint config fetched for: ${config.endpointName}`)

    return config
  } catch (error) {
    logger.error("Error validating API key:", error)
    return null
  }
}

/**
 * Create error response
 */
function createError(
  code: GatewayErrorCode,
  message: string,
  details?: unknown
): GatewayError {
  return { error: code, message, details }
}

/**
 * Handle MCP initialize request
 */
function handleInitialize(
  request: McpRequest,
  _sessionId: string
): McpResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "athreei-gateway-cloud",
        version: "0.1.0",
      },
    },
  }
}

/**
 * Handle MCP tools/list request
 */
function handleToolsList(request: McpRequest, sessionId: string): McpResponse {
  try {
    const tools = listSessionTools(sessionId)
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { tools },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32603, message },
    }
  }
}

/**
 * Handle MCP tools/call request
 */
async function handleToolsCall(
  request: McpRequest,
  sessionId: string,
  apiKey?: string,
  platformUrl?: string
): Promise<McpResponse> {
  const startTime = Date.now()

  const params = request.params as {
    name: string
    arguments?: Record<string, unknown>
  }

  if (!params?.name) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32602, message: "Missing tool name" },
    }
  }

  // Parse aggregated tool name (serverName__toolName)
  const parts = params.name.includes("__")
    ? params.name.split("__", 2)
    : ["unknown", params.name]
  const serverName = parts[0] ?? "unknown"
  const toolName = parts[1] ?? params.name

  try {
    const result = await callSessionTool(
      sessionId,
      params.name,
      params.arguments ?? {}
    )

    const endTime = Date.now()

    // Record trace (fire-and-forget)
    if (apiKey && platformUrl) {
      getTraceRecorder(apiKey, platformUrl, logger).record(
        {
          aggregatedToolName: params.name,
          serverName,
          toolName,
          arguments: params.arguments,
          result,
        },
        startTime,
        endTime
      )
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result,
    }
  } catch (error) {
    const endTime = Date.now()
    const message = error instanceof Error ? error.message : String(error)

    // Record error trace (fire-and-forget)
    if (apiKey && platformUrl) {
      getTraceRecorder(apiKey, platformUrl, logger).record(
        {
          aggregatedToolName: params.name,
          serverName,
          toolName,
          arguments: params.arguments,
          error: message,
        },
        startTime,
        endTime
      )
    }

    logger.error(`Tool call error: ${message}`)
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32603, message },
    }
  }
}

/**
 * Handle MCP ping request
 */
function handlePing(request: McpRequest): McpResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {},
  }
}

/**
 * Handle unknown MCP method
 */
function handleUnknownMethod(request: McpRequest): McpResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: {
      code: -32601,
      message: `Method not found: ${request.method}`,
    },
  }
}

/**
 * Route MCP request to appropriate handler
 */
async function handleMcpRequest(
  request: McpRequest,
  sessionId: string,
  apiKey?: string,
  platformUrl?: string
): Promise<McpResponse> {
  logger.debug(`Handling MCP request: ${request.method}`)

  switch (request.method) {
    case "initialize":
      return handleInitialize(request, sessionId)
    case "tools/list":
      return handleToolsList(request, sessionId)
    case "tools/call":
      return await handleToolsCall(request, sessionId, apiKey, platformUrl)
    case "ping":
      return handlePing(request)
    default:
      return handleUnknownMethod(request)
  }
}

/**
 * Send SSE event
 */
async function sendEvent(
  stream: SSEStreamingApi,
  event: string,
  data: unknown,
  id?: string
): Promise<void> {
  const dataStr = typeof data === "string" ? data : JSON.stringify(data)

  await stream.writeSSE({
    event,
    data: dataStr,
    id,
  })
}

/**
 * Handle SSE connection
 */
async function handleSseConnection(
  stream: SSEStreamingApi,
  sessionId: string,
  abortController: AbortController
): Promise<void> {
  logger.info(`SSE connection established for session: ${sessionId}`)

  // Send initial connection event with session endpoint
  await sendEvent(stream, "endpoint", `/mcp/messages?sessionId=${sessionId}`)

  // Keep connection alive with periodic pings
  const pingInterval = setInterval(async () => {
    if (abortController.signal.aborted) {
      clearInterval(pingInterval)
      return
    }

    try {
      // Touch session to keep it alive
      touchSession(sessionId)

      await sendEvent(stream, "ping", { timestamp: Date.now() })
    } catch {
      // Connection closed
      clearInterval(pingInterval)
    }
  }, 30000) // Ping every 30 seconds

  // Wait for abort signal
  await new Promise<void>((resolve) => {
    if (abortController.signal.aborted) {
      resolve()
      return
    }
    abortController.signal.addEventListener("abort", () => resolve(), {
      once: true,
    })
  })

  clearInterval(pingInterval)
  logger.info(`SSE connection closed for session: ${sessionId}`)
}

/**
 * SSE endpoint for MCP communication
 * GET /mcp/:endpointName/sse
 */
sse.get("/:endpointName/sse", async (c) => {
  const { endpointName } = c.req.param()
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "")
  const platformUrl = process.env.PLATFORM_URL ?? "http://localhost:3000"

  // Validate API key and get endpoint config
  const config = await validateAndGetConfig(endpointName, apiKey, platformUrl)

  if (!config) {
    return c.json(
      createError(GatewayErrorCode.UNAUTHORIZED, "Invalid or missing API key"),
      401
    )
  }

  // Create gateway session
  let session
  try {
    session = await createSession({
      endpointName: config.endpointName,
      userId: config.userId,
      namespaceId: config.namespaceId,
      servers: config.servers,
      logger,
      apiKey, // Pass apiKey for fetching server environment variables and trace recording
      platformUrl, // Pass platformUrl for trace recording
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to create session: ${message}`)
    return c.json(
      createError(
        GatewayErrorCode.INTERNAL_ERROR,
        "Failed to create gateway session",
        {
          error: message,
        }
      ),
      500
    )
  }

  const abortController = new AbortController()

  // Set up connection close handler
  c.req.raw.signal.addEventListener(
    "abort",
    async () => {
      abortController.abort()
      await destroySession(session.id)
    },
    { once: true }
  )

  return streamSSE(c, async (stream) => {
    try {
      await handleSseConnection(stream, session.id, abortController)
    } catch (error) {
      logger.error("SSE stream error:", error)
    } finally {
      await destroySession(session.id)
    }
  })
})

/**
 * Message endpoint for receiving MCP requests
 * POST /mcp/messages
 */
sse.post("/messages", async (c) => {
  const sessionId = c.req.query("sessionId")

  if (!sessionId) {
    return c.json(
      createError(
        GatewayErrorCode.INVALID_REQUEST,
        "Missing sessionId query parameter"
      ),
      400
    )
  }

  const session = getSession(sessionId)

  if (!session) {
    return c.json(
      createError(
        GatewayErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${sessionId}`
      ),
      404
    )
  }

  if (!session.isActive) {
    return c.json(
      createError(GatewayErrorCode.SESSION_EXPIRED, "Session has expired"),
      410
    )
  }

  // Parse MCP request
  let request: McpRequest
  try {
    request = await c.req.json()
  } catch {
    return c.json(
      createError(GatewayErrorCode.INVALID_REQUEST, "Invalid JSON body"),
      400
    )
  }

  // Validate basic JSON-RPC structure
  if (
    request.jsonrpc !== "2.0" ||
    request.id === undefined ||
    !request.method
  ) {
    return c.json(
      createError(GatewayErrorCode.INVALID_REQUEST, "Invalid JSON-RPC request"),
      400
    )
  }

  // Handle the MCP request
  const response = await handleMcpRequest(
    request,
    sessionId,
    session.apiKey,
    session.platformUrl
  )

  return c.json(response)
})

/**
 * Resume an existing session via SSE
 * GET /mcp/session/:sessionId/sse
 */
sse.get("/session/:sessionId/sse", async (c) => {
  const { sessionId } = c.req.param()

  const session = getSession(sessionId)

  if (!session) {
    return c.json(
      createError(
        GatewayErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${sessionId}`
      ),
      404
    )
  }

  if (!session.isActive) {
    return c.json(
      createError(GatewayErrorCode.SESSION_EXPIRED, "Session has expired"),
      410
    )
  }

  const abortController = new AbortController()

  c.req.raw.signal.addEventListener(
    "abort",
    () => {
      abortController.abort()
      // Don't destroy session on reconnect, just close the stream
    },
    { once: true }
  )

  return streamSSE(c, async (stream) => {
    try {
      await handleSseConnection(stream, session.id, abortController)
    } catch (error) {
      logger.error("SSE stream error:", error)
    }
  })
})

export default sse
