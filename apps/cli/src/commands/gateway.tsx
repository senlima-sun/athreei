import React, { useState, useEffect, useCallback, useRef } from "react"
import { Box, Text, useApp, useInput } from "ink"
import Spinner from "ink-spinner"
import { spawn, execFileSync, spawnSync } from "child_process"
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  watchFile,
  unwatchFile,
  statSync,
  createWriteStream,
} from "fs"
import { join } from "path"
import { homedir } from "os"
import { ErrorDisplay } from "../components/error.js"
import {
  loadConfig,
  writeConfig,
  getConfigValue,
  setConfigValue,
} from "../lib/config-loader.js"
import type { Config } from "../lib/config-schema.js"

// ============================================
// Helper Functions
// ============================================

function getAthreeiDir(): string {
  return join(homedir(), ".athreei")
}

function getGatewayPidPath(): string {
  return join(getAthreeiDir(), "gateway.pid")
}

function getGatewayLogPath(): string {
  return join(getAthreeiDir(), "gateway.log")
}

function ensureAthreeiDir(): void {
  const dir = getAthreeiDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function findGatewayBinary(): string | null {
  // Check common locations
  const locations = [
    // Local bin directory
    join(getAthreeiDir(), "bin", "gateway"),
    // Project build location (for development)
    join(process.cwd(), "packages", "gateway", "dist", "gateway"),
    // Homebrew on macOS
    "/usr/local/bin/athreei-gateway",
    "/opt/homebrew/bin/athreei-gateway",
  ]

  // Check if in PATH using which/where
  try {
    const whichCmd = process.platform === "win32" ? "where" : "which"
    const result = spawnSync(whichCmd, ["athreei-gateway"], {
      encoding: "utf-8",
    })
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim().split("\n")[0]
    }
  } catch {
    // Not found in PATH
  }

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc
    }
  }

  return null
}

