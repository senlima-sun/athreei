import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { spawn } from "child_process"
import { createWriteStream } from "fs"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { loadConfig } from "../../lib/config-loader"
import {
  isGatewayRunning,
  findGatewayBinary,
  ensureAthreeiDir,
  getGatewayLogPath,
  writePidFile,
} from "../../lib/gateway-process"

export interface GatewayStartProps {
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

        let gatewayPort = props.port
        if (!gatewayPort) {
          const result = loadConfig()
          gatewayPort = result?.config.gateway?.port ?? 8080
        }
        setPort(gatewayPort)

        setPhase("starting")

        ensureAthreeiDir()
        const logPath = getGatewayLogPath()

        const child = spawn(binaryPath, ["--port", String(gatewayPort)], {
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            ATHREEI_LOG_FILE: logPath,
          },
        })

        const logStream = createWriteStream(logPath, { flags: "a" })
        child.stdout?.pipe(logStream)
        child.stderr?.pipe(logStream)

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
    return <LoadingSpinner message="Checking gateway status..." />
  }

  if (phase === "starting") {
    return <LoadingSpinner message="Starting gateway..." />
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
