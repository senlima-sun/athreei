/**
 * Tests for Native Messaging Protocol
 */

import { describe, test, expect, beforeEach } from "vitest"
import {
  createRequest,
  createResponse,
  createEvent,
  isRequest,
  isResponse,
  isEvent,
  resetStdinReader,
} from "./protocol"
import {
  registerHandler,
  removeHandler,
  clearHandlers,
  handleRequest,
  initializeHandlers,
  getRegisteredMethods,
} from "./handlers"
import type { NativeRequest } from "@athreei/shared"

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

  describe("resetStdinReader", () => {
    test("can be called without error", () => {
      expect(() => resetStdinReader()).not.toThrow()
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

    const validLength = MAX_MESSAGE_SIZE - 1
    expect(validLength).toBeLessThan(MAX_MESSAGE_SIZE)

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
    const largeString = "x".repeat(500000) // 500KB string
    const request = createRequest("id", "method", {
      data: largeString,
      more: largeString,
    })

    const json = JSON.stringify(request)
    const size = Buffer.from(json, "utf-8").length

    expect(size).toBeLessThan(1024 * 1024)

    const parsed = JSON.parse(json)
    expect(parsed.payload.data).toBe(largeString)
  })
})

describe("Handler Registry", () => {
  beforeEach(() => {
    clearHandlers()
  })

  describe("registerHandler", () => {
    test("registers a handler successfully", () => {
      registerHandler("test_method", async () => ({ result: "ok" }))
      expect(getRegisteredMethods()).toContain("test_method")
    })

    test("throws error when registering duplicate handler", () => {
      registerHandler("duplicate", async () => ({}))
      expect(() => registerHandler("duplicate", async () => ({}))).toThrow(
        "Handler already registered for method: duplicate"
      )
    })
  })

  describe("removeHandler", () => {
    test("removes an existing handler", () => {
      registerHandler("to_remove", async () => ({}))
      expect(getRegisteredMethods()).toContain("to_remove")

      const removed = removeHandler("to_remove")
      expect(removed).toBe(true)
      expect(getRegisteredMethods()).not.toContain("to_remove")
    })

    test("returns false when removing non-existent handler", () => {
      const removed = removeHandler("non_existent")
      expect(removed).toBe(false)
    })
  })

  describe("clearHandlers", () => {
    test("removes all handlers", () => {
      registerHandler("handler1", async () => ({}))
      registerHandler("handler2", async () => ({}))
      expect(getRegisteredMethods().length).toBe(2)

      clearHandlers()
      expect(getRegisteredMethods().length).toBe(0)
    })
  })
})

describe("handleRequest", () => {
  beforeEach(() => {
    clearHandlers()
  })

  test("returns error for unknown method", async () => {
    const request: NativeRequest = {
      id: "req-1",
      type: "request",
      method: "unknown_method",
      payload: {},
    }

    const response = await handleRequest(request)
    expect(response.success).toBe(false)
    expect(response.error).toBe("Unknown method: unknown_method")
  })

  test("handles successful request", async () => {
    registerHandler("echo", async (payload) => ({ echoed: payload }))

    const request: NativeRequest = {
      id: "req-2",
      type: "request",
      method: "echo",
      payload: { message: "hello" },
    }

    const response = await handleRequest(request)
    expect(response.success).toBe(true)
    expect(response.payload).toEqual({ echoed: { message: "hello" } })
  })

  test("handles handler errors gracefully", async () => {
    registerHandler("error_handler", async () => {
      throw new Error("Handler failed")
    })

    const request: NativeRequest = {
      id: "req-3",
      type: "request",
      method: "error_handler",
      payload: {},
    }

    const response = await handleRequest(request)
    expect(response.success).toBe(false)
    expect(response.error).toBe("Handler failed")
  })

  test("validates payload with schema", async () => {
    const { z } = await import("zod")

    registerHandler(
      "validated",
      async (payload: { name: string }) => ({ greeting: `Hello, ${payload.name}` }),
      z.object({ name: z.string() })
    )

    // Valid payload
    const validRequest: NativeRequest = {
      id: "req-4",
      type: "request",
      method: "validated",
      payload: { name: "World" },
    }

    const validResponse = await handleRequest(validRequest)
    expect(validResponse.success).toBe(true)
    expect(validResponse.payload).toEqual({ greeting: "Hello, World" })

    // Invalid payload
    const invalidRequest: NativeRequest = {
      id: "req-5",
      type: "request",
      method: "validated",
      payload: { name: 123 }, // should be string
    }

    const invalidResponse = await handleRequest(invalidRequest)
    expect(invalidResponse.success).toBe(false)
    expect(invalidResponse.error).toContain("Invalid payload")
  })
})

describe("initializeHandlers", () => {
  beforeEach(() => {
    clearHandlers()
  })

  test("registers ping handler (browser tools forwarded to extension via IPC)", () => {
    initializeHandlers()

    const methods = getRegisteredMethods()
    // Only ping handler is registered in native-host
    // Browser tools are forwarded to Chrome extension via IPC
    expect(methods).toContain("ping")
    expect(methods).toHaveLength(1)
  })

  test("ping handler returns pong with timestamp", async () => {
    initializeHandlers()

    const request: NativeRequest = {
      id: "ping-1",
      type: "request",
      method: "ping",
      payload: {},
    }

    const response = await handleRequest(request)
    expect(response.success).toBe(true)
    expect(response.payload).toHaveProperty("pong", true)
    expect(response.payload).toHaveProperty("timestamp")
    expect(typeof (response.payload as { timestamp: number }).timestamp).toBe("number")
  })

  test("unregistered browser methods return unknown method error", async () => {
    initializeHandlers()

    // Browser tools are forwarded to extension, not handled in native-host
    const request: NativeRequest = {
      id: "stub-1",
      type: "request",
      method: "browser_list_tabs",
      payload: {},
    }

    const response = await handleRequest(request)
    expect(response.success).toBe(false)
    expect(response.error).toContain("Unknown method")
  })
})
