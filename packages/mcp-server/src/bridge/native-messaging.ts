/**
 * Native Messaging Client (MCP Server Side)
 *
 * This manages communication with the native host binary, which in turn
 * communicates with the Chrome extension.
 *
 * Note: This is a placeholder implementation for Phase 2.3.
 * In the current architecture, the native host directly handles messages from
 * the Chrome extension. In a future iteration, this bridge will facilitate
 * communication between the MCP server and the native host.
 */

import { spawn, type ChildProcess } from "child_process"
import type { NativeMessage, NativeRequest, NativeResponse, NativeEvent } from "@athreei/shared"

const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const HEARTBEAT_INTERVAL = 10000 // 10 seconds
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 2000 // 2 seconds

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
  method: string
}

export class NativeMessagingClient {
  private process: ChildProcess | null = null
  private readonly binaryPath: string
  private pendingRequests = new Map<string, PendingRequest>()
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private isConnected = false
  private buffer = Buffer.alloc(0)
  private eventHandlers = new Map<string, ((payload: unknown) => void)[]>()

  constructor(binaryPath: string) {
    this.binaryPath = binaryPath
  }

  /**
   * Start the native host process and establish connection
   */
  async connect(): Promise<void> {
    if (this.process) {
      throw new Error("Already connected")
    }

    try {
      console.log(`[bridge] Spawning native host: ${this.binaryPath}`)

      this.process = spawn(this.binaryPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      })

      // Setup event handlers
      this.process.stdin?.setDefaultEncoding("binary")
      this.process.stdout?.on("data", this.handleData.bind(this))
      this.process.stderr?.on("data", (data) => {
        console.error(`[bridge] Native host stderr: ${data.toString()}`)
      })

      this.process.on("error", (error) => {
        console.error("[bridge] Process error:", error)
        this.handleDisconnect()
      })

      this.process.on("exit", (code, signal) => {
        console.log(`[bridge] Process exited: code=${code}, signal=${signal}`)
        this.handleDisconnect()
      })

      // Wait for ready event
      await this.waitForReady()

      this.isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()

      console.log("[bridge] Connected to native host")
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Disconnect from the native host
   */
  disconnect(): void {
    console.log("[bridge] Disconnecting from native host")
    this.cleanup()
  }

  /**
   * Send a request to the native host and wait for response
   */
  async sendRequest(method: string, payload: Record<string, unknown> = {}, timeout = DEFAULT_TIMEOUT): Promise<unknown> {
    if (!this.isConnected || !this.process?.stdin) {
      throw new Error("Not connected to native host")
    }

    const id = crypto.randomUUID()
    const request: NativeRequest = {
      id,
      type: "request",
      method,
      payload,
    }

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutTimer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout after ${timeout}ms: ${method}`))
      }, timeout)

      // Store pending request
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutTimer,
        method,
      })

      // Send the request
      try {
        this.writeMessage(request)
      } catch (error) {
        this.pendingRequests.delete(id)
        clearTimeout(timeoutTimer)
        reject(error)
      }
    })
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: (payload: unknown) => void): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: (payload: unknown) => void): void {
    const handlers = this.eventHandlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected
  }

  /**
   * Write a message to the native host
   */
  private writeMessage(message: NativeMessage): void {
    if (!this.process?.stdin) {
      throw new Error("Process stdin not available")
    }

    const messageText = JSON.stringify(message)
    const messageBytes = Buffer.from(messageText, "utf-8")
    const messageLength = messageBytes.length

    if (messageLength > MAX_MESSAGE_SIZE) {
      throw new Error(`Message too large: ${messageLength} bytes (max: ${MAX_MESSAGE_SIZE})`)
    }

    // Create 4-byte length prefix (little-endian)
    const lengthBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32LE(messageLength, 0)

    // Write length + message
    this.process.stdin.write(lengthBuffer)
    this.process.stdin.write(messageBytes)
  }

  /**
   * Handle incoming data from native host
   */
  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])

    // Process all complete messages in the buffer
    while (this.buffer.length >= 4) {
      // Read message length
      const messageLength = this.buffer.readUInt32LE(0)

      if (messageLength > MAX_MESSAGE_SIZE) {
        console.error(`[bridge] Message too large: ${messageLength} bytes`)
        this.buffer = Buffer.alloc(0) // Reset buffer
        return
      }

      // Check if we have the complete message
      if (this.buffer.length < 4 + messageLength) {
        // Wait for more data
        break
      }

      // Extract message
      const messageBytes = this.buffer.subarray(4, 4 + messageLength)
      this.buffer = this.buffer.subarray(4 + messageLength)

      // Parse and handle message
      try {
        const messageText = messageBytes.toString("utf-8")
        const message = JSON.parse(messageText) as NativeMessage
        this.handleMessage(message)
      } catch (error) {
        console.error("[bridge] Error parsing message:", error)
      }
    }
  }

  /**
   * Handle a parsed message
   */
  private handleMessage(message: NativeMessage): void {
    if (message.type === "response") {
      this.handleResponse(message as NativeResponse)
    } else if (message.type === "event") {
      this.handleEvent(message as NativeEvent)
    } else {
      console.warn(`[bridge] Unexpected message type: ${message.type}`)
    }
  }

  /**
   * Handle a response message
   */
  private handleResponse(response: NativeResponse): void {
    const pending = this.pendingRequests.get(response.id)
    if (!pending) {
      console.warn(`[bridge] Received response for unknown request: ${response.id}`)
      return
    }

    this.pendingRequests.delete(response.id)
    clearTimeout(pending.timeout)

    if (response.success) {
      pending.resolve(response.payload)
    } else {
      pending.reject(new Error(response.error || "Request failed"))
    }
  }

  /**
   * Handle an event message
   */
  private handleEvent(event: NativeEvent): void {
    console.log(`[bridge] Received event: ${event.event}`)

    const handlers = this.eventHandlers.get(event.event) || []
    for (const handler of handlers) {
      try {
        handler(event.payload)
      } catch (error) {
        console.error(`[bridge] Error in event handler for ${event.event}:`, error)
      }
    }
  }

  /**
   * Wait for the ready event from the native host
   */
  private async waitForReady(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off("ready", readyHandler)
        reject(new Error("Timeout waiting for ready event"))
      }, timeout)

      const readyHandler = () => {
        clearTimeout(timer)
        this.off("ready", readyHandler)
        resolve()
      }

      this.on("ready", readyHandler)
    })
  }

  /**
   * Start heartbeat to monitor connection health
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendRequest("ping", {}, 5000)
      } catch (error) {
        console.error("[bridge] Heartbeat failed:", error)
        this.handleDisconnect()
      }
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    if (!this.isConnected) {
      return
    }

    console.log("[bridge] Disconnected from native host")
    this.isConnected = false

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(new Error("Disconnected from native host"))
    }
    this.pendingRequests.clear()

    this.cleanup()

    // Attempt to reconnect
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++
      console.log(`[bridge] Reconnecting (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("[bridge] Reconnect failed:", error)
        })
      }, RECONNECT_DELAY)
    } else {
      console.error("[bridge] Max reconnect attempts reached")
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.process) {
      this.process.kill()
      this.process = null
    }

    this.buffer = Buffer.alloc(0)
  }
}

/**
 * Create and connect to the native host
 */
export async function createNativeMessagingClient(binaryPath: string): Promise<NativeMessagingClient> {
  const client = new NativeMessagingClient(binaryPath)
  await client.connect()
  return client
}
