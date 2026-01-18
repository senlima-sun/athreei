/**
 * IPC Client for Unix Socket Communication
 *
 * Connects to the Native Host's Unix socket server to forward browser tool calls.
 * This allows the MCP Server to communicate with the Chrome extension without
 * spawning its own native host process (Chrome manages that).
 */

import { Socket, createConnection } from "net"
import { homedir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"
import { logger } from "../utils/logger"
import { getAiAppName } from "../context/index"

function getSocketPath(): string {
  const baseDir =
    process.platform === "win32"
      ? process.env.APPDATA || join(homedir(), "AppData", "Roaming")
      : join(homedir(), ".athreei")
  return join(baseDir, "athreei.sock")
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

export class IPCClient {
  private socket: Socket | null = null
  private buffer = Buffer.alloc(0)
  private pendingRequests = new Map<string, PendingRequest>()
  private connected = false
  private connecting = false

  async connect(): Promise<void> {
    if (this.connected || this.connecting) return
    this.connecting = true

    const socketPath = getSocketPath()

    return new Promise((resolve, reject) => {
      this.socket = createConnection(socketPath, () => {
        this.connected = true
        this.connecting = false
        logger.info("Connected to native host IPC")
        resolve()
      })

      this.socket.on("data", (data) => this.handleData(data))
      this.socket.on("close", () => this.handleDisconnect())
      this.socket.on("error", (err) => {
        this.connecting = false
        reject(err)
      })
    })
  }

  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data])

    while (this.buffer.length >= 4) {
      const msgLen = this.buffer.readUInt32LE(0)
      if (this.buffer.length < 4 + msgLen) break

      const jsonStr = this.buffer.slice(4, 4 + msgLen).toString("utf8")
      this.buffer = this.buffer.slice(4 + msgLen)

      try {
        const message = JSON.parse(jsonStr)
        this.handleMessage(message)
      } catch (e) {
        logger.error("Failed to parse IPC message", e)
      }
    }
  }

  private handleMessage(message: {
    id?: string
    success?: boolean
    payload?: unknown
    error?: string
  }): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      clearTimeout(pending.timeout)

      if (message.success) {
        pending.resolve(message.payload)
      } else {
        pending.reject(new Error(message.error || "Request failed"))
      }
    }
  }

  private handleDisconnect(): void {
    this.connected = false
    this.socket = null

    // Reject all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout)
      pending.reject(new Error("Disconnected from native host"))
    }
    this.pendingRequests.clear()
  }

  async sendRequest<T = unknown>(
    method: string,
    payload: Record<string, unknown> = {},
    timeout = 30000
  ): Promise<T> {
    // Auto-connect if not connected
    if (!this.connected) {
      await this.connectWithRetry()
    }

    const id = randomUUID()
    // Inject AI app name into payload for extension permission dialogs
    const enrichedPayload = { ...payload, _aiApp: getAiAppName() }
    const request = { id, type: "request", method, payload: enrichedPayload }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request ${method} timed out`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutId,
      })

      const json = JSON.stringify(request)
      const buf = Buffer.alloc(4 + Buffer.byteLength(json))
      buf.writeUInt32LE(Buffer.byteLength(json), 0)
      buf.write(json, 4)

      this.socket!.write(buf)
    })
  }

  private async connectWithRetry(
    maxAttempts = 10,
    delay = 1000
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.connect()
        return
      } catch (err) {
        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to connect after ${maxAttempts} attempts: ${err}`
          )
        }
        logger.warn(
          `Connection attempt ${attempt} failed, retrying in ${delay}ms...`
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }
}

// Singleton instance
let ipcClientInstance: IPCClient | null = null

export function getIPCClient(): IPCClient {
  if (!ipcClientInstance) {
    ipcClientInstance = new IPCClient()
  }
  return ipcClientInstance
}