function readPidFile(): number | null {
  const pidPath = getGatewayPidPath()
  if (!existsSync(pidPath)) {
    return null
  }

  try {
    const content = readFileSync(pidPath, "utf-8").trim()
    const pid = parseInt(content, 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

function writePidFile(pid: number): void {
  ensureAthreeiDir()
  writeFileSync(getGatewayPidPath(), String(pid), "utf-8")
}

function removePidFile(): void {
  const pidPath = getGatewayPidPath()
  if (existsSync(pidPath)) {
    try {
      unlinkSync(pidPath)
    } catch {
      // Ignore errors
    }
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function isGatewayRunning(): { running: boolean; pid: number | null } {
  const pid = readPidFile()
  if (!pid) {
    return { running: false, pid: null }
  }

  if (isProcessRunning(pid)) {
    return { running: true, pid }
  }

  // Process not running but PID file exists - clean up
  removePidFile()
  return { running: false, pid: null }
}

function getProcessStartTime(pid: number): Date | null {
  if (process.platform === "win32") {
    // Windows doesn't have ps, skip uptime
    return null
  }

  try {
    const result = execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf-8",
    })
    return new Date(result.trim())
  } catch {
    return null
  }
}

function formatUptime(startTime: Date): string {
  const now = new Date()
  const diff = now.getTime() - startTime.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

// ============================================
// GatewayStatus - Check gateway status
// ============================================

export function GatewayStatus() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{
    running: boolean
    pid: number | null
    port: number | null
    uptime: string | null
  } | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const { running, pid } = isGatewayRunning()

        let port: number | null = null
        let uptime: string | null = null

        if (running && pid) {
          // Try to get port from config
          const result = loadConfig()
          if (result?.config.gateway?.port) {
            port = result.config.gateway.port
          } else {
            port = 8080 // Default port
          }

          // Get uptime
          const startTime = getProcessStartTime(pid)
          if (startTime) {
            uptime = formatUptime(startTime)
          }
        }

        setStatus({ running, pid, port, uptime })
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to check gateway status")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    checkStatus()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Checking gateway status...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="checking gateway status" />
  }

  if (!status?.running) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="yellow">Gateway is not running</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run </Text>
          <Text color="cyan">athreei gateway start</Text>
          <Text dimColor> to start the gateway</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="green">Gateway is running</Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>PID: </Text>
        <Text color="cyan">{status.pid}</Text>
      </Box>

      {status.port && (
        <Box marginLeft={2}>
          <Text dimColor>Port: </Text>
          <Text color="cyan">{status.port}</Text>
        </Box>
      )}

      {status.uptime && (
        <Box marginLeft={2}>
          <Text dimColor>Uptime: </Text>
          <Text color="cyan">{status.uptime}</Text>
        </Box>
      )}

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>Endpoint: </Text>
        <Text color="blue">http://localhost:{status.port ?? 8080}</Text>
      </Box>
    </Box>
  )
}

// ============================================
// GatewayStart - Start the gateway
// ============================================

interface GatewayStartProps {
  port?: number
}

type StartPhase = "checking" | "starting" | "success" | "error"

export function GatewayStart(props: GatewayStartProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<StartPhase>("checking")
  const [error, setError] = useState<Error | null>(null)
  const [pid, setPid] = useState<number | null>(null)
  const [port, setPort] = useState<number>(8080)

  useEffect(() => {
    async function startGateway() {
      try {
        // Check if already running
        const { running, pid: existingPid } = isGatewayRunning()
        if (running) {
          setError(
            new Error(
              `Gateway is already running (PID: ${existingPid}). Run 'athreei gateway stop' first.`
            )
          )
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        // Find gateway binary
        const binaryPath = findGatewayBinary()
        if (!binaryPath) {
          setError(
            new Error(
              "Gateway binary not found. Install it with 'athreei gateway install' or ensure it's in your PATH."
            )
          )
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        // Determine port
        let gatewayPort = props.port
        if (!gatewayPort) {
          const result = loadConfig()
          gatewayPort = result?.config.gateway?.port ?? 8080
        }
        setPort(gatewayPort)

        setPhase("starting")

        // Ensure log directory exists
        ensureAthreeiDir()
        const logPath = getGatewayLogPath()

        // Start gateway in background
        const child = spawn(binaryPath, ["--port", String(gatewayPort)], {
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            ATHREEI_LOG_FILE: logPath,
          },
        })

        // Write logs to file
        const logStream = createWriteStream(logPath, { flags: "a" })
        child.stdout?.pipe(logStream)
        child.stderr?.pipe(logStream)

        // Unref to allow parent to exit
        child.unref()

        if (child.pid) {
          writePidFile(child.pid)
          setPid(child.pid)
          setPhase("success")
        } else {
          setError(new Error("Failed to start gateway process"))
          setPhase("error")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to start gateway")
        )
        setPhase("error")
      }

      setTimeout(() => exit(), 100)
    }

    startGateway()
  }, [props.port, exit])

  if (phase === "checking") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Checking gateway status...</Text>
      </Box>
    )
  }

  if (phase === "starting") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Starting gateway...</Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="starting gateway" />
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="green">Gateway started successfully</Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>PID: </Text>
        <Text color="cyan">{pid}</Text>
      </Box>

      <Box marginLeft={2}>
        <Text dimColor>Port: </Text>
        <Text color="cyan">{port}</Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>Endpoint: </Text>
        <Text color="blue">http://localhost:{port}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Logs: <Text color="cyan">{getGatewayLogPath()}</Text>
        </Text>
      </Box>
    </Box>
  )
}

// ============================================
// GatewayStop - Stop the gateway
// ============================================

interface GatewayStopProps {
  force?: boolean
}

type StopPhase =
  | "checking"
  | "stopping"
  | "waiting"
  | "force-killing"
  | "success"
  | "error"

