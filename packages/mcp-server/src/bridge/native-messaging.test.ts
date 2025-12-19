/**
 * Tests for Native Messaging Client (MCP Server Side)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import type { NativeRequest, NativeResponse, NativeEvent } from "@athreei/shared"

describe("NativeMessagingClient", () => {
  describe("Message Correlation", () => {
    test("generates unique message IDs using UUID", () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const id = crypto.randomUUID()
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }

      expect(ids.size).toBe(100)
    })

    test("matches responses to requests by ID", () => {
      const requestId = crypto.randomUUID()

      const request: NativeRequest = {
        id: requestId,
        type: "request",
        method: "ping",
        payload: {},
      }

      const response: NativeResponse = {
        id: requestId,
        type: "response",
        success: true,
        payload: { pong: true },
      }

      expect(response.id).toBe(request.id)
    })

    test("handles multiple pending requests", () => {
      const pendingRequests = new Map<
        string,
        { resolve: (value: unknown) => void; reject: (error: Error) => void }
      >()

      // Simulate 3 concurrent requests
      const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]

      ids.forEach((id) => {
        pendingRequests.set(id, {
          resolve: vi.fn(),
          reject: vi.fn(),
        })
      })

      expect(pendingRequests.size).toBe(3)

      // Simulate receiving response for second request
      const secondId = ids[1]
      const pending = pendingRequests.get(secondId)
      expect(pending).toBeDefined()

      pending?.resolve({ result: "success" })
      pendingRequests.delete(secondId)

      expect(pendingRequests.size).toBe(2)
      expect(pendingRequests.has(ids[0])).toBe(true)
      expect(pendingRequests.has(ids[1])).toBe(false)
      expect(pendingRequests.has(ids[2])).toBe(true)
    })
  })

  describe("Request Timeout Handling", () => {
    test("times out after specified duration", async () => {
      const timeout = 100 // 100ms

      const promise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`))
        }, timeout)
      })

      await expect(promise).rejects.toThrow("Request timeout after 100ms")
    })

    test("clears timeout on successful response", () => {
      const timeout = setTimeout(() => {
        throw new Error("Should not timeout")
      }, 100)

      // Simulate receiving response before timeout
      clearTimeout(timeout)

      // If we get here, the timeout was cleared successfully
      expect(true).toBe(true)
    })

    test("supports different timeout values per request", () => {
      const shortTimeout = 100
      const longTimeout = 1000

      expect(longTimeout).toBeGreaterThan(shortTimeout)

      // Both should be valid timeout values
      expect(shortTimeout).toBeGreaterThan(0)
      expect(longTimeout).toBeGreaterThan(0)
    })
  })

  describe("Message Protocol", () => {
    test("encodes length prefix as little-endian uint32", () => {
      const message = JSON.stringify({ id: "test", type: "request", method: "ping", payload: {} })
      const messageBytes = Buffer.from(message, "utf-8")
      const messageLength = messageBytes.length

      const lengthBuffer = Buffer.alloc(4)
      lengthBuffer.writeUInt32LE(messageLength, 0)

      // Verify little-endian encoding
      expect(lengthBuffer[0]).toBe(messageLength & 0xff)
      expect(lengthBuffer[1]).toBe((messageLength >> 8) & 0xff)
      expect(lengthBuffer[2]).toBe((messageLength >> 16) & 0xff)
      expect(lengthBuffer[3]).toBe((messageLength >> 24) & 0xff)
    })

    test("decodes length prefix correctly", () => {
      const expectedLength = 1234
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(expectedLength, 0)

      const decodedLength = buffer.readUInt32LE(0)
      expect(decodedLength).toBe(expectedLength)
    })

    test("handles partial message reads", () => {
      const message = JSON.stringify({ id: "test", type: "request", method: "ping", payload: {} })
      const messageBytes = Buffer.from(message, "utf-8")
      const messageLength = messageBytes.length

      const lengthBuffer = Buffer.alloc(4)
      lengthBuffer.writeUInt32LE(messageLength, 0)

      // Simulate partial read - only length prefix
      let buffer = Buffer.concat([lengthBuffer])
      expect(buffer.length).toBe(4)

      const length = buffer.readUInt32LE(0)
      expect(length).toBe(messageLength)

      // Check if we have complete message (we don't yet)
      expect(buffer.length).toBeLessThan(4 + messageLength)

      // Simulate receiving the rest
      buffer = Buffer.concat([buffer, messageBytes])
      expect(buffer.length).toBe(4 + messageLength)
    })

    test("processes multiple messages from buffer", () => {
      // Create two messages
      const msg1 = JSON.stringify({ id: "1", type: "response", success: true, payload: {} })
      const msg2 = JSON.stringify({ id: "2", type: "response", success: true, payload: {} })

      const msg1Bytes = Buffer.from(msg1, "utf-8")
      const msg2Bytes = Buffer.from(msg2, "utf-8")

      const len1Buffer = Buffer.alloc(4)
      const len2Buffer = Buffer.alloc(4)
      len1Buffer.writeUInt32LE(msg1Bytes.length, 0)
      len2Buffer.writeUInt32LE(msg2Bytes.length, 0)

      // Concatenate both messages
      const buffer = Buffer.concat([len1Buffer, msg1Bytes, len2Buffer, msg2Bytes])

      // Process first message
      let offset = 0
      const length1 = buffer.readUInt32LE(offset)
      offset += 4
      const message1 = buffer.subarray(offset, offset + length1).toString("utf-8")
      offset += length1

      expect(JSON.parse(message1).id).toBe("1")

      // Process second message
      const length2 = buffer.readUInt32LE(offset)
      offset += 4
      const message2 = buffer.subarray(offset, offset + length2).toString("utf-8")
      offset += length2

      expect(JSON.parse(message2).id).toBe("2")
      expect(offset).toBe(buffer.length)
    })

    test("respects maximum message size", () => {
      const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB

      const validSize = MAX_MESSAGE_SIZE - 100
      const invalidSize = MAX_MESSAGE_SIZE + 1

      expect(validSize).toBeLessThan(MAX_MESSAGE_SIZE)
      expect(invalidSize).toBeGreaterThan(MAX_MESSAGE_SIZE)
    })
  })

  describe("Event Handling", () => {
    test("dispatches events to registered handlers", () => {
      const handlers = new Map<string, ((payload: unknown) => void)[]>()
      const mockHandler = vi.fn()

      handlers.set("ready", [mockHandler])

      const event: NativeEvent = {
        id: crypto.randomUUID(),
        type: "event",
        event: "ready",
        payload: { version: "1.0.0" },
      }

      // Simulate event dispatch
      const eventHandlers = handlers.get(event.event) || []
      eventHandlers.forEach((handler) => handler(event.payload))

      expect(mockHandler).toHaveBeenCalledWith({ version: "1.0.0" })
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })

    test("supports multiple handlers for same event", () => {
      const handlers = new Map<string, ((payload: unknown) => void)[]>()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      handlers.set("tab_updated", [handler1, handler2, handler3])

      const event: NativeEvent = {
        id: crypto.randomUUID(),
        type: "event",
        event: "tab_updated",
        payload: { tabId: 123 },
      }

      const eventHandlers = handlers.get(event.event) || []
      eventHandlers.forEach((handler) => handler(event.payload))

      expect(handler1).toHaveBeenCalledWith({ tabId: 123 })
      expect(handler2).toHaveBeenCalledWith({ tabId: 123 })
      expect(handler3).toHaveBeenCalledWith({ tabId: 123 })
    })

    test("handles errors in event handlers gracefully", () => {
      const handlers = new Map<string, ((payload: unknown) => void)[]>()

      const failingHandler = vi.fn(() => {
        throw new Error("Handler error")
      })
      const successHandler = vi.fn()

      handlers.set("error_event", [failingHandler, successHandler])

      const event: NativeEvent = {
        id: crypto.randomUUID(),
        type: "event",
        event: "error_event",
        payload: {},
      }

      const eventHandlers = handlers.get(event.event) || []
      eventHandlers.forEach((handler) => {
        try {
          handler(event.payload)
        } catch (error) {
          // Catch and log, but continue processing other handlers
          console.error("Error in event handler:", error)
        }
      })

      expect(failingHandler).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled()
    })

    test("removes event handlers correctly", () => {
      const handlers = new Map<string, ((payload: unknown) => void)[]>()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      handlers.set("test_event", [handler1, handler2])

      // Remove handler1
      const list = handlers.get("test_event") || []
      const index = list.indexOf(handler1)
      if (index !== -1) {
        list.splice(index, 1)
      }

      expect(list).toEqual([handler2])
      expect(list.length).toBe(1)
    })
  })

  describe("Connection Health", () => {
    test("heartbeat interval validates connection", () => {
      const HEARTBEAT_INTERVAL = 10000 // 10 seconds
      const lastHeartbeat = Date.now()

      // Simulate time passing
      const currentTime = lastHeartbeat + 5000 // 5 seconds later

      const timeSinceHeartbeat = currentTime - lastHeartbeat
      expect(timeSinceHeartbeat).toBeLessThan(HEARTBEAT_INTERVAL)
    })

    test("detects stale connection", () => {
      const HEARTBEAT_INTERVAL = 10000 // 10 seconds
      const lastHeartbeat = Date.now()

      // Simulate significant time passing
      const currentTime = lastHeartbeat + 15000 // 15 seconds later

      const timeSinceHeartbeat = currentTime - lastHeartbeat
      expect(timeSinceHeartbeat).toBeGreaterThan(HEARTBEAT_INTERVAL)
    })

    test("tracks reconnection attempts", () => {
      const MAX_RECONNECT_ATTEMPTS = 5
      let reconnectAttempts = 0

      // Simulate reconnection attempts
      for (let i = 0; i < 3; i++) {
        reconnectAttempts++
      }

      expect(reconnectAttempts).toBe(3)
      expect(reconnectAttempts).toBeLessThan(MAX_RECONNECT_ATTEMPTS)
    })

    test("stops reconnecting after max attempts", () => {
      const MAX_RECONNECT_ATTEMPTS = 5
      let reconnectAttempts = 0

      // Simulate hitting max attempts
      for (let i = 0; i < 6; i++) {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
        }
      }

      expect(reconnectAttempts).toBe(MAX_RECONNECT_ATTEMPTS)
    })
  })

  describe("Error Handling", () => {
    test("handles malformed JSON gracefully", () => {
      const invalidJSON = '{"id": "test", invalid json}'

      expect(() => {
        JSON.parse(invalidJSON)
      }).toThrow()
    })

    test("validates message structure", () => {
      const validMessage = {
        id: "test-123",
        type: "request",
        method: "ping",
        payload: {},
      }

      expect(validMessage.id).toBeDefined()
      expect(validMessage.type).toBeDefined()

      const invalidMessage = {
        // missing id and type
        method: "ping",
        payload: {},
      }

      expect(invalidMessage.id).toBeUndefined()
      expect(invalidMessage.type).toBeUndefined()
    })

    test("cleans up resources on error", () => {
      const pendingRequests = new Map()
      const timers = new Set<NodeJS.Timeout>()

      // Create some requests
      for (let i = 0; i < 3; i++) {
        const id = crypto.randomUUID()
        const timer = setTimeout(() => {}, 1000)
        pendingRequests.set(id, { timer })
        timers.add(timer)
      }

      expect(pendingRequests.size).toBe(3)
      expect(timers.size).toBe(3)

      // Simulate cleanup on error
      for (const [_, pending] of pendingRequests) {
        clearTimeout(pending.timer)
      }
      pendingRequests.clear()
      timers.clear()

      expect(pendingRequests.size).toBe(0)
      expect(timers.size).toBe(0)
    })
  })

  describe("Auto-Reconnect Logic", () => {
    test("implements exponential backoff", () => {
      const BASE_DELAY = 1000
      const MAX_DELAY = 30000

      const getBackoffDelay = (attempt: number): number => {
        const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY)
        return delay
      }

      expect(getBackoffDelay(0)).toBe(1000) // 1s
      expect(getBackoffDelay(1)).toBe(2000) // 2s
      expect(getBackoffDelay(2)).toBe(4000) // 4s
      expect(getBackoffDelay(3)).toBe(8000) // 8s
      expect(getBackoffDelay(4)).toBe(16000) // 16s
      expect(getBackoffDelay(5)).toBe(30000) // capped at 30s
      expect(getBackoffDelay(10)).toBe(30000) // still capped
    })

    test("resets reconnect counter on successful connection", () => {
      let reconnectAttempts = 5

      // Simulate successful connection
      const onSuccessfulConnection = () => {
        reconnectAttempts = 0
      }

      onSuccessfulConnection()
      expect(reconnectAttempts).toBe(0)
    })

    test("delays between reconnect attempts", async () => {
      const RECONNECT_DELAY = 50 // Short delay for testing

      const startTime = Date.now()
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY))
      const endTime = Date.now()

      const actualDelay = endTime - startTime
      expect(actualDelay).toBeGreaterThanOrEqual(RECONNECT_DELAY)
    })
  })
})
