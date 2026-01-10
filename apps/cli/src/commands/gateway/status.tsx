import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { ErrorDisplay } from "../../components/error.js"
import { LoadingSpinner } from "../../components/loading-spinner.js"
import { loadConfig } from "../../lib/config-loader.js"
import {
  isGatewayRunning,
  getProcessStartTime,
  formatUptime,
} from "../../lib/gateway-process.js"

export interface GatewayStatusProps {
  json?: boolean
}

export function GatewayStatus(props: GatewayStatusProps) {
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
          const result = loadConfig()
          if (result?.config.gateway?.port) {
            port = result.config.gateway.port
          } else {
            port = 8080
          }

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
    return <LoadingSpinner message="Checking gateway status..." />
  }

  if (error) {
    if (props.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
      return null
    }
    return <ErrorDisplay error={error} context="checking gateway status" />
  }

  if (props.json) {
    console.log(
      JSON.stringify(
        {
          running: status?.running ?? false,
          pid: status?.pid ?? null,
          port: status?.port ?? null,
          uptime: status?.uptime ?? null,
          endpoint: status?.running
            ? `http://localhost:${status?.port ?? 8080}`
            : null,
        },
        null,
        2
      )
    )
    return null
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
