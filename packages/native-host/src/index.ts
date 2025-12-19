/**
 * @athreei/native-host - Native messaging host binary
 *
 * This is the bridge between the Chrome extension and the MCP server.
 * It communicates with the extension via stdin/stdout using Chrome's
 * Native Messaging protocol (length-prefixed JSON messages).
 *
 * Usage:
 *   This binary is spawned by Chrome when the extension connects.
 *   Communication happens automatically via stdin/stdout.
 */

import { readMessage, writeMessage, isRequest, createEvent } from "./protocol.js"
import { handleRequest, initializeHandlers, getRegisteredMethods } from "./handlers.js"

export const HOST_NAME = "com.athreei.host"
export const VERSION = "0.1.0"

/**
 * Main loop
 */
async function main() {
  console.error(`[native-host] Starting ${HOST_NAME} v${VERSION}`)
  console.error(`[native-host] Process ID: ${process.pid}`)

  // Initialize handlers
  initializeHandlers()
  console.error(`[native-host] Registered methods: ${getRegisteredMethods().join(", ")}`)

  // Send ready event to extension
  const readyEvent = createEvent(crypto.randomUUID(), "ready", {
    version: VERSION,
    methods: getRegisteredMethods(),
    pid: process.pid,
  })
  writeMessage(readyEvent)
  console.error("[native-host] Sent ready event")

  // Main message loop
  let running = true

  while (running) {
    try {
      const message = await readMessage()

      if (message === null) {
        console.error("[native-host] stdin closed, exiting")
        break
      }

      console.error(`[native-host] Received message: ${message.type} (id: ${message.id})`)

      if (isRequest(message)) {
        // Handle request and send response
        const response = await handleRequest(message)
        writeMessage(response)
        console.error(`[native-host] Sent response: ${response.success ? "success" : "error"} (id: ${response.id})`)
      } else {
        console.error(`[native-host] Ignoring non-request message type: ${message.type}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[native-host] Error in main loop: ${errorMessage}`)

      // Don't crash on individual message errors, continue processing
      // The response will have already been sent by handleRequest if it was a valid request
    }
  }

  console.error("[native-host] Shutting down")
  process.exit(0)
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers() {
  const shutdown = (signal: string) => {
    console.error(`[native-host] Received ${signal}, shutting down...`)
    process.exit(0)
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    console.error("[native-host] Uncaught exception:", error)
    process.exit(1)
  })

  process.on("unhandledRejection", (reason) => {
    console.error("[native-host] Unhandled rejection:", reason)
    process.exit(1)
  })
}

// Start the host
setupShutdownHandlers()
main().catch((error) => {
  console.error("[native-host] Fatal error:", error)
  process.exit(1)
})
