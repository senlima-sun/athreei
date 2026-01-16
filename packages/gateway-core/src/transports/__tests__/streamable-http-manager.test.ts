/**
 * Tests for Streamable HTTP Transport Manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { StreamableHttpTransportManager } from "../streamable-http-manager.js"
import type {
  StreamableHttpTransportConfig,
  McpMessage,
} from "../../types/transports.js"

const createMockResponse = (options: {
  status?: number
  ok?: boolean
  headers?: Record<string, string>
  json?: () => Promise<unknown>
  body?: ReadableStream<Uint8Array> | null
} = {}): Response => {
  const headers = new Headers(options.headers)
  return {
    status: options.status ?? 200,
    statusText: options.status === 200 ? "OK" : "Error",
    ok: options.ok ?? (options.status ?? 200) < 400,
    headers,
    json: options.json ?? (() => Promise.resolve({})),
    body: options.body ?? null,
  } as Response
}

const createMockConfig = (
  overrides: Partial<StreamableHttpTransportConfig> = {}
): StreamableHttpTransportConfig => ({
  transport: "streamable-http",
  url: "https://example.com/mcp",
  ...overrides,
})

describe("StreamableHttpTransportManager", () => {
  let manager: StreamableHttpTransportManager
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    manager = new StreamableHttpTransportManager()
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(async () => {
    await manager.disconnectAll()
    vi.unstubAllGlobals()
  })

  describe("connect", () => {
    it("sends InitializeRequest with protocol version", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: {
                  protocolVersion: "2025-06-18",
                  serverInfo: { name: "test", version: "1.0" },
                },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      await manager.connect("test-1", config)

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/mcp",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "MCP-Protocol-Version": "2025-06-18",
          }),
          body: expect.stringContaining('"method":"initialize"'),
        })
      )
    })

    it("extracts Mcp-Session-Id from response header", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: {
              "content-type": "application/json",
              "Mcp-Session-Id": "session-123",
            },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      expect(connection.status).toBe("connected")
    })

    it("sends notifications/initialized after init", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))
        .mockResolvedValueOnce(createMockResponse({ status: 405 }))

      const config = createMockConfig()
      await manager.connect("test-1", config)

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch.mock.calls[1][1].body).toContain(
        "notifications/initialized"
      )
    })

    it("returns connected TransportConnection", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      expect(connection.id).toBe("test-1")
      expect(connection.status).toBe("connected")
      expect(connection.connectedAt).toBeInstanceOf(Date)
    })

    it("handles 400 for invalid request", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          status: 400,
          ok: false,
        })
      )

      const config = createMockConfig()

      await expect(manager.connect("test-1", config)).rejects.toThrow(
        "HTTP 400"
      )
    })

    it("handles 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          status: 401,
          ok: false,
        })
      )

      const config = createMockConfig()

      await expect(manager.connect("test-1", config)).rejects.toThrow(
        "HTTP 401"
      )
    })

    it("includes custom headers from config", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig({
        headers: { Authorization: "Bearer token123" },
      })

      await manager.connect("test-1", config)

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/mcp",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
        })
      )
    })

    it("replaces existing connection with same id", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
      )

      const config = createMockConfig()

      await manager.connect("test-1", config)
      await manager.connect("test-1", config)

      expect(manager.getConnectionIds()).toHaveLength(1)
    })
  })

  describe("send", () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: {
              "content-type": "application/json",
              "Mcp-Session-Id": "session-123",
            },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))
    })

    it("sends POST with Content-Type: application/json", async () => {
      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", id: 2, result: { ok: true } }),
        })
      )

      const message: McpMessage = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }

      await connection.send(message)

      expect(mockFetch).toHaveBeenLastCalledWith(
        "https://example.com/mcp",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(message),
        })
      )
    })

    it("includes Mcp-Session-Id header", async () => {
      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", id: 2, result: {} }),
        })
      )

      await connection.send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      })

      expect(mockFetch).toHaveBeenLastCalledWith(
        "https://example.com/mcp",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Mcp-Session-Id": "session-123",
          }),
        })
      )
    })

    it("throws when connection is closed", async () => {
      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      await connection.close()

      await expect(
        connection.send({ jsonrpc: "2.0", id: 2, method: "test" })
      ).rejects.toThrow("Connection test-1 is closed")
    })
  })

  describe("close", () => {
    it("sends DELETE to terminate session", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: {
              "content-type": "application/json",
              "Mcp-Session-Id": "session-123",
            },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 204 }))

      await connection.close()

      expect(mockFetch).toHaveBeenLastCalledWith(
        "https://example.com/mcp",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            "Mcp-Session-Id": "session-123",
          }),
        })
      )
    })

    it("cleans up internal session state", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      await connection.close()

      expect(manager.getConnection("test-1")).toBeUndefined()
      expect(manager.isConnected("test-1")).toBe(false)
    })

    it("handles DELETE failure gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: {
              "content-type": "application/json",
              "Mcp-Session-Id": "session-123",
            },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      await expect(connection.close()).resolves.toBeUndefined()
    })

    it("handles multiple close calls safely", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      await connection.close()
      await expect(connection.close()).resolves.toBeUndefined()
    })
  })

  describe("disconnectAll", () => {
    it("closes all sessions", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
      )

      const config = createMockConfig()

      await manager.connect("test-1", config)
      await manager.connect("test-2", config)

      await manager.disconnectAll()

      expect(manager.getConnectionIds()).toHaveLength(0)
    })

    it("handles empty session pool", async () => {
      await expect(manager.disconnectAll()).resolves.toBeUndefined()
    })
  })

  describe("getConnection", () => {
    it("returns connection for existing id", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      await manager.connect("test-1", config)

      const connection = manager.getConnection("test-1")

      expect(connection).toBeDefined()
      expect(connection?.id).toBe("test-1")
    })

    it("returns undefined for unknown id", () => {
      expect(manager.getConnection("unknown")).toBeUndefined()
    })
  })

  describe("getStatus", () => {
    it("returns connected for active session", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      await manager.connect("test-1", config)

      expect(manager.getStatus("test-1")).toBe("connected")
    })

    it("returns undefined for unknown session", () => {
      expect(manager.getStatus("unknown")).toBeUndefined()
    })
  })

  describe("isConnected", () => {
    it("returns true for connected session", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      await manager.connect("test-1", config)

      expect(manager.isConnected("test-1")).toBe(true)
    })

    it("returns false for unknown session", () => {
      expect(manager.isConnected("unknown")).toBe(false)
    })

    it("returns false after close", async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))

      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      await connection.close()

      expect(manager.isConnected("test-1")).toBe(false)
    })
  })

  describe("event handlers", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
        .mockResolvedValueOnce(createMockResponse({ status: 202 }))
    })

    it("allows setting onMessage handler", async () => {
      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      const handler = vi.fn()
      connection.onMessage(handler)

      expect(handler).toHaveBeenCalled()
    })

    it("allows setting onError handler", async () => {
      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      const handler = vi.fn()
      connection.onError(handler)

      expect(handler).not.toHaveBeenCalled()
    })

    it("allows setting onClose handler", async () => {
      const config = createMockConfig()
      const connection = await manager.connect("test-1", config)

      const handler = vi.fn()
      connection.onClose(handler)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe("getConnectionIds", () => {
    it("returns empty array initially", () => {
      expect(manager.getConnectionIds()).toEqual([])
    })

    it("returns all session ids", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
      )

      const config = createMockConfig()

      await manager.connect("test-1", config)
      await manager.connect("test-2", config)

      const ids = manager.getConnectionIds()
      expect(ids).toContain("test-1")
      expect(ids).toContain("test-2")
      expect(ids).toHaveLength(2)
    })
  })

  describe("config handling", () => {
    beforeEach(() => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          createMockResponse({
            headers: { "content-type": "application/json" },
            json: () =>
              Promise.resolve({
                jsonrpc: "2.0",
                id: 1,
                result: { protocolVersion: "2025-06-18" },
              }),
          })
        )
      )
    })

    it("stores config in connection", async () => {
      const config = createMockConfig({
        requestTimeout: 5000,
        sessionTimeout: 60000,
      })

      const connection = await manager.connect("test-1", config)

      expect(connection.config).toEqual(config)
    })

    it("respects custom requestTimeout", async () => {
      const config = createMockConfig({
        requestTimeout: 5000,
      })

      const connection = await manager.connect("test-1", config)

      expect(
        (connection.config as StreamableHttpTransportConfig).requestTimeout
      ).toBe(5000)
    })
  })
})
