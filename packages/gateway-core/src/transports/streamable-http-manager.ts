/**
 * Streamable HTTP Transport Manager
 *
 * Manages HTTP-based MCP server connections with SSE streaming support.
 * Implements the MCP Streamable HTTP transport specification (2025-06-18).
 */

import type {
  StreamableHttpTransportConfig,
  TransportConnection,
  McpMessage,
  TransportStatus,
} from "../types/transports.js"

interface HttpSession {
  id: string
  config: StreamableHttpTransportConfig
  sessionId: string | null
  status: TransportStatus
  messageQueue: McpMessage[]
  lastEventId: string | null
  connectedAt?: Date
  lastMessageAt?: Date
  abortController: AbortController
}

export class StreamableHttpTransportManager {
  private sessions = new Map<string, HttpSession>()
  private messageHandlers = new Map<string, (msg: McpMessage) => void>()
  private errorHandlers = new Map<string, (err: Error) => void>()
  private closeHandlers = new Map<string, () => void>()

  async connect(
    id: string,
    config: StreamableHttpTransportConfig
  ): Promise<TransportConnection> {
    const existingSession = this.sessions.get(id)
    if (existingSession) {
      existingSession.abortController.abort()
      this.sessions.delete(id)
    }

    const session: HttpSession = {
      id,
      config,
      sessionId: null,
      status: "connecting",
      messageQueue: [],
      lastEventId: null,
      abortController: new AbortController(),
    }
    this.sessions.set(id, session)

    try {
      const initResponse = await this.sendRequest(config, session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "athreei-gateway", version: "1.0.0" },
        },
      })

      session.sessionId = initResponse.headers.get("Mcp-Session-Id")

      const contentType = initResponse.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const result = await initResponse.json()
        session.messageQueue.push(result as McpMessage)
      } else if (contentType?.includes("text/event-stream")) {
        if (initResponse.body) {
          await this.parseEventStream(session, initResponse.body)
        }
      }

      await this.sendNotification(session, {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      })

      session.status = "connected"
      session.connectedAt = new Date()

      if (config.enableResumability !== false) {
        this.openEventStream(session)
      }

      return this.createConnection(id, session)
    } catch (e) {
      session.status = "error"
      const error = e instanceof Error ? e : new Error(String(e))
      const errorHandler = this.errorHandlers.get(id)
      errorHandler?.(error)
      throw error
    }
  }

  private async sendRequest(
    config: StreamableHttpTransportConfig,
    session: HttpSession | null,
    message: McpMessage
  ): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
      ...config.headers,
    }

    if (session?.sessionId) {
      headers["Mcp-Session-Id"] = session.sessionId
    }

    const signals = [AbortSignal.timeout(config.requestTimeout ?? 30000)]
    if (session?.abortController) {
      signals.push(session.abortController.signal)
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
      signal: AbortSignal.any(signals),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  }

  private async sendNotification(
    session: HttpSession,
    message: McpMessage
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
      ...session.config.headers,
    }

    if (session.sessionId) {
      headers["Mcp-Session-Id"] = session.sessionId
    }

    const signals = [
      session.abortController.signal,
      AbortSignal.timeout(session.config.requestTimeout ?? 30000),
    ]

    const response = await fetch(session.config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
      signal: AbortSignal.any(signals),
    })

    if (response.status !== 202 && response.status !== 200) {
      throw new Error(`Expected 200/202, got ${response.status}`)
    }
  }

  private async openEventStream(session: HttpSession): Promise<void> {
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
      ...session.config.headers,
    }

    if (session.sessionId) {
      headers["Mcp-Session-Id"] = session.sessionId
    }

    if (session.lastEventId) {
      headers["Last-Event-ID"] = session.lastEventId
    }

    try {
      const response = await fetch(session.config.url, {
        method: "GET",
        headers,
        signal: session.abortController.signal,
      })

      if (response.status === 405) {
        // Server doesn't support SSE GET - this is fine, not an error
        return
      }

      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("text/event-stream") ||
        !response.body
      ) {
        return
      }

      this.parseEventStream(session, response.body)
    } catch {
      // SSE stream error - often expected during cleanup
    }
  }

  private async parseEventStream(
    session: HttpSession,
    body: ReadableStream<Uint8Array>
  ): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let eventId: string | null = null
        let eventData = ""

        for (const line of lines) {
          if (line.startsWith("id:")) {
            eventId = line.slice(3).trim()
          } else if (line.startsWith("data:")) {
            const dataContent = line.slice(5).startsWith(" ")
              ? line.slice(6)
              : line.slice(5)
            if (eventData) {
              eventData += "\n"
            }
            eventData += dataContent
          } else if (line === "") {
            if (eventData) {
              if (eventId) {
                session.lastEventId = eventId
              }
              try {
                const message = JSON.parse(eventData) as McpMessage
                session.lastMessageAt = new Date()
                session.messageQueue.push(message)

                const handler = this.messageHandlers.get(session.id)
                handler?.(message)
              } catch {
                console.error(
                  `[http:${session.id}] Invalid SSE data:`,
                  eventData
                )
              }
            }
            eventData = ""
            eventId = null
          }
        }
      }
    } catch (e) {
      if (!session.abortController.signal.aborted) {
        const errorHandler = this.errorHandlers.get(session.id)
        errorHandler?.(e instanceof Error ? e : new Error(String(e)))
      }
    } finally {
      reader.releaseLock()
    }
  }

  private createConnection(
    id: string,
    session: HttpSession
  ): TransportConnection {
    const sessions = this.sessions
    const messageHandlers = this.messageHandlers
    const errorHandlers = this.errorHandlers
    const closeHandlers = this.closeHandlers
    const parseEventStream = this.parseEventStream.bind(this)

    return {
      id,
      config: session.config,
      get status() {
        return sessions.get(id)?.status ?? "disconnected"
      },
      get connectedAt() {
        return sessions.get(id)?.connectedAt
      },
      get lastMessageAt() {
        return sessions.get(id)?.lastMessageAt
      },

      send: async (message: McpMessage) => {
        const currentSession = sessions.get(id)
        if (!currentSession || currentSession.abortController.signal.aborted) {
          throw new Error(`Connection ${id} is closed`)
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "MCP-Protocol-Version": "2025-06-18",
          ...currentSession.config.headers,
        }

        if (currentSession.sessionId) {
          headers["Mcp-Session-Id"] = currentSession.sessionId
        }

        const response = await fetch(currentSession.config.url, {
          method: "POST",
          headers,
          body: JSON.stringify(message),
          signal: currentSession.abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get("content-type")

        if (contentType?.includes("application/json")) {
          const result = (await response.json()) as McpMessage
          currentSession.lastMessageAt = new Date()
          currentSession.messageQueue.push(result)

          const handler = messageHandlers.get(id)
          handler?.(result)
        } else if (contentType?.includes("text/event-stream") && response.body) {
          await parseEventStream(currentSession, response.body)
        }
      },

      close: async () => {
        const currentSession = sessions.get(id)
        if (!currentSession) return

        currentSession.abortController.abort()
        currentSession.status = "disconnected"

        if (currentSession.sessionId) {
          try {
            await fetch(currentSession.config.url, {
              method: "DELETE",
              headers: { "Mcp-Session-Id": currentSession.sessionId },
            })
          } catch {
            // Ignore errors on close
          }
        }

        const closeHandler = closeHandlers.get(id)
        closeHandler?.()

        sessions.delete(id)
        messageHandlers.delete(id)
        errorHandlers.delete(id)
        closeHandlers.delete(id)
      },

      onMessage: (handler) => {
        messageHandlers.set(id, handler)

        const currentSession = sessions.get(id)
        if (currentSession) {
          const queued = currentSession.messageQueue
          currentSession.messageQueue = []
          for (const msg of queued) {
            handler(msg)
          }
        }
      },

      onError: (handler) => {
        errorHandlers.set(id, handler)
      },

      onClose: (handler) => {
        closeHandlers.set(id, handler)
      },
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map(async (session) => {
      session.abortController.abort()
      session.status = "disconnected"

      if (session.sessionId) {
        try {
          await fetch(session.config.url, {
            method: "DELETE",
            headers: { "Mcp-Session-Id": session.sessionId },
          })
        } catch {
          // Ignore errors
        }
      }

      const closeHandler = this.closeHandlers.get(session.id)
      closeHandler?.()
    })

    await Promise.all(promises)

    this.sessions.clear()
    this.messageHandlers.clear()
    this.errorHandlers.clear()
    this.closeHandlers.clear()
  }

  getConnection(id: string): TransportConnection | undefined {
    const session = this.sessions.get(id)
    if (!session) return undefined
    return this.createConnection(id, session)
  }

  getStatus(id: string): TransportStatus | undefined {
    return this.sessions.get(id)?.status
  }

  isConnected(id: string): boolean {
    const session = this.sessions.get(id)
    return session?.status === "connected"
  }

  getConnectionIds(): string[] {
    return Array.from(this.sessions.keys())
  }
}
