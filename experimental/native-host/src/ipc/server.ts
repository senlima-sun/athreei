/**
 * IPC Server - Unix socket server for MCP connections
 *
 * Accepts connections from the MCP server and uses the same
 * length-prefixed JSON protocol as Chrome Native Messaging.
 */

import { createServer, Server, Socket } from "net"
import { getSocketPath, cleanupStaleSocket, ensureSocketDir } from "./protocol"

/**
 * Connected IPC client state
 */
interface IPCClient {
  id: string
  socket: Socket
  buffer: Buffer
}

/**
 * Unix socket server that accepts connections from MCP server
 */
export class IPCServer {
  private server: Server | null = null
  private clients = new Map<string, IPCClient>()
  private clientCounter = 0

  /**
   * Callback for when a request is received from an IPC client
   * Should be set by the main application to forward requests to Chrome
   */
  public onRequest: ((request: any, clientId: string) => void) | null = null

  /**
   * Start the IPC server listening on the Unix socket
   */
  async start(): Promise<void> {
    const socketPath = getSocketPath()
    cleanupStaleSocket(socketPath)
    ensureSocketDir(socketPath)

    return new Promise((resolve, reject) => {
      this.server = createServer(this.handleConnection.bind(this))

      this.server.on("error", (error) => {
        console.error("[ipc-server] Server error:", error)
        reject(error)
      })

      this.server.listen(socketPath, () => {
        console.error(`[ipc-server] Listening on ${socketPath}`)
        resolve()
      })
    })
  }

  /**
   * Handle a new client connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = `client-${++this.clientCounter}`
    const client: IPCClient = {
      id: clientId,
      socket,
      buffer: Buffer.alloc(0),
    }

    this.clients.set(clientId, client)
    console.error(`[ipc-server] Client connected: ${clientId}`)

    socket.on("data", (data) => this.handleData(client, data))

    socket.on("close", () => {
      console.error(`[ipc-server] Client disconnected: ${clientId}`)
      this.clients.delete(clientId)
    })

    socket.on("error", (error) => {
      console.error(`[ipc-server] Client error (${clientId}):`, error)
      this.clients.delete(clientId)
    })
  }

  /**
   * Handle incoming data from a client
   * Uses same length-prefixed protocol as Chrome Native Messaging
   */
  private handleData(client: IPCClient, data: Buffer): void {
    // Append new data to client buffer
    client.buffer = Buffer.concat([client.buffer, data])

    // Process all complete messages in buffer
    while (client.buffer.length >= 4) {
      const msgLen = client.buffer.readUInt32LE(0)

      if (client.buffer.length < 4 + msgLen) {
        break
      }

      const jsonStr = client.buffer.slice(4, 4 + msgLen).toString("utf8")
      client.buffer = client.buffer.slice(4 + msgLen)

      try {
        const message = JSON.parse(jsonStr)
        console.error(
          `[ipc-server] Received from ${client.id}: ${message.type} (id: ${message.id})`
        )

        if (this.onRequest) {
          this.onRequest(message, client.id)
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error(
          `[ipc-server] Failed to parse message from ${client.id}: ${errorMessage}`
        )
      }
    }
  }

  /**
   * Send a response back to a specific client
   */
  sendResponse(clientId: string, response: any): void {
    const client = this.clients.get(clientId)
    if (!client) {
      console.error(
        `[ipc-server] Cannot send response, client not found: ${clientId}`
      )
      return
    }

    try {
      const json = JSON.stringify(response)
      const buf = Buffer.alloc(4 + Buffer.byteLength(json))
      buf.writeUInt32LE(Buffer.byteLength(json), 0)
      buf.write(json, 4)
      client.socket.write(buf)
      console.error(
        `[ipc-server] Sent response to ${clientId}: ${response.type} (id: ${response.id})`
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(
        `[ipc-server] Failed to send response to ${clientId}: ${errorMessage}`
      )
    }
  }

  /**
   * Stop the IPC server and close all client connections
   */
  async stop(): Promise<void> {
    console.error("[ipc-server] Stopping server...")

    for (const client of this.clients.values()) {
      try {
        client.socket.destroy()
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error(
          `[ipc-server] Error closing client ${client.id}: ${errorMessage}`
        )
      }
    }
    this.clients.clear()

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.error("[ipc-server] Server stopped")
          resolve()
        })
      })
    }
  }
}
