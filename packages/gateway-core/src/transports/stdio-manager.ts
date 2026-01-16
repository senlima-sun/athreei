/**
 * stdio Transport Manager
 *
 * Manages subprocess-based MCP server connections using Bun.spawn().
 * Handles process lifecycle, automatic restarts, and line-delimited JSON messaging.
 */

import type { Subprocess } from "bun"
import type {
  StdioTransportConfig,
  TransportConnection,
  McpMessage,
  TransportStatus,
} from "../types/transports.js"

interface ManagedProcess {
  process: Subprocess
  restartCount: number
  config: StdioTransportConfig
  abortController: AbortController
  status: TransportStatus
  connectedAt?: Date
  lastMessageAt?: Date
}

export class StdioTransportManager {
  private processes = new Map<string, ManagedProcess>()
  private messageHandlers = new Map<string, (msg: McpMessage) => void>()
  private errorHandlers = new Map<string, (err: Error) => void>()
  private closeHandlers = new Map<string, () => void>()

  async connect(
    id: string,
    config: StdioTransportConfig
  ): Promise<TransportConnection> {
    const existingProcess = this.processes.get(id)
    if (existingProcess) {
      existingProcess.abortController.abort()
      existingProcess.process.kill("SIGTERM")
      this.processes.delete(id)
    }

    const proc = Bun.spawn([config.command, ...(config.args || [])], {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      onExit: (_proc, exitCode, signalCode, _error) => {
        this.handleProcessExit(id, exitCode, signalCode)
      },
    })

    const managed: ManagedProcess = {
      process: proc,
      restartCount: 0,
      config,
      abortController: new AbortController(),
      status: "connected",
      connectedAt: new Date(),
    }
    this.processes.set(id, managed)

    this.startLineReader(id, managed)
    this.startStderrReader(id, proc)

    return this.createConnection(id, managed)
  }

  private async startLineReader(
    id: string,
    managed: ManagedProcess
  ): Promise<void> {
    const stdout = managed.process.stdout
    if (!stdout) return

    try {
      for await (const line of this.lines(stdout)) {
        if (managed.abortController.signal.aborted) break

        try {
          const message = JSON.parse(line) as McpMessage
          managed.lastMessageAt = new Date()
          const handler = this.messageHandlers.get(id)
          handler?.(message)
        } catch {
          const errorHandler = this.errorHandlers.get(id)
          errorHandler?.(new Error(`Invalid JSON from server: ${line}`))
        }
      }
    } catch (e) {
      if (!managed.abortController.signal.aborted) {
        const handler = this.errorHandlers.get(id)
        handler?.(e instanceof Error ? e : new Error(String(e)))
      }
    }
  }

  private async startStderrReader(
    id: string,
    proc: Subprocess
  ): Promise<void> {
    const stderr = proc.stderr
    if (!stderr) return

    const reader = stderr.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        console.debug(`[stdio:${id}:stderr]`, decoder.decode(value))
      }
    } catch {
      // Ignore stderr read errors
    } finally {
      reader.releaseLock()
    }
  }

  private async *lines(
    stream: ReadableStream<Uint8Array>
  ): AsyncGenerator<string> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n")
        buffer = parts.pop() || ""

        for (const line of parts) {
          if (line) yield line
        }
      }

      if (buffer) yield buffer
    } finally {
      reader.releaseLock()
    }
  }

  private createConnection(
    id: string,
    managed: ManagedProcess
  ): TransportConnection {
    const self = this

    return {
      id,
      config: managed.config,
      get status() {
        return self.processes.get(id)?.status ?? "disconnected"
      },
      get connectedAt() {
        return self.processes.get(id)?.connectedAt
      },
      get lastMessageAt() {
        return self.processes.get(id)?.lastMessageAt
      },

      send: async (message: McpMessage) => {
        const currentManaged = self.processes.get(id)
        if (!currentManaged || currentManaged.abortController.signal.aborted) {
          throw new Error(`Connection ${id} is closed`)
        }

        const json = JSON.stringify(message)
        if (json.includes("\n")) {
          throw new Error("Message contains embedded newlines")
        }

        const stdin = currentManaged.process.stdin
        if (!stdin) {
          throw new Error(`No stdin available for connection ${id}`)
        }

        stdin.write(json + "\n")
        stdin.flush()
      },

      close: async () => {
        const currentManaged = self.processes.get(id)
        if (!currentManaged) return

        currentManaged.abortController.abort()
        currentManaged.status = "disconnected"
        currentManaged.process.kill("SIGTERM")

        setTimeout(() => {
          if (!currentManaged.process.killed) {
            currentManaged.process.kill("SIGKILL")
          }
        }, 5000)

        self.processes.delete(id)
        self.messageHandlers.delete(id)
        self.errorHandlers.delete(id)
        self.closeHandlers.delete(id)
      },

      onMessage: (handler) => {
        self.messageHandlers.set(id, handler)
      },

      onError: (handler) => {
        self.errorHandlers.set(id, handler)
      },

      onClose: (handler) => {
        self.closeHandlers.set(id, handler)
      },
    }
  }

  private async handleProcessExit(
    id: string,
    code: number | null,
    signal: string | null
  ): Promise<void> {
    const managed = this.processes.get(id)
    if (!managed || managed.abortController.signal.aborted) return

    managed.status = "error"

    const maxRestarts = managed.config.maxRestarts ?? 3
    const restartDelay = managed.config.restartDelay ?? 1000

    if (managed.restartCount < maxRestarts) {
      console.log(
        `[stdio:${id}] Process exited (code=${code}, signal=${signal}). Restarting (${managed.restartCount + 1}/${maxRestarts})...`
      )
      managed.restartCount++

      await Bun.sleep(restartDelay)

      if (!managed.abortController.signal.aborted) {
        try {
          await this.connect(id, managed.config)
        } catch (e) {
          console.error(`[stdio:${id}] Restart failed:`, e)
          const closeHandler = this.closeHandlers.get(id)
          closeHandler?.()
        }
      }
    } else {
      console.error(`[stdio:${id}] Max restarts (${maxRestarts}) exceeded`)
      this.processes.delete(id)
      const closeHandler = this.closeHandlers.get(id)
      closeHandler?.()
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.processes.entries()).map(
      async ([id, managed]) => {
        managed.abortController.abort()
        managed.status = "disconnected"
        managed.process.kill("SIGTERM")

        await Bun.sleep(100)

        if (!managed.process.killed) {
          managed.process.kill("SIGKILL")
        }
      }
    )

    await Promise.all(promises)

    this.processes.clear()
    this.messageHandlers.clear()
    this.errorHandlers.clear()
    this.closeHandlers.clear()
  }

  getConnection(id: string): TransportConnection | undefined {
    const managed = this.processes.get(id)
    if (!managed) return undefined
    return this.createConnection(id, managed)
  }

  getStatus(id: string): TransportStatus | undefined {
    return this.processes.get(id)?.status
  }

  isConnected(id: string): boolean {
    const managed = this.processes.get(id)
    return managed?.status === "connected" && !managed.process.killed
  }

  getConnectionIds(): string[] {
    return Array.from(this.processes.keys())
  }
}
