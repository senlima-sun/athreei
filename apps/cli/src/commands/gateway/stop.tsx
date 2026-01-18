import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import {
  isGatewayRunning,
  isProcessRunning,
  removePidFile,
} from "../../lib/gateway-process"

export interface GatewayStopProps {
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

        process.kill(currentPid, "SIGTERM")

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
              setPhase("force-killing")
              try {
                process.kill(currentPid, "SIGKILL")
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
    return <LoadingSpinner message="Checking gateway status..." />
  }

  if (phase === "stopping" || phase === "waiting") {
    return <LoadingSpinner message={`Stopping gateway (PID: ${pid})...`} />
  }

  if (phase === "force-killing") {
    return <LoadingSpinner message={`Force killing gateway (PID: ${pid})...`} />
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
