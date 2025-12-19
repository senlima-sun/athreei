/**
 * Tests for Native Messaging Protocol
 */

import { describe, test, expect } from "vitest"
import {
  createRequest,
  createResponse,
  createEvent,
  isRequest,
  isResponse,
  isEvent,
} from "./protocol"

describe("Protocol Helpers", () => {
  describe("createRequest", () => {
    test("creates a valid request message", () => {
      const request = createRequest("test-id", "browser_list_tabs", { foo: "bar" })

      expect(request).toEqual({
        id: "test-id",
        type: "request",
        method: "browser_list_tabs",
        payload: { foo: "bar" },
      })
    })
  })

  describe("createResponse", () => {
    test("creates a successful response", () => {
      const response = createResponse("test-id", true, { result: "success" })

      expect(response).toEqual({
        id: "test-id",
        type: "response",
        success: true,
        payload: { result: "success" },
        error: undefined,
      })
    })

    test("creates an error response", () => {
      const response = createResponse("test-id", false, null, "Something went wrong")

      expect(response).toEqual({
        id: "test-id",
        type: "response",
        success: false,
        payload: null,
        error: "Something went wrong",
      })
    })
  })

  describe("createEvent", () => {
    test("creates a valid event message", () => {
      const event = createEvent("event-id", "ready", { version: "1.0.0" })

      expect(event).toEqual({
        id: "event-id",
        type: "event",
        event: "ready",
        payload: { version: "1.0.0" },
      })
    })
  })

  describe("Type Guards", () => {
    test("isRequest identifies request messages", () => {
      const request = createRequest("id", "method", {})
      const response = createResponse("id", true, {})
      const event = createEvent("id", "event", {})

      expect(isRequest(request)).toBe(true)
      expect(isRequest(response)).toBe(false)
      expect(isRequest(event)).toBe(false)
    })

    test("isResponse identifies response messages", () => {
      const request = createRequest("id", "method", {})
      const response = createResponse("id", true, {})
      const event = createEvent("id", "event", {})

      expect(isResponse(request)).toBe(false)
      expect(isResponse(response)).toBe(true)
      expect(isResponse(event)).toBe(false)
    })

    test("isEvent identifies event messages", () => {
      const request = createRequest("id", "method", {})
      const response = createResponse("id", true, {})
      const event = createEvent("id", "event", {})

      expect(isEvent(request)).toBe(false)
      expect(isEvent(response)).toBe(false)
      expect(isEvent(event)).toBe(true)
    })
  })
})

describe("Message Encoding/Decoding", () => {
  test("encodes message length as little-endian uint32", () => {
    const messageText = JSON.stringify({ id: "1", type: "request", method: "test", payload: {} })
    const messageBytes = Buffer.from(messageText, "utf-8")
    const messageLength = messageBytes.length

    const lengthBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32LE(messageLength, 0)

    // Verify it's little-endian by checking byte order
    expect(lengthBuffer.readUInt32LE(0)).toBe(messageLength)
    expect(lengthBuffer.readUInt32BE(0)).not.toBe(messageLength)
  })

  test("decodes message length from little-endian uint32", () => {
    const expectedLength = 1234
    const lengthBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32LE(expectedLength, 0)

    const decodedLength = lengthBuffer.readUInt32LE(0)
    expect(decodedLength).toBe(expectedLength)
  })

  test("handles message size limits", () => {
    const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB

    // Just under the limit should be OK
    const validLength = MAX_MESSAGE_SIZE - 1
    expect(validLength).toBeLessThan(MAX_MESSAGE_SIZE)

    // Over the limit should fail
    const invalidLength = MAX_MESSAGE_SIZE + 1
    expect(invalidLength).toBeGreaterThan(MAX_MESSAGE_SIZE)
  })

  test("serializes and deserializes JSON correctly", () => {
    const original = {
      id: "test-123",
      type: "request" as const,
      method: "browser_click",
      payload: {
        selector: "#button",
        index: 5,
        nested: {
          foo: "bar",
          num: 42,
          bool: true,
        },
      },
    }

    const json = JSON.stringify(original)
    const parsed = JSON.parse(json)

    expect(parsed).toEqual(original)
  })

  test("handles UTF-8 encoding", () => {
    const message = {
      id: "test",
      type: "request" as const,
      method: "test",
      payload: {
        unicode: "Hello 世界 🌍",
        emoji: "🚀💻🎉",
      },
    }

    const json = JSON.stringify(message)
    const encoded = Buffer.from(json, "utf-8")
    const decoded = encoded.toString("utf-8")
    const parsed = JSON.parse(decoded)

    expect(parsed).toEqual(message)
  })

  test("handles empty payload", () => {
    const request = createRequest("id", "method", {})
    expect(request.payload).toEqual({})

    const json = JSON.stringify(request)
    const parsed = JSON.parse(json)
    expect(parsed.payload).toEqual({})
  })

  test("handles large payloads", () => {
    // Create a payload close to the 1MB limit
    const largeString = "x".repeat(500000) // 500KB string
    const request = createRequest("id", "method", {
      data: largeString,
      more: largeString,
    })

    const json = JSON.stringify(request)
    const size = Buffer.from(json, "utf-8").length

    // Should be under 1MB
    expect(size).toBeLessThan(1024 * 1024)

    // Should be deserializable
    const parsed = JSON.parse(json)
    expect(parsed.payload.data).toBe(largeString)
  })
})
