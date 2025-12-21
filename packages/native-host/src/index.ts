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

import { readMessage, writeMessage, isRequest, createEvent, resetStdinReader } from "./protocol.js"
import { handleRequest, initializeHandlers, getRegisteredMethods, clearHandlers } from "./handlers.js"

export const HOST_NAME = "com.athreei.host"
export const VERSION = "0.1.0"

let eventCounter = 0
let isShuttingDown = false

/**
 * Generate a deterministic event ID
 */
function nextEventId(): string {
  return `event-${eventCounter++}`
}

/**
 * Cleanup resources before shutdown
 */
async function cleanup(): Promise<void> {
  console.error("[native-host] Cleaning up resources...")
  clearHandlers()
  resetStdinReader()
  console.error("[native-host] Cleanup complete")
}

/**
 * Graceful shutdown with cleanup
 */
async function gracefulShutdown(reason: string, code: number): Promise<void> {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true

  console.error(`[native-host] Shutting down: ${reason}`)

  try {
    await cleanup()
  } catch (error) {
    console.error("[native-host] Error during cleanup:", error)
  }

  process.exit(code)
}

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
  const readyEvent = createEvent(nextEventId(), "ready", {
    version: VERSION,
    methods: getRegisteredMethods(),
    pid: process.pid,
  })
  writeMessage(readyEvent)
  console.error("[native-host] Sent ready event")

  // Main message loop
  while (!isShuttingDown) {
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
    }
  }

  await gracefulShutdown("main loop ended", 0)
}

/**
 * Setup signal and error handlers
 */
function setupShutdownHandlers() {
  process.on("SIGINT", () => {
    gracefulShutdown("SIGINT received", 0)
  })

  process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM received", 0)
  })

  process.on("uncaughtException", (error) => {
    console.error("[native-host] Uncaught exception:", error)
    gracefulShutdown("uncaught exception", 1)
  })

  process.on("unhandledRejection", (reason) => {
    console.error("[native-host] Unhandled rejection:", reason)
    gracefulShutdown("unhandled rejection", 1)
  })
}

// Start the host
setupShutdownHandlers()
main().catch((error) => {
  console.error("[native-host] Fatal error:", error)
  gracefulShutdown("fatal error in main", 1)
})
