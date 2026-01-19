/**
 * Native Messaging Protocol
 *
 * Chrome Native Messaging uses a simple protocol:
 * - Each message is JSON
 * - Prefixed with 4-byte unsigned integer (little-endian) indicating message length
 * - Maximum message size: 1MB (1024 * 1024 bytes)
 */

import { z } from "zod"
import type {
  NativeMessage,
  NativeRequest,
  NativeResponse,
  NativeEvent,
} from "@athreei/shared"

const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB

/**
 * Zod schemas for message validation
 */
const BaseMessageSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["request", "response", "event"]),
  payload: z.unknown(),
})

const NativeRequestSchema = BaseMessageSchema.extend({
  type: z.literal("request"),
  method: z.string().min(1),
  payload: z.record(z.unknown()),
})

const NativeResponseSchema = BaseMessageSchema.extend({
  type: z.literal("response"),
  success: z.boolean(),
  payload: z.unknown(),
  error: z.string().optional(),
})

const NativeEventSchema = BaseMessageSchema.extend({
  type: z.literal("event"),
  event: z.string().min(1),
  payload: z.unknown(),
})

const NativeMessageSchema = z.discriminatedUnion("type", [
  NativeRequestSchema,
  NativeResponseSchema,
  NativeEventSchema,
])

/**
 * Reader interface for stdin chunks
 */
interface ChunkReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>
}

/**
 * Buffered stdin reader for reading exact byte counts from a stream
 */
class StdinReader {
  private reader: ChunkReader
  private buffer: Uint8Array = new Uint8Array(0)

  constructor() {
    // Use type assertion to work around Bun's complex stream types
    const stream = Bun.stdin.stream()
    this.reader = stream.getReader() as unknown as ChunkReader
  }

  /**
   * Read exactly `count` bytes from stdin
   * Returns null if stdin is closed before reading enough bytes
   */
  async readExact(count: number): Promise<Uint8Array | null> {
    // Keep reading until we have enough bytes
    while (this.buffer.length < count) {
      const result = await this.reader.read()

      if (result.done) {
        if (this.buffer.length === 0) {
          return null // Clean EOF
        }
        throw new Error(
          `Unexpected EOF: got ${this.buffer.length} bytes, expected ${count}`
        )
      }

      const chunk = result.value
      if (chunk && chunk.length > 0) {
        // Append new data to buffer
        const newBuffer = new Uint8Array(this.buffer.length + chunk.length)
        newBuffer.set(this.buffer)
        newBuffer.set(chunk, this.buffer.length)
        this.buffer = newBuffer
      }
    }

    const extracted = this.buffer.slice(0, count)
    this.buffer = this.buffer.slice(count)
    return extracted
  }
}

// Singleton reader instance
let stdinReader: StdinReader | null = null

function getStdinReader(): StdinReader {
  if (!stdinReader) {
    stdinReader = new StdinReader()
  }
  return stdinReader
}

/**
 * Reset the stdin reader (useful for testing or reconnection scenarios)
 */
export function resetStdinReader(): void {
  stdinReader = null
}

/**
 * Read a single message from stdin
 * Returns null when stdin is closed
 */
export async function readMessage(): Promise<NativeMessage | null> {
  try {
    const reader = getStdinReader()

    const lengthBuffer = await reader.readExact(4)

    if (lengthBuffer === null) {
      // stdin closed
      return null
    }

    const dataView = new DataView(
      lengthBuffer.buffer,
      lengthBuffer.byteOffset,
      lengthBuffer.byteLength
    )
    const messageLength = dataView.getUint32(0, true) // true = little-endian

    if (messageLength > MAX_MESSAGE_SIZE) {
      throw new Error(
        `Message too large: ${messageLength} bytes (max: ${MAX_MESSAGE_SIZE})`
      )
    }

    if (messageLength === 0) {
      throw new Error("Message length cannot be 0")
    }

    const messageBuffer = await reader.readExact(messageLength)

    if (messageBuffer === null) {
      throw new Error(`Unexpected EOF while reading message body`)
    }

    const messageText = new TextDecoder().decode(messageBuffer)
    const parsed = JSON.parse(messageText)
    const result = NativeMessageSchema.safeParse(parsed)

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ")
      throw new Error(`Invalid message format: ${issues}`)
    }

    return result.data as NativeMessage
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
      throw new Error(
        `Message too large: ${messageLength} bytes (max: ${MAX_MESSAGE_SIZE})`
      )
    }

    const lengthBuffer = new ArrayBuffer(4)
    const dataView = new DataView(lengthBuffer)
    dataView.setUint32(0, messageLength, true) // true = little-endian

    const lengthBytes = new Uint8Array(lengthBuffer)
    process.stdout.write(Buffer.from(lengthBytes))
    process.stdout.write(Buffer.from(messageBytes))
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
export function createRequest(
  id: string,
  method: string,
  payload: Record<string, unknown>
): NativeRequest {
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
export function createResponse(
  id: string,
  success: boolean,
  payload: unknown,
  error?: string
): NativeResponse {
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
export function createEvent(
  id: string,
  event: string,
  payload: unknown
): NativeEvent {
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
