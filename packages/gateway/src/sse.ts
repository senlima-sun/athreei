/**
 * SSE Transport for Gateway
 *
 * Provides Server-Sent Events transport for MCP protocol communication.
 * Each SSE connection creates a new gateway session with connected MCP servers.
 */

import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import type { SSEStreamingApi } from "hono/streaming"
import {
  createSession,
  getSession,
  destroySession,
  touchSession,
  listSessionTools,
  callSessionTool,
} from "./session"
import { log } from "./logger"
import type { NamespaceConfig } from "./types"

interface McpRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: unknown
}

interface McpResponse {
  jsonrpc: "2.0"
  id: string | number
  result?: unknown
  error?: { code: number; message: string }
}

let namespaceConfig: NamespaceConfig | null = null

export function setNamespaceConfig(config: NamespaceConfig): void {
  namespaceConfig = config
}

function handleInitialize(request: McpRequest): McpResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "athreei-gateway",
        version: "0.1.0",
      },
    },
  }
}

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

async function handleToolsCall(
  request: McpRequest,
  sessionId: string
): Promise<McpResponse> {
  try {
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

    const result = await callSessionTool(
      sessionId,
      params.name,
      params.arguments ?? {}
    )

    return {
      jsonrpc: "2.0",
      id: request.id,
      result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error(`Tool call error: ${message}`)
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32603, message },
    }
  }
}

function handlePing(request: McpRequest): McpResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {},
  }
}

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

async function handleMcpRequest(
  request: McpRequest,
  sessionId: string
): Promise<McpResponse> {
  log.debug(`Handling MCP request: ${request.method}`)

  switch (request.method) {
    case "initialize":
      return handleInitialize(request)
    case "tools/list":
      return handleToolsList(request, sessionId)
    case "tools/call":
      return await handleToolsCall(request, sessionId)
    case "ping":
      return handlePing(request)
    default:
      return handleUnknownMethod(request)
  }
}

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

async function handleSseConnection(
  stream: SSEStreamingApi,
  sessionId: string,
  abortController: AbortController
): Promise<void> {
  log.info(`SSE connection established for session: ${sessionId}`)

  // Send initial connection event with session endpoint
  await sendEvent(stream, "endpoint", `/mcp/messages?sessionId=${sessionId}`)

  // Keep connection alive with periodic pings
  const pingInterval = setInterval(async () => {
    if (abortController.signal.aborted) {
      clearInterval(pingInterval)
      return
    }

    try {
      touchSession(sessionId)
      await sendEvent(stream, "ping", { timestamp: Date.now() })
    } catch {
      clearInterval(pingInterval)
    }
  }, 30000)

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
  log.info(`SSE connection closed for session: ${sessionId}`)
}

export function createSseApp(): Hono {
  const app = new Hono()

  // SSE endpoint - creates a new session
  app.get("/sse", async (c) => {
    if (!namespaceConfig) {
      return c.json({ error: "Gateway not configured" }, 500)
    }

    // Create gateway session
    let session
    try {
      session = await createSession({
        servers: namespaceConfig.servers,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`Failed to create session: ${message}`)
      return c.json({ error: "Failed to create gateway session" }, 500)
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
        log.error("SSE stream error:", error)
      } finally {
        await destroySession(session.id)
      }
    })
  })

  // Message endpoint for receiving MCP requests
  app.post("/messages", async (c) => {
    const sessionId = c.req.query("sessionId")

    if (!sessionId) {
      return c.json({ error: "Missing sessionId query parameter" }, 400)
    }

    const session = getSession(sessionId)

    if (!session) {
      return c.json({ error: `Session not found: ${sessionId}` }, 404)
    }

    if (!session.isActive) {
      return c.json({ error: "Session has expired" }, 410)
    }

    // Parse MCP request
    let request: McpRequest
    try {
      request = await c.req.json()
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400)
    }

    // Validate basic JSON-RPC structure
    if (
      request.jsonrpc !== "2.0" ||
      request.id === undefined ||
      !request.method
    ) {
      return c.json({ error: "Invalid JSON-RPC request" }, 400)
    }

    // Handle the MCP request
    const response = await handleMcpRequest(request, sessionId)

    return c.json(response)
  })

  // Health check
  app.get("/health", (c) => {
    return c.json({ status: "ok" })
  })

  return app
}
