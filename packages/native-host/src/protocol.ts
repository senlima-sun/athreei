/**
 * Native Messaging Protocol
 *
 * Chrome Native Messaging uses a simple protocol:
 * - Each message is JSON
 * - Prefixed with 4-byte unsigned integer (little-endian) indicating message length
 * - Maximum message size: 1MB (1024 * 1024 bytes)
 */

import type { NativeMessage, NativeRequest, NativeResponse, NativeEvent } from "@athreei/shared"

const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB

/**
 * Read a single message from stdin
 * Returns null when stdin is closed
 */
export async function readMessage(): Promise<NativeMessage | null> {
  try {
    // Read 4-byte length prefix
    const lengthBuffer = new Uint8Array(4)
    const lengthBytesRead = await Bun.stdin.read(lengthBuffer)

    if (lengthBytesRead === null || lengthBytesRead === 0) {
      // stdin closed
      return null
    }

    if (lengthBytesRead < 4) {
      throw new Error(`Incomplete length prefix: got ${lengthBytesRead} bytes, expected 4`)
    }

    // Parse length as little-endian uint32
    const dataView = new DataView(lengthBuffer.buffer)
    const messageLength = dataView.getUint32(0, true) // true = little-endian

    if (messageLength > MAX_MESSAGE_SIZE) {
      throw new Error(`Message too large: ${messageLength} bytes (max: ${MAX_MESSAGE_SIZE})`)
    }

    if (messageLength === 0) {
      throw new Error("Message length cannot be 0")
    }

    // Read message body
    const messageBuffer = new Uint8Array(messageLength)
    let totalBytesRead = 0

    while (totalBytesRead < messageLength) {
      const bytesRead = await Bun.stdin.read(messageBuffer.subarray(totalBytesRead))

      if (bytesRead === null || bytesRead === 0) {
        throw new Error(`Incomplete message: got ${totalBytesRead} bytes, expected ${messageLength}`)
      }

      totalBytesRead += bytesRead
    }

    // Parse JSON
    const messageText = new TextDecoder().decode(messageBuffer)
    const message = JSON.parse(messageText) as NativeMessage

    // Validate basic message structure
    if (!message.id || !message.type) {
      throw new Error("Invalid message: missing 'id' or 'type' field")
    }

    return message
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[protocol] Error reading message: ${error.message}`)
      throw error
    }
    throw new Error(`Unknown error reading message: ${error}`)
  }
}

/**
 * Write a single message to stdout
 */
export function writeMessage(message: NativeMessage): void {
  try {
    // Serialize to JSON
    const messageText = JSON.stringify(message)
    const messageBytes = new TextEncoder().encode(messageText)
    const messageLength = messageBytes.length

    if (messageLength > MAX_MESSAGE_SIZE) {
      throw new Error(`Message too large: ${messageLength} bytes (max: ${MAX_MESSAGE_SIZE})`)
    }

    // Create 4-byte length prefix (little-endian)
    const lengthBuffer = new ArrayBuffer(4)
    const dataView = new DataView(lengthBuffer)
    dataView.setUint32(0, messageLength, true) // true = little-endian

    // Write length prefix + message body
    const lengthBytes = new Uint8Array(lengthBuffer)
    Bun.stdout.write(lengthBytes)
    Bun.stdout.write(messageBytes)
    Bun.stdout.flush()
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[protocol] Error writing message: ${error.message}`)
      throw error
    }
    throw new Error(`Unknown error writing message: ${error}`)
  }
}

/**
 * Create a typed request message
 */
export function createRequest(id: string, method: string, payload: Record<string, unknown>): NativeRequest {
  return {
    id,
    type: "request",
    method,
    payload,
  }
}

/**
 * Create a typed response message
 */
export function createResponse(id: string, success: boolean, payload: unknown, error?: string): NativeResponse {
  return {
    id,
    type: "response",
    success,
    payload,
    error,
  }
}

/**
 * Create a typed event message
 */
export function createEvent(id: string, event: string, payload: unknown): NativeEvent {
  return {
    id,
    type: "event",
    event,
    payload,
  }
}

/**
 * Type guards for message types
 */
export function isRequest(message: NativeMessage): message is NativeRequest {
  return message.type === "request" && "method" in message
}

export function isResponse(message: NativeMessage): message is NativeResponse {
  return message.type === "response" && "success" in message
}

export function isEvent(message: NativeMessage): message is NativeEvent {
  return message.type === "event" && "event" in message
}