export function GatewayStop(props: GatewayStopProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<StopPhase>("checking")
  const [error, setError] = useState<Error | null>(null)
  const [pid, setPid] = useState<number | null>(null)

  useEffect(() => {
    async function stopGateway() {
      try {
        const { running, pid: currentPid } = isGatewayRunning()

        if (!running || !currentPid) {
          setError(new Error("Gateway is not running"))
          setPhase("error")
          setTimeout(() => exit(), 100)
          return
        }

        setPid(currentPid)
        setPhase("stopping")

        // Send SIGTERM
        process.kill(currentPid, "SIGTERM")

        // Wait for graceful shutdown (5 seconds)
        const startWait = Date.now()
        const timeout = 5000

        setPhase("waiting")

        const checkInterval = setInterval(() => {
          if (!isProcessRunning(currentPid)) {
            clearInterval(checkInterval)
            removePidFile()
            setPhase("success")
            setTimeout(() => exit(), 100)
            return
          }

          if (Date.now() - startWait > timeout) {
            clearInterval(checkInterval)

            if (props.force) {
              // Force kill
              setPhase("force-killing")
              try {
                process.kill(currentPid, "SIGKILL")
                // Give it a moment
                setTimeout(() => {
                  removePidFile()
                  setPhase("success")
                  setTimeout(() => exit(), 100)
                }, 500)
              } catch {
                removePidFile()
                setPhase("success")
                setTimeout(() => exit(), 100)
              }
            } else {
              setError(
                new Error(
                  `Gateway did not stop gracefully within ${timeout / 1000}s. Use --force to kill it.`
                )
              )
              setPhase("error")
              setTimeout(() => exit(), 100)
            }
          }
        }, 100)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to stop gateway")
        )
        setPhase("error")
        setTimeout(() => exit(), 100)
      }
    }

    stopGateway()
  }, [props.force, exit])

  if (phase === "checking") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Checking gateway status...</Text>
      </Box>
    )
  }

  if (phase === "stopping" || phase === "waiting") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Stopping gateway (PID: {pid})...</Text>
      </Box>
    )
  }

  if (phase === "force-killing") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Force killing gateway (PID: {pid})...</Text>
      </Box>
    )
  }

  if (phase === "error" && error) {
    return <ErrorDisplay error={error} context="stopping gateway" />
  }

  return (
    <Box padding={1}>
      <Text color="green">Gateway stopped successfully (PID: {pid})</Text>
    </Box>
  )
}

// ============================================
// GatewayLogs - View gateway logs
// ============================================

interface GatewayLogsProps {
  follow?: boolean
  lines?: number
  level?: string
}

export function GatewayLogs(props: GatewayLogsProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [watching, setWatching] = useState(false)
  const lastSizeRef = useRef(0)

  const filterByLevel = useCallback(
    (line: string): boolean => {
      if (!props.level) return true

      const levelOrder = ["debug", "info", "warn", "error"]
      const filterIndex = levelOrder.indexOf(props.level.toLowerCase())
      if (filterIndex === -1) return true

      // Check if line contains a level indicator
      const lowerLine = line.toLowerCase()
      for (let i = filterIndex; i < levelOrder.length; i++) {
        if (
          lowerLine.includes(`[${levelOrder[i]}]`) ||
          lowerLine.includes(`"level":"${levelOrder[i]}"`)
        ) {
          return true
        }
      }

      // Include lines without level (headers, separators, etc.)
      const hasAnyLevel = levelOrder.some(
        (l) =>
          lowerLine.includes(`[${l}]`) || lowerLine.includes(`"level":"${l}"`)
      )
      return !hasAnyLevel
    },
    [props.level]
  )

  const readLogs = useCallback(() => {
    const logPath = getGatewayLogPath()

    if (!existsSync(logPath)) {
      return []
    }

    try {
      const content = readFileSync(logPath, "utf-8")
      const allLines = content.split("\n").filter(Boolean)
      const filteredLines = allLines.filter(filterByLevel)
      const lineCount = props.lines ?? 50
      return filteredLines.slice(-lineCount)
    } catch {
      return []
    }
  }, [props.lines, filterByLevel])

  useEffect(() => {
    const logPath = getGatewayLogPath()

    if (!existsSync(logPath)) {
      setError(
        new Error(
          `Log file not found at ${logPath}. Gateway may not have been started yet.`
        )
      )
      setLoading(false)
      setTimeout(() => exit(), 100)
      return
    }

    // Initial read
    const initialLogs = readLogs()
    setLogs(initialLogs)
    setLoading(false)

    if (props.follow) {
      setWatching(true)
      const stats = statSync(logPath)
      lastSizeRef.current = stats.size

      // Watch for changes
      watchFile(logPath, { interval: 100 }, (curr, _prev) => {
        if (curr.size > lastSizeRef.current) {
          const newLogs = readLogs()
          setLogs(newLogs)
          lastSizeRef.current = curr.size
        }
      })

      // Cleanup on unmount
      return () => {
        unwatchFile(logPath)
      }
    } else {
      setTimeout(() => exit(), 100)
    }
  }, [props.follow, readLogs, exit])

  // Handle Ctrl+C to stop following
  useInput(
    (input, key) => {
      if (key.ctrl && input === "c") {
        const logPath = getGatewayLogPath()
        unwatchFile(logPath)
        exit()
      }
    },
    { isActive: watching }
  )

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading logs...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="reading gateway logs" />
  }

  if (logs.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No logs found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      {watching && (
        <Box marginBottom={1}>
          <Text dimColor>Following logs (Ctrl+C to stop)...</Text>
        </Box>
      )}
      {logs.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </Box>
  )
}

