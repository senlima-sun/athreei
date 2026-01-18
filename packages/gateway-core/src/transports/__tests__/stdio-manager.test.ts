/**
 * Tests for stdio Transport Manager
 *
 * Note: These tests mock Bun.spawn since Vitest runs in Node.js environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { StdioTransportConfig, McpMessage } from "../../types/transports"

function createMockReadableStream(
  data: string[] = []
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < data.length) {
        controller.enqueue(encoder.encode(data[index] + "\n"))
        index++
      } else {
        controller.close()
      }
    },
  })
}

function createMockWritableStream(): {
  stream: { write: (data: string) => void; flush: () => void }
  written: string[]
} {
  const written: string[] = []
  return {
    stream: {
      write: (data: string) => written.push(data),
      flush: () => {},
    },
    written,
  }
}

function createMockSubprocess(
  options: {
    stdout?: ReadableStream<Uint8Array>
    stderr?: ReadableStream<Uint8Array>
    stdin?: { write: (data: string) => void; flush: () => void }
    killed?: boolean
  } = {}
) {
  return {
    stdout: options.stdout ?? createMockReadableStream(),
    stderr: options.stderr ?? createMockReadableStream(),
    stdin: options.stdin ?? createMockWritableStream().stream,
    killed: options.killed ?? false,
    kill: vi.fn(),
  }
}

const mockBunSpawn = vi.fn()
const mockBunSleep = vi.fn().mockResolvedValue(undefined)

vi.stubGlobal("Bun", {
  spawn: mockBunSpawn,
  sleep: mockBunSleep,
})

const { StdioTransportManager } = await import("../stdio-manager.js")

const createMockConfig = (
  overrides: Partial<StdioTransportConfig> = {}
): StdioTransportConfig => ({
  transport: "stdio",
  command: "echo",
  args: [],
  ...overrides,
})

describe("StdioTransportManager", () => {
  let manager: StdioTransportManager

  beforeEach(() => {
    manager = new StdioTransportManager()
    mockBunSpawn.mockReset()
    mockBunSleep.mockReset()
  })

  afterEach(async () => {
    await manager.disconnectAll()
  })

  describe("connect", () => {
    it("creates a connection with connected status", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      expect(connection.id).toBe("test-1")
      expect(connection.status).toBe("connected")
      expect(connection.config).toEqual(config)
      expect(connection.connectedAt).toBeInstanceOf(Date)
    })

    it("calls Bun.spawn with correct command array", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({
        command: "/usr/bin/node",
        args: ["--version", "--help"],
      })

      await manager.connect("test-1", config)

      expect(mockBunSpawn).toHaveBeenCalledWith(
        ["/usr/bin/node", "--version", "--help"],
        expect.objectContaining({
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
        })
      )
    })

    it("replaces existing connection with same id", async () => {
      const mockProc1 = createMockSubprocess()
      const mockProc2 = createMockSubprocess()
      mockBunSpawn.mockReturnValueOnce(mockProc1).mockReturnValueOnce(mockProc2)

      const config = createMockConfig({ command: "cat" })

      await manager.connect("test-1", config)
      await manager.connect("test-1", config)

      expect(mockProc1.kill).toHaveBeenCalledWith("SIGTERM")
      expect(manager.getConnectionIds()).toHaveLength(1)
    })

    it("handles multiple connections with different ids", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const config = createMockConfig({ command: "cat" })

      await manager.connect("test-1", config)
      await manager.connect("test-2", config)

      expect(manager.getConnectionIds()).toHaveLength(2)
      expect(manager.isConnected("test-1")).toBe(true)
      expect(manager.isConnected("test-2")).toBe(true)
    })

    it("sets cwd from config", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({
        command: "cat",
        cwd: "/tmp",
      })

      await manager.connect("test-1", config)

      expect(mockBunSpawn).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ cwd: "/tmp" })
      )
    })

    it("merges env vars with process.env", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({
        command: "cat",
        env: { CUSTOM_VAR: "custom_value" },
      })

      await manager.connect("test-1", config)

      expect(mockBunSpawn).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ CUSTOM_VAR: "custom_value" }),
        })
      )
    })

    it("handles empty args array", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({
        command: "cat",
        args: [],
      })

      await manager.connect("test-1", config)

      expect(mockBunSpawn).toHaveBeenCalledWith(["cat"], expect.any(Object))
    })
  })

  describe("send", () => {
    it("writes JSON + newline to stdin", async () => {
      const mockStdin = createMockWritableStream()
      const mockProc = createMockSubprocess({ stdin: mockStdin.stream })
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      const message: McpMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
      }

      await connection.send(message)

      expect(mockStdin.written).toContain(
        '{"jsonrpc":"2.0","id":1,"method":"test"}\n'
      )
    })

    it("allows messages with newlines in values (escaped by JSON.stringify)", async () => {
      const mockStdin = createMockWritableStream()
      const mockProc = createMockSubprocess({ stdin: mockStdin.stream })
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      const message: McpMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
        params: { text: "line1\nline2" },
      }

      await expect(connection.send(message)).resolves.toBeUndefined()
      expect(mockStdin.written[0]).not.toContain("\n\n")
    })

    it("throws when connection is closed", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      await connection.close()

      const message: McpMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
      }

      await expect(connection.send(message)).rejects.toThrow(
        "Connection test-1 is closed"
      )
    })

    it("handles unicode characters in message", async () => {
      const mockStdin = createMockWritableStream()
      const mockProc = createMockSubprocess({ stdin: mockStdin.stream })
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      const message: McpMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
        params: { text: "Hello 世界 🌍" },
      }

      await connection.send(message)

      expect(mockStdin.written[0]).toContain("Hello 世界 🌍")
    })
  })

  describe("close", () => {
    it("sends SIGTERM to process", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      await connection.close()

      expect(mockProc.kill).toHaveBeenCalledWith("SIGTERM")
    })

    it("removes from internal process map", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      await connection.close()

      expect(manager.getConnection("test-1")).toBeUndefined()
      expect(manager.isConnected("test-1")).toBe(false)
    })

    it("handles multiple close() calls safely", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      await connection.close()
      await expect(connection.close()).resolves.toBeUndefined()
    })
  })

  describe("disconnectAll", () => {
    it("closes all connections", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const config = createMockConfig({ command: "cat" })

      await manager.connect("test-1", config)
      await manager.connect("test-2", config)
      await manager.connect("test-3", config)

      await manager.disconnectAll()

      expect(manager.getConnectionIds()).toHaveLength(0)
    })

    it("handles empty pool", async () => {
      await expect(manager.disconnectAll()).resolves.toBeUndefined()
    })

    it("sends SIGTERM to all processes", async () => {
      const mockProc1 = createMockSubprocess()
      const mockProc2 = createMockSubprocess()
      mockBunSpawn.mockReturnValueOnce(mockProc1).mockReturnValueOnce(mockProc2)

      const config = createMockConfig({ command: "cat" })

      await manager.connect("test-1", config)
      await manager.connect("test-2", config)

      await manager.disconnectAll()

      expect(mockProc1.kill).toHaveBeenCalledWith("SIGTERM")
      expect(mockProc2.kill).toHaveBeenCalledWith("SIGTERM")
    })
  })

  describe("getConnection", () => {
    it("returns connection for existing id", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
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
    it("returns connected for active connection", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      await manager.connect("test-1", config)

      expect(manager.getStatus("test-1")).toBe("connected")
    })

    it("returns undefined for unknown connection", () => {
      expect(manager.getStatus("unknown")).toBeUndefined()
    })
  })

  describe("isConnected", () => {
    it("returns true for connected process", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      await manager.connect("test-1", config)

      expect(manager.isConnected("test-1")).toBe(true)
    })

    it("returns false for unknown connection", () => {
      expect(manager.isConnected("unknown")).toBe(false)
    })

    it("returns false after close", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      await connection.close()

      expect(manager.isConnected("test-1")).toBe(false)
    })

    it("returns false when process is killed", async () => {
      const mockProc = createMockSubprocess({ killed: true })
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      await manager.connect("test-1", config)

      expect(manager.isConnected("test-1")).toBe(false)
    })
  })

  describe("event handlers", () => {
    it("allows setting onMessage handler", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      const handler = vi.fn()
      connection.onMessage(handler)

      expect(handler).not.toHaveBeenCalled()
    })

    it("allows setting onError handler", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      const handler = vi.fn()
      connection.onError(handler)

      expect(handler).not.toHaveBeenCalled()
    })

    it("allows setting onClose handler", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
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

    it("returns all connection ids", async () => {
      mockBunSpawn.mockImplementation(() => createMockSubprocess())

      const config = createMockConfig({ command: "cat" })

      await manager.connect("test-1", config)
      await manager.connect("test-2", config)

      const ids = manager.getConnectionIds()
      expect(ids).toContain("test-1")
      expect(ids).toContain("test-2")
      expect(ids).toHaveLength(2)
    })
  })

  describe("config handling", () => {
    it("uses default maxRestarts of 3 when not specified", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      expect(
        (connection.config as StdioTransportConfig).maxRestarts
      ).toBeUndefined()
    })

    it("respects custom maxRestarts", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({
        command: "cat",
        maxRestarts: 5,
      })
      const connection = await manager.connect("test-1", config)

      expect((connection.config as StdioTransportConfig).maxRestarts).toBe(5)
    })

    it("uses default restartDelay of 1000 when not specified", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({ command: "cat" })
      const connection = await manager.connect("test-1", config)

      expect(
        (connection.config as StdioTransportConfig).restartDelay
      ).toBeUndefined()
    })

    it("respects custom restartDelay", async () => {
      const mockProc = createMockSubprocess()
      mockBunSpawn.mockReturnValue(mockProc)

      const config = createMockConfig({
        command: "cat",
        restartDelay: 2000,
      })
      const connection = await manager.connect("test-1", config)

      expect((connection.config as StdioTransportConfig).restartDelay).toBe(
        2000
      )
    })
  })
})