// ============================================
// GatewayConfigShow - Display gateway config
// ============================================

export function GatewayConfigShow() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<Config["gateway"] | null>(null)
  const [configPath, setConfigPath] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = loadConfig()
        if (result) {
          setConfig(result.config.gateway ?? null)
          setConfigPath(result.path)
        } else {
          setError(
            new Error(
              "No config file found. Run 'athreei config init' to create one."
            )
          )
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load config")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading gateway config...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="loading gateway config" />
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Gateway Configuration
        </Text>
      </Box>

      {configPath && (
        <Box marginBottom={1}>
          <Text dimColor>Config file: </Text>
          <Text color="cyan">{configPath}</Text>
        </Box>
      )}

      {!config ? (
        <Box>
          <Text dimColor>No gateway configuration set (using defaults)</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginLeft={2}>
          <Box>
            <Text bold>port: </Text>
            <Text color="cyan">{config.port ?? 8080}</Text>
          </Box>
          <Box>
            <Text bold>logLevel: </Text>
            <Text color="cyan">{config.logLevel ?? "info"}</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Default values: port=8080, logLevel=info</Text>
      </Box>
    </Box>
  )
}

// ============================================
// GatewayConfigSet - Set gateway config value
// ============================================

interface GatewayConfigSetProps {
  configKey: string
  value: string
}

export function GatewayConfigSet(props: GatewayConfigSetProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)
  const [oldValue, setOldValue] = useState<unknown>(undefined)
  const [newValue, setNewValue] = useState<unknown>(undefined)

  useEffect(() => {
    async function updateConfig() {
      try {
        const result = loadConfig()
        if (!result) {
          throw new Error(
            "No config file found. Run 'athreei config init' to create one."
          )
        }

        const { config, path } = result
        const fullKey = `gateway.${props.configKey}`

        // Get old value
        const previousValue = getConfigValue(config, fullKey)
        setOldValue(previousValue)

        // Parse value
        let parsedValue: unknown = props.value
        try {
          parsedValue = JSON.parse(props.value)
        } catch {
          // Keep as string
        }

        // Validate key
        const validKeys = ["port", "logLevel"]
        if (!validKeys.includes(props.configKey)) {
          throw new Error(
            `Invalid gateway config key: ${props.configKey}. Valid keys: ${validKeys.join(", ")}`
          )
        }

        // Set new value
        const updatedConfig = setConfigValue(config, fullKey, parsedValue)
        setNewValue(parsedValue)

        // Write config
        writeConfig(updatedConfig, path)
        setSuccess(true)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to set gateway config")
        )
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    updateConfig()
  }, [props.configKey, props.value, exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Updating gateway config...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="setting gateway config" />
  }

  if (success) {
    const formatValue = (val: unknown): string => {
      if (val === undefined) return "(not set)"
      if (typeof val === "object") return JSON.stringify(val)
      return String(val)
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green">Gateway config updated</Text>
        </Box>

        <Box marginTop={1} marginLeft={2}>
          <Text bold>gateway.{props.configKey}: </Text>
        </Box>

        <Box marginLeft={4}>
          <Text color="red">- {formatValue(oldValue)}</Text>
        </Box>

        <Box marginLeft={4}>
          <Text color="green">+ {formatValue(newValue)}</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Restart the gateway for changes to take effect.</Text>
        </Box>
      </Box>
    )
  }

  return null
}
